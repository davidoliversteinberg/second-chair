import { randomUUID } from "node:crypto";
import { z } from "zod";
import { localDay, taskCounts } from "./task-dates.mjs";
const fields = {
  title: z.string().trim().min(1).max(240),
  dueDate: z.string().date().nullable(),
  notes: z.string().trim().max(4000),
};
const createSchema = z
  .object({
    title: fields.title.optional(),
    dueDate: fields.dueDate.optional(),
    notes: fields.notes.optional(),
    findingKey: z.string().min(1).max(220).optional(),
    requestId: z.string().uuid(),
  })
  .strict();
const updateSchema = z
  .object({
    id: z.string().uuid(),
    revision: z.number().int().positive(),
    title: fields.title.optional(),
    dueDate: fields.dueDate.optional(),
    notes: fields.notes.optional(),
    completed: z.boolean().optional(),
  })
  .strict();
export function createTask(store, input) {
  const value = createSchema.parse(input);
  const previous = store.state.tasks.find(
    (t) =>
      t.requestId === value.requestId ||
      (value.findingKey && t.findingKey === value.findingKey),
  );
  if (previous) return previous; // Retry, or the same finding imported again: keep one task.
  const finding =
    value.findingKey &&
    store.state.alerts.find((a) => a.key === value.findingKey);
  if (value.findingKey && !finding)
    throw new Error("Finding no longer available");
  const title = value.title || finding?.title;
  if (!title) throw new Error("Give your task a title");
  const at = store.now().toISOString();
  const task = {
    id: randomUUID(),
    requestId: value.requestId,
    revision: 1,
    title,
    dueDate: value.dueDate ?? null,
    notes: value.notes || "",
    findingKey: value.findingKey || null,
    createdAt: at,
    updatedAt: at,
    completedAt: null,
  };
  store.state.tasks.push(task);
  store.save();
  return task;
}
export function updateTask(store, input) {
  const { id, revision, completed, ...patch } = updateSchema.parse(input);
  const task = store.state.tasks.find((t) => t.id === id);
  if (!task) throw new Error("Task not found");
  if (task.revision !== revision)
    throw new Error(
      "This task changed. Close and reopen it to review the latest version.",
    );
  Object.assign(task, patch);
  if (completed !== undefined)
    task.completedAt = completed ? store.now().toISOString() : null;
  task.updatedAt = store.now().toISOString();
  task.revision++;
  store.save();
  return task;
}
export function remindTasks(store, now) {
  const day = localDay(now);
  if (
    !store.state.settings.taskReminders ||
    now.getHours() < store.state.settings.taskReminderHour ||
    store.state.taskReminderDay === day
  )
    return false;
  const counts = taskCounts(store.state.tasks, day);
  if (!counts.open) return false;
  try {
    // No capability in browser mode; a later native launch can still deliver today.
    if (store.notifyTasks(counts, store.state.settings) !== true) return false;
  } catch {
    return false;
  }
  store.state.taskReminderDay = day;
  return true;
}
