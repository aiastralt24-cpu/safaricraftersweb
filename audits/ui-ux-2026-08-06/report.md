# Safari Crafters — UI/UX and Image Alignment Audit

Date: 6 August 2026  
Scope: homepage plus Destinations, Svalbard, journey, expedition, Specialists, Plan a Journey, and Store pages at desktop and mobile widths.

## Executive verdict

The site has a distinctive, credible luxury editorial direction, and several hero sections are already strong. The current experience is not yet consistently production-polished across inner pages. The most damaging issue is the persistent white header: after the hero it remains over pale content, becomes unreadable, and overlaps headings, portraits, and gallery imagery. The second systemic issue is an uncontrolled typography scale: display-sized serif type is repeatedly used for ordinary body copy, creating very long pages and weak scanability. Image problems are concentrated in responsive galleries, portrait art direction, and pages with missing or excessively empty content states.

## Priority findings

### P0 — Navigation contrast and content collision

- The fixed white logo, menu, and CTA remain over cream page sections.
- On Destinations, Specialists, Store, Svalbard, journey, and expedition pages, navigation becomes nearly invisible.
- The header overlaps headings, portraits, gallery images, and product content while scrolling.
- Mobile has the same failure, with the white brand mark floating over pale copy and images.

Recommendation: introduce explicit header states. Use the transparent/light-on-image version only while the hero is underneath it; switch to a compact solid cream header with dark text after the hero. Reserve page space equal to the compact header height and test the transition at every breakpoint.

### P0 — Store content appears missing after the hero

- The Store hero is visually strong.
- Immediately below it, only table headings are visible followed by several screens of empty cream space.
- This reads as a loading/data/render failure and blocks the purchase journey.

Recommendation: repair the edition/purchase module before visual polish. Provide a deliberate loading state, an explicit unavailable state, and remove any fixed/min-height that creates empty screens when data is absent.

### P1 — Typography scale is not role-based

- Journey and expedition pages use near-display serif sizes for paragraphs and itinerary copy.
- Introductory copy, section headings, pull quotes, card titles, and ordinary prose are too visually similar.
- Long lines and large paragraph type make the pages tiring and dramatically increase page length.
- Small uppercase labels, credits, metadata, and some secondary copy go in the opposite direction and are too small/light.

Recommendation: define semantic tokens rather than page-specific sizes. Suggested targets: display 56–80px desktop / 38–54px mobile; section heading 40–56px / 30–40px; body lead 22–28px / 19–23px; body 18–21px / 17–19px; metadata no smaller than 12–13px. Limit long-form copy to roughly 62–70 characters and use 1.55–1.7 line height.

### P1 — Svalbard mobile gallery is visibly misaligned

- A rigid two-column crop compresses subjects and makes several polar-bear frames look soft.
- The final gallery tile occupies only the left column, leaving a large unintended blank area.
- Desktop uses oversized stacked imagery for too many consecutive screens; the header also sits on top of the animals.

Recommendation: use a deliberate responsive gallery: one lead image, paired secondary images only where their aspect ratios work, and make the final tile span both columns. Store focal-point data per image, avoid upscaling small source files, and use `sizes`/`srcset` matched to the rendered slot.

### P1 — Inner-page composition lacks a shared grid

- Portraits, text blocks, cards, and headings align to different horizontal origins across pages.
- Specialists has strong raw content but the portrait/headline compositions are repeatedly obscured by the header.
- Journey “At a Glance” and adjacent copy create an unbalanced tall layout with large unused areas.
- Destination search and section layouts are clean, but the persistent header visually breaks them.

Recommendation: adopt one inner-page grid with consistent outer gutters, 12 desktop columns, and reusable 5/7 or 6/6 editorial splits. Define standard vertical section spacing and sticky-card rules rather than tuning each route independently.

### P2 — Content density and scanability

- Journey and expedition narratives repeat similar ideas across introductions, highlights, and later prose.
- Itinerary information is visually long before users reach practical departure details.
- Planner mobile spends much of the first screen on atmosphere and concierge copy before the first useful selection.

Recommendation: move duration, dates, group size, and price/availability higher; collapse detailed itinerary days; shorten repeated prose; and bring the planner's first choice higher on mobile.

### P2 — Specialist authority can be presented more clearly

- The profiles and photography are credible.
- The large hero overlay makes the lead person hard to recognise.
- Accomplishments, destinations, credentials, and journeys are not consistently grouped into a fast-scanning proof block.

Recommendation: use clearer portrait crops, then add concise proof modules for role, years/regions in field, notable work, selected journeys, and direct planning CTA.

## What is already working

- The restrained cream, charcoal, and ochre palette feels premium and coherent.
- Homepage, Destinations, Svalbard, expedition, and Store hero photography generally has good desktop focal placement.
- Store product photography and the supplied book image suit the brand well.
- Destination search is visually clear and the India feature image is well balanced.
- The editorial serif/sans pairing is appropriate; the problem is scale and role assignment, not the typefaces themselves.
- Primary calls to action are restrained rather than aggressive.

## Accessibility risks visible in screenshots

- White navigation on cream backgrounds has inadequate contrast.
- Pale grey text and tiny uppercase metadata may fall below comfortable reading contrast/size.
- Text obscured by the fixed header is functionally inaccessible even if present in the DOM.
- Large text does not guarantee readability when line length, hierarchy, and overlap are poor.

Keyboard order, screen-reader labels, focus styles, colour contrast ratios, and lightbox behaviour require separate interaction/code testing; screenshots alone cannot verify them.

## Recommended implementation sequence

1. Fix header states and overlap across all routes and breakpoints.
2. Repair the Store purchase/content module and its empty states.
3. Introduce global semantic typography and measure tokens.
4. Create shared inner-page grid and spacing primitives.
5. Rebuild the Svalbard/gallery responsive rules and audit source resolution/focal points.
6. Restructure journey and expedition information hierarchy.
7. Refine Specialists composition and authority modules.
8. Finish accessibility, keyboard, performance, and responsive regression testing.

## Evidence

Accepted screenshots are stored beside this report. The early `01`–`09` full-page captures were rejected because sticky elements were duplicated during capture; the `10`–`30` viewport and scroll-state captures are the audit evidence.

