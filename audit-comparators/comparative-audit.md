# Safari Crafters comparative UI/UX audit

Audited references: Grafton Safaris, Reverie Safaris, ATR Safari, and Amadi Journeys.

## Executive verdict

The strongest Safari Crafters direction is not to imitate one competitor. Combine Amadi's cinematic art direction, Reverie's calm service language, ATR's useful decision architecture, and Grafton's conversion clarity. Safari Crafters should remain more editorial and private than ATR, more usable than Amadi, more legible than Reverie, and more rarefied than Grafton.

## Reference journeys

1. **Grafton: homepage to packages — healthy clarity, medium luxury ceiling.** The primary booking action is obvious and the navigation is reassuringly direct. The oversized display copy, soft imagery, and friendly visual language make the experience approachable, but less exclusive.
2. **Reverie: homepage to itineraries — strong atmosphere, mixed usability.** The opening is quiet and emotionally precise, with concise navigation and a clear enquiry action. Very small body copy, pale text over photography, and a branded loading interstitial slow access and weaken readability.
3. **ATR: homepage to finder — excellent utility, high cognitive weight.** The What / When / Where model and interactive finder reduce uncertainty for serious planners. The utility bar, map, tabs, and sentence-builder are more functional than luxurious and need simplification for an ultra-HNI audience.
4. **Amadi: homepage to destinations — exceptional visual identity, shallow discovery.** Full-bleed film and landscape imagery create the strongest first impression. Transparent navigation over bright scenes risks low contrast, while the sparse information architecture gives users less support when comparing trips.

## What to adopt

- Use one cinematic hero, not video in several sections. Give it a strong poster image, restrained movement, an explicit pause/play control, and a consistent dark scrim behind text.
- Introduce a lightweight editorial journey finder built around **Where / Species / Season**. Do not load a map or complex filtering library until the visitor asks for it.
- Use a single dominant action—**Plan a private journey**—and one quiet secondary action such as **Explore journeys**.
- Add service proof immediately after inspiration: named specialists, access, on-ground handling, and discreet guest reassurance. Luxury is communicated through confidence and specificity, not decorative gold alone.
- Let the journeys index alternate between immersive editorial features and a compact comparison mode. This separates inspiration from decision-making without duplicating sections.

## Recommended Safari Crafters flow

1. Cinematic promise and primary enquiry action.
2. Three journey modes: private journeys, guided bespoke safaris, photo expeditions.
3. Signature journeys as large editorial chapters.
4. Lightweight Where / Species / Season finder.
5. Upcoming fixed departures in a restrained calendar/list.
6. Quiet credibility band: experience, countries, guests, journeys.
7. Specialist service and conservation proof.
8. Private planning invitation.

## Typography system

- Display serif: `clamp(3.25rem, 6.8vw, 7rem)` on desktop; `clamp(2.6rem, 12vw, 4.25rem)` on mobile.
- Section title: `clamp(2.4rem, 4.5vw, 5.25rem)` with approximately 0.95 line-height.
- Body: 17–19px desktop, 16–18px mobile, 1.55–1.7 line-height, and a 55–70 character line length.
- Eyebrows and navigation: 11–12px uppercase, 0.14–0.18em tracking. Do not use these sizes for descriptive copy.
- Maintain two families only: one expressive editorial serif and one neutral sans. Italic should be a deliberate accent, not a recurring styling device.

## Motion system

- Hero image drift: 10–16 seconds, extremely low amplitude.
- Masked headline reveal: 700–1000ms with a gentle stagger.
- Section entrance: 400–700ms; hover feedback: 180–240ms.
- Sticky navigation may hide on downward scroll and return on upward scroll, but should never obscure focus or anchor targets.
- Respect `prefers-reduced-motion`; disable parallax and convert reveals to short fades.

## Accessibility and performance risks

- Keep normal text at or above 16px and verify image-overlay contrast rather than relying on a visual impression.
- Preserve visible keyboard focus, semantic carousel buttons, 44px minimum touch targets, descriptive image alternatives, and logical heading levels.
- Lazy-load below-fold media. Prioritize only the hero/LCP asset, use responsive AVIF/WebP sources, and defer maps or heavy interaction bundles.
- A video hero needs a poster, muted playback, pause control, and a still-image fallback.

## Priorities

- **P0:** contrast, readable body sizing, mobile navigation, and one consistent CTA hierarchy.
- **P1:** redesign journey discovery around editorial browse plus lightweight filters; remove overlapping homepage modules.
- **P2:** introduce the motion system, service proof, and cinematic polish after the information architecture is stable.

## Evidence limits

This review is based on visible desktop states, DOM structure, and the captured browse paths. It is not a full keyboard, screen-reader, analytics, Core Web Vitals, or cross-device accessibility certification. Motion quality is assessed from visible behaviour and page structure rather than a frame-by-frame performance trace.
