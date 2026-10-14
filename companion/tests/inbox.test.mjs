import test from "node:test";
import assert from "node:assert/strict";
import { contentFreshness, selectFindings, PAGE_SIZE } from "../src/inbox.mjs";
const alerts = Array.from({ length: 50 }, (_, i) => ({
  key: `fixture:${i}`,
  title: `Finding ${i}`,
  summary: "Review the specification",
  project: i % 2 ? "Library" : "Upload",
  source: { label: "Design channel" },
  state: i < 30 ? "new" : i < 45 ? "acknowledged" : "resolved",
  priority: i === 0 ? "urgent" : "fyi",
  updatedAt: new Date(Date.UTC(2026, 9, 14, 0, i)).toISOString(),
}));
test("50-item queue filters and sorts deterministically without mutating source data", () => {
  assert.equal(selectFindings(alerts).length, 30);
  assert.equal(selectFindings(alerts, { filter: "read" }).length, 15);
  assert.equal(selectFindings(alerts, { filter: "all" }).length, 50);
  assert.equal(selectFindings(alerts)[0].key, "fixture:29");
  assert.equal(selectFindings(alerts, { sort: "oldest" })[0].key, "fixture:0");
  assert.equal(
    selectFindings(alerts, { sort: "priority" })[0].key,
    "fixture:0",
  );
  assert.equal(
    selectFindings(alerts, { sort: "project" })[0].project,
    "Library",
  );
  assert.equal(selectFindings(alerts, { query: "library DESIGN" }).length, 15);
  assert.equal(selectFindings(alerts, { query: "nonexistent" }).length, 0);
  assert.equal(selectFindings(alerts).slice(PAGE_SIZE).length, 10);
  assert.equal(alerts[0].key, "fixture:0");
});
test("recent connector health never disguises old or absent content reports", () => {
  const now = Date.parse("2026-10-14T14:00:00Z");
  const health = { checkedAt: "2026-10-14T13:59:00Z", status: "ok" };
  assert.equal(
    contentFreshness({ "second-chair-sources": health }, now).latest,
    null,
  );
  const old = { checkedAt: "2026-10-08T12:27:00Z", status: "partial" };
  assert.deepEqual(
    contentFreshness({ "second-chair-sources": health, sweep: old }, now),
    { latest: old, stale: true },
  );
  assert.equal(contentFreshness({ sweep: health }, now).stale, false);
});

test("tracking stays out of attention filters and remains searchable through its history", () => {
  const tracked = {
    ...alerts[0],
    state: "acknowledged",
    thread: {
      status: "waiting",
      events: [{ author: "Alex", text: "Approved the option." }],
    },
    notes: [{ text: "Keep the alternative." }],
  };
  const rows = [tracked, alerts[1]];
  assert.equal(selectFindings(rows).length, 1);
  assert.equal(selectFindings(rows, { filter: "read" }).length, 0);
  assert.equal(
    selectFindings(rows, { filter: "tracking", query: "Alex alternative" })
      .length,
    1,
  );
  assert.equal(selectFindings(rows, { filter: "all" }).length, 2);
});
