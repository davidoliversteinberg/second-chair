# Prototype Instructions

Run the local server yourself and open the preview in the browser available to this environment. Do not give the user server-start instructions when you can run it.

Before making substantial visual changes, use the Product Design plugin's `get-context` skill when the visual source is unclear or no longer matches the current goal. When the user gives durable prototype-specific design feedback, preferences, or decisions, record them in `AGENTS.md`.

When implementing from a selected generated mock, treat that image as the source of truth for layout, component anatomy, density, spacing, color, typography, visible content, and hierarchy.

Build app UI in `src/`. Keep `.openai/hosting.json`, `worker/index.js`, `scripts/prepare-sites-build.mjs`, and `tests/sites-worker.test.mjs` intact so the same local prototype can be handed to Sites. Before a Sites handoff, run `npm run build` and `npm run test:sites`; the build must leave `dist/client/index.html`, `dist/server/index.js`, and `dist/.openai/hosting.json`.

## Approved product direction

The user explicitly requested the `frontend-designer` skill and a visual identity matching Optimizely.com. Preserve the compact tray companion, Chat / For you model, and optional expanded desk. Use verified Axiom controls and semantic tokens, Die Grotesk body text, VC Nudge product headings, and the live site's forest/lime palette; the expanded desk may use Henrietta display type. This direction supersedes the original mock's gray background and serif wordmark. Keep sample and unconfigured states truthful. Do not turn local report monitoring into a claim of direct Teams access.

Use the official Optimizely “O” for the app icon, Mac menu-bar icon, header, chat avatars, and
favicon. The source `src/assets/optimizely-o.svg` is the unchanged public asset from
`https://www.optimizely.com/favicon/favicon.svg`; build all raster sizes from it. Keep the two-color
menu-bar icon non-template so macOS does not flatten the filled center into a solid silhouette.
The originally supplied Figma node (`tTfVt7im2cBdVBmnorJ1rl`, `7832:27523`) remains inaccessible to
the connected guest account; do not describe the public asset as a Figma export or a verified node
match. Keep the top window area draggable and preserve the user’s chosen window placement.

## Approved next product direction

Keep the current look and Chat / For you layout. Chat should primarily dispatch work to the user's
local Claude Code agents and receive their results, progress, and blockers. The user selected local
Claude Code before Cowork or Codex. Use the company's approved Claude environment and approved
connectors; installing an unrelated plugin or signing into a Microsoft desktop app does not grant
this companion access. Agent dispatch and shared teammate notifications are future work, not part
of the 0.3 runtime. See `../docs/agent-workflow.md` for the proposed next increment.

## October 8 feedback

Preserve the accepted design. Make saved chat navigation a labeled, searchable drawer. Findings
need a short verified procedure and a direct action destination separate from evidence links.
Use truthful verbs: opening an item is not completing work; Mark done changes local state only.
Expose actual checking cadence and reported usage. Native desk opening must report failure and
use the running instance's port; browser reconnection must refresh its mutation token.

## October 14 inbox feedback

For you is a triage queue, with Unread as the starting view, Read and All filters, local search,
Newest/Oldest/Priority/Project sorting, and 20 findings per page. Opening a new finding marks it
read; read remains actionable and separate from done. Quiet read titles and priority colors.
Keep counts explicit, preserve navigation state, and guard bulk read against newer revisions.
Show actual content-report dates separately from folder polling and connector checks. Never
imply autonomous source scans exist until a producer and its schedule are actually configured.

## October 14 compact inbox correction

Prioritize findings over chrome, inspired by Slack's scanning density. Remove the duplicate unread
heading and large content-report card. Use a compact brand header, fixed search/filter controls,
and a scrolling list of short previews. Keep read rows quiet and all actions keyboard accessible.
Source health belongs in the footer/menu; keep the absence of automatic scans explicit. Preserve
Optimizely branding, existing chat, and full finding details.

## October 14 answered-request correction

A user's own reply is history on the original request, not a fresh task or a reason to explain
their motivation. Use explicit source-backed thread status: needs-you, waiting, or done. Keep
waiting items in Tracking, out of unread/read attention queues and notifications. Preserve source
updates, private notes, and linked Second Chair chat in one thread. Hide advice/steps for waiting
or completed threads. Never infer that a reply completes an external task or that teammate
messages can be sent from the private thread. Re-escalate only on a genuinely new ask, blocker,
or relevant deadline supplied by a producer, or the user's explicit status change.
