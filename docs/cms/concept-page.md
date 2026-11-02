# Concept page migration

`/concept` is a distinct public legacy route that renders ConceptExperience using shared homepage data. It does not select the new CMS homepage renderer. Migrating `/` therefore does not establish editability of `/concept`, and the route must not silently share the homepage's published revision unless the client explicitly chooses that behavior.

## Captured evidence

`concept-migration-inventory.json` contains 121 recursively resolved local source dependencies and their hashes, 104 original local media hashes/sizes, rendered copy/headings/links/images, page metadata, top-level source declarations and conditional JSX. The read-only capture script is `scripts/cms/inventory-concept.mjs`. It refuses non-local origins and blocks enquiry POST destinations.

The rendered page has ten sections: hero; story/experience ledger; journey types; curated private journeys; upcoming photography departures; corporate travel; private aviation; preferred partners; guest notes; concierge. Interaction evidence includes three partner regions, all six observed guest-note carousel entries and the expanded concept menu. The menu's labels, links and image data are page-owned evidence, distinct from the root shell.

Six visibility flags are retained as source declarations. Private aviation is enabled; wildest places, conservation, photographic worlds, species index and species editorial are disabled. Five conditional JSX branches are captured, including enabled aviation. The species-index declaration has no matching conditional branch and must not be presented as an implemented section toggle. Dormant source copy is preserved rather than discarded.

Fresh 1280px and 390px reduced-motion loads each had one H1, no page exceptions and document width matching the viewport. Full-page screenshots were inspected as inventory evidence. Date-dependent departures record the observed state only. This capture does not validate hero video playback, non-reduced motion, media rights, testimonials/claims, partner permissions or client design acceptance.

The captured canonical is `https://safaricrafters.com/`, despite the `/concept` path. Migration needs an explicit index/canonical decision, with the original metadata retained for comparison. No automatic SEO correction or public route change has been made.

## Implementation mapping

Reuse existing homepage section contracts where they preserve the evidence: homepageHero, homepageJourneys, homepageDepartures, homepageCorporate, homepageAviation, homepagePartners and homepageGuestNotes. Map the story/ledger, journey-type cards and concierge through the corresponding existing homepage contracts after a field-by-field comparison. This is a reuse plan, not an assertion that the Concept page is editable today.

Remaining work:

- Build a source-bound Concept proposal that retains section order, explicit typography, image framing, claims and record references. Keep disabled source blocks as review material until approved for inclusion.
- Decide and implement independent Concept page authoring, standalone menu ownership and allowed section controls. Avoid coupling ordinary Concept edits to the root homepage.
- Add authenticated preview, trusted validation, dependency/media rechecks, editorial release/withdrawal, route metadata and sitemap behavior for the exact reserved route.
- Verify interactive menu, partner regions, carousel/departures, media and responsive/motion fidelity against the captured content.
- Prepare recoverable draft migration with verified media/record mappings and explicit SEO/claims review, then managed-provider and client acceptance checks.

Two focused inventory tests verify all captured source/asset hashes and the retained disabled/interactive/SEO evidence. No CMS draft, media approval, publication, production setting or live content was changed.

## Independent draft authoring and structural projection

Pages now offers a separate Concept page draft at `/concept`, starting empty rather than copying or sharing the root homepage record. Its section palette reuses the ten editorial landing families plus document downloads. Existing detailed editors/previews support these section contracts; some labels still say “homepage” and need contextual polish. The workspace explains that Concept delivery and dependencies are pending. This is authoring support, not completed source migration.

`projectConceptPage` accepts ordinary page envelopes only and returns the fixed Concept path. It validates English context, schema, supported configured sections, region restrictions and exactly one hero H1 at every future visibility boundary. It preserves ordering and explicit document revisions, projects currently visible sections, and removes private statistic-source evidence without mutating the draft. It does not fetch or authorize referenced content, serve a route or prove media eligibility.

Stored checks now include Concept-specific structural feedback. Concept remains outside the supported publication route list and its reserved route remains protected by the existing database guard. Successful structure checks cannot authorize release. The captured source dependency inventory was refreshed after adding the validator (now 123 dependencies); source page/content and media were not changed.

Five focused tests cover projection, private evidence exclusion, schedules/locales, invalid envelopes, downloads and non-authorizing draft validation. Synthetic desktop/mobile composer checks added hero/story sections to an independent Concept template and verified palette restrictions. Screenshots inspected; fixture removed. These fixtures reuse known-valid homepage-shaped data to test the shared section contracts; they are not evidence that Concept source content has been migrated. Menu ownership, source-bound proposal, eligible published references, renderer/release and provider/client acceptance remain outstanding.

