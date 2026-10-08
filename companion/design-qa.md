# Companion design verification — 0.3 preview

## Brief and visual authority

The decision is: what needs my attention, and what is the next useful step? A compact inbox and a
conversation are the two primary views. Source health, history, and notification preferences stay
secondary. The selected companion mock supplied the narrow window, message/evidence hierarchy,
composer, and quiet status footer. The user's subsequent explicit correction was to use the
[frontend-designer skill](https://github.com/davidoliversteinberg/frontend-designer/blob/main/skills/frontend-designer/SKILL.md)
and match [Optimizely.com](https://www.optimizely.com/). This supersedes the mock's gray desktop and
serif wordmark; it is an intentional brand change, not a pixel-identical reproduction.

The live website was inspected on October 7, 2026, including its rendered page, computed type,
font-face URLs, lime `#ABFF44`, and forest `#08251A`. The desk uses its Henrietta display treatment;
the working app uses Axiom's VC Nudge heading and Die Grotesk body families. The decorative distortion
of the marketing hero is not appropriate for a working inbox and is omitted. No Optimizely logo or
claim of official affiliation is included.

First reading stops: conversation/finding → evidence and source → reply/next action. The single
white companion is the task surface. The optional desk introduction is subordinate context. Inbox
items use separators, not nested cards. Secondary and repeated actions remain neutral.

## Component contract

Installed authority: `@optiaxiom/react` 3.4.0, globals 3.0.7, icons 1.10.0; npm lockfile.
No configured Axiom MCP was available. Public documentation was supporting evidence; installed
public declarations and component source were used for the executable API. Internal Material names
are not necessarily public icon exports: the build caught an alias mismatch, which was corrected
before verification. The final build resolves all imports.

| Intent | Verified Axiom anatomy | States/modes checked |
|---|---|---|
| Main navigation | Tabs, TabsList, TabsTrigger, TabsContent | Chat / For you, neutral selection |
| Finding filter | SegmentedControl, SegmentedControlItem | Active / all, resolved item reappears in all |
| Actions | Button `icon`, `iconPosition`; filled leading, outline trailing icons | Enabled, disabled, primary, secondary, icon-only |
| Overflow | Menu options + execute, MenuTrigger + EllipsisMenuButton, MenuContent | Desktop popover and narrow modal; preferences/new chat |
| Composer | Input with supported addonAfter; Axiom attachment/send buttons | Empty, typed, sample reply, unavailable provider |
| Notification choices | Switch with description and onCheckedChange | Label click, keyboard Space, persisted state |
| Quiet hours | Select, SelectTrigger, SelectContent, controlled value | Open list, choose hour, updated value |
| Source confirmation | Dialog, DialogContent/Header/Body/Footer, DialogClose | Destination shown, Escape/cancel, narrow layout |
| Icon hints | Tooltip wrapping Axiom Button | Accessible names retained in native/DOM trees |
| Text | Heading semantic levels/asChild; Text; semantic color tokens | Wrapped titles, 16px chat body, 12px secondary metadata |

The hidden native file input invokes the OS picker; it is not a replacement for an Axiom text
control. Phosphor Intersect is retained only as Second Chair's identity mark. Product backgrounds,
text, borders, and states use Axiom tokens; the external desk backdrop and brand typography are the
user-requested brand treatment. Axiom's switch checked color retains its system semantics.

## Rendered verification

Routes: `/`, `/?desk=1`, native `/?native=1`. Browser preview on port 4318; native sample on 4319;
a temporary instance on 4320 contained one synthetic linked report and no API key.

- Desktop: 1487 × 1058, with a 548 × 868 companion; expanded desk and compact views.
- Native window: 548 × 868 logical pixels (retina capture is 1096 × 1736).
- Narrow: 390 × 844; menu switches to the Axiom modal mode.
- Responsive boundaries: 799/801 and 599/601 pixels wide, at 900px high. Each was rendered and
  inspected. The desk introduction disappears at the first boundary; the panel fills the viewport
  at the second. Main actions remain reachable.
- Enlarged text: native zoom was exercised, then restored. A 274 × 434 CSS viewport additionally
  checks the layout equivalent of a 548 × 868 window at 200% zoom. The composer remained within
  x=16..258 and y=239..287; document scroll width equaled viewport width, 274. This is not a formal
  screen-reader audit or a calibrated OS text-scaling certification.
- Inspected computed font stacks, compared rendered glyphs with the live brand reference, and
  checked browser error/warning output (none observed). Brand font URLs and CORS availability were
  verified; offline uses bundled Roboto-family fallbacks. The browser automation bridge did not
  expose FontFaceSet iteration, so no per-face loading-status report is claimed.
- Exercised detail → resolve → all findings → reopen → acknowledge; acknowledgment kept the item
  active. Tested preferences, quiet-hour selection, keyboard switch operation, recent/new chat,
  sample replies, pause/resume, health view, and source-link confirmation. API tests independently
  exercise real report polling, invalid inputs, local request boundaries, and fake-provider streams.

## Iterations and final evidence

The initial rendered chat cropped the first avatar/message. Removed a paragraph's default margin
and reduced inter-message/header spacing without shrinking body text. Added a short-window layout
for enlarged text, replaced custom menus/dialogs/controls with Axiom anatomy, increased small
metadata, fixed singular labels, and made source-dialog focus return to its initiating control.

Actual app screenshots (synthetic data, not generated UI mockups):

- [Chat](../docs/screenshots/chat.jpg)
- [For you](../docs/screenshots/inbox.jpg)
- [Expanded desk](../docs/screenshots/desk.jpg)
- [Native window](../docs/screenshots/native-window.png)

## Full visual scorecard

| Category | Score | Rendered evidence / tradeoff |
|---|---:|---|
| Interaction fit | 2 | Inbox and chat own distinct tabs; utility views return through Back |
| Focal point / reading order | 2 | One companion panel; title, evidence, composer/next action are successive stops |
| Typography / readability | 2 | Brand heading distinct from 16px chat copy; secondary 12px timestamps; narrow content wraps |
| Composition / balance | 2 | Fixed-width work surface; wider desk balances it with a single supporting introduction |
| Content restraint | 1 | Sample labeling is deliberately repeated in header, agent state, and report footer |
| Action hierarchy | 2 | Lime is limited to main actions and built-in switch semantics; row actions and filters are neutral |
| Surface discipline | 2 | Inbox uses separators; only messages, evidence, and the companion itself have surfaces |
| Axiom / brand fit | 2 | Verified Axiom anatomy plus the inspected Optimizely palette and type |
| Accessibility / operability | 1 | Keyboard/labels/focus and compact layout checked; formal assistive-technology audit remains |
| Browser / responsive | 2 | Browser/native, narrow mode, short height, and both custom breakpoints inspected |

**18/20. Visual scope passes with no observed automatic failure.** This is a judgment of the
inspected preview, not a claim of production readiness or exhaustive accessibility conformance.

## Technical evidence and limits

`npm test`: 14 passing tests. Python publisher tests: 2 passing. Skill metadata validator: passed.
The first GitHub run exposed a workflow ordering error: the packaging test ran before the build. The workflow now builds before testing.
Production build: passed, with a Vite advisory that the main JS bundle exceeds 500 KB. Unsigned x64
Mac ZIP built successfully. `git diff --check`: passed. No target-repository TypeScript/lint/Axiom
checker is configured; the unrelated Axiom Play repository was not changed or used as this app's
build environment.

Live Claude authentication/model calls, real enterprise connectors, native notification appearance,
login after reboot, and sleep/wake delivery were not validated. They are documented separately from
UI/demo behavior. No company data or existing Claude conversations were used for these checks.
