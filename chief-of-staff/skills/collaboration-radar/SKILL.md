---
name: collaboration-radar
description: Finds people working on the same surfaces as you and suggests when to talk, plus tracks how stale your important relationships are getting. Reads work sources only. Reference this for the weekly radar, when the user asks who else is working on something, who they should talk to, or whether their work overlaps with someone else's.
---

# Collaboration Radar

Collision detection. Two people solving the same problem in different rooms is the most expensive
failure mode in a large design org, and it's invisible from inside either room.

**Reads `work` origin only.** Filter the source list before the first tool call — this skill
produces suggestions about colleagues, and personal data must never reach it.

Load [source-adapter](../source-adapter/SKILL.md) first.

## Inputs

- **Your surfaces** — the `surfaces` lists in `memory/projects/`, plus *Surfaces I own* in
  `PROFILE.md`. If this is empty the radar can't work; say so and offer to fill it in.
- **The people** — `~~directory` org tree, scoped to your org and adjacent ones. Without a directory
  connector, fall back to people who appear on your calendar or in your threads. Narrower, still
  useful, and say which mode you're in.
- **Their activity** — for each person, whatever is visible: meeting titles you can see, chat in
  shared channels, `~~tracker` issues, `~~design` file activity, `~~code` PRs.

## Visibility

Only read what's normally visible to the user. Shared channels, public tickets, calendar entries the
user can already see, design files they have access to.

Don't attempt to widen access — no reading DMs the user isn't part of, no private channels, no
calendars beyond free/busy plus whatever titles the tenant already exposes. If a source returns
something that looks like it shouldn't be visible, skip it and say so.

The radar's value is in correlation, not in surveillance. It's finding a pattern across things the
user could have seen anyway but wouldn't have connected.

## Method

1. Extract topics per person from their visible activity — nouns and named artifacts, not verbs.
   "design tokens", "empty states", "onboarding flow".
2. Intersect against your surface list. Require a real overlap, not a category match — "design" is
   not an overlap, "the type scale" is.
3. For each hit, gather the evidence: the specific message, ticket or file, with a date.
4. Check recency of contact: last 1:1, last direct exchange, from `memory/people/<slug>.md`.
5. **Suppress anything already scheduled.** If you're meeting them in the next week, drop it.
6. Rank by: *active disagreement* → *duplicated work* → *dependency you haven't flagged* →
   *adjacent work worth knowing about*.

## Output

At most four. This is a list to act on, not a directory.

```
**<Name> — <the shared topic>**
<What they're doing, with the evidence and where you saw it.>
<How it touches what you own.>
Last spoke: <date, or "no direct contact on record">
→ <a concrete, small suggestion>
```

Worked example:

> **Mira Kovač — design tokens**
> They flagged that agent-built UI is hardcoding token values into skill files (Design Sync,
> Aug 20). You own the token scale in design-system-web and are mid-migration.
> Last spoke: Aug 12.
> → Suggest a 25-minute sync before either of you goes further. Want me to draft the invite?

If nothing clears the bar: *"No new overlaps this week."* One line, and stop. A radar that always
finds something is a radar that isn't filtering.

## Never send

Draft, don't send. This skill can write a calendar invite or a message; it does not send one. The
user sends it, after reading it.

That's not a technical limitation, it's the design. An assistant that autonomously books time with
your colleagues on the basis of an inferred topic overlap will be wrong in public, and the cost of
being wrong in public with a colleague is much higher than the cost of one extra click.

Same for the drafts themselves: write them in the user's voice (see the writing-style skill if one
is set up), keep them short, and state the actual reason for the meeting rather than "syncing."

## Stakeholder freshness

Second half of the weekly run. For each person in `memory/people/` who is marked as a dependency on
an active project, compare `last-direct-interaction` against how much you need them:

```
**Going stale**
- **Dan Osei** — you need their sign-off for the density spec (blocking, due Sept 15).
  Last spoke Jul 24, seven weeks ago.
```

Only surface people with an actual live dependency. "You haven't spoken to someone in a while" is
not useful on its own; "you haven't spoken to the person who has to approve the thing that's due in
two weeks" is.

## Feeding memory

Update `last-seen-activity` in `memory/people/` from activity you gathered, whether or not the
person made the report. Update `last-direct-interaction` only for a cited direct exchange with the
user. Unknown dates remain unknown; another person's post does not prove a conversation happened.

New people who show up repeatedly on your surfaces and have no file yet — propose creating one.