## Published reference resolver

`resolveConceptDependencies` first validates the independent ordinary-page envelope, then resolves its currently visible journey, departure and guest-note sections through trusted published-only readers. A shared internal landing resolver now serves both Concept and homepage wrappers, retaining their separate projections and paths. It preserves editorial ordering, checks catalogue/guest website envelopes, rejects missing or cross-site results, batches guest reads with a maximum of four concurrent requests and excludes consent/name evidence through existing public projections. No bundled or draft fallback is introduced.

Hidden and not-yet-visible sections do not fetch records. Once their visibility boundary is reached, dependency resolution applies normally. This is request-time behavior only: release-time checks must separately cover all configured future references. The reader contract still depends on a trusted server implementation returning published records; this helper alone does not prove publication or provider access.

Five Concept resolver tests cover ordered output, privacy, missing/cross-site/failed readers, hidden/scheduled sections and envelope/context rejection before network access. Existing homepage resolver tests also pass after extraction. Fixtures deliberately reuse valid shared section shapes, not a completed Concept source migration. The standalone menu, public endpoint with appropriate projection, release policy and client/provider verification remain pending.

## Page-owned Concept menu contract and proposal

The inventory now explicitly captures the Concept menu's six primary and six secondary links, planning CTA, closed/open control labels, accessible group labels and six decorative primary images. Menu images live in an aria-hidden presentation stack, so ordinary accessible-content extraction excluded them; explicit menu capture found one additional local asset, bringing the inventory to 105. Closed-state labels are read from the rendered navigation rather than fixed script text.

`conceptNavigationSchema` defines a bounded flat menu belonging to the Concept page revision. It preserves editable labels/order and image identities, rejects duplicate item IDs and unknown fields, and restricts links to ordinary local routes or HTTPS without credentials/ambiguous paths. It does not reuse or mutate the global settings/navigation record. Shared brand ownership is unchanged; integration still needs an explicit brand/header contract.

`planConceptNavigationMigration` binds a review-only menu proposal to the exact inventory source/asset proof. It preserves link and image ordering and decorative intent; missing images use clearly marked review placeholders. Original image hashes and distinct processed asset mappings are required to resolve the placeholders. Even complete mappings do not authorize saving or publishing: processing/rights, local link availability, editor integration and accessible menu rendering remain pending.

Three focused tests verify source-preserving output, isolated proposal copies, stale/unknown/duplicate mappings, unsafe links, duplicate IDs and bounded schema fields. Inventory hash tests and TypeScript also passed. No page record, shared navigation, media rights or rollout flag was changed.

## Concept menu editor and page persistence

Pages now exposes the Concept menu alongside its composition. Editors can add the menu, change its accessible and visible labels, planning action, ordered primary/secondary links, per-link new-tab behavior and primary images through the existing verified-media picker. Reordering preserves link/image identity; editing respects read-only permissions. The starter is deliberately incomplete, and invalid menu fields block saving until completed. Existing malformed menu data is retained with repair feedback rather than silently reset.

Menu data is stored as `payload.navigation` on the ordinary Concept page. Projection accepts and validates this field, returns it separately from sections, and leaves absent menus null for incomplete drafts. Advisory validation reports a missing menu; publication remains disabled. Other page payloads and shared navigation records are not repurposed. The page preview currently previews sections only; an interactive menu renderer/preview is still pending.

Synthetic desktop/mobile checks exercised label editing, stable primary reordering/image identity, adding/removing secondary links, unsafe-link feedback and read-only controls. Screenshots inspected as editor-function evidence, not final workspace visual acceptance; the isolated fixture had a raw state-output element and unavailable image doubles. The fixture was removed. The Concept inventory was recaptured after payload-validator integration and now records 124 local source dependencies and 105 media assets.

## Interactive menu component

`CmsConceptNavigation` renders the page-owned labels, links, planning action and primary images in a native modal dialog. Keyboard focus selects the associated image, Tab/Shift+Tab cycle within visible controls, Escape and link activation close the dialog, and closing restores focus and the prior body overflow value. A revision key remounts menu state and cleans up an open dialog when the reviewed revision changes. New-tab destinations carry `noopener noreferrer`; decorative images retain empty alternative text. Mobile hides the image column, and reduced motion disables the entrance animation.

