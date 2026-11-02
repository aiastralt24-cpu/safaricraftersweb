# Bespoke Safaris CMS migration

Status: source and rendered inventory captured; editor, reviewed migration and published route not yet connected. This page remains unchanged on the website.

## Source evidence

`guided-safaris-migration-inventory.json` binds the route, FAQ, motion, styling and transitive shell dependencies to their current hashes. It contains eight ordered sections, eight unique image assets, desktop/mobile image framing, headings with line breaks/emphasis, paragraph/quote/caption/link text, metadata and four FAQ question/answer pairs. Each FAQ was opened and closed at 1280 and 390 pixels; only one answer remained expanded. Both viewport captures had one H1 and no document overflow. Screenshots were captured outside the repository. The mobile field cards use their own horizontal layout; document-overflow checks do not certify full keyboard/swipe usability.

Source evidence retains `showSpecialistsCta=false` and the disabled `/specialists` link. Migration must preserve its disabled state until an editor deliberately enables it with a valid destination. Source metadata uses the page's canonical URL and a separate social-image description. `/plan?guided=true`, the introduction anchor and their accessible labels must survive migration exactly; replacing them with generic links changes the enquiry intent.

## Editable-field map and implementation requirements

| Source section | Required editor controls | Implementation path |
|---|---|---|
| Hero | Eyebrow; multiline/emphasized H1; copy; planning CTA; desktop/mobile image, alt, caption and focal point; scroll-cue label, accessible name and anchor | Extend approved hero presentation only where needed to retain the scroll cue and source arrangement. |
| Introduction | Eyebrow; heading; ordered paragraphs; section anchor; width/spacing/background | Existing text fields, with the source two-column presentation verified. |
| Expanding encounter image | Image/alt; desktop/mobile crop, size and shape; accessible section label; motion option | Approved image presentation; do not invent a required visible heading. Preserve static/reduced-motion appearance. |
| Field intelligence | Eyebrow, heading/emphasis, introduction; three ordered cards with labels, titles, copy and images | Image cards with source mobile horizontal presentation and keyboard access. |
| Photography | Image/alt/framing; eyebrow; heading/emphasis; copy; quotation | Image/text presentation with explicit quotation support and source background. |
| Field companion | Eyebrow; heading; paragraphs; portrait/alt/caption/framing; optional specialists CTA | Image/text presentation with disabled optional CTA retained. |
| Two ways to begin | Eyebrow; heading; two ordered linked cards; image/alt; label, title, copy and action label | Linked image cards preserving independent action wording and destinations. |
| FAQ | Eyebrow; heading; ordered questions and answers; initial-open behaviour | Approved accessible accordion with stable IDs, keyboard controls and one-open policy. |
| Page SEO | Title/description, canonical/indexing, social title/description/image and alt | Existing page SEO fields; map source values explicitly. |

All rows are proposed field coverage, not a claim of working controls. The root brand/header/footer remain shared settings and require their own ownership/delivery acceptance. No unapproved content exception is introduced.

## Planned acceptance sequence

1. Add only the section presentation fields missing from the current registry, retaining compatibility with existing pages; connect editors and responsive private preview.
2. Add a Bespoke Safaris page template and strict route/palette/heading/anchor validation. Verify query-preserving planning links against the supported planning contract.
3. Build a source-bound, explicit-media-mapped migration review with no invented copy, approved rights or automatic publication; retain hidden CTA intent and source provenance.
4. Use existing atomic draft/recovery, editorial review, publish/restore and public media/SEO delivery. Add a dedicated guarded route behind an off-by-default delivery flag.
5. Compare all sections, FAQ states, keyboard behaviour and desktop/mobile framing with the captured source. Verify managed storage, rights, consent/intake routing and client editing tasks before rollout.

Pending: all implementation steps above, animation fidelity, real media rights, client content approval, managed-provider validation and client acceptance. The capture submitted no enquiries and changed no CMS or live content.

## Section content contracts

