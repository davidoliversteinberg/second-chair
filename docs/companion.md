# Second Chair companion 0.3.1 — developer preview

The companion gives the skill somewhere visible to deliver its work: a quiet Mac menu-bar window,
an alert inbox, and a local chat desk. You can try it with sample data before connecting anything.

## Packaged Mac app

Releases publish one ZIP per CPU: **arm64** for Apple silicon and **x64** for Intel. Each contains
**Second Chair.app** with its runtime and the matching bundled Claude binary. The 0.3.1 preview download is Apple silicon/arm64; the older 0.3.0 download is Intel/x64.
[Download Second Chair 0.3.1](https://github.com/davidoliversteinberg/second-chair/releases/tag/v0.3.1).

- **Menu-bar icon.** Drag the app to Applications and open it once. A packaged build then registers
  itself to open at login, so the green **O** is always there. Turn it off from the icon's right-click
  menu; the app will not turn it back on. If startup fails (for example a damaged data file), the
  icon stays and shows **!** with the reason, instead of disappearing.
- **Busy port.** The browser desk prefers port 4318 (also the OpenTelemetry default). If another
  program has it, the app picks a free port; use **Open your desk in browser** from the icon's menu.
- **No account or API key to set up.** Chat uses the Claude sign-in already on the Mac; reports and
  notifications work without it.
- **Developer preview.** The download is signed ad hoc, without Developer ID or notarization. macOS
  or managed-device policy may block it. Where your device policy permits, macOS offers **Open Anyway**
  in **System Settings → Privacy & Security**. Company-wide rollout needs
  a Developer ID signed, notarized build; see [Company rollout](#company-rollout).

### Company rollout

Set repository secrets `MAC_CERT_P12`, `MAC_CERT_PASSWORD`, `APPLE_API_KEY_P8_PATH`,
`APPLE_API_KEY_ID`, and `APPLE_API_ISSUER` (a Developer ID Application certificate and an App Store
Connect API key from your organization's Apple Developer account). Running the **Companion checks**
workflow with *Build Mac packages* then produces signed, notarized arm64 and x64 ZIPs, each
smoke-tested (`npm run smoke:mac`). The signed path is untested until those credentials exist.
Distribute through your device-management tool; set `SECOND_CHAIR_NO_LOGIN_ITEM=1` if IT manages login
items itself. Updates are manual until an updater is added.

For source builds or report/chat setup, follow the sections below.

## Try it from source

Requires Node.js 22 or newer and npm. The browser desk works without Electron; native notifications
and the tray require the desktop app. Mac is the packaging target in this preview.

```bash
git clone https://github.com/davidoliversteinberg/second-chair.git
cd second-chair
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
Click the green **O** in the menu bar to show/hide the window. **Drag the small grip at the very top or the
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

Chat runs on **your own Claude sign-in** (the company SSO login already on your Mac), so there is
no API key and nothing to set up. If you can use Claude on this Mac, chat turns on within a minute of
the app starting. It can read the sources your Claude has connected (mail, calendar, Teams, files,
Jira, Confluence, Figma, Coda), **read-only**, and says which source each answer came from. Under
**More options → Source health** you can see which connectors it found and whether each is signed in.
If one needs you to sign in again, the app notifies you once; reconnect it in Claude → Settings →
Connectors. A source whose connector declares no read-only tools stays off.

Developers can still use an API key instead, supplied in the environment when starting the process:

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

The menu-bar app stays running after its window closes. A packaged build enables **Start at login**
on its first run, unless disabled by environment policy. Right-click the tray to turn it off; later
launches preserve that choice. A sleeping or shut-down Mac cannot check or notify; when it wakes,
checks resume. Bookmark the local desk if useful. If the preferred port is occupied at launch,
open the desk from the app to obtain its current address.

## Build a Mac app

```bash
npm run package:mac
```

This produces `companion/release/Second-Chair-0.3.1-<arch>.zip`, containing **Second Chair.app**.
Build on the matching architecture; the SDK's native executable must match it. The included workflow
also supports manual Mac builds. This is an **ad hoc signed, unnotarized developer preview**.
Managed devices may block it. Developer ID signing, notarization, auto-update, and a tested
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
3. Chat needs nothing extra: it uses the Claude sign-in already on the machine. If Claude is not
   signed in, chat stays off and says so.
4. Choose notification preferences and review the default **Start at login** setting.

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

The app icon, menu-bar icon, header, chat avatars, and favicon use the official Optimizely O from the public website. The original SVG is bundled locally; no logo is fetched at runtime. See [asset provenance](../companion/NOTICE.md). After updating, quit and reopen the app to refresh its menu-bar icon; a Mac restart is normally unnecessary.

The companion follows the [frontend-designer skill](https://github.com/davidoliversteinberg/frontend-designer/blob/main/skills/frontend-designer/SKILL.md) and the current [Optimizely website](https://www.optimizely.com/): forest green, lime accents, Die Grotesk body text, VC Nudge product headings, and Henrietta display type in the expanded desk. Axiom supplies the controls and their interaction states. Bright green is used for primary actions; tabs and filters remain neutral. This is a community companion, not an official Optimizely product.

Versions: `@optiaxiom/react` 3.4.0, `@optiaxiom/globals` 3.0.7, `@optiaxiom/icons` 1.10.0. See the [design verification record](../companion/design-qa.md) for evidence and limitations.

## Desk recovery, chat history, and action links (0.3.1)

**Open your desk** now asks the native app to check its own local server before opening the browser.
An unavailable server or browser-launch failure produces an error and a copyable address. The
address follows the running port, so an old bookmark can be wrong if 4318 was occupied at launch.
A browser page cannot start a Mac app that has quit. Open the O app, then open the desk again.
The browser retries its connection and refreshes the write token after a server restart. On wake,
the native app immediately checks the report folder and connector status. Sleep suspends checks;
this is not a cloud service. Normal-mode chats, findings, and settings persist on this Mac.

**History** beside the chat title opens a searchable drawer. It is also in More options. Select a
chat to resume it, or use New chat; saved conversations are retained. Unsent drafts are retained
while switching during the current app session (they are not persisted across app restarts).

A finding can now supply `action.label`, an optional verified `action.url`, and numbered
`action.steps`, separate from the original `source` evidence. The button names the destination,
such as Open artifact or Open ticket. If the direct link is absent, Plan next steps asks the agent
to verify the workflow and locate it. The UI does not invent sharing controls or destinations.
Mark done only clears the local finding; it never grants access or changes an external item.
Existing reports still load, but need a newly verified revision to gain steps and an action link.

## Checking cadence and model usage

Open **More options → Usage and cadence**.

| Activity | Cadence | Model tokens |
| --- | --- | --- |
| Local report-folder import | Every 30 seconds while running; also at startup and wake | None |
| Local browser connection check | Every 30 seconds and on reconnect/return to the page | None |
| Claude connector availability | Every 15 minutes, startup, wake, or Check connections now | No model prompt |
| Read and analyze company content | When you send a chat, or a separately configured producer runs | Depends on context, tools, reply, and cache |

This app does not schedule content sweeps. Producer schedules must be inspected in the runtime
that owns them. A folder timestamp is not evidence of a fresh Teams or Outlook search.
The usage screen stores the SDK's cumulative per-model session totals and replaces each session's
previous total when another result arrives. It includes input, output, cache read/write tokens,
and estimated USD. It does not sum resumed session totals twice. A resumed older session may
report its earlier turns too. Other apps and external report producers are excluded. Missing or
interrupted reports of usage remain incomplete, not zero. USD figures are estimates, not invoices
or subscription charges. Existing runs made before measurement cannot be reconstructed here.
Company-login requests retain the existing 12-turn / $1.50 estimated budget limits; isolated API
requests retain the 1-turn / $0.50 limits. These are request bounds, not expected per-message costs
or guarantees about your account's billing. No new background AI spending is enabled by this update.

### Updated screens

Synthetic data only; no company communication is included in these screenshots.

![Searchable chat history](screenshots/history.png)

![Usage and checking cadence](screenshots/usage.png)
