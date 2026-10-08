---
description: Weekly review — impact recorded, then honest coaching on where you're going
---

# Review

End of week. Two halves: what happened, then what it means.

`/chief-of-staff:review [--monthly | --quarterly | --half]`

> Placeholders are roles, not products — see [CONNECTORS.md](../CONNECTORS.md).

## Run

**Half one — the record.** Run [ledger](ledger.md). Work origin only. Get the entry confirmed and
written before doing any interpretation; the coaching reads it.

**Half two — the interpretation.** Load [coaching](../skills/coaching/SKILL.md). **Both origins** —
where the time went is a fact about the whole week, and advice built on the work half alone will
always conclude "work more."

Output inline; write to `reviews/YYYY-Www.md`.

## Weekly output

```
**The week**       — ledger entry, four categories
**Where time went** — actual split vs. goals.md, with numbers
**What that means** — one or two observations, each citing something specific
**Watch**          — anything trending wrong; omit if nothing is
**Two moves**      — two concrete things for next week
```

Two moves. Not five.

## Monthly

`--monthly` reads four weeks. Trend questions: is scope widening or narrowing, is the goal split
converging, which goals still have no evidence behind them.

Also run the memory hygiene pass — `CLAUDE.md` over ~100 lines, stale ignore rules, people files
with old `last-seen-activity` dates.

## Quarterly — the OKR session

`--quarterly` is the goal-setting ritual, not just a longer review. Four parts, in order, because
each one feeds the next.

**1. Close the quarter.** Read `goals.md` against the whole quarter's ledger. Per goal: met, partly,
or not, with citations. No adjectives.

**2. Ask whether it was the right goal.** The part worth the time. Goals set three months ago under
different conditions are often quietly obsolete, and retiring one is usually a better move than
grinding on it. Say which ones you'd now not have set.

**3. Take in what's cascading down.** Ask for the unit and org OKRs for the coming quarter and write
them verbatim into the *Cascaded to me* table. Verbatim matters — the wording is what the user will
be measured against, and paraphrase quietly drops the measurable clause.

Then the question that keeps the two lists honest: **which cascaded objectives are already covered
by the work, and which one is asking for something genuinely new?** Assigned work that was happening
anyway isn't a goal, it's a description.

**4. Set the user's own.** Three at most, in *This quarter*. Each has to name something observable
by a date. At least one should be a goal nobody asked for — that's the one a promotion case is
actually made of.

Rewrite `goals.md`, keeping the previous version alongside it as `goals-YYYY-Qn.md`. The drift
between quarters is a signal worth reading next time.

Output to `reviews/YYYY-Qn-coaching.md`.

## Half-yearly — the formal review cycle

`--half` prepares for a company performance review. It does not submit anything anywhere.

1. Read `memory/context/review-rubric.md` — the competency framework the user is actually scored
   against. If it's missing or still a template, **stop and say so**: a self-assessment written
   against invented categories is worse than none, because it argues for the wrong things
   convincingly.
2. Roll up the full ledger for the period (see [ledger](ledger.md) `--rollup`).
3. **Map evidence to the rubric's own categories, using its own wording.** Not the ledger's four
   headings — the company's. This is the whole point: reviewers score against the rubric in front of
   them, and evidence filed under a heading they aren't looking at reads as missing.
4. Name the empty cells out loud. A rubric row with no evidence behind it is the single most useful
   output of this run, and the only one that's still actionable — six weeks before the cycle there's
   time to go earn it.
5. Draft in the user's voice, to `reviews/<period>-self-assessment.md`. Draft only. The user pastes
   it into the HR system themselves.

Getting the rubric in is a copy-paste job the user does once per framework change. See
*Performance-review systems* in [CONNECTORS.md](../CONNECTORS.md) for why it isn't an integration.

## Tone

Direct, and always with evidence. A coach that only says things are going well isn't one.

But where there's a plausible innocent explanation for something that looks bad, say it. And never
pathologise a thin week — sometimes work is thin.