`lib/cms/guided-safaris-content.ts` defines eight strict section contracts corresponding to the captured source. Shared heading/image/framing primitives are reused; page-specific scroll-cue accessibility, standalone image expansion, mobile card layout, quotation, disabled optional CTA and FAQ initial-open identity remain explicit. Source paragraph whitespace is retained. Item IDs must be unique, framing stays within bounds, FAQ selection must exist, and button labels retain the agreed 30-character cap. The exact `/plan?guided=true` intent is admitted without allowing arbitrary planning queries or URL-normalization tricks.

These contracts are not yet registered in the composition editor or public renderer. They confer no media approval or publication authority. The next step is registry/editor/preview integration and a source-bound mapping into these fields, followed by the planned route/validation lifecycle.

## Composition registry and draft builders

The eight contracts are now registered with shared composition validation. `createGuidedSection` provides intentionally incomplete drafts with stable item identities and separate desktop/mobile framing; `createGuidedPageDraft` supplies an empty ordinary-page starting point. No source claims, media IDs or approval are invented. These builders are not yet exposed as editor buttons.

`projectGuidedSafarisPage` validates the ordinary-page envelope, English context, explicit section palette and unsupported region targeting. It requires exactly one visible hero H1 at every future schedule boundary, and a visible target for its scroll cue throughout that schedule. It preserves valid content and filters audience/time visibility without granting publication. The current full-revision validator still refuses publication for this route. Field controls, section preview/rendering, source migration and guarded public delivery remain pending.

## Authoring controls connected

The Pages template picker now includes an empty Bespoke Safaris draft with its explicit eight-section palette. The composer can add/edit these sections using structured text/headings, private media selection, separate mobile images, caption/credit and per-viewport framing. Cards/paragraphs/questions have bounded additions and stable-ID reordering/removal. The FAQ selector stores an item ID, preserves selection through moves and clears it when the selected question is removed. Disabling the specialists CTA preserves its configured link; editors may remove the optional configuration explicitly. Existing section controls retain visibility, scheduling, order and duplication.

Controlled local browser checks passed at 1280/390 pixels for adding all eight sections, hero copy/link editing, FAQ reordering/removal/initial state, optional-link retention, mobile-image add/remove and read-only enforcement. An ambiguous initial-answer select label was corrected and the complete check repeated. The fixture used stubbed media services and was removed; no managed content was written. Screenshots represent the isolated control fixture, not final CMS layout acceptance. Full page preview, actual saved-revision roundtrip, migration and public rendering remain pending.

### Bespoke saved revisions and private content preview

Verified eight-section draft persistence in the actual local database: nested media/framing, hidden CTA configuration, FAQ identity and section ordering survive save and restore; recipient preview remains pinned to its original revision, outsiders are refused, revocation works, stale restores conflict, and homepage/Concept pointers stay unchanged. Unpublished drafts remain unavailable through the public page reader.

Connected all eight sections to CompositionPreview using the existing private MediaImage loader. Content review includes editorial headings, paragraph line breaks, image captions/credits, responsive mobile-image selection and framing, planning/action links, scroll target, quotation, optional specialists CTA and a single-open FAQ with keyboard-operable buttons. Preview explicitly describes requested card/scroll presentation without claiming final website motion or layout fidelity.

Controlled browser checks passed at 1280/390 pixels with synthetic content and a stub image loader: eight sections, responsive image caption selection, hidden CTA omission, exact planning link, scroll anchor, FAQ click/Enter toggling, no document overflow and no runtime errors. Browser plugin not available; regular Playwright used. Temporary QA route removed. All 1,166 CMS tests passed with zero skips and production build passed. Initial concurrent standalone TypeScript check encountered Next generated-route file regeneration; the standalone rerun after the build passed. No managed content, delivery flag or public route changed.

Pending for Bespoke: source-bound migration of original copy/assets, final visual/motion renderer, trusted publication checks and public delivery, full migration/release lifecycle and client acceptance. Whole-site editability and provider deployment/handover remain open.

### Bespoke original-content migration proposal

