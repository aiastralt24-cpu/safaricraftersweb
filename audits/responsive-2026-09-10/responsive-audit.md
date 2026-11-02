# Safari Crafters responsive website audit

Date: 10 September 2026  
Environment: local development build at `localhost:9090`  
Scope: 142 public routes (138 sitemap routes plus 4 public routes omitted from the sitemap)  
Viewports: 390 × 844, 768 × 1024, 1024 × 768, 1366 × 900, 1728 × 1117

## Executive verdict

The site is structurally responsive and visually strongest at laptop and large-desktop widths. No tested route produced document-level horizontal scrolling, missing primary headings, duplicate IDs, or broken images at the five target widths. The homepage, bespoke editorial pages, navigation overlay, and core card grids adapt cleanly.

The main responsive weakness is not catastrophic breakage; it is loss of clarity and comfort at phone and tablet widths. Filters become hidden horizontal rails, many secondary links are smaller than a comfortable touch target, the four expedition forms use sub-16px controls through iPad width, and the Search page becomes a long, unstructured wall of adjacent links. These patterns make a technically functional interface feel unfinished on smaller screens.

Overall health: **Needs a focused responsive refinement pass, not a redesign.**

## What was tested

- Every sitemap route at all five target widths.
- Four additional public routes not present in the sitemap: `/concept`, `/conservation-commitment`, `/private-aviation`, and `/search`.
- Initial render integrity: route load, one primary `<main>`, one `<h1>`, broken images, duplicate IDs, and document overflow.
- Visible controls: touch dimensions, form font sizes, internal horizontal scrolling, and basic autocomplete signals.
- Representative visual review of listing filters, destination finder, destination field-note tabs, expedition enquiry, homepage, private aviation, conservation, and store sections.
- Interaction checks for Journey, Photo Expedition, Journal, and Destination filters.
- Open/close, focus transfer, and scroll locking for both the standard mobile menu and homepage mobile menu.

## Priority findings

### P1 — Mobile filters work, but hidden options are not discoverable

At 390px, the Journey filter rail is 838px wide inside a 390px viewport. The Photo Expedition rail is 437px wide. The Journal rail similarly requires a horizontal swipe to reach later categories; the screenshot visibly cuts off “Safari Intelligence.” All three hide their scrollbars and provide no fade, partial-chip treatment, arrow, or “Swipe to explore” cue.

The controls are functionally correct: selecting `Multi-park`, `Pantanal`, and `Conservation` updated pressed state and results. The issue is that a guest cannot confidently tell that additional choices exist.

Evidence:

- [Journey filters at 390px](./screenshots/01-journeys-filter-mobile.png)
- [Photo Expedition filters at 390px](./screenshots/02-expedition-filter-mobile.png)
- [Journal filters at 390px](./screenshots/03-journal-filter-mobile.png)
- [Journey filters at iPad portrait](./screenshots/09-journeys-filter-ipad-portrait.png)

Recommendation: use a two-row chip/grid treatment on phones where the option count is small. If horizontal scrolling is retained, show a clipped next chip plus a right-edge fade and keep every chip at least 44px high. Keep the result count visible rather than hiding it on phones.

### P1 — Search is not a usable search experience on small screens

`/search` renders the complete site library as adjacent inline links. On a phone this becomes a dense text wall with no search field, no grouping, poor separation between items, and dozens of undersized targets. At 390px the page is difficult to scan and easy to mis-tap.

Evidence: [Search at 390px](./screenshots/05-search-mobile.png)

Recommendation: add a real search field, group results by Journeys / Destinations / Expeditions / Journal, render one result per row or card, and show type as metadata rather than concatenated text. This should be treated as the first usability fix.

### P1 — Expedition form controls risk iOS focus zoom

All four Photo Expedition detail routes compute their text-entry control size at 15.36px from phone through 1024px:

