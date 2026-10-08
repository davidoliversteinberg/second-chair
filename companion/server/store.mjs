import fs from "node:fs";
import path from "node:path";
import { EventEmitter } from "node:events";
import { reportSchema, settingsSchema } from "./schema.mjs";

export function inQuietHours(settings, date) {
  const { quietStart: start, quietEnd: end } = settings;
  const hour = date.getHours();
  return start === end
    ? false
    : start < end
      ? hour >= start && hour < end
      : hour >= start || hour < end;
}

export class Store extends EventEmitter {
  constructor(
    directory,
    { now = () => new Date(), notify = () => {}, demo = false } = {},
  ) {
    super();
    this.directory = directory;
    this.now = now;
    this.notify = notify;
    this.demo = demo;
    fs.mkdirSync(directory, { recursive: true, mode: 0o700 });
    this.file = path.join(directory, "state.json");
    this.state = {
      version: 1,
      settings: {
        paused: false,
        notifications: true,
        showPreview: false,
        quietStart: 20,
        quietEnd: 8,
      },
      alerts: [],
      sources: {},
      chats: [],
      usage: {},
      lastPoll: null,
      problems: [],
    };
    if (fs.existsSync(this.file)) {
      const saved = JSON.parse(fs.readFileSync(this.file, "utf8"));
      if (
        saved.version !== 1 ||
        !Array.isArray(saved.alerts) ||
        !Array.isArray(saved.chats) ||
        !saved.sources
      )
        throw new Error(
          "Unsupported state file. Preserve it and use a separate data directory.",
        );
      this.state = saved;
    }
    this.state.usage ||= {};
    for (const chat of this.state.chats)
      if (chat.busy) {
        chat.busy = false;
        chat.error =
          "The app stopped during this reply. You can send another message.";
      }
  }
  save() {
    fs.writeFileSync(this.file + ".tmp", JSON.stringify(this.state, null, 2), {
      mode: 0o600,
    });
    fs.renameSync(this.file + ".tmp", this.file);
    this.emit("change");
  }
  settings(patch) {
    Object.assign(this.state.settings, settingsSchema.parse(patch));
    this.save();
  }
  ingest(input) {
    const report = reportSchema.parse(input);
    if (Date.parse(report.checkedAt) > this.now().getTime() + 300000)
      throw new Error("Report time is more than five minutes in the future");
    const previous = this.state.sources[report.producer];
    if (
      previous &&
      Date.parse(previous.checkedAt) > Date.parse(report.checkedAt)
    )
      return;
    this.state.sources[report.producer] = {
      checkedAt: report.checkedAt,
      status: report.status,
      coverage: report.coverage,
    };
    for (const incoming of report.alerts) {
      const key = report.producer + ":" + incoming.id;
      const existing = this.state.alerts.find((a) => a.key === key);
      if (existing && existing.revision >= incoming.revision) continue;
      const alert = {
        ...incoming,
        key,
        producer: report.producer,
        state: "new",
        snoozedUntil: null,
        notifiedRevision: 0,
      };
      if (existing) Object.assign(existing, alert);
      else this.state.alerts.unshift(alert);
    }
    this.save();
  }
  action(key, action) {
    const alert = this.state.alerts.find((a) => a.key === key);
    if (!alert) throw new Error("Alert not found");
    if (!["acknowledge", "resolve", "snooze", "reopen"].includes(action))
      throw new Error("Unknown action");
    alert.state = {
      acknowledge: "acknowledged",
      resolve: "resolved",
      snooze: "snoozed",
      reopen: "new",
    }[action];
    alert.snoozedUntil =
      action === "snooze"
        ? new Date(this.now().getTime() + 3600000).toISOString()
        : null;
    if (action === "snooze") alert.notifiedRevision = 0;
    this.save();
  }
  tick() {
    if (this.state.settings.paused) return;
    const now = this.now();
    let changed = false;
    for (const alert of this.state.alerts) {
      if (
        alert.state === "snoozed" &&
        Date.parse(alert.snoozedUntil) <= now.getTime()
      ) {
        alert.state = "new";
        alert.snoozedUntil = null;
        changed = true;
      }
    }
    const pending = this.state.alerts.filter(
      (a) =>
        a.state === "new" &&
        a.priority !== "fyi" &&
        a.notifiedRevision < a.revision,
    );
    if (
      pending.length &&
      this.state.settings.notifications &&
      !inQuietHours(this.state.settings, now)
    ) {
      // One notification per batch, including after sleep or quiet hours. No replay storm.
      const accepted = this.notify(pending, this.state.settings);
      if (accepted !== false) {
        for (const alert of pending) alert.notifiedRevision = alert.revision;
        changed = true;
      }
    }
    if (changed) this.save();
  }
}

export function scanInbox(store, inbox) {
  if (store.state.settings.paused) return;
  const problems = [];
  try {
    const root = fs.realpathSync(inbox);
    const files = fs
      .readdirSync(root)
      .filter((f) => f.endsWith(".json"))
      .sort();
    if (files.length > 200)
      problems.push(
        "Only the first 200 JSON files were checked. Keep one report per producer.",
      );
    for (const name of files.slice(0, 200)) {
      try {
        const file = path.join(root, name);
        const stat = fs.lstatSync(file);
        if (!stat.isFile() || stat.isSymbolicLink() || stat.size > 256000)
          throw new Error("Use a regular JSON file under 256 KB");
        store.ingest(JSON.parse(fs.readFileSync(file, "utf8")));
      } catch {
        problems.push(
          `${name}: invalid or unreadable report; previous findings kept.`,
        );
      }
    }
  } catch {
    problems.push(
      "The report folder is unavailable. Check its location and permissions.",
    );
  }
  store.state.problems = problems;
  store.state.lastPoll = store.now().toISOString();
  store.save();
  store.tick();
}
