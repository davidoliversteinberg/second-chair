import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { Store } from "../server/store.mjs";
import { EmailMonitor, nextWindow } from "../server/email-monitor.mjs";
import { applyEmailResult, mailPolicy } from "../server/email-scan.mjs";
const at = "2026-10-21T14:00:00.000Z";
const item = (id = "email-1", change = "request") => ({
  identity: "training:ergonomics:2026",
  existingKey: null,
  title: "Complete training",
  summary: "Required training reminder.",
  project: "Training",
  priority: "attention",
  status: "needs-you",
  change,
  dueAt: "2026-10-23T14:00:00Z",
  events: [
    {
      messageId: id,
      author: "Learning Center",
      actor: "other",
      text: "Please complete your assigned course.",
      at,
      source: { label: "Training email", url: "https://example.com/mail/1" },
    },
  ],
});
const result = (...items) => ({
  complete: true,
  coverage: "Received and sent email checked.",
  items,
});
function setup(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "chair-monitor-test-"));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const s = new Store(dir, { now: () => new Date(at) });
  s.state.settings.emailScanning = true;
  s.state.settings.quietStart = s.state.settings.quietEnd = 0;
  return s;
}
test("reminders merge; rereads stay quiet; local Done survives reminders; escalation reopens", (t) => {
  const s = setup(t);
  applyEmailResult(s, result(item()), at);
  const a = s.state.alerts[0];
  s.markRead([{ key: a.key, revision: a.revision }]);
  applyEmailResult(s, result({ ...item(), summary: "Rephrased" }), at);
  assert.equal(a.revision, 1);
  applyEmailResult(s, result(item("2", "reminder")), at);
  assert.equal(a.state, "acknowledged");
  assert.equal(a.thread.events.length, 2);
  s.setThreadStatus({ key: a.key, revision: a.revision, status: "done" });
  applyEmailResult(s, result(item("3", "reminder")), at);
  assert.equal(a.state, "resolved");
  applyEmailResult(s, result(item("4", "escalation")), at);
  assert.equal(a.state, "new");
  assert.equal(s.state.alerts.length, 1);
  assert.equal(a.thread.events.length, 4);
});
test("existing producer thread keeps notes and original coverage", (t) => {
  const s = setup(t);
  applyEmailResult(s, result(item()), at);
  const a = s.state.alerts[0];
  a.key = "legacy:training";
  a.producer = "legacy";
  a.id = "training";
  delete a.emailIdentity;
  s.state.sources.legacy = {
    checkedAt: "2026-10-14T12:00:00Z",
    status: "partial",
    coverage: "Old report",
  };
  s.addNote({ key: a.key, text: "Remember this" });
  applyEmailResult(
    s,
    result({ ...item("2", "reminder"), existingKey: a.key }),
    at,
  );
  assert.equal(s.state.alerts.length, 1);
  assert.equal(a.notes[0].text, "Remember this");
  assert.equal(s.state.sources.legacy.checkedAt, "2026-10-14T12:00:00Z");
});
test("unknown thread references reject the whole batch", (t) => {
  const s = setup(t);
  assert.throws(() =>
    applyEmailResult(
      s,
      result(item(), { ...item("2"), existingKey: "unknown:id" }),
      at,
    ),
  );
  assert.equal(s.state.alerts.length, 0);
});
test("cadence survives restart and overdue wake runs once without overlap", async (t) => {
  const s = setup(t);
  let now = new Date(2026, 9, 21, 10),
    calls = 0,
    release;
  s.now = () => now;
  const opts = {
    store: s,
    now: () => now,
    getCapabilities: async () => ({}),
    scan: async () => {
      calls++;
      await new Promise((r) => (release = r));
      return result();
    },
  };
  const m = new EmailMonitor(opts);
  const first = m.tick();
  await new Promise((r) => setImmediate(r));
  await m.tick();
  assert.equal(calls, 1);
  release();
  await first;
  const next = m.state.nextRun;
  m.close();
  const resumed = new EmailMonitor(opts);
  await resumed.tick();
  assert.equal(calls, 1);
  assert.equal(resumed.state.nextRun, next);
  now = new Date(now.getTime() + 7200000);
  const wake = resumed.tick();
  await new Promise((r) => setImmediate(r));
  release();
  await wake;
  assert.equal(calls, 2);
});
test("partial coverage never advances checkpoint; failure notifies once and recovery clears warning", async (t) => {
  const s = setup(t);
  let now = new Date(2026, 9, 21, 10),
    mode = "partial";
  const m = new EmailMonitor({
    store: s,
    now: () => now,
    getCapabilities: async () => ({}),
    scan: async ({ onUsage, continuation, until }) => {
      if (mode !== "partial") {
        assert.ok(continuation);
        assert.equal(until, new Date(2026, 9, 21, 10).toISOString());
      }
      onUsage({ input: 12, output: 5, costUsd: 0.01 });
      if (mode === "fail") throw new Error("Sign-in required");
      return {
        ...result(),
        complete: mode === "ok",
        coverage: "Mailbox coverage",
      };
    },
  });
  await m.tick();
  assert.equal(m.state.lastSuccess, null);
  assert.match(m.state.error, /partial/);
  assert.equal(m.state.nextRun, nextWindow(now, 5));
  mode = "fail";
  now = new Date(now.getTime() + 300000);
  await m.tick();
  assert.equal(s.state.alerts.length, 1);
  assert.match(m.state.error, /Sign-in/);
  mode = "ok";
  now = new Date(now.getTime() + 900000);
  await m.tick();
  assert.equal(m.state.lastSuccess, new Date(2026, 9, 21, 10).toISOString());
  assert.equal(m.state.error, null);
  assert.equal(s.state.alerts[0].state, "resolved");
  assert.equal(Object.keys(s.state.usage).length, 3);
});
test("off hours, pause, daily cap, interrupted restart, and timeout", async (t) => {
  const s = setup(t);
  let now = new Date(2026, 9, 21, 22),
    calls = 0;
  s.now = () => now;
  const opts = {
    store: s,
    now: () => now,
    getCapabilities: async () => ({}),
    scan: async () => {
      calls++;
      return result();
    },
  };
  const m = new EmailMonitor(opts);
  await m.tick();
  assert.equal(calls, 0);
  assert.equal(new Date(m.state.nextRun).getHours(), 8);
  s.state.settings.paused = true;
  await m.tick({ force: true });
  assert.equal(calls, 0);
  s.state.settings.paused = false;
  m.state.runsToday = 12;
  await m.tick({ force: true });
  assert.equal(calls, 0);
  assert.match(m.state.error, /limit/);
  m.state.running = true;
  const restart = new EmailMonitor(opts);
  assert.equal(restart.state.running, false);
  assert.match(restart.state.error, /stopped/);
  now = new Date(2026, 9, 22, 10);
  const stalled = new EmailMonitor({
    ...opts,
    timeoutMs: 10,
    scan: async () => new Promise(() => {}),
  });
  await stalled.tick();
  assert.match(stalled.state.error, /timed out/);
  assert.equal(stalled.state.running, false);
});
test("deadline reminder once per threshold, never for done", (t) => {
  const s = setup(t);
  applyEmailResult(s, result(item()), at);
  const a = s.state.alerts[0];
  const m = new EmailMonitor({ store: s, now: () => new Date(at) });
  m.deadlineReminders();
  const rev = a.revision;
  m.deadlineReminders();
  assert.equal(a.revision, rev);
  s.action(a.key, "resolve");
  m.now = () => new Date("2026-10-24T14:00:00Z");
  m.deadlineReminders();
  assert.equal(a.revision, rev);
});
test("email-only policy excludes calendar, nonemail and write tools", () => {
  const p = mailPolicy([
    {
      name: "Microsoft 365",
      status: "connected",
      readTools: [
        "mcp__microsoft__outlook_email_search",
        "mcp__microsoft__outlook_calendar_search",
        "mcp__teams__search",
      ],
      otherTools: ["mcp__microsoft__send_mail"],
    },
  ]);
  assert.deepEqual(p.allowed, ["mcp__microsoft__outlook_email_search"]);
  assert.equal(p.blocked.length, 3);
});

