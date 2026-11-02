# Safari Crafters — Typography & Content Flow Audit

Date: 10 September 2026  
Surface: local website at desktop 1440×900 and mobile 390×844  
Mode: combined UX, visual hierarchy and accessibility-risk review

## Overall verdict

The site already has a convincing luxury-safari identity: authoritative photography, a restrained palette, a strong serif/sans pairing, and generally excellent art direction. It does not look generic. The weakness is editorial discipline. Display typography is sometimes asked to carry long-form reading, vertical space is occasionally used without adding tension or meaning, and similar section structures repeat across long pages. The result is that individual screens can look beautiful while the full journey feels longer and less decisive than it needs to.

Current assessment: **strong visual identity, uneven editorial system**.

## Audit steps

### 1. Homepage — Healthy, with pacing opportunities

Evidence: `flow-home-0.png` through `flow-home-3.png`, plus `mobile-home-0.png` and `mobile-home-1.png`.

- The hero is excellent: one memorable image, one short line, one primary action in the header.
- The credibility statistics transition naturally from atmosphere to proof.
- “Give your dream journeys wings and paws” is distinctive but introduces another very large typographic moment soon after the hero.
- Scroll reveals can leave whole cards low-opacity during fast scrolling. The page should reveal faster and avoid animating every sibling independently.
- The total page is long, but the visual variation makes that acceptable. The weaker passages are repeated grids rather than the overall length itself.

### 2. Journey collection — Healthy

Evidence: `02-journeys-desktop.png`, `mobile-journeys-0.png`, and `mobile-journeys-1.png`.

- Clear entry, useful three-choice filter, strong hero photography.
- Featured journey followed by the broader collection is a sensible content sequence.
- The featured card and “Six ways into the wild” section partly repeat the same collection story. The transition should explicitly say why the second view is useful.
- Mobile hierarchy and card widths are sound; no body-level horizontal overflow was detected.

### 3. Journey detail — Needs substantial editorial tightening

Evidence: `flow-journey-0.png` through `flow-journey-3.png`, `mobile-journey-0.png`, and `mobile-journey-1.png`.

- Hero, ledger and chapter navigation are strong and immediately useful.
- The opening paragraph is set as a large serif display passage. On mobile it becomes a long wall of approximately 28–29px text, producing dozens of short lines.
- The content repeats the same promise through overview, signature statement, private brief, landscape notes, itinerary, inclusions and closing CTAs.
- At 10,686px desktop height, the page asks for too much reading before the visitor reaches the decision points.
- Keep the opening statement to 3–5 lines, move the remainder into normal sans body text, and cut or merge approximately 20–30% of repeated copy.
- Use one principal planning verb. “Begin planning,” “Refine this private journey,” and the footer’s “Begin a private journey” currently describe the same action differently.

### 4. Destination collection — Healthy

Evidence: `04-destinations-desktop.png`, `mobile-destinations-0.png`, and `mobile-destinations-1.png`.

- The hero and atlas cards clearly explain the browsing model.
- Photography, labels and card headings have a good hierarchy.
- Mobile cards are easy to scan and the geographic sequence makes sense.
- The India, Africa, Americas and Arctic sections should maintain identical image ratios and text measures across every atlas.

### 5. India atlas — Good but long

Evidence: `05-india-atlas-desktop.png`.

- Content has authority and regional specificity.
- At 9,722px, the atlas risks becoming a second destination directory rather than a considered regional introduction.
- Retain the strongest featured places, then allow the index to do the comprehensive work.
- Avoid introducing a full display headline for every subdivision; alternate large headings with compact index-led sections.

### 6. Photo expedition detail — Needs substantial editorial tightening

Evidence: `06-photo-expedition-desktop.png`, `mobile-expedition-0.png`, and `mobile-expedition-1.png`.

- The proposition and winter-photography framing are clear.
- The mobile introduction repeats multiple large-serif paragraphs with no visual interruption, which feels like a manuscript rather than a premium expedition page.
- Convert the introduction to one concise serif lead plus normal body copy, then bring “At a glance” or one strong photograph into the first two mobile screens.
- The enquiry component is visually strong after its recent compaction, but should appear after enough proof—not before the core rhythm and photographic opportunity are understood.

### 7. Private aviation — Good, with mobile heading and repetition issues

Evidence: `flow-aviation-0.png` through `flow-aviation-3.png`, `mobile-aviation-0.png`, and `mobile-aviation-1.png`.

- The dark hero, real aircraft imagery and safari-first language create a credible luxury proposition.
- Desktop balance is strong.
- On mobile, “Private flight. Wild arrival.” breaks into several nearly single-word lines and occupies too much of the opening screen.
- Reduce mobile hero type by roughly 10–14% and widen its measure.
- “More time in the wild” is repeated in multiple sections. Keep it as one signature statement and let subsequent sections use factual headings.
- Aircraft specifications are readable and images now have consistent visual weight.

### 8. Conservation — Strong narrative, overly spreadsheet-like proof

Evidence: `flow-conservation-0.png` through `flow-conservation-3.png`, `mobile-conservation-0.png`, and `mobile-conservation-1.png`.

- The hero is one of the site’s strongest: relevant image, restrained copy and clear partnership attribution.
- Field-record image/text pairs feel credible and specific.
- The impact grid introduces many statistics with identical weight. On mobile, each statistic becomes a large isolated panel and slows the story considerably.
- Feature the three most meaningful figures, then place the remaining evidence in a compact “full record” list or disclosure.
- Increase the contrast of muted explanatory text slightly on the beige and dark-green backgrounds.

