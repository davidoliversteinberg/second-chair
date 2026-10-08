---
description: Who else is working on your surfaces, and who's going stale
---

# Radar

Collision detection plus relationship freshness. Weekly.

`/chief-of-staff:radar [--surface "<name>"]`

`--surface` narrows to one thing you own — useful before a specific meeting.

> Placeholders like `~~directory` are roles, not products — see [CONNECTORS.md](../CONNECTORS.md).

## Run

1. Load [source-adapter](../skills/source-adapter/SKILL.md). **Filter to `work` origin before the
   first tool call** — this produces suggestions about colleagues.
2. Load [collaboration-radar](../skills/collaboration-radar/SKILL.md) and follow it.
3. Output inline; write to `reviews/radar-YYYY-MM-DD.md`.

## Output

Two parts:

**Overlaps** — at most four, ranked, each with evidence, last-contact date, and one concrete
suggestion.

**Going stale** — people you have a live dependency on and haven't spoken to. Only with a real
dependency; "haven't talked in a while" alone isn't actionable.

"No new overlaps this week" is a legitimate and common result. Say it in one line and stop.

## Drafts

If the user wants to act on a suggestion, draft the invite or message — short, in their voice, with
the actual reason stated rather than "syncing."

**Never send it.** Leave it for them. An assistant that books time with colleagues on an inferred
topic overlap will eventually be wrong in front of someone who matters.

## No directory connector

Fall back to people visible on the calendar and in threads. Narrower, still useful. Say which mode
you're in at the top so the user knows the coverage.

## After

Update `last-seen-activity` for observed activity and `last-direct-interaction` only for cited direct
exchanges with the user, whether or not
they made the report. That's what keeps the freshness half honest.
