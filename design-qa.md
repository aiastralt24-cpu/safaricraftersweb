# Design QA — Safari Crafters audit fixes

## Evidence

- Source visual truth: `artifacts/ux-audit-2026-07-22/03-home-mobile-initial.png` and `artifacts/ux-audit-2026-07-22/inner-pages/08-journal-detail-mobile.png`
- Rendered implementation: `artifacts/ux-audit-2026-07-22/qa-after/06-home-restored-mobile.png`, `artifacts/ux-audit-2026-07-22/qa-after/02-journal-detail-mobile.png`, `artifacts/ux-audit-2026-07-22/qa-after/03-private-aviation-mobile.png`, and `artifacts/ux-audit-2026-07-22/qa-after/04-contact-mobile.png`
- Full-view comparisons: `artifacts/ux-audit-2026-07-22/qa-after/home-comparison.png` and `artifacts/ux-audit-2026-07-22/qa-after/journal-comparison.png`
- Viewports: 390 × 844 CSS px at density 1 for direct mobile comparison; additional 320 × 780 responsive check; 1440 × 1000 desktop check.
- Source and implementation mobile screenshots: 390 × 844 pixels, normalized 1:1.
- State: initial page load, menu closed, top of page.
- Browser console: no errors on the four corrected routes.
- Primary interactions checked: visible mobile Plan CTA, skip-link off-canvas resting position, responsive header at 320 px, route rendering, and no horizontal overflow.

## Findings

- No remaining actionable P0, P1 or P2 visual mismatch was found in the corrected surfaces.
- Typography: the display and body families, weights and hierarchy remain consistent. The long article title now occupies a readable four-line block instead of seven lines.
- Spacing and layout: the mobile header fits at 320 px without overflow; the planning CTA and menu retain 44 px targets.
- Colors and tokens: existing night, bone and brass tokens are preserved; no palette drift was introduced.
- Image quality: the homepage now uses a 1261 × 1261 restored source rather than the 535 × 540 original. Mobile focal positioning keeps the lead animals visible. Private Aviation now uses a relevant India-circuit visual with an explicit focal point.
- Copy and content: the placeholder WhatsApp destination was removed; the valid email contact and enquiry form remain.

## Comparison history

1. Earlier P2: mobile homepage centered crop clipped most of the tiger group and hid the primary planning action.
   - Fix: mobile hero focal point set to `62% center`; compact Plan CTA retained.
   - Evidence: `qa-after/home-comparison.png`, plus the 320 px capture `qa-after/05-home-320.png`.
2. Earlier P2: mobile article title became seven lines and competed with the subject.
   - Fix: narrow-screen title size, width, line height and hero height were constrained.
   - Evidence: `qa-after/journal-comparison.png`.
3. Earlier P2: the hero asset was visibly under-resolved.
   - Fix: created and integrated `public/assets/safari-crafters/ranthambhore-tiger-family-restored-v2.png` as a faithful high-resolution restoration.
   - Post-fix evidence: `qa-after/06-home-restored-mobile.png` and `qa-after/07-home-restored-desktop.png`.
4. Earlier P2: Private Aviation used unrelated tiger-family imagery.
   - Fix: replaced it with the existing Amer Fort/India circuit image and an explicit focal point.
   - Evidence: `qa-after/03-private-aviation-mobile.png`.
5. Earlier P2: the skip link left a visible black strip.
   - Fix: moved it fully off-canvas at rest and above the header when focus-visible. Resting bounding box verified at y = -48.

## Focused region comparison

Focused comparisons were required for the mobile header, tiger focal point, article headline, and contact/aviation hero content. These are represented by the 320 px capture and the route-specific implementation screenshots above.

## Follow-up polish

- P3: replace the generated restoration with the original photographer's high-resolution master if it becomes available; that remains preferable for archival authenticity.
- P3: validate the skip-link focus reveal with VoiceOver and a physical keyboard outside the automated browser.

final result: passed

---

# Design QA — Destination finder control sizing

## Evidence

- Source visual truth: `/var/folders/86/xk6mzkbn0l38n62l52kcsn0c0000gn/T/codex-clipboard-4908b5d9-c41a-4b47-ae53-23304425d38e.png` (2518 × 332 px).
- Rendered implementation: `/tmp/destination-finder-equal-controls.png` (1280 × 720 px).
- Desktop viewport: 1280 × 720 CSS px at browser density.
- Mobile verification: 390 × 844 CSS px.
- State: `/destinations`, finder inactive, menu closed.
- Measured desktop heights: search input 62 px; travel select 62 px.
- Measured mobile heights: search input 62 px; region select 62 px; travel select 62 px.

## Full-view comparison

- The reference and implementation were opened together. The reference shows the search control substantially taller than the native travel select. The implementation gives both controls an identical 62 px frame and aligns their top and bottom edges.
- The surrounding finder heading, labels, column proportions, palette and section spacing remain unchanged.

## Focused region comparison

