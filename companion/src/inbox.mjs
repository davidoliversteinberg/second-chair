import { needsYou, threadStatus } from "../server/finding-state.mjs";
export const PAGE_SIZE = 20;
export const sortLabels = {
  newest: "Newest",
  oldest: "Oldest",
  priority: "Priority",
  project: "Project",
};
export function contentFreshness(sources = {}, now = Date.now()) {
  const reports = Object.entries(sources)
    .filter(([name]) => name !== "second-chair-sources")
    .map(([, value]) => value);
  const latest = reports.reduce(
    (found, report) =>
      !found || Date.parse(report.checkedAt) > Date.parse(found.checkedAt)
        ? report
        : found,
    null,
  );
  return {
    latest,
    stale: !latest || now - Date.parse(latest.checkedAt) > 86400000,
  };
}
export function reportDate(value) {
  return value
    ? new Date(value).toLocaleString([], {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      })
    : "Never";
}
export function selectFindings(
  alerts,
  { filter = "unread", query = "", sort = "newest" } = {},
) {
  const words = query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
  const priority = { urgent: 0, attention: 1, fyi: 2 };
  return alerts
    .filter(
      (a) =>
        filter === "all" ||
        (filter === "tracking"
          ? threadStatus(a) === "waiting"
          : needsYou(a) &&
            (filter === "unread"
              ? a.state === "new"
              : a.state === "acknowledged")),
    )
    .filter((a) => {
      const text = [
        a.title,
        a.summary,
        a.why,
        a.nextStep,
        a.project,
        a.source?.label,
        ...(a.action?.steps || []),
        ...(a.thread?.events || []).map(
          (e) => `${e.author} ${e.text} ${e.source?.label || ""}`,
        ),
        ...(a.notes || []).map((e) => e.text),
      ]
        .join(" ")
        .toLocaleLowerCase();
      return words.every((word) => text.includes(word));
    })
    .sort((a, b) => {
      const latest = Date.parse(b.updatedAt) - Date.parse(a.updatedAt);
      return (
        (sort === "priority"
          ? priority[a.priority] - priority[b.priority] || latest
          : sort === "project"
            ? a.project.localeCompare(b.project) || latest
            : sort === "oldest"
              ? -latest
              : latest) || a.key.localeCompare(b.key)
      );
    });
}