Synthetic Playwright checks passed at 1280px and 390px with both motion preferences, including focus confinement, outside-focus refusal, Escape restoration, link dismissal, image selection, overflow and revision replacement while open. Browser plugin not available; the existing local server and repository Playwright were used. The first keyboard test exposed Tab leaving the controls; explicit first/last cycling fixed it. Screenshots were inspected and the temporary route removed.

This component is not yet wired into the page preview or public Concept route. Its caller must supply validated menu data and verified media/link availability. Shared brand/header ownership, release checks, source migration application and real client acceptance remain pending. These synthetic checks do not establish full visual parity with the source menu.

## Unsaved menu preview integration

The Pages draft-layout panel now includes the Concept menu using current unsaved editor values. `ConceptNavigationPreview` validates the menu before rendering, reports incomplete/malformed menus, and supplies authenticated `MediaImage` blobs through the renderer's image callback. No public media endpoint is used for these draft images. The shared image loader retains abort/revocation and retry behavior. Other page previews do not receive a Concept menu.

Menu clicks show their destination instead of navigating away from unsaved edits, including new-tab and auxiliary clicks. Closing the preview unmounts the modal and restores body scrolling. Menu value changes remount its interaction state. Public Concept delivery and secure share-link menu integration remain pending; this completes the local unsaved-layout preview only.

Synthetic desktop/mobile checks at 1280px and 390px passed for private blob images, selected destination feedback without URL changes, invalid-menu feedback, image failure and closing the preview while the menu was open. Browser plugin not available; existing Playwright used. A first run timed out before locating the control; a subsequent page inspection showed the expected controls with no JavaScript errors, and completed runs passed. Settled screenshots exposed generic CMS image sizing/button styles, which were corrected with scoped overrides and rechecked. Temporary fixture removed. Final visual parity, real permissions/media service integration and client acceptance are not established by these fixture checks.

## Saved private preview integration

The secure preview viewer now renders `payload.navigation` for ordinary pages at `/concept`, alongside the pinned revision's composition. It uses the same validated menu preview and authenticated media callback. Menus from other page paths and homepage payloads are not rendered. The revision-keyed wrapper resets menu interaction state when the pinned revision changes; unavailable/expired preview state unmounts the menu and releases its modal scroll lock.

Existing access rules are unchanged: `get_preview` requires the assigned recipient, current record-view permission, a valid unrevoked session and the creator's continuing view authority. Image viewing separately requires current media-library access. The viewer refreshes access every 30 seconds, on visibility return and on manual refresh, and clears content at expiry. This is not instantaneous revocation of bytes already displayed or downloaded.

Controlled authenticated-response browser checks passed at 1280px and 390px for the saved menu, exact site/asset/token in private image requests, destination selection, removal after a revoked-access refresh while the dialog was open, body-scroll cleanup and exclusion on another page path. No public image delivery was used. Screenshots inspected, no page errors, temporary fixture removed. Browser plugin not available; repository Playwright used. Managed provider verification, public delivery/release, source migration and client acceptance remain pending.

## Menu validation feedback

Stored Concept validation now checks all primary/secondary/planning destinations through the deployment's navigation URL policy. Unknown paths, unsupported anchors and unsafe URLs receive field-specific errors. A standalone helper can accept exact trusted published-path evidence, but the current Concept validation call supplies none; dynamic destinations remain unverified until a trusted reader is connected. External HTTPS acceptance checks syntax, not reachability. The fixed-route registry proves route ownership, not runtime availability after a future CMS withdrawal; authoritative release-time and delivery checks remain required.

Menu images already pass through the full stored-payload media traversal. Added regression cases prove missing, unavailable and duplicate image evidence is rejected and valid image evidence does not enable Concept publication. Tests also cover all three link groups, owned-host unknown paths, dynamic evidence and fragments/queries/encoded paths. Refreshed the read-only inventory to 125 source dependencies; ten rendered sections, ten interaction states and 105 media assets remain captured. No publication policy or live route was enabled.

## Composition migration evidence

Expanded the independent Concept capture with normalized paragraphs alongside their original text-node/tag structure, figure captions, statistic terms/labels, corporate format labels, journey and departure card actions/metadata, aviation benefits and accessible button labels. Full section snapshots at 1280px and 390px retain computed image positions for responsive framing. Existing heading runs preserve emphasis and line boundaries.