Extended read-only capture with separate path-card eyebrows/action labels and full Open Graph/Twitter metadata. Added a source-bound pure migration planner for all eight sections, preserving original text, emphasized heading runs, captions, image alternatives and independent desktop/mobile focal points, guided planning intent, disabled specialists CTA, card destinations and initial FAQ selection. Builds structured composition and SEO proposals with explicit missing-media placeholders. Exact dependency hashes, unique source mappings, source image digests and distinct processed identities are checked before proposal creation; these caller-provided mappings are not trusted media eligibility or write authorization.

Tests compare every captured paragraph, quotation, figure caption, heading run and image description against the resulting content; check projection, all FAQ answers, social metadata/image reuse; and reject changed/duplicate/incomplete source proofs, stale/unknown image mappings, placeholder bindings and conflicting processed identities. All 1,169 CMS tests passed with zero skips; TypeScript and production build passed. Capture used the running local website and changed no CMS content.

This is review-only and saves nothing. Authenticated review/API/UI, trusted media provenance verification and atomic draft application/recovery remain pending. Source CSS crop geometry and motion are not approximated as verified fidelity: focal points are preserved with natural framing for later route-specific rendering. Public delivery/release and client/provider acceptance remain pending; whole-site scope is unchanged.

### Bespoke authenticated migration and atomic draft application

Added the `/api/cms/migrations/guided` review/apply/status endpoint and local database migration `180-guided-migration.sql`. Review requires the caller's create or exact English Bespoke-page edit authority and revision, validates all eight source mappings, and binds proposal/site/target/media evidence into the review identity. Trusted media evidence checks original upload hashes, processed storage identity, current revision and approved rights. Apply locks target/upload/media rows, rechecks evidence and rights, saves only a draft and commits one actor/site-scoped immutable receipt. Retries require current authority and return the original result without replacing subsequent edits. Status distinguishes an unconfirmed request from completed work; malformed receipts fail closed.

Local database and HTTP tests cover evidence drift, unmapped payload assets, stale revisions, revoked rights, transactional rollback, same-request replay, changed-request rejection, receipt isolation, revoked membership and a lost completed HTTP response followed by a later client edit and safe recovery. Endpoint tests cover authorization, foreign origins, invalid mappings, missing/contradictory evidence and wrong-target results. All 1,175 CMS tests passed with zero skips; TypeScript and production build passed. The SQL migration was exercised in PGlite only, not applied to a managed database; no production content or delivery flags changed.

Pending: client-side review/receipt verification and import controls, rendered import/recovery acceptance, final route rendering/motion and public release integration, real content/media approval and provider deployment. The broader CMS goal remains incomplete.

### Bespoke client import review and recovery controls

Added browser-side verification of the server proposal, source/review digests, exact target and ordered media evidence. Recovery stores bounded account/site-scoped identifiers and media evidence, never page copy or credentials; receipts must match the original request/target/digests, and an unconfirmed result stays pending. Tests reject content/SEO/evidence substitutions, wrong identities, oversized or foreign recovery state and mismatched results.

Connected the Bespoke import panel to Pages with eight processed-image selections, create/replace destination, current/proposed composition and SEO review, explicit replacement acknowledgement and apply/status/retry controls. Pending imports block conflicting edits/imports; a verified completion opens the saved record, including newly created pages. Storage failures preserve recovery rather than assuming success.

Controlled browser flows passed at 1280/390 pixels: all eight image selections, reviewed eight-section preview, acknowledgement gate, simulated lost apply response, reload from saved recovery identifiers, verified completion and cleanup, exact saved-record callback, and no runtime errors. Browser plugin not available; regular Playwright used. Synthetic API responses and media were used; this does not prove managed-provider integration or client visual acceptance. Temporary QA route removed. All 1,178 CMS tests passed with zero skips; standalone TypeScript and production build passed.

Remaining: final Bespoke website renderer/motion, trusted publication and public delivery integration, deployment of database migration 180 to the chosen provider, real media/content approval and client acceptance. Broader whole-site editability, operations and handover remain open.

### Bespoke source-layout renderer

