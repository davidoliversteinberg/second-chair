# Report contract, version 1

The exact runtime schema is maintained in `companion/server/schema.mjs` in the Second Chair repo.
One UTF-8 JSON file, at most 256 KB, per producer; up to 100 findings. Every field below is required
except `source.url`. Extra fields are rejected.

```json
{
  "schemaVersion": 1,
  "producer": "ambient-sweep",
  "checkedAt": "2026-10-07T12:00:00Z",
  "status": "partial",
  "coverage": "Read 4 watched channels and 2 meeting notes. Calendar unavailable.",
  "alerts": [{
    "id": "upload-limit-decision",
    "revision": 1,
    "title": "The upload limit needs a decision",
    "summary": "The meeting note leaves the limit open.",
    "why": "The limit affects the flow being reviewed tomorrow.",
    "nextStep": "Confirm the limit before the review.",
    "priority": "attention",
    "kind": "observed",
    "project": "Upload experience",
    "updatedAt": "2026-10-07T11:30:00Z",
    "source": { "label": "Design review notes · Oct 7, 11:30" }
  }]
}
```

The example uses `partial` because calendar was in scope but unavailable.
Set coverage from what actually ran; never copy sample coverage.

- `producer`: 1–80 ASCII letters, digits, `.`, `_`, `-`; not `__proto__`, `prototype`, `constructor`.
- `checkedAt`, `updatedAt`: ISO 8601 with timezone. `checkedAt` cannot be >5 minutes in the future.
- `status`: `ok`, `partial`, `error`. Empty alerts are valid for a quiet or failed run.
- `coverage`: 1–1,000 characters, naming what was read and what was missing.
- `id`: 1–120 ASCII letters, digits, `.`, `_`, `:`, `-`; unique within this report.
- `revision`: a positive integer. Stable across unchanged runs.
- `title`: 1–160 characters; `summary`: 1–4,000; `why` and `nextStep`: 1–1,000 each.
- `project`: 1–100 characters; `source.label`: 1–200; optional `source.url`: HTTPS only.
- `priority`: `urgent`, `attention`, `fyi`. The first two may notify; quiet hours apply to both.
- `kind`: `observed`, `inferred`, `recommended`. Put the basis of an inference in its summary.

Absence from a later report does **not** resolve an existing finding. Keep it active until the user
resolves it or a changed revision explains what happened. Do not manufacture revision changes merely
to remind someone. The app's one-hour snooze handles reminders.
