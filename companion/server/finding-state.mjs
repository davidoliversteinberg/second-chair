// Shared by report ingestion, notification delivery, and the inbox.
export function threadStatus(alert) {
  if (alert.state === "resolved") return "done";
  return alert.localThreadStatus || alert.thread?.status || "needs-you";
}
export function needsYou(alert) {
  return threadStatus(alert) === "needs-you";
}
export const threadStatusLabels = {
  "needs-you": "Needs me",
  waiting: "Tracking",
  done: "Done",
};