### 9. Journal — Healthy, with filter wrapping issue

Evidence: `09-journal-desktop.png`, `mobile-journal-0.png`, and `mobile-journal-1.png`.

- Strongest information hierarchy after the planner: image, category/read time, headline, short description and clear link.
- Body text is readable and images lead correctly.
- On mobile, five category filters wrap into an unbalanced 2–2–1 arrangement, leaving “Conservation” orphaned. Use a horizontally scrollable single-row category rail or a deliberate two-column grid.
- Article titles should stay within a consistent line count to keep the listing rhythm stable.

### 10. Store — Strong hero and gallery; weak land introduction

Evidence: `flow-store-0.png` through `flow-store-3.png`, `mobile-store-0.png`, and `mobile-store-1.png`.

- Hero is persuasive and product-specific; the purchase hierarchy is now clear.
- The book gallery is visually rich and feels suitably collectible.
- “Where the stone remembers” is the weakest section: oversized heading, unused left rail, two fragmented columns, a detached drop cap and a second oversized quotation immediately below.
- Redesign it as an image-led editorial spread: one Jawai image occupying about 55%, one readable text column, and a compact quotation attached to the image.
- The purchase-notes section becomes a long dark utility stack on mobile. Condense it into a two-column definition list where space permits and reduce vertical padding.

### 11. Planner — Healthy and conversion-ready

Evidence: `flow-plan-0.png`, `flow-plan-1.png`, `mobile-plan-0.png`, and `mobile-plan-1.png`.

- Clear promise, calm visual tone and good progressive disclosure.
- Choices are large and understandable, with a single next action.
- The desktop left rail helps orientation; mobile reflow is logical.
- This should be the reference standard for other transactional sections: concise heading, one task per screen, visible progress and restrained support copy.

## Typography system findings

### What works

- One display serif and one body sans are used consistently in concept.
- Global body size and line height are comfortable.
- Eyebrows, CTAs and metadata have a recognizable visual role.
- Major pages use a single H1 and maintain semantic section headings.

### What weakens consistency

- The CSS contains a global role-based type ladder, but many page styles bypass it with one-off `clamp()` values and rem sizes.
- More than 70 distinct literal or computed font-size declarations appear across app and component styles.
- Cormorant Garamond works well for headlines but becomes fragile at large paragraph lengths and very light weights.
- Some mobile headlines use a measure so narrow that the type becomes decorative rather than communicative.
- Remote Google Fonts loading weakens privacy and performance reliability for a premium site; self-host the two required WOFF2 families.

## Content-flow findings

1. **Atmosphere is strong; editing is weak.** Pages often introduce the same promise in a hero, statement, brief, service grid and closing CTA.
2. **The journey pages are the main bottleneck.** Visitors receive too much prose before itinerary clarity and practical decision points.
3. **Section grammar repeats.** Eyebrow + enormous serif headline + two-column copy appears often enough that different stories begin to feel templated.
4. **CTA vocabulary is fragmented.** Standardize around three intents:
   - Browse: “Explore the journey”
   - Customise: “Shape this journey”
   - Enquire: “Begin planning”
5. **Proof should be curated, not exhaustive.** Conservation metrics, aircraft facts and journey inclusions need hierarchy rather than equal visual weight.

## Accessibility and resilience

Confirmed strengths:

- No body-level horizontal overflow was detected at 390px across the audited pages.
- A skip link and global visible focus treatment exist.
- Form controls have visible focus styling.
- Reduced-motion alternatives exist for the newer aviation and conservation experiences.
- FAQ grouping uses native, keyboard-accessible disclosure controls.

Risks and limits:

- Muted text should be contrast-tested against every beige/green surface; visual inspection suggests some combinations are close to the comfortable-reading threshold.
- Screenshots cannot establish complete keyboard order, screen-reader announcements or WCAG compliance.
- Scroll reveals leave content temporarily faint; fast scrollers and slower devices may experience this as missing content.
- The site imports fonts from Google rather than self-hosting, so type can swap or fail under blocked third-party requests.

## Prioritised recommendations

### Priority 1 — Highest impact

1. Create a strict typography contract and remove page-level one-off sizes: Display, H1, H2, H3, intro, body, small and label only.
2. Re-edit journey and expedition introductions: one short serif lead, all remaining narrative in 16–18px sans with a 60–68ch measure.
3. Shorten journey-detail content by 20–30% and surface route, season, duration and itinerary earlier.
4. Redesign the store’s “Where the stone remembers” section as an image-led spread.
5. Standardise CTA language across the site.

### Priority 2 — Flow and polish

6. Reduce mobile aviation hero scale and eliminate one-word line breaks.
7. Curate the conservation grid to three featured figures plus a compact secondary record.
8. Balance the mobile Journal category navigation.
9. Reduce reveal duration/translation and reveal related card groups together.
10. Self-host and preload the essential font files.

### Priority 3 — System maintenance

11. Add visual-regression captures at 1440×900 and 390×844 for the 11 audited templates.
12. Add automated checks for one H1, body overflow, minimum tap targets and key text contrast.

## Recommended sequencing

Do not redesign every page independently. First fix the typography contract and journey-detail reading pattern. Then apply the same editorial rules to photo expeditions, the store introduction and conservation proof. The visual identity should remain; the work is refinement and subtraction.

## Evidence limits

This audit reviewed the local rendered experience and implementation styles. It did not measure real-device Core Web Vitals, conduct an assistive-technology session, validate every destination detail page, or assess the accuracy of editorial claims.