test("background API requires opt-in, persists enabled state, and scans through the injected company reader", async (t) => {
  const { startCompanion } = await import("../server/index.mjs");
  const s = setup(t);
  s.state.settings.emailScanning = false;
  s.save();
  let calls = 0;
  const app = await startCompanion({
    port: 0,
    dataDir: s.directory,
    login: true,
    monitorMs: 60000,
    discover: async () => ({
      loggedIn: true,
      account: { email: "sample@example.com" },
      connectors: [],
    }),
    emailScan: async () => {
      calls++;
      return result();
    },
  });
  t.after(() => app.close());
  const state = async () => (await fetch(app.baseURL + "/api/state")).json();
  const post = async (route, data) =>
    fetch(app.baseURL + "/api/" + route, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Second-Chair-Token": (await state()).token,
      },
      body: JSON.stringify(data),
    });
  assert.equal((await post("email/check", {})).status, 409);
  await post("settings", { emailScanning: true });
  await new Promise((r) => setTimeout(r, 50));
  if (!calls) await post("email/check", {});
  await new Promise((r) => setTimeout(r, 50));
  assert.ok(calls);
  assert.ok((await state()).runtime.emailMonitor.lastSuccess);
  await post("settings", { emailScanning: false });
  assert.equal((await state()).runtime.backgroundContentScans, false);
});

test("two assignments in one message stay separate; extracted date-only deadlines use local end of day", (t) => {
  const s = setup(t);
  applyEmailResult(
    s,
    result(
      { ...item(), dueAt: null, dueDate: "2026-10-23" },
      {
        ...item(),
        identity: "learning:security:2026",
        title: "Security training",
      },
    ),
    at,
  );
  assert.equal(s.state.alerts.length, 2);
  const a = s.state.alerts.find((a) => a.title === "Complete training");
  assert.equal(new Date(a.dueAt).getHours(), 23);
});

test("turning monitoring off cancels work without creating a failure notification", async (t) => {
  const s = setup(t);
  let release;
  const m = new EmailMonitor({
    store: s,
    now: () => new Date(2026, 9, 21, 10),
    getCapabilities: async () => ({}),
    scan: async ({ signal }) =>
      new Promise((resolve, reject) => {
        release = () => reject(new Error("cancelled"));
        signal.addEventListener("abort", release);
      }),
  });
  const run = m.tick();
  await new Promise((r) => setImmediate(r));
  s.settings({ emailScanning: false });
  m.stop();
  await run;
  assert.equal(m.state.running, false);
  assert.equal(m.state.error, null);
  assert.equal(s.state.alerts.length, 0);
});