All five hero headline frames are resolved from static source declarations and the current reviewed content snapshot without executing source expressions. A separate non-reduced-motion pass records the two video source declarations and autoplay/mute/loop/inline settings; it does not prove video playback or animation quality. Captured viewport/video media join the original asset hash inventory. Source hashes are rechecked after browser capture so concurrent source edits abort before writing evidence.

This is source-bound migration input, not a completed composition proposal or imported page. Disabled source branches remain separately retained; they are not silently converted into active sections. Statistic evidence, consent, media rights, mapped record content, runtime departure changes and source visual parity still require review. Focused tests verify the rich copy fields, desktop/mobile section order and framing, hero frames and media bindings.

## Source-bound Concept migration proposal

`reviewConceptMigration` binds mappings to the independent capture digest and exact source/media hash set. It lists original image/video identities and 16 referenced records (three journeys, seven captured departures and six guest notes). Guest quotations are now captured separately and retained as testimonial mapping evidence alongside trip and destination. Missing mappings keep the proposal payload null; unknown/stale mappings, duplicate source keys, duplicate target identities and review-placeholder asset IDs are rejected.

`planConceptMigration` converts complete mappings into all ten captured visible sections in their original order, plus the page-owned menu and inherited SEO. It preserves hero frames and desktop/mobile video selection, structured headings and journey-type emphasis, story copy/statistics, corporate captions/formats, image framing, partner region ordering, guest-note selection and concierge links. Section IDs are Concept-specific. It produces an ordinary `/concept` page proposal and never updates the homepage.

This pure proposal has no apply or publication authority. Mapped IDs still require current provider provenance, site/type/revision, processing/rights and consent checks; referenced-record copy must be compared with source evidence. Statistics retain empty supporting-evidence fields for owner review. The inherited root canonical is preserved and flagged; the proposed departure empty-state copy is explicitly flagged as new. Dormant source branches and guest films remain pending rather than becoming enabled sections. Responsive rendering and motion parity are not proved by schema validation.

Tests exercise complete/incomplete mapping behavior, independent page projection, source copy/counts, original quotations, distinct mobile/desktop videos, isolated result copies, stale proofs and duplicate/unknown mappings. The next step is authenticated migration review/apply with current provider evidence and client comparison; no CMS records were written by this milestone.

## Authenticated migration comparison

`POST /api/cms/migrations/concept` now accepts review requests only. It checks caller credentials/origin, page-create authority or an editable English `/concept` target at the expected revision, then reads the exact mapped records through site-scoped `get_editor_record`. Reads run in bounded batches. Unavailable, wrong-identity or malformed responses reject the whole review; client-supplied comparison evidence and apply/status commands are not accepted.

The Concept-specific comparator checks source-visible journey title/duration/region/hero, testimonial quote/trip/category/display name/verification/consent, and expedition imagery/duration/captured departure date and label. The inventory now captures `<time>` text/datetime separately. Findings contain field names and revision identities without echoing private record or consent payloads. This compares current drafts for migration review, not published eligibility or full-record fidelity.

The endpoint reuses the existing caller-scoped image/video evidence readers for source-hash provenance, processing and current rights. Its digest binds site, target revision, source proposal, compared revisions and media evidence. These separate reads are not an atomic snapshot: `applyAvailable` remains false, and a future save must recheck and lock every dependency. No managed migration or provider deployment was performed.

Local tests cover matching and changed copy, missing/wrong-site/type/path/locale records, duplicate evidence, privacy, authorization/origin denial, stale targets, malformed provider responses, missing media/video evidence and digest changes. Actual managed-provider authorization, atomic apply/recovery, editor UI, public delivery and client acceptance remain pending.

## Draft migration transaction

Migration `169-concept-migration.sql` adds actor/site-scoped immutable migration receipts and a draft-only apply function for English `/concept` pages. It checks current create/edit authority even on retries, locks the target and ordered referenced records, rejects changed revisions and validates every payload record/image/video reference against the manifest. Upload/media rows are locked before rereading original-source provenance, processed evidence and current rights. Evidence drift or unavailable dependencies aborts the entire transaction.

Completed retries return the original saved result without replaying the save over newer edits. Receipt lookup is actor-private and requires current page-view permission. New requests still require fresh evidence; a completed receipt is not a statement that the old media remains publishable. The transaction writes a draft and audit event only, retaining publication pointers. It does not itself attest source-copy fidelity or grant publication.

