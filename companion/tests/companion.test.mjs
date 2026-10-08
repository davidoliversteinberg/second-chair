import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import http from "node:http";
import { Store, scanInbox } from "../server/store.mjs";
import { startCompanion } from "../server/index.mjs";
import { agentOptions } from "../server/agent.mjs";
const report = (revision = 1) => ({
  schemaVersion: 1,
  producer: "sweep",
  checkedAt: "2026-10-07T12:00:00Z",
  status: "ok",
  coverage: "Two sample channels",
  alerts: [
    {
      id: "decision",
      revision,
      title: "A design decision",
      summary: "The limit changed.",
      why: "Affects the upload flow.",
      nextStep: "Review the decision.",
      priority: "attention",
      kind: "observed",
      project: "Test",
      updatedAt: "2026-10-07T12:00:00Z",
      source: { label: "Example note", url: "https://example.com/source" },
    },
  ],
});
function directory(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "second-chair-test-"));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  return dir;
}
function fixture(t) {
  let now = new Date(2026, 9, 7, 12);
  const notifications = [];
  const store = new Store(directory(t), {
    now: () => now,
    notify: (alerts) => notifications.push(alerts.map((a) => a.key)),
  });
  return { store, notifications, setNow: (value) => (now = value) };
}
test("repeat imports and restarts do not re-notify; a new revision reopens a resolved item", (t) => {
  const { store, notifications } = fixture(t);
  store.ingest(report());
  store.tick();
  assert.equal(notifications.length, 1);
  store.action("sweep:decision", "resolve");
  store.ingest(report());
  store.tick();
  assert.equal(store.state.alerts[0].state, "resolved");
  assert.equal(notifications.length, 1);
  const reopened = new Store(store.directory, {
    now: store.now,
    notify: () => notifications.push("new"),
  });
  reopened.tick();
  assert.equal(notifications.length, 1);
  reopened.ingest(report(2));
  reopened.tick();
  assert.equal(notifications.length, 2);
  assert.equal(reopened.state.alerts[0].state, "new");
});
test("acknowledged stays active; snooze returns in an hour without replay before then", (t) => {
  const { store, notifications, setNow } = fixture(t);
  store.ingest(report());
  store.action("sweep:decision", "acknowledge");
  assert.equal(store.state.alerts[0].state, "acknowledged");
  store.tick();
  assert.equal(notifications.length, 0);
  store.action("sweep:decision", "snooze");
  setNow(new Date(2026, 9, 7, 12, 59));
  store.tick();
  assert.equal(notifications.length, 0);
  setNow(new Date(2026, 9, 7, 13));
  store.tick();
  assert.equal(notifications.length, 1);
});
test("quiet hours and pause defer one batch; FYI stays quiet", (t) => {
  const { store, notifications, setNow } = fixture(t);
  setNow(new Date(2026, 9, 7, 21));
  store.ingest(report());
  const second = report();
  second.alerts[0].id = "second";
  store.ingest(second);
  store.tick();
  assert.equal(notifications.length, 0);
  store.settings({ paused: true });
  setNow(new Date(2026, 9, 8, 9));
  store.tick();
  assert.equal(notifications.length, 0);
  store.settings({ paused: false });
  store.tick();
  assert.equal(notifications.length, 1);
  assert.equal(notifications[0].length, 2);
  const fyi = report();
  fyi.alerts[0].id = "fyi";
  fyi.alerts[0].priority = "fyi";
  store.ingest(fyi);
  store.tick();
  assert.equal(notifications.length, 1);
});
test("invalid, partial-write, symlinked, and missing inbox reports keep last good findings", (t) => {
  const { store } = fixture(t);
  const inbox = path.join(store.directory, "inbox");
  fs.mkdirSync(inbox);
  const file = path.join(inbox, "sweep.json");
  fs.writeFileSync(file, JSON.stringify(report()));
  scanInbox(store, inbox);
  assert.equal(store.state.alerts.length, 1);
  fs.writeFileSync(file, "{broken");
  fs.symlinkSync(store.file, path.join(inbox, "symlink.json"));
  scanInbox(store, inbox);
  assert.equal(store.state.alerts.length, 1);
  assert.equal(store.state.problems.length, 2);
  scanInbox(store, path.join(inbox, "missing"));
  assert.equal(store.state.sources.sweep.status, "ok");
  assert.match(store.state.problems[0], /unavailable/);
});
test("partial source coverage is visible and older reports cannot regress it", (t) => {
  const { store } = fixture(t);
  const partial = report();
  partial.status = "partial";
  store.ingest(partial);
  const old = report();
  old.checkedAt = "2026-10-06T12:00:00Z";
  store.ingest(old);
  assert.equal(store.state.sources.sweep.status, "partial");
  const bad = report();
  bad.alerts[0].source.url = "javascript:alert(1)";
  assert.throws(() => store.ingest(bad));
  const future = report();
  future.checkedAt = "2030-01-01T00:00:00Z";
  assert.throws(() => store.ingest(future));
});
test("unsupported notification delivery leaves alerts pending", (t) => {
  const store = new Store(directory(t), {
    now: () => new Date(2026, 9, 7, 12),
    notify: () => false,
  });
  store.ingest(report());
  store.tick();
  assert.equal(store.state.alerts[0].notifiedRevision, 0);
});
test("SDK uses no tools, no inherited settings, isolated config, bounded requests", async (t) => {
  const options = agentOptions({
    dataDir: directory(t),
    apiKey: "test-key",
    abortController: new AbortController(),
  });
  assert.deepEqual(options.tools, []);
  assert.deepEqual(options.settingSources, []);
  assert.deepEqual(options.mcpServers, {});
  assert.equal(options.strictMcpConfig, true);
  assert.equal(options.maxBudgetUsd, 0.5);
  assert.equal((await options.canUseTool()).behavior, "deny");
  assert.ok(options.env.CLAUDE_CONFIG_DIR.endsWith("claude"));
});
test("local HTTP API rejects foreign origins, hosts, CSRF, and missing Claude auth", async (t) => {
  const app = await startCompanion({
    port: 0,
    dataDir: directory(t),
    apiKey: "",
  });
  t.after(() => app.close());
  assert.equal(
    (
      await fetch(app.baseURL + "/api/state", {
        headers: { Origin: "https://evil.example" },
      })
    ).status,
    403,
  );
  const hostStatus = await new Promise((resolve, reject) => {
    const req = http.get(
      app.baseURL + "/api/state",
      { headers: { Host: "evil.example" } },
      (res) => {
        res.resume();
        resolve(res.statusCode);
      },
    );
    req.on("error", reject);
  });
  assert.equal(hostStatus, 403);
  assert.equal(
    (await fetch(app.baseURL + "/api/settings", { method: "POST" })).status,
    403,
  );
  const state = await (await fetch(app.baseURL + "/api/state")).json();
  assert.equal(state.agent, "unconfigured");
  const send = (route, value) =>
    fetch(app.baseURL + "/api/" + route, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Second-Chair-Token": state.token,
      },
      body: JSON.stringify(value),
    });
  assert.equal((await send("chat", { text: "Hello" })).status, 503);
  assert.equal((await send("settings", { quietStart: 25 })).status, 400);
  assert.equal((await send("settings", { paused: true })).status, 200);
  assert.equal(app.store.state.settings.paused, true);
});
test("chat streams, resumes only its own session, and persists history", async (t) => {
  const calls = [];
  async function* reply(args) {
    calls.push(args);
    yield { sessionId: "owned-session" };
    yield { text: "A grounded " };
    yield { text: "reply." };
  }
  const dir = directory(t),
    app = await startCompanion({
      port: 0,
      dataDir: dir,
      apiKey: "fake",
      reply,
    });
  t.after(() => app.close());
  const state = await (await fetch(app.baseURL + "/api/state")).json();
  const send = (body) =>
    fetch(app.baseURL + "/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Second-Chair-Token": state.token,
      },
      body: JSON.stringify(body),
    });
  const result = await (await send({ text: "What changed?" })).json();
  for (let i = 0; i < 20 && app.store.state.chats[0].busy; i++)
    await new Promise((r) => setTimeout(r, 10));
  assert.equal(
    app.store.state.chats[0].messages.at(-1).text,
    "A grounded reply.",
  );
  assert.equal(calls[0].sessionId, undefined);
  await send({ chatId: result.chatId, text: "What next?" });
  for (let i = 0; i < 20 && app.store.state.chats[0].busy; i++)
    await new Promise((r) => setTimeout(r, 10));
  assert.equal(calls[1].sessionId, "owned-session");
  assert.equal(new Store(dir).state.chats[0].messages.length, 4);
  const publicState = await (await fetch(app.baseURL + "/api/state")).json();
  assert.equal(publicState.chats[0].sessionId, undefined);
  assert.equal(publicState.apiKey, undefined);
});

