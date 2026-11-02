# Big Cats of India: photographic journey

## Direction
Private wildlife travellers should feel the change between four habitats and be able to reach practical details or enquire at any point. Photography, ivory, forest green, serif type and restrained gold remain the identity. The opening uses asymmetric landscape/portrait/data composition. Four habitat chapters replace repeated overview prose, the large private-brief panel and a separate itinerary list. Daily details stay within their chapter. All 12 original itinerary entries remain accessible, including arrival and departure.

## Motion choices
- Revealing, editorial motion. Native scrolling, no wheel interception or artificial scroll distance.
- Existing GSAP + ScrollTrigger, dynamically imported. No new package, video or WebGL.
- Hero: photograph settles from scale 1.035 to 1 over 1.5s; copy enters with 24px rise, .85s duration and .09s stagger, power3.out.
- Intro composition: .7s image/text rise, maximum 28px, once. Route underline draws with scroll, scrub .5.
- Desktop (>900px): native CSS sticky photo frame alongside four normally flowing chapters. At each chapter threshold the photo crossfades over .65s, power2.inOut; a .5s progress indicator follows the active chapter. No pinned scroll trap. Image selection works when arriving at a deep link and when scrolling back.
- Mobile/tablet: static photograph above each chapter, no sticky frame, natural reading order. At <=600px the hero photograph sits above the text so the tiger is not obscured.
- Daily-plan expansion: .35s height transition where interpolate-size is supported; native details fallback elsewhere. ScrollTrigger refreshes after expansion.
- Hover: .2s button response, .8s restrained photo scale. No loops.
- Reduced motion: system preference disables GSAP choreography; visible static chapter images retain the entire narrative. Page-level Reduce page motion control also tears down motion. Keyboard and screen readers retain native links, buttons and details; core text is server rendered.
- All GSAP contexts and event listeners are removed on unmount and media-query change.

## Budgets and limits
Target LCP <2.5s, INP <200ms, CLS <.1 on a mid-range mobile connection; desktop 60fps target. Assets are existing WebP photographs with responsive Next Image sizing, fixed aspect ratios and eager hero loading. These are targets, not measured production results. No production Lighthouse or real-device performance result is claimed.

## Local verification
TypeScript and diff whitespace checks. Asset path existence checks. Desktop preview at 1280px confirms Ladakh-to-Ranthambhore sticky image change; 390px responsive preview inspected. Motion-off control removes animated state. Daily plan opens with pointer and closes with Enter. Gallery opens, advances with arrow key and closes with Escape. No enquiry is submitted and no deployment is performed.

## Content boundaries
Uses only supplied photographs filed under Ladakh, Ranthambhore, Jawai and Gir. Existing price and itinerary source are retained; currency, dates, occupancy, taxes, flights and named lodges still need confirmation in the proposal. No invented reviews, accommodation photos or guarantees. Em dashes are not introduced. The route is a sequence, not a geographic map.