Local database integration exercised replacement, exact replay, private status, conflicting request reuse, later-edit preservation, revoked media, changed referenced revisions, evidence drift, unmapped menu images, missing menu shape, foreign-site/unauthorized callers and revoked access. Homepage pointers remained unchanged. The HTTP endpoint still accepts review only; client evidence validation, apply/status orchestration, recovery UI, new-record end-to-end coverage and managed deployment remain pending.

## Apply/status API and recovery contracts

The migration endpoint now supports review, apply and private status using `concept-migration-review-2`. Review reports apply readiness only when source comparison and every image/video evidence item pass. Apply reconstructs the proposal from capture-bound mappings, checks the reviewed target/digest/evidence, rereads current dependencies for new requests, and calls the draft transaction. Completed retries use the original receipt and transaction's current-authority checks instead of replacing a later draft. Unknown status is explicitly unconfirmed rather than failed.

Added strict client-side mapping, review, pending-request and receipt contracts. They bind account/site, capture, target revision, record identities/revisions and media source hashes; malformed or inconsistent readiness summaries are rejected. Pending recovery retains mapping/evidence identities, not source record bodies or consent evidence. Menu payloads must pass the page-owned navigation schema. The browser migration screen is not connected yet.

API tests cover conflicting/changed evidence, incomplete apply commands, denied targets, lost responses and exact receipt recovery. A full local database/API scenario created a new `/concept` page with all captured mappings, simulated response loss after commit, made a later client edit, recovered status and replayed the original request. The latest draft was preserved, publication stayed null and homepage revision pointers were unchanged. Managed migrations, actual providers, UI acceptance and public release remain pending.

## Pages migration screen

Pages now offers “Review existing concept migration” with a prepared JSON mapping upload, source comparison, section-order review, menu/composition preview, SEO and image/video evidence. It supports a new Concept draft or the selected `/concept` page; selecting a different page prevents a new review. An explicit acknowledgement is required before applying. The mapping file is a migration preparation artifact, not the routine client Word/Excel content-import workflow.

Review and pending recovery lock competing page edits/imports and propagate the workspace's navigation protection. Before a save, account/site-scoped recovery evidence is persisted; storage failure prevents the request. Unknown results retain the request across reloads, with status checking and exact retry. Success clears recovery and opens/refreshes the saved draft. The preview includes the page-owned menu through private draft-image loading.

Synthetic browser checks passed at 1280px and 390px for compare/discard, acknowledgement, workspace editing locks, lost-response reload, unconfirmed status, exact retry, receipt cleanup and saved-draft refresh. A separate storage-failure check confirmed no save request. Screenshots inspected; no page exceptions; temporary fixture removed. Browser plugin not available, so repository Playwright was used. These checks do not prove real provider deployment, source visual parity or client acceptance.

## Public reader contract

Added `parsePublicConceptInput` and an opt-in `readPublishedConcept` loader. The strict public envelope requires the configured website, ordinary page type, `/concept`, English and a valid page-owned menu. Public statistics must omit editorial evidence; a temporary blank value only permits reuse of structural parsing, and the projected result strips it again. Private menu properties and wrong route/language/type envelopes are rejected.

The loader uses anonymous published-only RPC/readers, published SEO defaults and no editor or bundled fallback. It returns undefined when disabled and null for an absent public page. It rereads the page/menu payload and SEO settings after dependency loading, refusing replacement or withdrawal rather than returning mixed snapshots. This recheck is not a transaction across every referenced record; publication/dependency guards and request-time eligibility still need authoritative server support.

The loader is not called by the live Concept route. Its proposed `get_public_concept` RPC, public guest eligibility for Concept, video/page media policy, release guards and renderer integration remain pending. The Concept flag is not enabled or added to deployment configuration. Tests use controlled published RPC responses for ten-section assembly, scoped anonymous requests, evidence exclusion, invalid configuration and concurrent page/SEO changes; they are not managed-database delivery proof.

## Public database projection

Migration 170 implements `get_public_concept` for the English ordinary page at `/concept`. It requires a published revision with valid current-policy composition validation and available media, then allowlists supported visible section fields, SEO and the page-owned navigation. Statistic source evidence and unknown nested/root properties are excluded. It reuses the landing-page media eligibility check, including processed silent hero videos, without changing the media policy for unrelated pages.

This read function does not enable publication: the existing reserved-route release guard still prevents Concept release. It does not yet provide Concept-specific guest eligibility, menu-link dependency locking, release validation or public rendering. Those must be connected before rollout. The migration has not been applied to a managed provider.