- Fonts and typography: existing label and control typography is preserved; the selected option retains the same readable size and weight.
- Spacing and layout rhythm: both desktop controls now share an exact height and baseline. Mobile controls stack at the same 62 px height without horizontal overflow.
- Colors and tokens: existing bone background, ink border and brass search icon are unchanged.
- Image quality: no raster assets are present in the focused control region; the supplied search icon and new dropdown chevron are library vector icons.
- Copy and content: labels, placeholder and “Any time” option are unchanged.
- No actionable P0, P1 or P2 mismatch remains in the requested surface.

## Comparison history

1. Before: the browser-native select rendered much shorter than the search field despite a shared minimum-height rule.
2. Fix: both controls now use an explicit 62 px height; the select uses normalized appearance and a Lucide chevron.
3. After: desktop and mobile DOM measurements confirm identical control heights, with no mobile overflow.

final result: passed

---

# Design QA — HNI destination finder simplification

## Evidence

- Source visual truth: `/var/folders/86/xk6mzkbn0l38n62l52kcsn0c0000gn/T/codex-clipboard-f4224078-2038-426b-b85e-2b3481af2a5e.png` (2624 × 1152 px), showing the duplicated region navigation and region dropdown.
- Rendered implementation: `audits/ui-ux-2026-08-06/46-destination-finder-hni.png` (1280 × 720 px).
- Viewport: 1280 × 720 CSS px at density 2. The source is a wider crop, so comparison focused on the finder region rather than pixel-for-pixel frame matching.
- State: `/destinations`, finder in its initial desktop state, menu closed.

## Findings

- No actionable P0, P1 or P2 mismatch remains in the redesigned finder.
- Fonts and typography: the Safari Crafters serif hierarchy and brass labels remain intact; the utility headline is smaller, more conversational and better balanced.
- Spacing and layout rhythm: excessive blank space, the boxed catalogue panel and detached count were removed. Region navigation, question, controls and assistance link now form one coherent vertical sequence.
- Colors and tokens: ivory, ink and brass tokens remain unchanged, with a restrained brass active-region underline.
- Image quality: this utility surface contains no imagery, so no image asset changes were required.
- Copy and content: catalogue language was replaced with a client-centred question. Search asks for an animal, landscape or place; timing is optional; personal guidance remains one click away.
- Controls: search and timing controls share a 62 px height. The duplicate desktop region dropdown is removed; a region select remains available only below the mobile breakpoint.
- The catalogue count is no longer presented as a sales-volume signal.
- Results remain contextual and the guided-planning link preserves its destination-finder source.
- Production build and TypeScript checks pass.

## Comparison history

1. Earlier P1: visible region links and a Region dropdown performed the same job.
   - Fix: the region links now own desktop region filtering; the dropdown is mobile-only.
   - Evidence: source screenshot versus `46-destination-finder-hni.png`.
2. Earlier P2: mismatched control heights and default native select styling weakened the premium presentation.
   - Fix: unified control height, borders, focus states, type and internal spacing.
3. Earlier P2: “91 destinations” and the oversized search-panel treatment made the interface feel like inventory browsing.
   - Fix: removed the count and panel box; added a discreet “Let us guide you” route into the private brief.

## Focused region comparison

The destination finder is itself the focused region. The source and implementation were inspected together; the duplicate filter and catalogue framing are visibly absent while the original brand system is preserved.

final result: passed

---

# Design QA — Private Aviation redesign

## Evidence

- Content and aviation visual source: `audits/ui-ux-2026-08-06/43-kairamya-source.png` plus browser-rendered DOM captures of `https://www.kairamyaair.com/` and `/our-fleets/`.
- Existing Safari Crafters visual baseline: `audits/ui-ux-2026-08-06/44-private-aviation-before.png`.
- Rendered implementation: `audits/ui-ux-2026-08-06/45-private-aviation-after-top.png`, `45-private-aviation-fleet.png`, and `45-private-aviation-journey.png`.
- Source and implementation captures: 1280 × 720 px at a 1280 × 720 CSS viewport, density 2. No density normalization was needed for the viewport comparisons.
- State: public `/private-aviation` route, desktop, menu closed; focused captures cover hero, introduction, fleet and safari-journey sections.

## Findings

- No actionable P0, P1 or P2 mismatch remains in the redesigned page.
- Fonts and typography: the existing Safari Crafters display/body families, light serif headings, uppercase brass labels and restrained body scale remain consistent across all new sections.
- Spacing and layout rhythm: the page now has a clear editorial sequence with balanced two-column sections, evenly aligned fleet cards, structured specification rows and a strong closing CTA. No horizontal overflow was detected at the tested desktop viewport.
- Colors and tokens: existing ivory, paper, soil, forest, bone and brass tokens are used; no unrelated Kairamya blue/yellow UI styling was copied into the Safari Crafters experience.
- Image quality and asset fidelity: the generic palace hero was replaced by genuine Kairamya aircraft photography. The Gulfstream and Cessna images are sharp, correctly identified and appropriately cropped; the Jawai image restores the safari context.
- Copy and content: aircraft type, range, nonstop duration, seating and service categories match Kairamya Air's published fleet and service information. Operational caveats are explicit. No unsupported ownership, guaranteed access or route promise was added.
- Icons and affordances: the existing lightweight arrow icon family is preserved; planning links are visually clear and keyboard-reachable.
- Interaction: both primary links preserve `experience=private-aviation` in the Safari Crafters planner.
- Production build and TypeScript checks pass.

