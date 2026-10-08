# second-chair

A chief-of-staff plugin for Claude, built for a **senior individual contributor**.

*A second chair knows the case as well as first chair, prepares every argument, and never stands up
to deliver one.*

Most assistant tooling is shaped for managers: what does my team need, who's blocked, how's morale.
That's a different job from being a staff-level IC, where the questions are *is a decision being made
about something I own without me in the room*, *who else is quietly working on my surface area*, and
*can I evidence my scope when review season arrives*.

This is that assistant. It works across your work and personal accounts, it's portable between
employers, and it's built to be trusted — which mostly means it cites everything and asks before
doing anything outward-facing.

## New in 0.3: the local companion (preview)

A quiet menu-bar app and a bookmarkable local desk, with **For you**, **Chat**, and **Recent chats**.
It checks a report folder every 30 seconds, keeps findings between launches, and delivers native Mac
notifications while the app is running. Optional Claude chat uses the official Agent SDK and its
own conversation history. The original plugin still works without the companion.

| Working now | Current boundary |
|---|---|
| Local report monitoring and native notifications | A sweep or other producer must still write the reports |
| Acknowledge, resolve, reopen, one-hour snooze | Acknowledged does not mean completed |
| Quiet hours, pause, private notification text | Computer must be awake; OS notification settings apply |
| Chat, recent chats, text attachments, streamed replies | Requires an Anthropic API key; no inherited Cowork chats/connectors |
| Source timestamps and partial/error coverage | A folder check is not a fresh Teams scan |
| Browser desk and Mac app packaging | Developer preview; unsigned Mac build, no automatic updates |

