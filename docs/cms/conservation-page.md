# Conservation page CMS coverage

Status: source inventory, five draft section editors, preview/public rendering, flagged route/sitemap, local publication lifecycle and authenticated draft migration panel/recovery are implemented. Original source photographs also pass local processing/provenance checks. No managed source upload, live draft migration or website rollout has been performed. Final layout/motion parity, source-claim and image-rights review, managed deployment and client acceptance remain pending. Later verification sections record successive milestones; earlier pending statements describe the stage at that time.

## Captured source

`conservation-migration-inventory.json` records the local route's rendered content and metadata, exact line/emphasis structure, source-file hashes and five image hashes. `scripts/cms/inventory-conservation.mjs` recaptures only from localhost, checks the expected eight metrics/four projects/three regions and writes the inventory. It does not write CMS data. The source dependency test fails when the page, CSS, motion or image bytes change; a recapture must be reviewed rather than used to hide drift.

The source page's factual claims are preserved verbatim. Their current accuracy has not been independently established. The existing Astral Foundation source URL and attribution remain attached to the impact group. Client content review should confirm current claims before publication.

## Business fields and draft controls

| Source area | Contract fields | Implemented draft controls | Delivery status |
|---|---|---|---|
| Hero | `hero.eyebrow`, `heading.lines[].runs`, `copy`, `image`, `credit` | Copy, explicit line breaks/emphasis, processed image picker, alt/decorative setting, credit | Implemented locally; managed rollout pending |
| Position | `intro.label`, `heading`, `paragraphs[]` | Label, heading and ordered paragraph editor | Implemented locally; managed rollout pending |
| Impact introduction | `impact.eyebrow`, `heading`, `copy`, `source` | Text plus source label/HTTPS URL/new-window choice | Implemented locally; managed rollout pending |
| Impact outcomes | `impact.metrics[].id/value/label/tier` | Stable ordered rows; primary/secondary grouping; values remain exact strings including units and plus signs | Implemented locally; managed rollout pending |
| Outcome accessibility labels | `impact.primaryLabel`, `secondaryLabel` | Editable descriptive labels | Implemented locally; managed rollout pending |
| Field record introduction | `fieldRecords.eyebrow`, `heading`, `copy` | Text and heading editor | Implemented locally; managed rollout pending |
| Projects | `fieldRecords.items[].id/place/title/copy/image` | Add/remove/reorder project cards and image picker | Implemented locally; managed rollout pending |
| Footprint | `footprint.eyebrow`, `heading`, `regions[].id/title/copy` | Text and ordered region list | Implemented locally; managed rollout pending |
| Species | `footprint.species.label/copy` | Descriptive label and list copy | Implemented locally; managed rollout pending |
| Metadata | Captured title, description, canonical and Open Graph title/description/image | Existing page SEO controls with source-aware mapping | Implemented locally; managed rollout pending |

Shared header/footer/menu fields belong to the global inventory. They are not included in this route's content contract. The source has no form, interactive filter or empty-state copy.

## Presentation to preserve

The current page uses a full-width desktop hero with dark overlay; at 620px and below its photograph becomes a separate 4:3 block above the heading. Desktop crop is 52%/42%; the mobile override uses 62%/bottom. Hero credit is currently hidden on narrow screens, which needs a deliberate migration decision. Impact splits the first three outcomes into a primary row and the remaining five into a secondary row. Mobile stacks the primary outcomes and displays secondary values beside their descriptions. Projects alternate image/copy columns on desktop and put imagery first on mobile. Footprint regions use three desktop columns and one mobile column.

The captured CSS and motion code own reveal timing, expanding image frames, responsive crop and reduced-motion behavior. These are not yet implemented by the new contract. Approved section-level presentation choices and reorder behavior must be designed and verified before registering these sections for publication; adding text fields alone is not delivery parity.

## Migration boundary

`planConservationMigration` compares the complete source dependency set and rejects drift, unknown/stale image bindings, duplicate mappings and review-placeholder asset IDs. It maps the original text/headings/projects/metrics into `conservationContentSchema`, preserving media alternative text. Without mappings it reports five missing images and supplies visibly named review-only IDs. Even with mappings it remains `readyToApply: false`: processing, rights and current availability require trusted backend evidence.

