# Safari Crafters — site-wide image alignment and UX audit

Date: 22 July 2026

## Scope

- Surfaces: homepage plus 16 representative inner-page routes
- Viewports: 1440 × 1000 desktop and 390 × 844 mobile
- Focus: image crop/alignment, responsive behavior, visual hierarchy, primary navigation, and screenshot-visible accessibility risks

## Overall verdict

The visual direction is premium and unusually consistent across the site. Shared inner-page heroes generally outperform the homepage hero on mobile, but the system relied almost entirely on centered `object-fit: cover` crops. This worked for some photographs and clipped key subjects in others. The partially hidden skip link also left a black strip visible along the top edge. The circular “N” visible in audit screenshots was confirmed to be the Next.js development toolbar and is not production UI.

## Steps reviewed

1. Homepage — needs attention; mobile focal point, hidden CTA and rotating copy issues remain.
2. Journeys listing — healthy; strong tiger portrait and readable hero copy. The source image is visually soft at desktop size.
3. Journey detail — minor issues; good text/subject split, but the family crop loses animals on mobile and uses the same low-resolution source.
4. Destinations listing — healthy; hero crop and region navigation are clear.
5. Destination detail — healthy; the tiger remains legible behind copy at both widths.
6. Photo Expeditions listing — healthy; consistent hierarchy and category entry points.
7. Expedition detail — minor issues; the black leopard is atmospheric but too dark to identify quickly on mobile.
8. Journal listing — healthy; strong editorial rhythm, consistent card proportions and clear categories.
9. Journal article — needs attention; the mobile title becomes seven lines and competes with the tiger’s face. Tighten the mobile type scale or cap the text width differently.
10. Planner — healthy structure; step framing and regional choices are clear.
11. Specialists — minor issues; good trust-building content, though the specialist card image is cropped at the face edge on mobile.
12. Reviews — healthy; proof structure is understandable and visually restrained.
13. Store — healthy; the product photograph uses a deliberate focal point and the CTA is prominent. The desktop product image is unusually tall and dominates the fold.
14. About — healthy; clear story entry and consistent hero treatment.
15. Contact — minor issues; the short-brief approach is clear, but the placeholder WhatsApp number undermines trust.
16. Private Aviation — minor issues; the reused tiger-family hero does not immediately communicate aviation.
17. Conservation — healthy; specific language and an appropriate landscape image support credibility.

## Highest-impact recommendations

1. Fix the skip-link hiding rule. `top: 12px` plus `translateY(-120%)` leaves a visible black strip; hide it fully off-canvas and reveal it only on focus. Resolved.
2. Add explicit focal-point support to hero images. Center crop should remain the fallback, not the universal rule. Partially resolved for the audited problem images.
3. Replace the 535 × 540 tiger-family source used by the homepage, Big Cats journey and reviews with a genuinely high-resolution master. Resolved with a restored 1261 × 1261 asset; use the photographer's master if it becomes available.
4. Set the homepage mobile focal point near `62% center`, then verify at 320, 390 and 430 px widths. Resolved at 320 and 390 px.
5. Keep a compact “Plan” action visible on mobile rather than relying solely on the menu. Resolved.
6. Reduce the journal article hero title to roughly `clamp(2.7rem, 11vw, 4rem)` on narrow screens and test long titles. Resolved.
7. Stop homepage headline rotation when `prefers-reduced-motion: reduce` is active. Confirmed already implemented.
8. Replace the private-aviation tiger hero with imagery that communicates the India circuit before the copy is read. Resolved.
9. Remove the placeholder WhatsApp destination before launch. Resolved; email and enquiry form remain.

## Evidence limits

This is a screenshot-led audit of the rendered homepage and representative inner-page templates. Keyboard order, screen-reader announcements, measured contrast ratios, video autoplay behavior, planner validation, external purchase completion and all menu states still require interaction or code-level accessibility testing before making compliance claims.
