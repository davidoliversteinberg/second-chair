import { applyEmailResult, existingObligations } from "./email-scan.mjs";
import { needsYou } from "./finding-state.mjs";

const HOUR = 3600000,
  DAY = 24 * HOUR;
export const DAILY_RUN_LIMIT = 12;
export function nextWindow(now, intervalMinutes = 60) {
  const next = new Date(now.getTime() + intervalMinutes * 60000);
  if (next.getHours() >= 18) {
    next.setDate(next.getDate() + 1);
    next.setHours(8, 0, 0, 0);
  } else if (next.getHours() < 8) next.setHours(8, 0, 0, 0);
  return next.toISOString();
}
const dayKey = (now) =>
  `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;

export class EmailMonitor {
  constructor({
    store,
    scan,
    getCapabilities,
    now = () => new Date(),
    busy = () => false,
    timeoutMs = 330000,
  }) {
    Object.assign(this, { store, scan, getCapabilities, now, busy, timeoutMs });
    this.controller = null;
    this.closed = false;
    store.state.emailMonitor ||= {
      lastSuccess: null,
      lastAttempt: null,
      nextRun: null,
      failures: 0,
      runsToday: 0,
    };
    if (this.state.running) {
      this.state.running = false;
      this.state.error =
        "The app stopped during an email check. Retrying when due.";
      this.state.nextRun = now().toISOString();
    }
  }
  get state() {
    return this.store.state.emailMonitor;
  }
  get enabled() {
    return this.store.state.settings.emailScanning === true;
  }
  status() {
    return {
      ...this.state,
      enabled: this.enabled,
      dailyRunLimit: DAILY_RUN_LIMIT,
      intervalMinutes: this.store.state.settings.emailScanMinutes || 60,
      window: "08:00–18:00 every day, local time",
      running: Boolean(this.controller),
    };
  }
  problem(message) {
    this.state.error = message;
    const key = "second-chair-monitor:email-checks";
    const old = this.store.state.alerts.find((a) => a.key === key);
    if (!old || old.state === "resolved")
      this.store.ingest({
        schemaVersion: 1,
        producer: "second-chair-monitor",
        checkedAt: this.now().toISOString(),
        status: "error",
        coverage: message,
        alerts: [
          {
            id: "email-checks",
            revision: (old?.revision || 0) + 1,
            title: "Email checks need attention",
            summary: message,
            priority: "attention",
            kind: "observed",
            project: "Second Chair",
            updatedAt: this.now().toISOString(),
            source: { label: "Email monitor" },
          },
        ],
      });
    else {
      old.summary = message;
      this.store.save();
    }
    this.store.tick();
  }
  deadlineReminders() {
    const now = this.now().getTime();
    for (const a of this.store.state.alerts) {
      if (
        !a.emailIdentity ||
        !a.dueAt ||
        !needsYou(a) ||
        a.state === "resolved" ||
        a.state === "snoozed"
      )
        continue;
      const remaining = Date.parse(a.dueAt) - now;
      const stage =
        remaining < 0
          ? "overdue"
          : remaining <= DAY
            ? "due-today"
            : remaining <= 3 * DAY
              ? "due-soon"
              : null;
      const marker = `${a.dueAt}:${stage}`;
      if (!stage || a.deadlineReminder === marker) continue;
      a.deadlineReminder = marker;
      a.revision++;
      a.state = "new";
      a.priority = remaining < DAY ? "urgent" : "attention";
      a.notifiedRevision = 0;
    }
  }
  async tick({ force = false } = {}) {
    if (
      this.closed ||
      this.controller ||
      !this.enabled ||
      this.store.state.settings.paused
    )
      return;
    const now = this.now(),
      s = this.state;
    if (s.day !== dayKey(now)) {
      s.day = dayKey(now);
      s.runsToday = 0;
    }
    if (!force && (now.getHours() < 8 || now.getHours() >= 18)) {
      s.nextRun = nextWindow(now, 0);
      this.store.save();
      return;
    }
    this.deadlineReminders();
    this.store.tick();
    if (!force && s.nextRun && Date.parse(s.nextRun) > now.getTime()) {
      this.store.save();
      return;
    }
    if (s.runsToday >= DAILY_RUN_LIMIT) {
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(8, 0, 0, 0);
      s.nextRun = tomorrow.toISOString();
      this.problem(
        "Daily email scan limit reached (12 attempts). Checks resume tomorrow at 08:00. Existing findings and deadline reminders are kept.",
      );
      return;
    }
    if (this.busy()) {
      if (!s.lastSuccess || now - Date.parse(s.lastSuccess) > 2 * HOUR)
        this.problem(
          "Email check is delayed while an agent reply is running. It will retry automatically.",
        );
      return;
    }
    this.controller = new AbortController();
    s.running = true;
    s.lastAttempt = now.toISOString();
    s.runsToday++;
    // Reserve the next attempt before contacting Claude: restart cannot reset cadence or budget.
    s.nextRun = nextWindow(
      now,
      this.store.state.settings.emailScanMinutes || 60,
    );
    this.store.save();
    let timeout;
    try {
      const existing = existingObligations(this.store);
      if (existing.length >= 250)
        throw new Error(
          "Email thread context reached 250 recent obligations. Scanning needs a larger-context update; existing findings are kept.",
        );
      // Never advance beyond a partially scanned window; overlap catches delayed delivery.
      const since =
        s.continuation?.since ||
        new Date(
          s.lastSuccess
            ? Date.parse(s.lastSuccess) - DAY
            : now.getTime() - 30 * DAY,
        ).toISOString();
      const until = s.continuation?.until || now.toISOString();
      const controller = this.controller;
      const run = this.scan({
        since,
        until,
        continuation: s.continuation?.coverage,
        existing,
        signal: controller.signal,
        capabilities: await this.getCapabilities(),
        onUsage: (usage) => {
          this.store.state.usage["email:" + s.lastAttempt] = {
            ...usage,
            updatedAt: this.now().toISOString(),
          };
          this.store.save();
        },
      });
      const result = await Promise.race([
        run,
        new Promise((_, reject) => {
          timeout = setTimeout(() => {
            controller.abort();
            reject(
              new Error(
                "Email scan timed out. Check your connection and Claude sign-in.",
              ),
            );
          }, this.timeoutMs);
        }),
      ]);
      if (this.closed || controller.signal.aborted)
        throw new Error("Email scan interrupted. It will retry when enabled.");
      applyEmailResult(this.store, result, now.toISOString());
      s.coverage = result.coverage;
      if (!result.complete) {
        s.continuation = { since, until, coverage: result.coverage };
        throw new Error(`Email coverage is partial: ${result.coverage}`);
      }
      s.lastSuccess = until;
      s.continuation = null;
      s.failures = 0;
      s.error = null;
      const issue = this.store.state.alerts.find(
        (a) => a.key === "second-chair-monitor:email-checks",
      );
      if (issue) this.store.action(issue.key, "resolve");
      this.deadlineReminders();
    } catch (error) {
      if (
        this.controller?.signal.aborted &&
        (this.closed || !this.enabled || this.store.state.settings.paused)
      ) {
        s.nextRun = this.now().toISOString();
        s.error = this.closed
          ? "Email check interrupted by shutdown. It will retry when due."
          : null;
        return;
      }
      s.failures++;
      const retry = [5, 15, 60][Math.min(s.failures - 1, 2)];
      s.nextRun = nextWindow(this.now(), retry);
      this.problem(error.message);
    } finally {
      clearTimeout(timeout);
      this.controller = null;
      s.running = false;
      this.store.save();
      this.store.tick();
    }
  }
  stop() {
    this.controller?.abort();
  }
  close() {
    this.closed = true;
    this.stop();
  }
}