The proposal has no save, publish or rollout operation. It does not claim preservation of responsive presentation merely because content validation passes. Five section kinds are registered for drafting, with a route-specific palette and an empty conservation starter. The migration proposal includes a validated five-section composition, the exact rendered title and canonical URL, descriptions and a social image mapped from the captured local source. The social image reuses the hero asset mapping without adding a duplicate upload. Explicit source metadata remains stable if global defaults change. Editors cover all content groups, ordered child rows, heading emphasis, media selection and read-only state. Registration does not authorize publication. `conservation-page.ts` now provides a strict shared projection, fixed-route reader and SEO metadata mapping. It preserves section order and exact content, rejects unsupported configured sections/region targeting, and requires one visible H1 at every future visibility boundary. Missing content is distinguished from malformed or failed reads. This is not wired to public delivery or publication authorization. The unsaved draft layout preview now renders all five section types using CmsConservationSection, with authenticated image loading, source links, captions/credits, accessible metric groups and semantic heading levels. It follows composition visibility/order and uses the existing preview presentation controls. It is a content/layout preview, not final website styling or motion parity. Next work is the matching public renderer and website theme/motion, revision-bound publication validation, source-aware media/SEO migration and full desktop/mobile/motion comparison. Managed provider and client acceptance remain separate gates.


## Website renderer foundation

CmsConservationPage now supplies a separate website theme around the shared semantic section component. Original local imagery was checked in an isolated browser fixture at 1280px and 390px: one H1, eight outcomes, four projects, separated mobile hero photograph, visible mobile credit and no horizontal overflow/runtime page errors. Image requests were intercepted with the original local files; this does not prove managed public-media delivery. Migration defaults now preserve dark hero/project/footprint surfaces, left-first alternating desktop projects and image-first mobile order.

The renderer is connected behind the disabled-by-default conservation flag. Remaining design comparison includes intro/impact heading grids, exact spacing and outcome borders, source image filters/crop differences, independent footprint spacing, optional hero caption placement and presentation-control behavior. Scoped fade/reveal entrances and responsive project-image expansion are now implemented. Live reduced-motion changes revert effects, revision changes clean them up, and keyboard focus completes hidden entrances. Exact source choreography, hero entrance and final migration motion defaults still require comparison. Final design parity and public delivery must be verified before rollout. The existing hardcoded route and source hashes remain unchanged.


## Draft validation feedback

Stored-content validation now runs conservation-specific diagnostics for route/type, English locale, unknown root fields, configured unsupported section kinds, region targeting and H1 continuity at future schedule boundaries. Outcome sections receive a source-claim review warning; URL validity is not factual verification. Generic complete-snapshot image verification includes scheduled and hidden sections and SEO social images, rejecting missing or duplicate availability evidence. These are advisory draft findings. Conservation can now pass advisory checks when its content and media evidence are valid; trusted database approval and release checks remain authoritative.


## Published delivery runtime

`loadConservationRoute` now reads only `/conservation-commitment` in English through `get_public_page`, validates the returned revision and then loads same-site published SEO defaults. Requires an exact `CMS_CONSERVATION_PAGE_ENABLED=true`, public delivery enabled and a valid configured website/provider. No request runs for invalid configuration/time; missing pages return null without reading settings. Malformed content, transport failures and unavailable/wrong-site SEO settings fail rather than substituting draft or legacy data. Gateway requests are no-store.

The public route now calls this runtime only when the explicit conservation flag is enabled. No active environment flag was changed. Its transport contract was tested with controlled responses; managed deployment and trusted release authorization remain unverified.


## Database release boundary audit

A PGlite integration test now saves the actual five-section conservation proposal, fetches its trusted validation input and records the worker result. Five unique image dependencies include the hero/social-image reuse; unavailable placeholders produce field-level media findings and publication-not-ready. Editors cannot fabricate trusted receipts. Reviewed content still cannot publish with a failed receipt. Even a deliberately erroneous service-role pass receipt remains blocked by `cms.enforce_custom_page_release` because conservation is a reserved route. Anonymous reads return null and the published revision stays null.

Release integration must therefore be coordinated: add a conservation-specific database route/release policy, explicitly exempt that route from the generic custom-route guard, update trusted validator authorization/version policy as needed, test exact-revision publish/restore/withdraw plus media-rights changes, then wire the flagged public route and discovery. Migration 162 now replaces the reserved-route barrier with a conservation-specific guard; deploy it together with the updated validator. This test covers the existing rejection path, not a completed conservation publication workflow.


## Local publication lifecycle

Migration 162 exempts only the exact conservation route from generic custom-page handling and installs a dedicated release trigger. It checks ordinary-page type, English locale, supported payload roots and configured section kinds, and rejects region targeting or moving an already-published conservation record. Existing revision-bound approval/validation and nested-media lock checks remain in force. The existing composition-5 policy is retained: prior conservation validation could never issue a valid receipt, so no earlier valid conservation receipt is reused. An older worker continues to fail closed.