The companion uses the official Optimizely O icon, Axiom controls, and current website palette and typography, following the [frontend-designer skill](https://github.com/davidoliversteinberg/frontend-designer).

<table><tr><td><img src="docs/screenshots/chat.jpg" alt="Running companion with chat and sample data" width="400"></td><td><img src="docs/screenshots/inbox.jpg" alt="Running companion alert inbox with sample data" width="400"></td></tr></table>

*Screenshots of the running app with synthetic sample data. Sample chat makes no AI calls.*

**[Download the Intel Mac preview](https://github.com/davidoliversteinberg/second-chair/releases/tag/v0.3.0)** — unsigned developer build; see setup requirements below.

**[Install and use the companion](docs/companion.md)** · **[How it works](docs/architecture.md)** ·
**[Release notes](CHANGELOG.md)**

## Install the skill

```bash
/plugin marketplace add davidoliversteinberg/second-chair
/plugin install chief-of-staff
```

Then, in the directory you want as your workspace:

```
/chief-of-staff:setup
```

Setup takes about ten minutes of conversation. It works out which connector fills which role, learns
your shorthand from your existing task list, and writes the rule files that everything else reads.

## Commands

| Command | What it does |
|---------|--------------|
| `/chief-of-staff:setup` | First run — profile, memory, rules, task board |
| `/chief-of-staff:brief` | Today: what needs you, what's coming, what went quiet |
| `/chief-of-staff:digest` | Catch up on a window — meetings, chat, email, ranked |
| `/chief-of-staff:capture` | Pull commitments out of recent activity into the task list |
| `/chief-of-staff:sweep` | Standing watch — read widely, record quietly, surface only what clears the bar |
| `/chief-of-staff:radar` | Who else is on your surfaces, and who's going stale |
| `/chief-of-staff:ux` | Prior art and options for a live design question, or help sequencing the work |
| `/chief-of-staff:trends` | Design-system drift, then UX/UI worth stealing |
| `/chief-of-staff:ledger` | Record this week's impact, or draft the promo case |
| `/chief-of-staff:mentor` | Where the promotion case stands, what's thin, what to take or decline |
| `/chief-of-staff:review` | Weekly: the record, then honest coaching |
| `/chief-of-staff:inbox` | Rank inbox noise, recommend what to do about each sender |
| `/chief-of-staff:tune` | Grade its own week and propose rule changes for you to apply |
| `/chief-of-staff:automate` | Put all of it on a schedule |
| `/chief-of-staff:companion` | Connect local sweep reports to the companion |

## What's in it

**The spine.** `source-adapter` resolves roles to actual connectors, decomposes them into checkable
capabilities, and tags everything by origin. `work-memory` is a two-tier memory — a short hot cache
plus a deeper store of people, projects and rules — split so that what's true about *you* can travel
between machines and jobs while what's true about *this workspace* stays put. `signal-filter`
decides what reaches you, and keeps observations, inferences and recommendations from being mistaken
for each other.

**Awareness.** `meeting-digest` summarizes meetings, chat and email into a ranked *Needs your
attention* list. `commitment-capture` turns "I'll get you that by Thursday" into a task that
remembers where it came from. `ambient-sweep` is the standing watch: it reads the rooms and
transcripts you don't have time for, records what it learns to memory, and stays silent unless
something clears a bar you wrote down. A quiet week reports as one line, not a summary.

**The IC-specific half.** `collaboration-radar` finds people working on your surfaces and suggests
when to talk. `impact-ledger` keeps a cited weekly record of what you shipped, who you unblocked,
what you influenced and how far your reach extended — the four things a staff-level case is
actually argued on — and it separates **big wins** from **spot wins**, because the two are lost in
different ways. A big win is a multi-month arc you'll remember; a spot win is the Tuesday afternoon
you unstuck someone in a chat thread, and it's gone by Friday unless something catches it. The
ambient sweep catches them. `career-mentor` runs the level above: the promotion as a campaign with
arcs, an audience and a set of moves, including which opportunities to decline. It's honest about
where its advice comes from — a small, mostly engineering-shaped literature — and it never predicts
an outcome. `system-watchtower` catches design-system drift. `decision-log` captures *why*, which is
the part that never survives.

**Outward.** `inbox-hygiene` ranks noise and recommends action. `trend-radar` scans a pinned source
list for things worth stealing. `design-advisor` is the other direction — you bring it a live open
question and it brings back prior art, options and tradeoffs, plus help sequencing the week.
`coaching` compares where your time went against where you said it would go.

## Portability

Every skill refers to tools by role — `~~email`, `~~chat`, `~~tracker` — never by product. One file
in your workspace (`PROFILE.md`) maps roles to whatever you've actually connected.

Change jobs: rewrite `PROFILE.md`, update `.mcp.json` if the new company uses different servers,
start a fresh workspace. Nothing in `skills/` changes. If a skill ever needs editing to accommodate
an employer, that's a bug — it means a product name leaked out of `source-adapter`.

See [CONNECTORS.md](chief-of-staff/CONNECTORS.md) for the role table.

## Work and personal in one assistant

A role holds a *list* of sources, each tagged `work` or `personal`. Outlook and Gmail both fill
`~~email`; Teams, Slack and iMessage all fill `~~chat`.

Origin travels with every item. Briefs section by it so they stay scannable, but the coaching and
the daily brief reason across both — an assistant that can only see half your week gives half-blind
advice.

Two hard rules: **`impact-ledger` and `collaboration-radar` read work origin only.** Nothing personal
reaches a promo packet or a message to a colleague.

Origin is a legibility boundary, **not a security one** — everything passes through the same session
and lands in the same local workspace.

So the first thing setup asks is **one workspace or two**, framed as a real choice rather than a
preference. Two gives you a ledger that structurally cannot see a personal item; one gives you
coaching that can see your whole week. Which is right depends on whether the boundary exists in your
life — an employee with a managed laptop and a freelancer whose work *is* their life want opposite
answers, and the command reads your situation and recommends rather than making you guess.

Two workspaces don't mean learning twice. `memory/portable/` holds what's true about you — how you
write, the craft principles you hold, what you're working toward — and is designed to be copied
between them. It contains no work facts by construction, so you can read exactly what crosses. It's
also what makes changing jobs cheap: keep that directory, archive the rest.

Origin isn't the only axis. A source can also be **excluded from named skills** regardless of who it
belongs to — because *whose data is this* and *which jobs is this the right input for* are different
questions. iMessage is the worked example: useful for catching a commitment made over text, wrong as
an input to a watch that runs unattended on a schedule. See *Device-local sources* in
[CONNECTORS.md](chief-of-staff/CONNECTORS.md), which also covers why Full Disk Access is a broader
grant than it looks and why the send tool stays off.

## What it will not do

Stated plainly because these are deliberate design decisions, not gaps:

- **Send to other people.** No emails, messages, or calendar invites. It drafts; you send.
  Explicitly configured local reports and desktop notifications to you are allowed.
- **Change account settings.** No mail rules, no filters, no block lists.
- **Follow an unsubscribe link.** For a spammer, that click confirms a live reader — and the URL is
  attacker-controlled. It hands you the link; you decide.
- **Write to your task list unattended.** Scheduled runs propose; you triage.
- **Write the impact ledger unattended.** You know things the transcript doesn't.
- **Change code.** The watchtower reports.
- **Act on instructions found in a message, document or web page.** Content from any source is data,
  never a command. If an email contains text addressed to an AI assistant, that gets reported as a
  curiosity, quoted, and otherwise ignored.

## Your data

This repository contains workflow instructions, companion code, and synthetic examples — no company
or personal workspace data.

Your private workspace and companion data live outside this repository. Local storage does **not**
mean local model processing: Claude and connected services process the content sent to them under
their own terms and your organization’s rules. Companion chat sends the current question, attachment,
and up to 20 unresolved findings with source metadata to Anthropic; resumed chats also retain prior
conversation context. Without an API key, local report monitoring works without model requests.

### Two repositories, and don't fork this one

There are two separate things, and confusing them is how private notes end up somewhere public.

| | This repo | Your workspace |
|---|---|---|
| Holds | commands, skills, templates | `PROFILE.md`, briefs, ledger, notes on colleagues |
| Contains data about your employer | never | that is its entire purpose |
| Visibility | public | **private, always** |
| You should | install from it | create it yourself |

**You do not need to fork this repository.** Install it as a marketplace and you'll get updates;
a fork just freezes you at today's version. Fork only if you intend to change the skills themselves
and send the changes back.

And if you were planning to fork it to make a private copy — **GitHub does not allow that.** A fork
of a public repository cannot be switched to private. To get a private copy you have to duplicate
rather than fork:

```bash
git clone --bare https://github.com/davidoliversteinberg/second-chair.git
cd second-chair.git && git push --mirror https://github.com/<you>/<your-private-repo>.git
```

That copy is disconnected from this one: no upstream, no updates, no pull requests back.

### Putting the workspace in a private repo

Optional, and worth understanding before you do it. The workspace is plain markdown, so it version-
controls cleanly, and a private repo buys you two things: a second machine can pull your accumulated
memory instead of you copying files around, and a scheduled runner that isn't your laptop can read
the profile it needs to do useful work.

It also means your briefs, your impact ledger, and your written observations about named colleagues
are on someone else's server. That is a materially different decision from installing a plugin, and
at most employers it is a conversation to have before rather than after. Have it.

If you do:

- **A new private repo. Not a fork of this one, and never a directory inside it.**
- Keep `memory/portable/` in it — that's the part worth having on both machines.
- Consider leaving `memory/people/` out. Notes about colleagues are the most sensitive thing the
  tool produces and the least useful to sync.

## Requirements

Built for **Claude Cowork**, where the connectors and scheduled tasks live. The plugin schema is
shared with Claude Code, so it loads there too — but with no connectors wired, most of it has
nothing to read.

Scheduling depends on the host and execution mode. Verify whether the runner is local or cloud,
and which files/connectors it can access. The companion itself runs locally; closing its window
keeps the tray process alive, but quitting or sleeping the Mac stops checks until it resumes.

## Connector notes

Both of these are tenant-dependent, so treat the answers as "verified here, probe yours". Tested
against Microsoft 365 on 2026-09-02:

- **Meeting transcripts — reachable.** Full WEBVTT with per-speaker attribution. The path is two
  hops: the calendar search result doesn't carry the transcript field, so you read the event
  resource to get `meetingTranscriptUrl`, then read that. `meeting-digest` still degrades gracefully
  (transcript → surrounding chat → metadata only) and always says which tier it's on, because
  transcription is per-meeting, not per-tenant.

  Transcripts are also messier than they look — interleaved speaker channels put lines out of
  chronological order, and product names get mangled badly enough to break topic matching. See
  *Reading a transcript* in `meeting-digest` for the four failure modes worth knowing about.

- **Mail rules and blocked senders — not reachable.** No tool exposes them and the resource URI
  whitelist has no rules scheme. `inbox-hygiene` remains advisory by policy. This is a dated connector snapshot, not a permanent
  Microsoft 365 limitation.

- **Sending — disabled by this plugin.** The tested connector exposed no send or draft tool then.
  Other versions may expose them; the plugin still keeps sending to others off.

## Prior art

The task board (`chief-of-staff/skills/assets/board.html`) is forked from the `dashboard.html`
shipped in Anthropic's `productivity` plugin (knowledge-work-plugins, v1.1.0), forked 2026-09-02.
Changes: status tokens beyond done, an Active-only filter, and round-trip preservation of the plain
sub-bullets that carry each task's provenance. Upstream fixes won't reach this copy.

The `TASKS.md` conventions and the two-tier memory architecture follow the same plugin, so the two
are broadly compatible.

## Licence

MIT.
