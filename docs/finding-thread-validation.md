# Finding threads — 0.3.4

## Design brief

The decision is whether the user still owes an action. Read/unread alone cannot answer that.
Keep one request with a chronological thread; move already-answered requests to quiet Tracking.
A separate notification for each reply was rejected because it recreates work the user already did.
The user's October 14 screenshot is the correction reference: remove the advice about their own
reply, retain context, and keep the compact Optimizely companion.

Reading order: topic/status, reported conversation, private composer. The history is the dominant
scrolling region; the toolbar and composer remain reachable. Use one green action when there is
a message to send to Second Chair; Save note is secondary. The report's verified action link is
available only when an actual next step exists. No nested cards or separate “Why it matters” block.

Verified Axiom 3.4.0 controls: Button, Heading/Text, Textarea, Menu/Trigger/Content, and
SegmentedControl/Item. Textarea uses its supported native rows/value/change props. Existing dialog,
search, and history contracts are retained. Narrow segmented controls retain their 32px height
and keyboard model; inline padding is reduced so four double-digit filters fit within 343px.

## Acceptance and rendered evidence

- Installed Mac app: the reported template-picker reply now lives under Tracking, has its original
  source links and reported reply timestamp, and contains no Why it matters / What to do / Plan next
  steps sections. Three known handled replies were reclassified locally with backups. The original
  16 findings and two existing chats remain. An outstanding promise remains in attention.
- Sample browser at 548 × 868: topic and source/user reply fit above the private composer.
  Private note and agent question appear in the same chronological thread; the agent conversation
  is available in History with a link back to that finding. No live model call was used.
- Sample browser at 375 × 812: thread text wraps, composer actions remain reachable, and status
  Menu uses its narrow drawer. Needs me, Done, and Tracking were exercised, including keyboard
  selection. Reload retained status, notes, and conversation.
- 50-item inbox: Unread/Read/Tracking/All and two pages were exercised. At 375px the four filters
  end at x342.5 within the x16–359 content area, with no document overflow. At 548 × 868 five
  complete preview rows fit above the footer. Tracking does not add to the attention badge.
- Active sample finding retains numbered Next step and its direct action link. Waiting/done
  threads omit advice. Search, private notes, status, and source history remain distinct from
  posting to teammates.
- Expanded desk at 1440 × 1000 retains its optional composition and shows the same thread.
- Rendered fonts: VC Nudge headings and Die Grotesk B body/composer, verified from computed styles.
  Green remains reserved for primary actions; quiet history uses text and separators.

## Scoped visual review

Using frontend-designer 1.2.0, the changed thread/inbox surfaces score 19/20: interaction model 2,
focal order 2, typography 2, composition 2, restraint 1, action hierarchy 2, surface discipline 2,
Axiom/brand 2, accessibility/operability 2, responsive quality 2. This is a design review judgment,
not a measured quality percentage or an audit of untouched settings screens.

The core scores are supported by the rendered topic → conversation → composer order, 22px heading
with 14px message text and quiet 12px metadata, and a single scrolling history between fixed
controls. Compared with the supplied screenshot, repeated advice is removed and conversation is
the primary content. The remaining restraint tradeoff is that the privacy/sample captions repeat
information visible elsewhere; they clarify that a private agent conversation is not a Teams post.

## Engineering checks and limits

- 39 Node tests pass: existing behavior plus quiet tracking revisions, event deduplication and
  preservation, notes/status persistence, revision guards, protected endpoints, thread chat reuse,
  context ownership, selected resolved-thread evidence, oversized context, and tracking search.
- Two Python report-publisher tests pass. Production Vite/Sites build passes; the existing large
  bundle advisory remains.
- Apple silicon package is ad hoc signed; code signature and native architecture verified.
- These checks do not validate production model answers, all possible producer classifications,
  automatic source sweeps, notarization, or reboot/sleep behavior. No background scanning was added.
- The app consumes explicit thread events/status from reports; it does not reconstruct missing
  conversation history or infer completion from prose. Legacy unclassified reports need a producer
  update. Truncated model context is labeled, and oversized source URLs are omitted, not shortened
  into misleading clickable destinations.

Public images use fictional evidence only. See [screenshot provenance](screenshots/README.md).