An isolated local database test bypassed release triggers only to inspect the read boundary with a deliberately incomplete fixture; it is not a publication acceptance test. It verified anonymous field projection, private-data exclusion, hidden/future omission, wrong-site/language denial, missing/invalid validation, menu-media revocation and page withdrawal. Normal draft reads returned null before the test's forced publication pointer.

## Current published-reference validation

Inspection confirmed `get_public_homepage_guest` is already a site-scoped, published/verified/consented testimonial reader independent of homepage existence. Concept can reuse its public-field projection; a second guest endpoint is unnecessary. Migration 171 adds `get_concept_reference_status` for the exact current English Concept draft, with caller view permission or trusted-service access. Journey, expedition and guest eligibility use the existing public readers and return only availability, type/language and published revision identity.

Trusted validation input now carries `conceptStatus`. Concept consumes the shared landing-reference checks under Concept-specific finding codes, including visible sections scheduled for the future and excluding disabled/expired sections. Missing, duplicated, unavailable or wrong-type/language evidence blocks the relevant references. The overall publication-not-ready finding remains; this is not a release authorization.

Database tests exercised private/scoped/current-revision evidence, guest publication and withdrawal, and trusted-input integration without changing homepage state. Validator tests cover future/hidden sections, missing/duplicate/wrong-type evidence and continued publication refusal. The source inventory was refreshed after validator integration. Release-time locking/rechecks, video/public media delivery, menu destination availability, live renderer and managed/client acceptance remain pending.

## Release-time reference guard

Migration 172 adds a Concept-only publication trigger without changing the existing reserved-route refusal. It locks referenced records and dynamic-link records in identity order, locks their referenced media, and rechecks published journey/expedition/guest eligibility directly. Enabled future sections are included; disabled and expired sections are excluded. Expected reference collections must be arrays. Menu destinations join section links in the check, and the deployment-owned navigation path registry is locked while evaluating links. Moving a published Concept record to another type/path/language is rejected.

The guard is one part of release validation, not complete publication authority. Fixed navigation entries still represent deployment route ownership; full live availability, schema/anchor schedule checks, parent media/video eligibility and the remaining route integration must also be satisfied. It does not enable a live route or change published pointers by itself.

A local temporary-table trigger fixture exercised eligible future guest references, malformed collections, guest withdrawal, disabled sections, unknown menu routes and published-route movement. The real Concept record stayed unpublished. This isolates the guard behavior; complete publication lifecycle and concurrent multi-connection stress testing remain pending, along with managed deployment and client acceptance.

## Published hero-video eligibility

Migration 173 extends the existing public hero-video eligibility function to English `/concept` ordinary pages, while preserving homepage behavior. Concept additionally requires a non-null public Concept projection, current-policy valid composition receipt and available page media. The requested asset must be the desktop or mobile video of a currently visible, unrestricted hero; processing, silent codec constraints and current rights still apply. Existing metadata and storage-read policies reuse this predicate, so original uploads remain private.

Receipt expiry continues to gate new publication rather than interrupt an already published immutable revision; invalidation, policy changes, media-rights expiry/revocation and withdrawal still remove access. This does not change generic page video publication policy or enable Concept release.

An isolated local database/storage-policy fixture passed for Concept processed-video visibility, original-upload denial, revoked/expired rights, receipt expiry, validation-policy changes, invalidation and withdrawal. Publication triggers were bypassed only for this read-boundary fixture, which was rolled back. Managed storage/HTTP playback, generic page release integration, full lifecycle and client acceptance remain pending.

## Draft video validation evidence

Migration 174 extends the private record-media status reader to English ordinary pages at exactly `/concept`. It reuses inspected silent-video eligibility and preserves caller/site/revision scoping, reference deduplication and conflicting image/video rejection. The stored-content validator accepts this route's video references only with one available evidence entry per asset; other ordinary page routes and unsupported languages remain rejected. Missing/duplicate/unavailable evidence does not pass.

Local tests cover route/language isolation, outsider/foreign-site/unknown-revision denial, revoked/expired rights and incomplete upload processing. The database also rejects audio-bearing delivery metadata. This improves draft review only: `publication_not_ready` remains, and generic release/withdrawal media integration, full Concept publishing lifecycle and live renderer remain pending. Migration 174 has not been deployed to a managed database.

## Publication and media withdrawal integration

