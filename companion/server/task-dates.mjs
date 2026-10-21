// Calendar dates stay local: UTC parsing shifts a due date on some Macs.
export const localDay = (date = new Date()) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
export function taskGroup(task, today = localDay()) {
  if (task.completedAt) return "Done";
  if (!task.dueDate) return "No date";
  return task.dueDate < today
    ? "Overdue"
    : task.dueDate === today
      ? "Today"
      : "Upcoming";
}
export function taskCounts(tasks, today = localDay()) {
  const open = tasks.filter((t) => !t.completedAt);
  return {
    open: open.length,
    overdue: open.filter((t) => t.dueDate && t.dueDate < today).length,
    today: open.filter((t) => t.dueDate === today).length,
  };
}