- `/photo-expeditions/kanha-wildlife-photography-expedition`
- `/photo-expeditions/laikipia-black-leopard-expedition`
- `/photo-expeditions/svalbard-expedition`
- `/photo-expeditions/the-pantanal-wetlands`

iOS browsers can zoom the viewport when a focused input is below 16px. The form itself reflows without horizontal breakage, but it is vertically long on phones and visually underuses the right side at the 1024px breakpoint before the fields begin.

Evidence:

- [Expedition form at 390px](./screenshots/06-expedition-form-mobile.png)
- [Expedition form at iPad portrait](./screenshots/11-expedition-form-ipad-portrait.png)
- [Expedition form at iPad landscape](./screenshots/14-expedition-form-ipad-landscape.png)

Recommendation: set input, select, and textarea text to a minimum of 16px; let the 1024px composition use a balanced two-column intro/details arrangement or collapse all content consistently rather than leaving a large empty quadrant.

### P2 — Touch comfort is inconsistent across route families

Using 44 × 44px as a comfort target, 86 of 142 routes contain at least one visible control or link below that size at 390, 768, or 1024px. Most are not WCAG failures because they exceed the 24px minimum and often have spacing, but they are below a comfortable mobile target.

Repeated examples:

- Homepage “Explore” links: about 35px high.
- Journey listing index links: about 36–37px high.
- Photo Expedition listing links: about 36px high.
- Destination “Begin planning” link: about 30px high.
- Related destination links: about 33–35px high.
- Legal email links: about 23px high.

Recommendation: introduce a shared `.touch-link` or equivalent spacing rule that gives compact text links a 44px clickable box without visually turning every link into a button. Audit the effective label target before enlarging checkboxes, because the surrounding `<label>` may already be clickable.

### P2 — Breakpoints are fragmented and make tablet behaviour harder to predict

The stylesheets contain 117 media-query blocks across 35 distinct query strings. Similar breakpoints appear in multiple forms (`680`, `700`, `720`, `760`, `800`, `820`, `860`, `900`, `920`, `960`, `980`, `1040`, `1050`, `1060`, and `1120px`, sometimes with spacing differences in the query text).

This explains why some sections switch patterns at iPad portrait while others wait until iPad landscape or slightly above it. No single instance is broken, but the system is expensive to reason about and prone to regressions.

Recommendation: rationalise responsive tokens around a small set such as phone, tablet portrait, tablet landscape/small laptop, desktop, and wide desktop. New component-specific breakpoints should be based on content failure, not device names.

### P2 — Wide-screen editorial density is uneven

The 1728px pages remain contained to roughly 1200px, which is appropriate for luxury editorial reading. Private Aviation and the Store author note use that space well. The Conservation impact section, however, combines a large amount of unused vertical space with comparatively small supporting copy inside a dense eight-cell metric grid. It feels under-scaled rather than intentionally spacious.

Evidence:

- [Private Aviation at 1728px](./screenshots/18-private-aviation-large-desktop.png)
- [Conservation impact at 1728px](./screenshots/19-conservation-large-desktop.png)
- [Store author note at 1728px](./screenshots/20-store-author-note-large-desktop.png)

Recommendation: retain the max-width, but tighten the lead-in spacing and increase metric descriptions slightly. Avoid making the whole container wider; the issue is hierarchy within the section, not the outer gutter.

### P2 — Four public pages are missing from the sitemap

The following routable pages are not emitted by `app/sitemap.ts`:

- `/concept`
- `/conservation-commitment`
- `/private-aviation`
- `/search`

Recommendation: add the three intended public editorial pages. Decide whether `/search` should be indexed only after its UX is rebuilt.

### P3 — Global clipping can conceal future responsive defects

Both the root and body use `overflow-x: clip`. This prevents a horizontal page scrollbar, but it can also hide an accidentally oversized component. The automated audit therefore paired document measurements with component-level checks and screenshots; no current page-level clipping defect was confirmed.

Recommendation: keep intentional scroll rails explicit at component level and add a development-only overflow test that flags visible elements extending outside the viewport.

