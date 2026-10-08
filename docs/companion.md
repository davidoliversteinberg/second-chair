# Second Chair companion 0.3 — developer preview

The companion gives the skill somewhere visible to deliver its work: a quiet Mac menu-bar window,
an alert inbox, and a local chat desk. You can try it with sample data before connecting anything.

## Try it from source

Requires Node.js 22 or newer and npm. The browser desk works without Electron; native notifications
and the tray require the desktop app. Mac is the packaging target in this preview.

```bash
git clone https://github.com/davidoliversteinberg/second-chair.git
cd second-chair
# Until the preview PR is merged, use its implementation branch:
git switch codex/local-companion-v0.3
cd companion
npm ci
npm run build
npm run demo
```

Open **http://127.0.0.1:4318**. Sample mode creates an isolated temporary data folder each launch,
uses fictional reports and scripted chat replies, and makes no AI calls. It is labeled throughout.
The reference mockup's claim of a connected agent is deliberately replaced by an honest sample state.

To try the tray, stop the browser server with Ctrl+C first (they share port 4318):

```bash
npm run assets
npm run desktop:demo
```

If npm disabled Electron's install script, run `node node_modules/electron/install.js` once.
Click the menu-bar icon to show/hide the window. **Drag the small grip at the very top or the
Second Chair title area to move it.** The app saves the position and size, including across restarts
in normal mode. Sample mode starts with a fresh temporary profile each launch.
Right-click the menu-bar icon for **Move window back to menu bar**, the browser desk, and Quit.
If a monitor is disconnected, the window is fitted inside an available display the next time it
opens. Closing the window leaves the app running.

## Use your own reports

Start the real app instead of sample mode:

```bash
npm run desktop
# Or run only the local browser server:
npm start
```

Open **More options → Source health** and copy its **Report folder** path. In your existing private
Second Chair workspace, run `/chief-of-staff:companion` and provide that path. The command records
the destination in PROFILE.md. Subsequent ambient sweeps publish their cited findings there when
they have filesystem access. For previously created routines, update the saved prompt to load
`companion-notify` after the sweep, including on quiet or partial runs. Updating the plugin alone
does not rewrite already saved schedules.

**There are two processes:** the producer reads your permitted sources; the companion delivers
its reports. A cloud routine that cannot access your Mac cannot write to this inbox. Installing
the companion does not create a Teams connection, replace the producer's schedule, scrape Teams,
or bypass tenant controls. Start with reports from a source you already use, or the sample below.

To test report delivery without connecting a source, copy the [synthetic example](example-report.json)
into the displayed inbox. It is not live company evidence. The companion imports it on the next
30-second check, or immediately with **Check folder now**. Existing unresolved findings import too;
they may produce one batch notification outside quiet hours.

To publish from a script or another local agent, use the portable bridge:

```bash
python3 chief-of-staff/skills/companion-notify/scripts/publish_report.py \
  /absolute/private/workspace/report.json \
  --inbox /absolute/path/from/source-health
```

Run that command from the repository root, or use the full helper path from an installed plugin.
It writes `<producer>.json` atomically. Full field validation occurs in the app. See the
[report contract](../chief-of-staff/skills/companion-notify/references/report.md).

## Chat with Claude

Chat uses the **official Claude Agent SDK** to start and resume Second Chair's own sessions.
Supply your own Anthropic API key in the environment when starting the process:

```bash
export ANTHROPIC_API_KEY='your-key-here'
npm run desktop
```

Use your usual secure secret-injection method for real keys; do not commit them. There is no key
entry box or credential persistence in this preview. A Finder-launched app or login item normally
does not inherit a terminal's environment, so its chat may be unconfigured even when terminal launch
works. Report monitoring remains available. A packaged app can be launched from a configured terminal
with `"/Applications/Second Chair.app/Contents/MacOS/Second Chair"`.

The status **Configured** means a key is present, not that authentication has been verified. A failed
request shows an error; it does not fall back to fake replies. Live API billing is separate from
a Claude subscription. No existing Desktop/Cowork session, login, private database, or connector is
read or reused. We do not offer claude.ai sign-in for this third-party application.

You can ask about unresolved reports, continue recent conversations, and attach a `.md` or `.txt`
file up to 30 KB. Only the selected file is read. There are no file-search, shell, browsing, sending,
or editing tools in companion chat. It can reason and draft; it cannot update your tasks or act in
other apps. Each turn has a $0.50 SDK budget and a two-minute timeout. The budget is an SDK control,
not an independent billing guarantee. Only one reply runs at a time. Stop cancels an in-flight reply.

The on-screen error and any partial response are retained if a turn fails. If the app exits mid-turn,
the next launch reports that interruption and lets you continue. Resuming a session includes prior
conversation context, even if a report has since been resolved.

## Alerts and attention

- **Got it:** mark a finding seen. It remains on your radar.
- **Resolve:** remove it from the active view; find it under All findings and reopen it if needed.
- **Clock:** snooze for one hour. A returning actionable finding can notify again.
- **Pause:** stop folder checks and notifications; chat still works. Resume to continue checking.
- **Quiet hours:** 20:00–08:00 local time by default. Equal start/end disables them. Afterward,
  pending actionable findings produce one batch notification, not one per missed check.
- **FYI:** visible in the inbox but never sends a desktop notification.
- **New revision:** a material update from a producer reopens the finding. Unchanged IDs/revisions
  retain your decision across repeated imports and restarts.

