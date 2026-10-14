# Report contract, version 1

The exact runtime schema is maintained in `companion/server/schema.mjs` in the Second Chair repo.
One UTF-8 JSON file, at most 256 KB, per producer; up to 100 findings. Every field below is required
except `source.url`, `why`, `nextStep`, the optional `action` object (since 0.3.1), and
`thread` (since 0.3.4). Older apps require `why`/`nextStep` and reject `thread`. Extra fields are rejected.

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

Absence from a later report does **not** resolve an existing finding. Preserve its prior status until
the user changes it or a newer revision supplies a source-backed status update. Do not manufacture revision changes merely
to remind someone. The app's one-hour snooze handles reminders.

## Action destination and steps (companion 0.3.1+)

Keep `source` as the evidence that raised the finding. Optionally add:

```json
"action": {
  "label": "Open ticket",
  "url": "https://example.com/verified-ticket",
  "steps": ["Review the requested change.", "Choose the correct status in the ticket."]
}
```

Use only a destination URL returned by a source or verified directly. Never manufacture a link
from a title or assume the evidence email is the place to perform the action. `label` is 1–80
characters; `url` is optional HTTPS; `steps` contains 1–8 entries of up to 500 characters each.
Describe the actual verified workflow. If controls or permissions are unknown, state that instead
of inventing an approval or sharing process. The app can open the destination and help plan; it
does not execute those steps. Older companions reject `action`; omit it for those installations.

## Thread status and history (companion 0.3.4+)

Use one stable producer/ID per request, across replies and evidence sources. A user's own answer
is an event on that request, never a new attention finding. For example, a subsequent revision:

```json
"thread": {
  "status": "waiting",
  "events": [{
    "id": "reply-20261014-1012",
    "actor": "self",
    "author": "You",
    "text": "Recommended the template grid and supplied alternatives.",
    "at": "2026-10-14T10:12:00-04:00",
    "source": {"label": "Verified design conversation · Oct 14"}
  }]
}
```

- `status`: `needs-you` for a current ask or outstanding commitment; `waiting` for quiet Tracking;
  `done` for verified closure. A reply is not proof of external completion.
- `events`: 1–50 per report update, unique stable IDs (1–120 letters, digits, `.`, `_`, `:`, `-`).
  Existing events merge by ID; a corrected event replaces that ID, and omitted older events remain.
- `author`: 1–100 characters; `actor`: `self`, `other`, or `update`; `text`: 1–2,000 characters;
  `at`: ISO datetime with timezone; optional `source` uses the same label/HTTPS rules as above.
- Use reported summaries with verified authors/times. Do not fabricate quotations, missing replies,
  or a source link. The UI labels this as reported history, not a complete live transcript.
- Increment revision when adding a material reply. Waiting/done revisions do not notify or enter
  Unread/Read. Only an explicit `needs-you` revision re-escalates a previously tracked thread.
  Legacy updates without `thread` preserve its existing tracking status and history.
- Local notes and local status changes are stored separately; producer updates cannot erase notes.
  An explicit source status on a newer revision supersedes a local status choice.
- `why`/`nextStep` are optional in 0.3.4. Omit advice for handled replies. The UI shows verified steps
  only on actionable threads; it does not display a generic “Why it matters” section.

Classify from the latest accessible evidence. Do not guess `waiting` when replies are unavailable.
Keep an actual promise of future work as `needs-you`. A neutral topic title remains useful in
Tracking. The next genuine ask should update this same finding, not duplicate it.
