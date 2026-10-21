import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { Store } from "../server/store.mjs";
import { createTask, updateTask } from "../server/tasks.mjs";
import { localDay, taskGroup } from "../server/task-dates.mjs";
import { startCompanion } from "../server/index.mjs";
function fixture(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "chair-tasks-"));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  let now = new Date(2026, 9, 21, 8, 30);
  const notices = [];
  const options = {
    now: () => now,
    notifyTasks: (counts) => {
      notices.push(counts);
      return true;
    },
  };
  const store = new Store(dir, options);
  return { store, notices, options, setNow: (v) => (now = v) };
}
const add = (store, fields = {}) =>
  createTask(store, {
    requestId: randomUUID(),
    title: "Complete assigned training",
    ...fields,
  });
test("tasks persist, retry idempotently, and link one task to a finding without changing it", (t) => {
  const { store, options } = fixture(t);
  store.state.alerts.push({
    key: "mail:training",
    title: "Training request",
    state: "new",
    revision: 2,
  });
  const task = add(store, {
    findingKey: "mail:training",
    dueDate: "2026-10-23",
  });
  const again = add(store, { findingKey: "mail:training" });
  assert.equal(task.id, again.id);
  assert.equal(store.state.tasks.length, 1);
  updateTask(store, { id: task.id, revision: task.revision, completed: true });
  assert.equal(store.state.alerts[0].state, "new");
  const reopened = new Store(store.directory, options);
  assert.ok(reopened.state.tasks[0].completedAt);
  assert.equal(reopened.state.tasks[0].dueDate, "2026-10-23");
  assert.equal(
    add(reopened, { findingKey: "mail:training" }).completedAt,
    task.completedAt,
  );
  updateTask(reopened, {
    id: task.id,
    revision: task.revision,
    completed: false,
    notes: "Original thread has the details",
  });
  assert.equal(reopened.state.tasks[0].completedAt, null);
  assert.equal(reopened.state.tasks[0].findingKey, "mail:training");
});
test("standalone retries, invalid dates, stale edits and forged links are guarded", (t) => {
  const { store } = fixture(t);
  const requestId = randomUUID();
  const task = add(store, { requestId });
  assert.equal(add(store, { requestId }).id, task.id);
  assert.throws(() => add(store, { dueDate: "2026-02-30" }));
  assert.throws(() => add(store, { findingKey: "missing" }));
  assert.throws(() => add(store, { title: " " }));
  assert.throws(() =>
    updateTask(store, {
      id: task.id,
      revision: task.revision,
      findingKey: "elsewhere",
    }),
  );
  updateTask(store, {
    id: task.id,
    revision: 1,
    title: "New title",
    dueDate: null,
  });
  assert.throws(() =>
    updateTask(store, { id: task.id, revision: 1, title: "Old edit" }),
  );
  assert.equal(task.title, "New title");
});
test("one daily summary includes unfinished, today and overdue; survives restart and skipped days", (t) => {
  const { store, notices, options, setNow } = fixture(t);
  add(store, { dueDate: "2026-10-20" });
  add(store, { dueDate: "2026-10-21" });
  add(store, { dueDate: "2026-10-23" });
  add(store);
  const done = add(store);
  updateTask(store, { id: done.id, revision: 1, completed: true });
  store.tick();
  assert.equal(notices.length, 0);
  setNow(new Date(2026, 9, 21, 9));
  store.tick();
  store.tick();
  assert.deepEqual(notices, [{ open: 4, overdue: 1, today: 1 }]);
  const restarted = new Store(store.directory, options);
  restarted.tick();
  assert.equal(notices.length, 1);
  setNow(new Date(2026, 9, 24, 15));
  restarted.tick();
  assert.equal(notices.length, 2);
  assert.deepEqual(notices[1], { open: 4, overdue: 3, today: 0 });
});
test("quiet hours, notification settings, pause, unsupported delivery and empty queue defer reminders", (t) => {
  const { store, notices, setNow } = fixture(t);
  setNow(new Date(2026, 9, 21, 9));
  store.tick();
  assert.equal(notices.length, 0);
  add(store);
  for (const patch of [
    { paused: true },
    { paused: false, notifications: false },
    { notifications: true, taskReminders: false },
    { taskReminders: true, quietStart: 8, quietEnd: 10 },
  ]) {
    store.settings(patch);
    store.tick();
    assert.equal(notices.length, 0);
  }
  setNow(new Date(2026, 9, 21, 10));
  const notify = store.notifyTasks;
  store.notifyTasks = () => false;
  store.tick();
  assert.equal(store.state.taskReminderDay, undefined);
  store.notifyTasks = () => {
    throw new Error("Unavailable");
  };
  store.tick();
  assert.equal(store.state.taskReminderDay, undefined);
  store.notifyTasks = notify;
  store.tick();
  assert.equal(notices.length, 1);
  store.settings({ taskReminderHour: 11 });
  setNow(new Date(2026, 9, 21, 11));
  store.tick();
  assert.equal(notices.length, 1);
});
test("calendar dates use local days over DST boundaries, not UTC offsets", () => {
  assert.equal(localDay(new Date(2026, 10, 1, 23, 30)), "2026-11-01");
  assert.equal(taskGroup({ dueDate: "2026-11-01" }, "2026-11-01"), "Today");
  assert.equal(taskGroup({ dueDate: "2026-11-01" }, "2026-11-02"), "Overdue");
  assert.equal(taskGroup({ dueDate: null }, "2026-11-02"), "No date");
  assert.equal(taskGroup({ completedAt: "yes" }, "2026-11-02"), "Done");
});
test("HTTP task mutations require token, validate payload and persist through API restart", async (t) => {
  const { store } = fixture(t);
  const app = await startCompanion({ port: 0, dataDir: store.directory });
  t.after(() => app.close());
  const state = await (await fetch(app.baseURL + "/api/state")).json();
  const post = (route, value, token = state.token) =>
    fetch(app.baseURL + "/api/tasks/" + route, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Second-Chair-Token": token,
      },
      body: JSON.stringify(value),
    });
  assert.equal(
    (await post("create", { title: "test", requestId: randomUUID() }, "bad"))
      .status,
    403,
  );
  const created = await (
    await post("create", {
      title: "Review approval",
      dueDate: "2026-10-22",
      requestId: randomUUID(),
    })
  ).json();
  assert.equal(created.tasks.length, 1);
  assert.ok(created.taskId);
  const response = await post("update", {
    id: created.taskId,
    revision: 1,
    completed: true,
  });
  assert.equal(response.status, 200);
  assert.ok((await response.json()).tasks[0].completedAt);
  assert.ok(new Store(store.directory).state.tasks[0].completedAt);
});
