# Changelog

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
