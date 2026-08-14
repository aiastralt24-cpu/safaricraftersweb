# Safari Crafters Store UX audit

Audited 7 August 2026 at desktop and 390 px mobile.

## Verdict

The page is visually atmospheric and presents the book as an editorial object, but it does not yet work confidently as a luxury-commerce page. Product discovery, evaluation and purchase confidence are interrupted by oversized typography, excessive narrative depth, weak information hierarchy and a handoff to a separate storefront before essential buying questions are answered.

## Highest-priority findings

1. Reframe the first screen around product, edition, price and purchase action. Preserve the editorial tone, but reduce the title and keep the complete book visible.
2. Add a concise product decision panel with availability, dimensions, weight, materials, contents, delivery window, shipping scope, returns/damage policy and payment reassurance.
3. Shorten the story between the first and second purchase opportunities. Keep one strong Jawai section and one tightly edited preview gallery.
4. Replace the three repeated generic acquisition links with a clear CTA system: primary `Purchase book`, secondary `View inside`, and `Ask about delivery`.
5. Make the external-store handoff explicit and visually continuous so it does not feel like leaving the brand.
6. Raise small-label and muted-text sizes/contrast, particularly captions, byline, edition details and utility copy.
7. On mobile, reduce the title scale and place price, edition and CTA together before the image.

## Evidence

- The DOM exposes only edition, price, generic shipping confirmation and a contact link before the long narrative.
- Missing decision information includes physical dimensions, weight, availability, fulfilment estimate, shipping geography, return/damage policy and payment methods.
- The purchase destination is a separate subdomain.
- The desktop hero gives nearly half the screen to the title while cropping the product photograph.
- At 390 px, the title occupies most of the first viewport and the price is visually subordinate.
- Browser console inspection found no warnings or errors during the audit.

## Accessibility risks

- Multiple labels are approximately 0.57–0.68 rem and use reduced-opacity text, which risks poor readability and contrast.
- Uppercase copy with wide tracking is overused for important product and purchasing information.
- Link meaning repeats as `Acquire the edition`; more descriptive labels would improve scanning and assistive-technology clarity.

## Limits

This was a visual and interaction audit of the local Store page. The external checkout was not submitted, and payment, shipping and post-purchase states were not tested.