Added a separate CMS Bespoke renderer for all eight typed sections using the existing source page classes and stylesheet. Source content is supplied from the reviewed projection; image loading is injected by the caller rather than granting public asset access. Preserves rich heading runs, paragraphs, quotations, image captions/credits, card links and the hidden specialists CTA. Added optional desktop/mobile image rendering and focal-point/shape hooks, and a CMS-driven single-open FAQ with stable item IDs and unique accessible question/answer associations. Mobile field cards are focusable for native keyboard scrolling and can render in stacked mode.

Controlled reduced-motion browser comparison at 1280/390 pixels matched every captured heading/paragraph, every image alternative/focal point and all nine rendered image dimensions exactly against the existing route. One H1, eight sections, omitted hidden CTA, FAQ Enter/Space interaction and no document overflow passed; mobile horizontal cards responded to ArrowRight. The fixture used original local images with proposed CMS content, not public-media authorization. Browser plugin not available; regular Playwright used. Screenshots were inspected and the temporary route removed.

The renderer is intentionally not connected to public delivery yet. Scoped motion, generic section presentation controls and edited-layout variants still need implementation/verification; the normal-source comparison does not prove those variants. Source route, live content and flags remain unchanged. Publication remains refused until release policy and delivery are complete.

Validation for the source-layout renderer: all 1,178 CMS tests passed with zero skips; standalone TypeScript and production build passed.

### Bespoke scoped motion and accessibility

Added a page-scoped motion wrapper that honors each section's none/fade/reveal setting and the encounter image's independent expansion toggle. Uses transform/opacity only, preserved desktop/mobile encounter scale/timing, reversible GSAP contexts and runtime reduced-motion matching. Server content stays visible without JavaScript. Keyboard focus completes entrance effects immediately; font/image load refreshes are scoped and guarded after cleanup. Revision changes and unmount remove old effects and listeners. The migration proposal now assigns reveal settings to the originally animated content sections while leaving hero/encounter entrance settings at none.

Applied animation-systems skill guidance. Controlled local browser tests passed at 1280/390 pixels for two independent instances, unrelated/static elements remaining untouched, disabled encounter expansion, focus visibility, changing reduced-motion preference at runtime, revision reset and detached-element style cleanup after unmount. The first cold browser run timed out waiting for styles; a separate read confirmed the styles and the same checks passed on rerun without restarting the server. Browser plugin not available; regular Playwright used. Temporary fixture removed. All 1,178 CMS tests passed with zero skips; standalone TypeScript passed before the browser run and the final production build passed.

Pending: full source-motion visual acceptance and edited presentation controls, public-media/delivery and release policy, managed deployment and client/provider acceptance. No live route/content or rollout flags changed.

### Bespoke presentation controls and source defaults

Connected section colour, width, spacing, alignment, semantic heading styling, desktop image side and mobile text/image order to the website renderer. Added shared Bespoke presentation defaults for empty drafts and source migration: ink hero, forest photography, white field/companion/FAQ and paper introduction/paths/encounter; full-width media sections, source photo side and media-first mobile layout. Added reading-width collapse for split sections, readable alternative heading styles and stacked mobile field cards. Existing source shapes/focal points remain unchanged by default.

Desktop/mobile browser comparisons at 1280/390 pixels passed original text, image alternatives/focal points, every image dimension and effective visible section background. Edited fixtures passed white backgrounds, compact spacing, centered alignment, reading width, H3 semantics, reversed desktop photography/companion image sides, text-first mobile split sections and stacked cards without document overflow. The tests caught shared editorial surface CSS overriding explicit CMS colours; corrected specificity and source colour defaults, then reran successfully. Transparent legacy encounter background was compared against its inherited visible colour. Browser plugin not available; regular Playwright used; temporary fixture removed.

Pending: broader combinations of edited crop/width/colour settings and visual acceptance, trusted publication/links/public-media/delivery, managed deployment and client handover. No public route or live content changed.

Presentation-control validation: all 1,178 CMS tests passed with zero skips; production build including TypeScript passed.

### Bespoke editorial publication validation

