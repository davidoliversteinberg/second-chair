# Changelog

## 0.3.1 — Reliable desk and clearer next steps

- Replace the silent native desk popup with a narrowly scoped IPC action that checks the local
  service, opens its actual port, and reports failures with a copyable address.
- Reconnect browser state and mutation tokens after server restart; check again on Mac wake.
- Add a labeled, searchable Chat history drawer and a direct New chat control; preserve drafts
  when switching between conversations.
- Separate a finding's evidence from its optional verified action URL and numbered steps. Keep
  external work distinct from locally marking a finding done.
- Show checking cadence and SDK-reported chat token/cache usage and estimated costs. Cumulative
  resumed-session results replace the previous total, avoiding double-counting. Earlier unmeasured
  activity and other apps are not included.

This release also includes the existing local improvements to startup and company-login chat:

- Keep the menu-bar icon present: create it before the server starts, show **!** and the reason if
  startup fails instead of quitting, retry from the menu or by reopening the app.
- Open at login the first time a packaged build runs; an opt-out in the menu is never overridden.
  `SECOND_CHAIR_NO_LOGIN_ITEM=1` lets IT manage login items instead.
- Fall back to a free port when 4318 (the OpenTelemetry default) is already in use.
- Chat runs on the person's own Claude company sign-in with read-only access to their connected
  sources (mail, calendar, Teams, files, Jira, Confluence, Figma, Coda); no API key. Only tools a
  connector marks read-only are usable; all others are hidden from Claude. The existing company-login integration is preserved; this update does not expand connector access.
- Keep sources alive: check connectors every 15 minutes, notify once when a connected source needs
  sign-in, re-dial a failed one, and show why a check failed under Source health.
- Fix the packaged app's chat: the bundled Claude binary was resolved inside app.asar and could not
  start (`spawn ENOTDIR`).
- Make the signed-out state calm: chat is disabled with "Sign in to Claude to turn it on", with no
  red error and no instruction to set an environment variable.
- Apply a valid signature to packaged builds (ad hoc by default). They remain subject to macOS and
  managed-device policy. Add hardened-runtime entitlements and a signed/notarized path
  (`npm run package:mac:signed`, untested until credentials exist).
- Build Apple silicon and Intel packages on matching runners and smoke-test each one
  (`npm run smoke:mac`): signature, CPU of the app and bundled Claude binary, server, window.

## 0.3.0 — Local companion preview

- Use the frontend-designer skill, verified Axiom controls, and Optimizely website branding.
- Use the official Optimizely O in the app/menu-bar icons, header, chat avatars, and favicon.
  Bundle the public source SVG and document its provenance; preserve its colors in the Mac menu bar.
- Add an optional Mac tray app and localhost desk with For you, Chat, and Recent chats.
- Add a visible native drag handle, saved window position/size, and a menu-bar reset action.
  Fit restored windows inside the available display after monitor changes.
- Watch atomic JSON reports every 30 seconds; persist findings, settings, and conversation history.
- Add native notification batching, quiet hours, pause, one-hour snooze, acknowledgment, resolution,
  reopening, and stable revision-based deduplication.
- Add optional official Claude Agent SDK chat, streamed replies, session continuation, text
  attachments, cancellation, errors, and explicit sample mode. No existing Cowork chats are imported.
- Add source-health timestamps, coverage, stale-report warnings, and malformed-report handling.
- Add `/chief-of-staff:companion`, the companion-notify skill, and an atomic report publisher.
- Fix signal filtering so a reaction or a tracked task is not mistaken for completion.
- Separate last observed activity from last direct interaction in stakeholder memory.
- Strengthen sweep instructions around stable IDs, overlapping reads, and successful checkpoints.
- Correct documentation about local storage versus cloud processing, runtime scheduling, and dated
  connector capabilities. Include actual app screenshots and setup/architecture guides.

This is a developer preview. It does not add Teams access, autonomous company-account actions,
signed installers, automatic updates, or a 24/7 cloud runner. Live Claude calls require an API key;
the screenshot/demo path makes no AI calls.

## 0.2.0

Existing chief-of-staff plugin, including shared gathering and the tune command.
