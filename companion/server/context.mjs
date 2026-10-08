export const byAttention = (a, b) =>
  ({ urgent: 0, attention: 1, fyi: 2 })[a.priority] -
    { urgent: 0, attention: 1, fyi: 2 }[b.priority] ||
  Date.parse(b.updatedAt) - Date.parse(a.updatedAt);

// Bound each request's evidence; explicitly tell Claude when it is seeing a subset.
export function chatContext(state) {
  const candidates = state.alerts
    .filter((a) => a.state !== "resolved")
    .sort(byAttention);
  const alerts = [];
  let size = 0;
  for (const alert of candidates) {
    const length = JSON.stringify(alert).length;
    if (alerts.length === 20 || size + length > 24000) continue;
    alerts.push(alert);
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
    alerts,
    sources,
    omittedFindings: candidates.length - alerts.length,
    omittedSources: Object.keys(state.sources).length - sources.length,
    note: "This is a bounded report snapshot, not a complete search of company sources.",
  };
}