PGlite tests cover trusted validation, independent review, publication, draft/live separation, rights changes after validation, public suppression when images lose rights, restored drafts requiring new validation/review, withdrawal, route mutation and unsupported-section rejection even with an erroneous privileged pass receipt. No managed migration was applied. Public route wiring, navigation/discovery, layout parity, migration application and client acceptance remain pending.


## Route and sitemap rollout

The public route uses the shared published runtime for both metadata and content with per-render caching. Missing published content becomes not-found; provider errors propagate without legacy/draft fallback. With the flag off, LegacyConservationPage and its metadata are used. The legacy component is a byte-for-byte copy of the captured original page. A fresh local inventory verified unchanged rendered content, metadata and all image hashes; dependency proof now includes both the route wrapper and legacy component.

Sitemap discovery uses the same flag: legacy entry when off, published canonical/indexable content when on. Withdrawn, global/page no-index, sitemap-excluded and noncanonical records are omitted. No modification timestamps are invented. Tests exercise the enabled runtime and sitemap using actual local database public RPCs and ensure withdrawal returns null/empty discovery. Managed provider and an enabled HTTP route/browser acceptance run remain pending. The example flag is false and no active flags or managed state changed.


## Enabled production-route verification

An isolated `next start` server with process-only rollout settings and a trusted local HTTPS test provider exercised the actual enabled HTTP route at 1280px and 390px. It renders CMS content and exact title/canonical/social metadata; withdrawn data yields no content and noindex, while provider errors render no legacy fallback. Browser media requests used original local images. Both ephemeral servers were stopped afterwards. This verifies the application route with controlled provider responses, not managed-provider deployment.

Testing found that a disabled-at-build flag otherwise caused Next.js to pre-render the legacy branch. The route now explicitly uses force-dynamic, confirmed in production build output, so runtime rollout and current published state are evaluated per request. Inventory was recaptured and its business content, metadata and image hashes remain unchanged.


## Authenticated migration backend

`POST /api/cms/migrations/conservation` now supports review, apply and status. It rebuilds the source proposal server-side, binds site/target/revision/content/mappings/evidence into the review digest, checks caller permissions and uses five exact source-to-processed-image mappings. Review includes current draft content and the complete proposed composition/SEO. Apply creates or replaces only a draft. Claims and presentation still require human review.

Migration 163 adds scoped source-media evidence and actor/site-scoped immutable recovery receipts. Apply locks the existing draft and media/upload rows, rechecks source hashes/inspection/rights/current media revision, rejects stale content/evidence or unmapped assets, and saves atomically. Failed transactions leave no receipt or partial draft. Completed retries return the original result without overwriting later edits and still require current permissions. No migration was applied to a managed database.

Tests cover source provenance, unavailable/expired/revoked rights, tenant isolation, stale revisions, media changes between review and apply, rollback, tampered request identities, revoked permission and an HTTP response lost after a successful database save. The client migration panel, actual processed source uploads, final presentation review and managed migration remain pending. The pure planner remains review-only; only authenticated evidence-backed API/SQL application can save a draft.


## Browser migration identity and recovery

The client verifier now rebuilds the local proposal and compares exact server review/source digests, site, target revision, mappings, content and eligibility evidence. It rejects substituted social images/canonical metadata and reordered evidence. Actor/site-scoped recovery records contain bounded identifiers, mappings and evidence only, not page copy or credentials. Only matching apply/status receipts clear recovery; unconfirmed responses remain pending.

Pages now includes the conservation migration panel and supported publication/workflow labels. Its review/pending state participates in editor, navigation, import and other migration guards. A verified save refreshes the page list and the selected draft. Newly created pages can be selected from the refreshed list.


## Migration panel browser verification

At 1280px and 390px, the actual panel was exercised with a server-generated verified review and controlled media/save responses: five image selections, proposal preview, acknowledgement before apply, editing lock during review/save, simulated lost response, page reload, verified status recovery, recovery-key removal and list refresh. No runtime page errors or horizontal overflow after fixing a client directive ordering issue. Unavailable fixture images intentionally tested fallback feedback; provider image selection and real transactional save are separately tested at API/database level. Temporary QA route removed.


## Original photograph processing verification

`tests/cms-conservation-source-media.test.mjs` reads all five original JPEGs and runs the production upload worker and Sharp image inspector. It verifies each inventory fingerprint, the generated WebP checksum, registered dimensions/byte count/inspection version, successful full decode, stripped EXIF/XMP and the 2400px bound. It rereads original files after processing to verify they were not changed. The migration proposal binds the hero and social image to the same asset and each project to its own asset, while remaining review-only.

All five sources passed. The hero derivative is 2400×1600; four project derivatives are 900×700. Scanner and storage adapters are test doubles. This does not establish malware clearance, managed storage delivery, image rights, approved claims or publication. Actual source uploads through configured production services remain pending.