Connected structural Bespoke projection and scheduled editorial-link findings to stored-content validation. Checks English ordinary-page identity, current/future heading/scroll-target structure and every active hero/path-card/optional companion link at all future section visibility boundaries. Disabled companion buttons and hidden sections do not produce link findings. Dynamic destinations require exact trusted same-site published-path evidence; owned absolute URLs follow the same policy, unsupported queries/fragments/subdomains and path normalization tricks are rejected, and the exact `/plan?guided=true` intent is retained. External HTTPS checks assert syntax only, not remote availability.

Both trusted worker input paths accept and forward `guidedPublishedPaths`; tests show that adding/removing evidence changes the correct finding, while `publication_not_ready` still prevents release. Evidence production in SQL and database release rechecks remain pending. Added four tests for source content, invalid identity, future expiry/optional visibility, exact URL policy and both worker flows. Refreshed Concept/Bespoke inventories after the shared validation dependency change.

No rollout or live content changed. Public projection, media authorization, release-time dependency checks, route integration and deployment remain required before Bespoke publishing can be enabled; client acceptance and broader CMS scope remain open.

Editorial validation milestone: all 1,182 CMS tests passed with zero skips; production build including TypeScript passed.

### Bespoke database-backed published-link evidence

Added local migration `181-guided-editorial-evidence.sql`. A private immutable helper accepts exact local paths or canonical owned HTTPS URLs and rejects queries, fragments, encoded/dot-segment normalization tricks, foreign/subdomain authorities and unsupported ports. `get_validation_input` now supplies deduplicated `guidedPublishedPaths` for the current Bespoke revision, using the existing content-type-specific public eligibility resolver so withdrawn/ineligible records are excluded. Fixed navigation/planning links remain the validator's separate policy rather than fabricated dynamic evidence.

The local database test publishes a synthetic journey through existing review/publish procedures, confirms local and owned absolute references produce one exact path, checks website/current-revision isolation, rejects unsupported URL forms, unpublishes through the normal procedure and confirms the evidence disappears. Direct authenticated access to the private helper is denied. This tests evidence behavior; synthetic journey validation receipts do not constitute acceptance of real client content. All 229 local database tests passed. No managed migration was applied.

Pending: atomic publish-time link/media rechecks, strict public Bespoke projection/media authorization and live-route integration, broader visual acceptance and managed/client handover. Publishing remains blocked and live content is unchanged.

Evidence milestone validation: all 1,183 CMS tests passed with zero skips. This turn changed SQL/tests/docs only; no frontend build was required.

### Bespoke publish-time link dependency guard

Added local migration `182-guided-release-links.sql` with a route-scoped publication trigger. It includes active and future scheduled sections, extracts only rendered hero/path-card/enabled companion links, locks linked records and their media in stable order, locks fixed navigation paths, then rechecks public eligibility. Disabled companion buttons and expired/hidden sections are excluded. Published route/type/locale changes are rejected. Exact planning intent is allowed; unsupported owned URL queries, subdomains and normalization tricks are refused. Anchor existence and schedule relationships remain the trusted structural validator's responsibility.

A dedicated temporary trigger fixture tests this guard independently while the real reserved-route publication prohibition stays enabled. The test verifies a future section's published dependency, disabled-link omission, route mutation refusal, subsequent normal journey withdrawal causing release rejection, unchanged fixture publication pointer and link policy cases. It does not claim a completed Bespoke release workflow. Initial SQL variable ambiguity was corrected; planning-query fallback was tightened, including case-sensitive query values. No user triggers on real records were disabled for this test. The migration was run only in local PGlite.

Pending: strict public projection/media authorization, complete route release gate and real end-to-end Bespoke publication/rollback, concurrent managed-database acceptance and public delivery integration. No live content or rollout changed.

Release-link guard validation: all 1,184 CMS tests passed with zero skips. SQL/tests/docs only; no frontend rebuild required.

### Bespoke public-field projection boundary

