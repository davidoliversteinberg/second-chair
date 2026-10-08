---
description: Connect local sweep reports to the Second Chair companion, or check its setup
---

# Companion

`/chief-of-staff:companion [status]`

Load [companion-notify](../skills/companion-notify/SKILL.md).

For setup, explain that the companion is a separate optional app. Link to the
[installation guide](https://github.com/davidoliversteinberg/second-chair/blob/main/docs/companion.md).
It watches local reports and offers its own chats; it does not grant new connector access.

If the user wants to connect it, get the **Report folder** shown in the app's Source health view.
Record the absolute path under `## Companion` in the private workspace's `PROFILE.md`:

```markdown
## Companion
- enabled: true
- inbox: /absolute/path/shown/by/the/app
```

Check that this host can write that folder. A cloud routine without access to the local filesystem
cannot deliver here; report that limit instead of suggesting it is connected. Never use this public
repository as the inbox. Do not install login items, create schedules, change account access, or
enable external sending merely by configuring the report folder.

For `status`, read the configuration and last local report if available. Name the last producer scan
time, its coverage, and any gaps. A running UI or a recent folder poll is not evidence that company
sources have been read recently.