## Responsive health by page family

| Page family | Routes | Health | Main observation |
| --- | ---: | --- | --- |
| Homepage / Concept | 2 | Healthy | Strong phone and 1728px hero crops; both mobile menus work and restore focus. |
| Journey listing | 1 | Needs work | Hidden phone filter options; otherwise solid tablet and desktop composition. |
| Journey details | 14 | Mostly healthy | No structural overflow or broken images; compact links need larger touch boxes. |
| Destination listing | 1 | Mostly healthy | Mobile finder sensibly swaps region rail for a select; breakpoint system should be simplified. |
| Destination details / regional atlases | 91 | Mostly healthy | Reflow is stable; planning and related links are consistently small for touch. Field-note tabs fit at 390px. |
| Photo Expedition listing | 1 | Needs work | Four-option rail is slightly wider than a phone and gives no continuation cue. |
| Photo Expedition details | 4 | Needs work | Forms are responsive but use 15.36px control text and become tall/uneven around tablet landscape. |
| Journal listing | 1 | Needs work | Category rail hides later choices on phones. |
| Journal articles | 15 | Healthy | No route-level overflow, image, or heading failures detected. |
| Search | 1 | Poor | Not a functional search UI; unusable wall of adjacent links on phone. |
| Store | 1 | Healthy | Wide-screen author note and section transitions are balanced. |
| Private Aviation | 1 | Healthy | Aircraft imagery and specification blocks align well at large desktop. |
| Conservation | 1 | Mostly healthy | Stable layout; wide-screen metric hierarchy and vertical density need refinement. |
| About / Specialists / Reviews | 3 | Healthy | No structural responsive failures detected. |
| Contact / Planner | 2 | Mostly healthy | Forms fit; compact consent/control treatment should be checked on physical touch devices. |
| Legal | 3 | Mostly healthy | Text columns fit; inline contact links are too small for comfortable touch. |

## Confirmed strengths

- Zero document-level horizontal overflow across the full 142-route matrix at the five audited widths.
- Zero broken-image findings in the route matrix.
- No duplicate IDs detected.
- Primary `<main>` and `<h1>` structure was present in the tested renders.
- Journey, Photo Expedition, Journal, and Destination filters changed state and content correctly.
- Standard and homepage mobile menus opened, locked body scrolling, moved focus to Close, closed, and returned focus to Open menu.
- The homepage hero preserves subject framing and readable title placement at 390px and 1728px.

Evidence:

- [Homepage at 390px](./screenshots/21-home-mobile.png)
- [Homepage at 1728px](./screenshots/22-home-large-desktop.png)
- [Destination finder at 390px](./screenshots/04-destination-finder-mobile.png)
- [Destination field-note tabs at 390px](./screenshots/07-destination-tabs-mobile.png)
- [Destination finder at iPad landscape](./screenshots/13-destination-finder-ipad-landscape.png)
- [Journey listing at 1366px](./screenshots/15-journeys-filter-laptop.png)

## Recommended implementation order

1. Rebuild `/search` into a real, grouped search interface.
2. Replace or visibly signal horizontally scrollable phone filter rails.
3. Raise expedition form control text to 16px and rebalance the 768–1050px form composition.
4. Add a shared 44px touch-box pattern to compact CTAs and navigation links.
5. Consolidate media-query tokens and retest boundary widths around 700–1120px.
6. Tune Conservation’s wide-screen hierarchy and add the missing public routes to the sitemap.
7. Add automated responsive assertions to CI at 390, 768, 1024, 1366, and 1728px.

## Evidence limits

This audit covers the local build’s initial and representative interactive states in the Codex in-app browser. It does not claim full WCAG conformance. It did not test physical iPhones/iPads, Safari-specific rendering, device safe areas, screen-reader output, color contrast, slow networks, production CDN behaviour, or real form/payment submission. Payment and enquiry forms were intentionally not submitted. A physical-device smoke pass should follow the responsive fixes.