## Comparison history

1. Earlier P1: the page opened on a heritage palace photograph, so the private-aviation proposition was not visually evident.
   - Fix: replaced it with a real Kairamya Gulfstream photograph and accurate image credit.
   - Evidence: `44-private-aviation-before.png` versus `45-private-aviation-after-top.png`.
2. Earlier P1: the page was only an introduction and two text articles, with weak decision support and no integrated safari-planning story.
   - Fix: added verified aircraft comparison, route-selection caveat, runway-to-wilderness planning sequence, service framing and a focused closing enquiry.
   - Evidence: `45-private-aviation-fleet.png` and `45-private-aviation-journey.png`.
3. Earlier P2: fleet details were presented as prose and one seating value was imprecise.
   - Fix: converted published specifications to explicit definition rows: G150 3,000 nm / about 6 hours / 8 passengers; CJ2 1,500 nm / about 3 hours / 6 passengers.
   - Evidence: browser DOM capture of Kairamya's fleet page and `45-private-aviation-fleet.png`.

## Focused region comparison

Focused captures were required because the aircraft specifications and safari-sequencing copy are too small to assess from a single full-page image. The hero, fleet and journey regions were compared together with the Kairamya content source and prior Safari Crafters baseline.

## Follow-up polish

- P3: add a verified mobile browser capture when the in-app browser viewport override reliably applies; responsive CSS has been implemented, but this session's browser retained its 1280 × 720 viewport after the temporary override request.

final result: passed

---

# Design QA — Expanded menu descriptions removed

## Evidence

- Source visual truth: `/Users/bunny/.codex/attachments/fd86793b-2c91-4837-9c1f-6349cc7d953f/image-1.png` (1118 × 1596 px), showing the menu descriptions requested for removal.
- Rendered implementation: `audits/ui-ux-2026-08-06/42-menu-no-descriptions-desktop.png` (1280 × 720 px).
- Viewport: 1280 × 720 CSS px at density 2.
- State: expanded homepage menu, desktop, first menu item active.
- DOM verification: nine homepage menu labels and zero description paragraphs; the shared inner-page menu also contains no description markup.

## Findings

- All descriptive subtext has been removed from both the homepage menu and shared inner-page menu.
- Navigation labels, numbering, destination links, active states, arrow affordances and contextual imagery are preserved.
- Fonts and typography: existing display family, weights and brass active state remain unchanged; removing the secondary body copy creates a clearer single-level hierarchy.
- Spacing and layout rhythm: rows now form a compact, evenly spaced list without empty text containers.
- Colors and tokens: night, bone and brass tokens remain unchanged.
- Image quality: existing menu imagery and crops remain unchanged.
- Copy and content: only the requested descriptions were removed; every navigation label remains intact.
- No actionable P0, P1 or P2 mismatch remains in the requested menu surface.
- Production build and TypeScript checks pass.

## Comparison history

1. Before: every menu label carried one or two lines of descriptive copy, producing a tall, text-heavy menu.
2. Fix: removed description fields, paragraph markup and description-specific CSS from both menu implementations.
3. After: the expanded menu is a compact label-only navigation list with the original imagery and interaction styling preserved.

## Focused region comparison

The menu list itself is the focused comparison region. The source and rendered captures were inspected together; the requested descriptive lines are absent from the implementation while the surrounding navigation treatment remains coherent.

final result: passed

---

# Design QA — Journey card CTA alignment

## Evidence

- Source visual truth: `/var/folders/86/xk6mzkbn0l38n62l52kcsn0c0000gn/T/codex-clipboard-3826985c-8944-4c85-bdd1-2f0719703571.png` (2818 × 458 px).
- Rendered implementation: `audits/ui-ux-2026-08-06/41-journey-cta-aligned.png` (1280 × 720 px).
- Viewport: 1280 × 720 CSS px at density 2.
- State: `/journeys`, first desktop card row, menu closed.
- Measured CTA tops: 1653.7266 px, 1653.7266 px, 1653.7266 px.
- Measured CTA bottoms: 1697.7266 px, 1697.7266 px, 1697.7266 px.

## Findings

- The three cards now stretch to a common row height and reserve flexible space between their descriptions and CTAs.
- All three “Refine this journey” links share the same baseline despite different title and description lengths.
- Existing typography, brass color, underline treatment, image sizing and card content remain unchanged.
- No P0, P1 or P2 mismatch remains in the requested region.
- Production build and TypeScript checks pass.

## Comparison history

1. Before: each card sized its content independently, so shorter copy pulled its CTA upward.
2. Fix: the listing grid now stretches row items; each editorial card uses a shared five-row track with a flexible description/spacer track and the CTA pinned to the final row.
3. After: all three rendered CTA bounding boxes are identical vertically.

final result: passed