Added local migration `183-public-guided.sql`. The private projection helper explicitly allowlists all eight section shapes, editorial runs, paragraph/card/FAQ items, image metadata/framing, links and SEO. It filters audience/time visibility, removes disabled companion buttons and replaces editor-only section labels with kind names. Unknown visible kinds fail closed. The public reader requires the exact English Bespoke published record and current validator policy, checks projected media and configured links, then returns the filtered envelope; it does not enable publication.

Local tests add private sentinel fields at root/composition/section/control/data/image/heading/card/FAQ/SEO levels and confirm none escape. Hidden/future sections, disabled-link details and nested objects substituted into scalar fields are excluded. The resulting full eight-section payload still parses through the strict TypeScript Bespoke projection. Unknown visible kinds/foreign locale fail closed, and anonymous reads of unpublished drafts, other sites and unsupported locales return null. All 231 database tests passed. Successful published reader behavior will be tested with the complete release lifecycle, not claimed from these draft/projection checks.

Pending: generic public-page delegation and public image authorization, complete release gate and actual published/withdrawn read lifecycle, route/SEO/sitemap integration, managed concurrency/storage and client acceptance. SQL was exercised only locally; no live content or rollout changed.

Public projection validation: all 1,185 CMS tests passed with zero skips. SQL/tests/docs only; no frontend rebuild required.

### Bespoke public images and generic page delegation

Added local migration `184-guided-public-images.sql`. Bespoke image eligibility now requires a reference in `get_public_guided`'s filtered payload; the old generic raw-payload image branch explicitly excludes the Bespoke route. Generic `get_public_page` lookup delegates Bespoke to the same public projection, retaining its existing response envelope and preventing a second raw-content path. Other content-type image behavior is preserved.

Anonymous API tests show approved images referenced only by a Bespoke draft remain inaccessible, including from another website; generic page lookup returns null for unpublished/unsupported-locale Bespoke pages. Publishing a separate synthetic journey that uses the same image makes it available through the real public media API, and withdrawing that journey makes it private again despite the remaining Bespoke draft reference. All 232 database tests passed. The first test attempted to call the deliberately private helper as anon; corrected the test to use `get_public_media`, without widening permissions.

Pending: full successful Bespoke publication/read/image/withdraw lifecycle after coordinated release-gate completion, route/SEO/sitemap delivery, managed provider/concurrency checks and client acceptance. No managed migration or live content changed.

Public image milestone validation: all 1,186 CMS tests passed with zero skips. SQL/tests/docs only; no frontend rebuild required.

### Bespoke complete local release lifecycle

Added migration `185-guided-page-publication.sql`, coordinating the reserved-route exemption with a dedicated English Bespoke envelope/palette/region guard. Stored-content validation now recognizes Bespoke's completed structural/link checks instead of unconditionally returning publication_not_ready; existing trusted-receipt, approval, media and new link-dependency guards remain required. This enables the backend lifecycle locally, not a production website rollout. Refreshed Concept/Bespoke source inventories after the shared validator change.

The end-to-end PGlite test uses the full eight-section migration proposal plus valid hidden/future encounter fixtures, real trusted validation workers and separate editor/reviewer/publisher actors. It verifies publication, identical filtered generic/dedicated reads, visible public image access, hidden/future content and images remaining private, a changed draft leaving publication untouched, revoked rights blocking release while preserving the previous pointer, restoration creating a new draft requiring fresh validation/approval, published route mutation rejection, unsupported sections rejected even with a synthetic passing receipt, and withdrawal removing content/image access. Real record triggers remain enabled throughout. Media/rights are synthetic fixtures; no managed data was modified.

Pending: live-route loader/SEO/sitemap and editor workflow presentation, deployment of migrations 180–185 and provider checks, broader visual/concurrent acceptance, real content/media approval and client handover. The existing public website still uses its legacy route.

Local release lifecycle validation: all 1,187 CMS tests passed with zero skips; production build including TypeScript passed.

### Bespoke published loader and sitemap contract