Migration 175 adds route-aware media/video eligibility overloads and uses them in the publication video trigger and media-withdrawal worker. Only English ordinary `/concept` pages gain the existing inspected hero-video eligibility; older generic callers remain conservative. Publication retains ordered upload/media locks and rechecks eligibility after locking. The worker retains eligible Concept publications and withdraws unavailable media with the existing delivery job/audit event, without duplicate withdrawals.

A local rolled-back fixture verifies exact route/language/site identity, unchanged legacy generic-page rejection, release-time rights revocation, eligible-page retention and one-time withdrawal after rights revocation. Publication checks were isolated with a temporary trigger table, and a published pointer was seeded with triggers disabled solely to test withdrawal. This does not prove the full Concept publication lifecycle or enable release: reserved-route and stored-content publication gates remain. Managed database deployment/concurrency validation, public image delivery integration and renderer/client acceptance remain pending.

## Public image delivery and legacy reader alignment

Migration 176 restricts Concept image eligibility to asset references present in its eligible public projection. This includes page-owned menu images and visible hero posters when the hero uses video. Hidden/future sections, private nested fields and newer draft references do not independently grant anonymous image access. Generic page image authorization excludes `/concept` in every language; only the English Concept reader can authorize that route. Other content-type branches retain their prior behavior.

The generic `get_public_page` entry point now delegates `/concept` to that same filtered projection while retaining its existing response envelope. Image-only Concept revisions therefore cannot expose private statistic evidence or hidden content through the legacy lookup. Current policy/validation, media rights and publication withdrawal apply to both readers.

Local read/storage-policy fixtures cover menu/poster delivery with video, original-upload denial, unpublished/hidden/future/private image exclusion, wrong-site denial, validation invalidation, expired receipt continuity, revoked menu rights and page withdrawal. The image-only projection fixture verifies identical sanitized payloads through both readers. Fixtures seed published pointers only for isolated read tests and roll back; full publication and managed HTTP/storage/client verification remain pending.

## Editorial publication evidence

Concept validation now checks visible links and statistic evidence at the current time and every future section visibility boundary. A section anchor must remain visible for the entire linking section's schedule; unresolved destinations produce field-specific findings. Displayed statistics require nonempty private supporting evidence, which stays excluded from the public projection. Hidden/expired claims do not block publication.

Migration 177 supplies exact same-site published paths from the stored Concept revision to both trusted validation workers. Query/fragment variants do not inherit a path's eligibility. Page-owned menu validation consumes the same trusted path evidence. Withdrawal removes a dynamic destination from subsequent validation input. These checks do not enable publication: the existing incomplete-release gate remains until renderer and remaining release integration are verified.

## Published renderer assembly

`CmsConceptPage` now assembles the resolved public Concept revision with its page-owned menu and shared `CmsLandingSections`. Homepage uses the same section dispatcher while retaining its separate published header. Both retain section controls, resolved dependency ordering, hero behavior, private-statistic exclusion and reduced-motion handling. The Concept component rejects missing navigation and performs no draft or provider reads. The live `/concept` route still uses the existing experience pending release integration.

A temporary local fixture using controlled published dependency/media responses was exercised at 1440 and 390 pixels: ten sections, one H1, three journey cards, menu open/Escape close, partner tabs and arrow-key selection, guest next/previous, reduced-motion video suppression and no horizontal overflow/runtime errors. Mobile screenshot inspected. The first fixture navigation timed out during local compilation; a diagnostic navigation confirmed rendered content and the repeated full interaction run passed. The temporary route was removed. This is synthetic renderer QA, not managed-storage playback or source-design/client acceptance. The shared brand mark and inherited global footer remain part of the outstanding ownership/acceptance review.

## Opt-in route and sitemap

The `/concept` wrapper now uses the published-only loader and `CmsConceptPage` when `CMS_CONCEPT_DELIVERY_ENABLED=true`. The original route component/metadata are preserved in `LegacyConceptPage`; the default remains legacy. Request-local React caching shares loaded content between metadata and rendering. An enabled route with no published revision returns not-found/noindex; invalid dependencies propagate failure instead of returning bundled content.

Sitemap integration replaces the legacy Concept entry only while CMS delivery is enabled. It includes the published page only when resolved SEO permits indexing, sitemap inclusion and the local canonical URL; no modification date is invented. No delivery flag has been enabled in the workspace or managed environment.