test("chat evidence is bounded, prioritizes urgent findings and excludes resolved items", async () => {
  const { chatContext } = await import("../server/context.mjs");
  const alerts = Array.from({ length: 50 }, (_, i) => ({
    ...report().alerts[0],
    id: String(i),
    state: "new",
    priority: i === 49 ? "urgent" : "fyi",
    summary: "x".repeat(4000),
  }));
  alerts.push({
    ...report().alerts[0],
    state: "resolved",
    priority: "urgent",
    id: "resolved",
  });
  const sources = Object.fromEntries(
    Array.from({ length: 25 }, (_, i) => [
      String(i),
      {
        coverage: "x".repeat(1000),
        status: "ok",
        checkedAt: report().checkedAt,
      },
    ]),
  );
  const context = chatContext({ alerts, sources });
  assert.equal(context.alerts[0].id, "49");
  assert.ok(
    context.alerts.reduce((sum, a) => sum + JSON.stringify(a).length, 0) <=
      24000,
  );
  assert.ok(context.alerts.length <= 20);
  assert.equal(
    context.alerts.some((a) => a.id === "resolved"),
    false,
  );
  assert.equal(context.omittedFindings, 50 - context.alerts.length);
  assert.equal(context.omittedSources, 5);
  assert.equal(context.sources.length, 20);
  assert.ok(context.sources.every((s) => s.coverage.length <= 250));
});