Added an opt-in `readPublishedGuided` loader gated by `CMS_GUIDED_DELIVERY_ENABLED` and general public delivery configuration. It requests only anonymous, website-scoped `get_public_guided` and published SEO defaults, parses the strict English route envelope and full composition, and rereads both before returning to reject changed/withdrawn revisions or changed payloads/defaults. Disabled rollout makes no requests; missing published content returns null without editor fallback. Added sitemap selection through resolved SEO, with no invented modification dates.

Four tests cover complete eight-section reads, anonymous-only credentials and exact request arguments, opt-out/missing content, configuration/time failures before requests, wrong site/route/type/locale and private field rejection, page/default withdrawal or replacement during loading, and noindex sitemap exclusion. These are controlled transport tests; managed-provider behavior remains unverified. No rollout flags changed.

Pending: route/metadata/main sitemap integration and HTTP-level publication/withdrawal checks, editor workflow presentation, provider rollout and client acceptance. The existing public route is unchanged.

Published-loader validation: all 1,191 CMS tests passed with zero skips; standalone TypeScript and production build passed.

### Bespoke route, metadata and sitemap integration

Moved the original route unchanged into `LegacyGuidedPage.tsx` and added a dynamic flag-gated wrapper. With `CMS_GUIDED_DELIVERY_ENABLED` off, original content/metadata remain active. When enabled with public delivery configuration, the route shares a cached published loader between metadata and rendering, uses authorized public image endpoints and fails closed on missing/invalid published content. Missing content returns not-found/noindex rather than legacy or draft fallback. The main sitemap replaces the legacy static entry with the resolved published entry. Added the disabled rollout flag to `.env.example`; no working environment flag changed.

Updated the read-only inventory to capture declarations/disabled CTA from the preserved legacy file while hashing the wrapper and its full dependency graph. Flag-off capture passed desktop/mobile content and FAQ checks (126 source dependencies, eight sections/eight media/eight FAQ states). All 1,191 CMS tests passed with zero skips; production build including TypeScript passed.

Controlled production HTTP checks on temporary port 3017 passed: flag-on renderer/revision, published SEO title/canonical, public media paths, exactly one sitemap entry, withdrawal returning 404 and removing the sitemap entry, and malformed private-bearing public data rejected without rendering/leaking it. Synthetic fetch responses were used; no live provider data was accessed or changed. Temporary server stopped; the existing port-3001 preview stays running.

Rollout still requires migrations 180–185 on the chosen provider, approved/published Bespoke content and published SEO defaults, general public delivery configuration and a deliberate delivery-flag switch. Editor workflow presentation, managed-storage/concurrency acceptance, complete visual/client acceptance and broader whole-site CMS work remain pending.


### Bespoke editor workflow connected (2026-10-23)

The English `/guided-bespoke-safaris` record now exposes trusted validation requests and the shared review/approve/publish/withdraw workflow. Confirmation and success messages identify the Bespoke Safaris rollout. Removed the obsolete section-editor warning that public delivery was unconnected; edits still require saved revisions, approval and trusted checks, and visitor delivery remains flag-gated.

Browser plugin not available; local Playwright used a temporary PagesWorkspace fixture with synthetic commands at 1280 and 390 px. Verified meaningful page/title, no framework error overlay or page errors, trusted-check request/status, dirty-draft action locks, submission/approval, publication cancellation sending no command, confirmed publication/withdrawal carrying the exact saved revision, and correct rollout messaging. Screenshots: `/private/tmp/cms-guided-workflow-1280.png` and `/private/tmp/cms-guided-workflow-390.png`. The initial cold fixture observation timed out; inspection and rerun used the same existing server. A test initially counted the development toolbar as an error portal; the assertion was narrowed to the actual error overlay and passed. Temporary fixture removed before the full suite/build. No managed content or delivery flags changed.

All 1,191 CMS tests passed with zero skips. Managed deployment, real-provider concurrency/storage checks, real-content rights review, full client acceptance and the remaining whole-site CMS scope are still pending. Synthetic UI checks verify command wiring, not provider publication; database lifecycle coverage is recorded in the earlier publication milestone.

Production build including TypeScript passed after removing the synthetic UI fixture.