Controlled production-build HTTP checks passed for the CMS renderer/revision marker, published metadata and canonical URL, exactly one Concept sitemap entry, withdrawal returning 404/removing the sitemap entry, and unavailable journey dependencies rejecting delivery. The isolated test enabled Concept and expedition delivery (required by departure sections); it did not enable the unrelated global-header rollout. The temporary production process was stopped after testing. Real provider calls, storage playback, publication lifecycle and client acceptance remain unverified.

## Local publication lifecycle enabled

Migration 178 exempts Concept from the generic reserved-route refusal only alongside its dedicated content guard. Ordinary English `/concept` revisions require the expected envelope/menu, supported section palette and no unsupported region targeting. Existing Concept reference/link locks and image/video/document guards remain active. Trusted validation now evaluates all connected checks without the unconditional `publication_not_ready` result or obsolete delivery-pending warning. This supersedes the earlier notes that Concept publishing is disabled in code; managed deployment and the public delivery flag remain unchanged.

A rolled-back local lifecycle fixture, with real trusted validation and separate editor/reviewer/publisher actors, passes draft → submit → approve → publish → edit → restore to new draft → revalidate/reapprove → republish → unpublish. This fixture uses an allowed hero/story composition, page-owned menu, inspected video and images; it does not claim complete ten-section content migration acceptance. No publication triggers were disabled. Revoked video rights between approval/publication reject release and preserve the previous pointer; rights restoration allows the approved revision. Private statistic evidence stays out of public reads. Published route movement fails. An unsupported section remains rejected by SQL even with a synthetic passing worker receipt.

Remaining release work includes full mapped ten-section dependency lifecycle acceptance, managed migration/worker rollout and concurrency verification, real media playback, brand/footer ownership, content/rights approvals and client visual acceptance. Delivery remains opt-in and off in this workspace.

## Ten-section dependency acceptance and linked content types

The complete captured ten-section composition now passes a local trusted publication test with its three journeys, seven expeditions, six consented guest notes, expedition enquiry form, images/videos and two additional guest-linked destination pages. Fixture-only missing publication fields are explicitly completed; this is not approval of real client copy, dates or consent. Public loading through the actual anonymous database readers resolves all ten sections, three selected journey cards and six guest cards without exposing private guest evidence.

This test found that dynamic Concept links incorrectly used the generic page reader, which cannot return destination, expedition or journal records. Migration 179 adds an exact-path, site/language-scoped helper that dispatches those types to their eligible public readers and uses it in both trusted path evidence and publication-time link checks. Fragments/queries do not inherit eligibility. The two captured destination links now qualify only while their destinations are published.

Withdrawing a selected guest makes the public loader reject the complete result and invalidates subsequent draft validation. A synthetic passing receipt still cannot bypass the dependency publication trigger; the previous Concept publication pointer remains intact. Unrelated deliberately incomplete earlier test publications are withdrawn only within the rolled-back fixture transaction to isolate public catalogues. No guard is disabled for the ten-section lifecycle. Managed rollout/concurrency, real media playback, actual migration approval, visual/client acceptance and broader PRD work remain outstanding.


### Concept editor workflow connected (2026-10-23)

Confirmed the full database lifecycle test and trusted content validation support `/concept`, then added the English Concept page to the editor workflow. Trusted-check requests, submit/approve/request-changes, publication confirmation and withdrawal now use the existing revision-bound commands. Confirmation/success notices name the Concept rollout. Replaced outdated integration and video-delivery warnings with the current draft-versus-publication requirements; no delivery flags or provider content changed.

Browser plugin not available; Playwright exercised a temporary PagesWorkspace fixture with synthetic API state at 1280 and 390 px using the CMS stylesheet. Verified page identity/content, no page errors/framework overlay, trusted request/status, unsaved-change locks, submit/approve, cancel without publishing, exact-revision confirmed publish/withdraw and the correct rollout notice. The initial cold fixture observation timed out; inspected and retried on the same server without restarting. Fixture removed before tests/build. Screenshots: `/private/tmp/cms-concept-workflow-1280.png` and `/private/tmp/cms-concept-workflow-390.png`. These UI checks prove command wiring; real database lifecycle coverage remains in `Concept completes trusted review publication restore and withdrawal without bypassing release guards`.

Managed deployment, provider/media checks, real-content approval, visual/client acceptance and remaining whole-site scope remain pending.

Validation: all 1,191 CMS tests passed with zero skips; production build including TypeScript passed.
