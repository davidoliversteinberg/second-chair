const number = (value) => (Number.isFinite(value) && value >= 0 ? value : 0);
// modelUsage is cumulative, including resumed turns. Replace a session's snapshot; never sum
// consecutive results from that session. These are SDK estimates, not account billing.
export function reportedUsage(result) {
  if (!result.modelUsage || !Object.keys(result.modelUsage).length) return null;
  const totals = {
    input: 0,
    output: 0,
    cacheRead: 0,
    cacheWrite: 0,
    costUsd: 0,
  };
  for (const model of Object.values(result.modelUsage)) {
    totals.input += number(model.inputTokens);
    totals.output += number(model.outputTokens);
    totals.cacheRead += number(model.cacheReadInputTokens);
    totals.cacheWrite += number(model.cacheCreationInputTokens);
    totals.costUsd += number(model.costUSD);
  }
  // Fatal startup results can carry zeroed counters; do not erase earlier measurements.
  return totals.input + totals.output + totals.cacheRead + totals.cacheWrite > 0 ? totals : null;
}
