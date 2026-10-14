# Inbox 0.3.2 validation

The October 14 queue keeps the accepted Optimizely O, typography, forest/lime identity, and
For you / Chat navigation. The primary model is a triage queue: freshness and unread count,
then filtering, then compact findings. Full evidence and action steps stay in detail.

Validation used 50 fictional findings in a separate data directory, never company screenshots.
Rendered at 548 × 960 and 375 × 812, plus the sort control's larger-screen mode at 900 × 1000.
Search, empty results, Escape to clear, all three filters, sorting by pointer and keyboard,
opening/reading, read styling, pagination, and page-level read actions were exercised.
The native installed app was reopened and retained its existing finding count and ready login.
No source-content query or new schedule was run during validation.

Axiom evidence: installed @optiaxiom/react 3.4.0 declarations/source and official component docs.
The official Axiom MCP was unavailable. SearchInput, SegmentedControl, Menu and Button reuse
package anatomy. Sort uses Menu rather than a form Select; its narrow dialog and wider popover
modes were inspected. Computed styles select Die Grotesk B for body and VC Nudge for headings;
the browser resource inventory includes the brand font requests. The browser's restricted DOM
inspection did not expose an iterable FontFaceSet, so individual glyph fallback was not audited.
Read-row priority computed to the secondary foreground and title weight to 400.

Frontend-designer scope score: 18/20, a design judgment, not a measured quality percentage.

| Category | Score | Rendered evidence / remaining tradeoff |
|---|---:|---|
| Interaction model | 2 | One queue, with detail subordinate; no second collection model. |
| Focal point and reading order | 2 | Unread count leads, freshness precedes controls, titles lead each row; removes the oversized intro in the supplied screenshot. |
| Typography and readability | 2 | Distinct heading/body/metadata roles; two-line previews and full detail keep long source text readable. |
| Composition and spatial balance | 2 | Full-width queue and thin separators retain the screenshot's compact companion structure; utility controls form one group. |
| Content restraint | 1 | Freshness is deliberately repeated in the footer; at narrow sizes fewer findings fit above the fold. |
| Action hierarchy | 2 | Finding titles open details; page read is a quiet scoped action; no repeated primary row buttons. |
| Surface discipline | 2 | One status surface, open list rows, no nested finding cards. |
| Axiom and brand | 2 | Existing O and type roles retained; verified Axiom controls and semantic colors. |
| Accessibility and operability | 1 | Labeled search/filter/sort, visible focus, keyboard sort and clear; a full screen-reader audit was not performed. |
| Browser and responsive quality | 2 | Both control modes inspected; 375px layout wraps controls with no horizontal overflow or clipped actions. |

Automated verification: 34 Node tests, including revision-safe read persistence, read endpoint
validation/authentication, stale content vs fresh connector health, and 50-item filtering/sorting;
2 Python tests; production build and Sites packaging checks. Packaged arm64 app and Claude binary
architectures and the ad hoc signature were verified. The app remains unnotarized.