Native notification text is generic by default. Enable title previews in Preferences if wanted.
Notifications depend on OS settings, Focus mode, and app availability. The browser server keeps the
inbox current but does not send OS notifications; use the menu-bar app for those. Delivery is best
effort, not a critical paging service.

**Source health** separates the last folder poll from each producer's last actual check, shows
partial/error coverage, flags reports older than a day, and reports malformed files. A missing or
invalid report preserves the previous findings and does not claim the source was read successfully.

## Keep it available

The menu-bar app stays running after its window closes. In a packaged Mac app, right-click the tray
and enable **Start at login** if wanted. This setting is off until you choose it. A sleeping or shut
down Mac cannot check or notify; when it wakes, checks resume. Bookmark the local desk if useful.
Only one process can use the configured port at a time.

## Build a Mac app

```bash
npm run package:mac
```

This produces `companion/release/Second-Chair-0.3.0-<arch>.zip`, containing **Second Chair.app**.
Build on the matching architecture; the SDK's native executable must match it. The included workflow
also supports manual Mac builds. This is an **unsigned, unnotarized developer preview**, not a signed
consumer installer. Managed devices may block it. Signing, notarization, auto-update, and a tested
Windows/Linux installer are future work. Do not disable company protections to run it.

## Installing for someone else

The packaged app includes its runtime; recipients do **not** need Node.js or npm. Source installs
do need the tools above. The current ZIP is a developer preview, so handing it to a nontechnical
colleague still requires setup:

1. Provide a build matching their Mac (Apple silicon or Intel). Extract it and place **Second
   Chair.app** in Applications, subject to their device’s normal application policy.
2. Open the app and connect a local report producer using **Source health → Report folder** and
   `/chief-of-staff:companion`. The companion can run independently of Claude when it only displays
   reports, but a separate permitted producer must create those reports.
3. Optionally configure an Anthropic API key for chat using the launch method above. There is
   currently no in-app sign-in or key setup.
4. Choose notification preferences and optionally enable **Start at login**.

Before a simple download-and-open rollout, the remaining product work is signed/notarized builds
for both Mac architectures, a first-run report connection guide, secure Keychain-backed chat setup,
and an update mechanism. Windows/Linux installers have not been validated. A browser bookmark
opens the desk only while the local app/server is running.

## Storage, privacy, and removal

| Item | Location |
|---|---|
| Desktop state, alerts, settings, chat history, window placement | Electron's per-user `Second Chair` or development app-data directory; see app logs/OS app data |
| Browser-server state | `~/.second-chair-companion/` |
| Report inbox | `<data directory>/inbox/`, unless configured |
| Claude SDK sessions/config | `<data directory>/claude/` and `agent/` |
| Sample mode | A new `second-chair-…-demo-*` folder under the OS temporary directory |

Set `SECOND_CHAIR_DATA_DIR` and `SECOND_CHAIR_INBOX` to absolute private paths to make browser and
desktop mode share data. `PORT` overrides 4318. Only one process should use a data directory; running
two writers against it is unsupported. Data files are plaintext with restrictive creation modes,
not an encrypted vault. Use a protected user account and disk encryption appropriate to your device.
There is no automatic retention cleanup in this preview; review/remove old data yourself.

Local UI/storage do not mean local AI inference. On a real chat request, the question, selected
attachment, up to 20 unresolved findings within a 24,000-character evidence budget, and up to 20 shortened source summaries are sent to Anthropic; SDK history
retains conversation context. No analytics or company connector is bundled. The UI requests Optimizely brand fonts from `https://www.optimizely.com`; those requests disclose your IP address, but carry no report or chat content and use no referrer. Bundled open-source Roboto fonts provide an offline fallback. No remote scripts or images are loaded. Source links open only when you choose them and confirm the destination.

To remove: turn off Start at login if enabled, quit the app, remove the application, and remove its
data directory if you want to erase local history (including SDK sessions). This does not erase
provider-side records. Remove the Companion section in PROFILE.md and update scheduled prompts to
stop publishing. The original Second Chair skill and its private workspace can remain in place.

## Screenshots and validation

These are browser-rendered captures of the same UI used by the desktop window, with sample data:

![Companion chat](screenshots/chat.jpg)
![For you inbox](screenshots/inbox.jpg)
![Expanded local desk](screenshots/desk.jpg)

The actual native Mac window:

<img src="screenshots/native-window.png" alt="Native Second Chair Mac window with sample data" width="548">

See [architecture and test scope](architecture.md) for what has been verified and what remains
untested. A sample chat screenshot is not evidence of a live Claude connection.

## Optimizely design

The companion follows the [frontend-designer skill](https://github.com/davidoliversteinberg/frontend-designer/blob/main/skills/frontend-designer/SKILL.md) and the current [Optimizely website](https://www.optimizely.com/): forest green, lime accents, Die Grotesk body text, VC Nudge product headings, and Henrietta display type in the expanded desk. Axiom supplies the controls and their interaction states. Bright green is used for primary actions; tabs and filters remain neutral. This is a community companion, not an official Optimizely product.

Versions: `@optiaxiom/react` 3.4.0, `@optiaxiom/globals` 3.0.7, `@optiaxiom/icons` 1.10.0. See the [design verification record](../companion/design-qa.md) for evidence and limitations.
