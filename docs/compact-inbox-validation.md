# Compact inbox 0.3.3

## Design brief and acceptance

The inbox is a working queue for 20–50 findings. The user's annotated correction supersedes the
0.3.2 density assessment: remove the repeated unread heading and large content-report card.
Keep the Optimizely O, forest/lime identity, brand typography, and For you / Chat model.
Use fixed utilities and compact rows, with full evidence and action instructions in detail.

| Target | Surface/state | Viewport | Expected result | Evidence |
|---|---|---|---|---|
| Crossed-out blocks | For you | 548 × 868 | Both absent; no duplicate replacement banner | Pixels and DOM |
| Finding density | 50 fictional findings | 548 × 868 | At least five complete short-preview rows; first row above 240px | Painted list bounds and screenshot |
| Fixed utilities | Scrolled list/detail return | Primary | Search/filter/sort remain visible; position restored | Interaction and bounds |
| Narrow layout | Unread/read/search/sort | 375 × 812 | No horizontal overflow or colliding actions | Pixels and bounds |
| Other render modes | Sort popover and Chat | 900 × 1000 | Native Axiom controls and chat retained | Interaction |
| Truthful health | Footer | All | Health remains reachable; scans-off state explicit | Code and rendered health |

Uses existing Axiom 3.4.0 SearchInput, SegmentedControl, Menu, Tooltip and Button composition.
The list is the scroll container; utilities are siblings. Row action placement uses CSS grid,
so wrapping metadata cannot overlap its button. No new AI requests or source permissions.

## Results

At 548 × 868, the list starts at y=224 and ends at y=823. Six complete 99px synthetic
short-preview rows are visible (first row 224–323; sixth 719–818). Longer previews use two lines.
The supplied before screenshot showed roughly one complete finding below the repeated sections.
At 375 × 812, sorting wraps safely, list starts at y=260, and four complete two-line preview rows
fit. No horizontal overflow. The fixed toolbar stays at y=116 while the list scrolls; opening
and returning from detail restored scrollTop=389.5 and page 2 of 3.

Search/empty results/Escape, Read/Unread/All, pointer and keyboard sorting (narrow dialog and wide
popover at 900 × 1000), pagination, opening/reading, and bulk page-read were exercised. Read title
weight is 400 and secondary foreground rgb(72,78,70). Chat composition remained usable at wide
size. All interactions used a separate 50-item fictional dataset; no live findings were changed.
Computed body/header families select Die Grotesk B / VC Nudge. Brand font resources were already
verified during 0.3.2 validation; glyph-level fallback and full screen-reader testing remain unaudited.

The 0.3.2 composition score is superseded by the user's density correction. Scoped frontend-designer
assessment for this version: 19/20 (qualitative judgment). Interaction, focal point, typography,
composition, content restraint, action hierarchy, surface discipline, Axiom/brand, and responsive
quality each 2/2; accessibility 1/2 because no full screen-reader audit was performed. The exact
crossed-out blocks are absent, source health remains reachable, and geometry agrees with screenshots.

Automated verification: 34 Node tests and 2 Python tests pass; production build includes Sites
packaging. Existing bundle-size warning remains. Screenshot: `screenshots/inbox-0.3.3.png`.

The installed arm64 0.3.3 app was restarted and visually checked with existing local data: five
complete two-line previews fit in the native window. All 16 findings and 14 unread states were
preserved. Both app and bundled Claude executable are arm64; deep signature verification passed.
The build remains ad hoc signed and unnotarized.
