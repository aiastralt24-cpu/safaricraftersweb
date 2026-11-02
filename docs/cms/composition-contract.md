# Approved page composition contract

Version 1 is implemented in `lib/cms/composition.ts`. It is an independent CMS contract, with no Sanity dependency. This checkpoint implements validation and draft editing operations; it does not replace the existing website renderer or claim client-facing editor completion.

The 20 initial PRD families are represented: hero, text, image/text, gallery, video, cards, product listing, product comparison, statistics, testimonials, projects, timeline, FAQ, tabs, downloads, CTA, form, logos, locations and related content. Each has a strict data schema. Unknown properties and component names fail validation.

Common controls include an internal label, visibility, unique anchor, approved background/width/spacing/alignment, mobile ordering, heading level, animation preset, explicit-offset visibility times, language and region scope. Empty language/region lists mean all audiences. A region-limited section is hidden when the delivery context has no region. End timestamps are exclusive. Delivery must pass its own timestamp and audience context; these are presentation controls, not authorization rules.

Hero desktop and mobile images have separate asset references. Meaningful images require alt text. Video requires transcript and caption references. Testimonials refer to managed records rather than copied quotes, and downloads identify both document and version. Publication still needs authoritative asset readiness, consent, rights, link and record checks; shape validation alone does not satisfy those requirements.

The pure command API supports insert, move, replace, remove and duplicate. Commands retain existing IDs, reject invalid positions and validate the resulting composition. Duplicates are independent page-local copies; they start hidden and omit the original anchor to prevent duplicate anchors. The editor must explain that hidden state and let the client enable the copy after reviewing it. Shared component references, dependency resolution and affected-page previews remain to be added; duplicating a local section is not shared-content editing.

Rich text currently has plain paragraphs, lists and links. Rendering must use escaped text, never arbitrary HTML. Formatting marks and deeper rich-text editing remain pending. Approved links accept site-relative paths, anchors and HTTPS URLs; phone/email actions need explicit typed controls rather than enabling arbitrary URL schemes.

## Integration work still required

- Build the actual client inspector/section list and keyboard controls around these commands.
- Wire saved compositions to authenticated immutable drafts and revision checks.
- Implement design-preserving renderers for each family, respecting reduced motion and responsive variants.
- Resolve references against a validated release snapshot, not whichever draft is latest.
- Add shared/global/inherited content and impact lists; connect every inventory entry to a field.
- Add publish-time validation and rendered preview tests, including real asset readiness and form behavior.
- Make schedule-aware delivery/cache invalidation work at visibility boundaries.

Eight focused tests cover command identity, preservation, audience/time visibility, independent mobile images, duplicate IDs/anchors/headings and unsafe links. They prove contract behavior only; they do not prove a working page builder or the complete UAT suite.
