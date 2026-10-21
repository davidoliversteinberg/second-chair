# 0.5.0 task validation

Design: a compact queue owns the To do tab. Read task, see date/source, then complete or edit.
Due groups replace dashboard statistics; task details use a focused form. Green is reserved for
New task/Save task. Existing header, fonts, colors, inbox and agent chat remain.

System evidence: installed Axiom React 3.4.0 declarations for Tabs, SegmentedControl, Checkbox,
Input, DateInput, Textarea, Dialog and Button; existing Select/Switch preferences pattern.
No Axiom MCP was available. DateInput uses controlled date-only strings and its built-in calendar.
Task title wrapping uses an owned child span, without targeting generated system classes.

Automated: six task tests cover retry/link deduplication; persistence; completion/reopen;
invalid dates, forged links and stale edits; daily summary/restart/missed days; quiet hours, pause,
notification opt-outs and failed delivery; local dates; protected HTTP mutations.
Full companion suite: 56 passing tests. Reminder time is injected in tests; these are not physical
sleep/reboot or macOS permission-banner tests.

Browser: isolated fictional data, widths 548 and 360 pixels; the editor was also checked at the native minimum 360×560 with Save/Cancel visible. Verified finding→task→original thread,
standalone/date/undated creation, blank-title save prevention, complete/reopen, saved notes,
calendar selection/cancel, search, time change and reminder switch. A 50-task fixture remained searchable; editing and clearing a due date persisted after reload. Corrected title overflow found
at 360px; long titles now wrap. No new console errors or warnings. The current screenshot is
`todo-0.5.0.jpg`, captured at 548×868 with fictional content only.

Visual gate: 18/20. Queue fit 2, focal order 2, typography 2, composition 2, restraint 2, actions 2,
surfaces 2, brand fit 2, accessibility 1, responsive quality 1. Date-group headings lead into full
readable task titles; source/date metadata is subordinate; utility controls stay above and below
the scrollable work area. Narrow rows wrap while keeping checkboxes and editor access visible.
Remaining tradeoffs: completion removes the focused row from the current list, and narrow windows
need scrolling for later groups. No automatic-failure finding remains in the inspected states.
