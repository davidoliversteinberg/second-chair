import { needsYou, threadStatus } from "./finding-state.mjs";
export const byAttention = (a, b) =>
  ({ urgent: 0, attention: 1, fyi: 2 })[a.priority] -
    { urgent: 0, attention: 1, fyi: 2 }[b.priority] ||
  Date.parse(b.updatedAt) - Date.parse(a.updatedAt);

// Bound each request's evidence; explicitly tell Claude when it is seeing a subset.
export function chatContext(state, findingKey) {
  const candidates = state.alerts
    .filter(
      (a) => (findingKey && a.key === findingKey) || a.state !== "resolved",
    )
    .sort(
      (a, b) =>
        Number(b.key === findingKey) - Number(a.key === findingKey) ||
        Number(needsYou(b)) - Number(needsYou(a)) ||
        byAttention(a, b),
    );
  const alerts = [];
  let size = 0;
  for (const alert of candidates) {
    // Keep the selected thread present even when its history has grown beyond the budget.
    let bounded = {
      ...alert,
      workflowStatus: threadStatus(alert),
      thread: alert.thread
        ? { ...alert.thread, events: alert.thread.events.slice(-8) }
        : undefined,
      notes: (alert.notes || []).slice(-4),
    };
    let length = JSON.stringify(bounded).length;
    if (findingKey && alert.key === findingKey && length > 24000) {
      // Retain the selected finding even with unusually long URLs or notes.
      const compact = (value, key) =>
        typeof value === "string"
          ? key === "url" && value.length > 600
            ? undefined
            : value.slice(0, 600)
          : Array.isArray(value)
            ? value.map((entry) => compact(entry))
            : value && typeof value === "object"
              ? Object.fromEntries(
                  Object.entries(value).map(([k, v]) => [k, compact(v, k)]),
                )
              : value;
      bounded = compact(bounded);
      bounded.contextTruncated = true;
      length = JSON.stringify(bounded).length;
    }
    if (alerts.length === 20 || size + length > 24000) continue;
    alerts.push(bounded);
    size += length;
  }
  const sources = Object.entries(state.sources)
    .slice(0, 20)
    .map(([producer, s]) => ({
      producer,
      checkedAt: s.checkedAt,
      status: s.status,
      coverage: s.coverage.slice(0, 250),
    }));
  return {
    tasks: (state.tasks || [])
      .filter((t) => !t.completedAt || t.findingKey === findingKey)
      .slice(0, 50)
      .map((t) => ({
        title: t.title,
        dueDate: t.dueDate,
        completedAt: t.completedAt,
        findingKey: t.findingKey,
        notes: t.notes.slice(0, 500),
      })),
    taskNote:
      "Personal tasks are local records, separate from source completion. At most 50 tasks are included; change them in To do, not through chat.",
    alerts,
    findingKey: findingKey || null,
    threadHistoryNote:
      "Thread evidence includes at most 8 reported events and 4 private notes per finding; earlier events may be omitted. A reply does not prove external completion. Tracking means no current ask of the user.",
    sources,
    omittedFindings: candidates.length - alerts.length,
    omittedSources: Object.keys(state.sources).length - sources.length,
    note: "This is a bounded report snapshot, not a complete search of company sources.",
  };
}
