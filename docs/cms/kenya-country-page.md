# Kenya country page CMS coverage

## Current state

Kenya is a bespoke `/destinations/kenya` route rendered by `components/KenyaCountryPage.tsx`. The generic destination CMS intentionally reserves this slug and does not make this page editable. The country renderer and live route are unchanged in this batch. No CMS draft, migration, publication or rollout was performed.

A complete initial editorial contract is now retained in `lib/cms/kenya-country-content.ts`, using existing inspected-image references, explicit heading lines/emphasis and page SEO types. It is now registered in the draft builder through ten Kenya section schemas; trusted publication remains unconnected. Raw legacy image paths cannot pass as inspected CMS asset IDs.

## Page-owned field map

| Source section | Contract group | Editable data retained |
|---|---|---|
| PageHero | hero | Title/accent, description, regional meta, image/alt/credit, focal point and ancestor/current-page breadcrumbs |
| kenya-facts | facts | Accessible label, fact headings, values and supporting notes |
| kenya-opening-band | introduction | Eyebrow, explicit heading lines, lead and body paragraphs |
| kenya-places | places | Place titles/subtitles, copy, focus, images and independent image-link/button labels and destinations |
| kenya-gallery | gallery | Heading, copy, accessible label and ordered images with alternative text/credits |
| kenya-luxury | luxury | Eyebrow, heading, image, caption, paragraphs and emphasized closing paragraph |
| kenya-combinations | itineraries | Eyebrow, heading, itinerary title/label/copy/image, CTA and planning URL including route query |
| kenya-faq | faq | Eyebrow, heading, questions and answers |
| kenya-plan-band | planner | Eyebrow, heading, copy and planning CTA |
| kenya-related | related | Eyebrow, heading, country cards, copy and links |

The legacy bento source contains itinerary copy that its current renderer does not display; retain it as source data without silently claiming visible parity. Shared gallery controls such as Close/Previous/Next and root header/footer belong to shared UI/global content; their observed labels are captured, but this contract does not make those shared controls editable. Layout classes and stable semantic anchors remain renderer-owned.

## Read-only baseline

`docs/cms/kenya-source-inventory.json` captures the ten sections at 1280 and 390 pixels, eight distinct source image files, metadata/structured data and fourteen FAQ/gallery interaction states. Source dependencies and media files have SHA-256 identities checked again after capture. A regression test verifies source hashes, matching desktop/mobile section content and retained interactive states. Image hashes identify files, not publishing rights.

Reproduce against the current built local website with `node scripts/capture-cms-kenya-source.mjs http://localhost:3002`. `CMS_CAPTURE_OUTPUT` can target a temporary candidate for comparison. The capture script only permits local preview origins, blocks non-GET/HEAD requests and never follows planning links or submits enquiries. Compare source, text, metadata and media before replacing a retained baseline; do not update it simply to silence a changed-source test.

Evidence: `/private/tmp/cms-kenya-capture.log`, `/private/tmp/cms-kenya-contract.log`, `/private/tmp/cms-kenya-typecheck.log`, `/private/tmp/cms-kenya-full.log`. All 1,482 CMS tests and TypeScript checks pass. Both viewport captures complete with one H1 and no horizontal overflow; FAQ and gallery open/close states pass. Full-page screenshots are `/private/tmp/cms-kenya-source-1280.png` and `/private/tmp/cms-kenya-source-390.png`.

## Remaining integration

1. Verify full source-content visual parity after migration; the ten-section draft preview and section editing are now connected.
2. Finish any remaining section-control styling and client acceptance against the migrated source content.
3. Connect the implemented offline, source-bound migration proposal to authenticated media review and the client interface. Verify rights and availability through trusted provider evidence.
4. Apply migration to a draft only, with scope/revision binding, exact recovery and permission checks.
5. Add trusted validation and dependency/media publication guards, published projection, visitor loader, metadata, sitemap and disabled rollout gate.
6. Verify review/publish/restore/withdraw and both viewport renderings, then perform hosted/provider/client acceptance.
7. Retain Tanzania, Brazil, Uganda/Rwanda, India and generic country/regional-atlas coverage as separate requirements. A Kenya contract does not complete them.


## Structured draft authoring

The Pages template selector now includes **Kenya country draft**, with the fixed initial path `/destinations/kenya` and an empty composition requiring explicit authoring. Its palette is restricted to ten Kenya sections. Each section starts with incomplete fields rather than invented approved copy/media. The generic destination editor retains its reserved-route exclusion.

`kenya-country-sections.ts` defines independent section contracts, avoiding a circular dependency on the composition registry. The original whole-country contract composes those same contracts. Hero emphasis and linked-ancestor/unlinked-current breadcrumb checks apply directly to the hero section. `kenya-section-drafts.ts` supplies independent starter values and normalized controls; `kenya-section-fields.tsx` provides text/paragraph fields, heading-line/emphasis editing, image selection, hero focal point, optional breadcrumb links, captions, flags and ordered collections. Collection IDs are preserved; additions get new IDs and removal/reordering retain the other values. Planning query parameters are editable without being stripped.

This is draft editing, not public delivery. The existing trusted validator still returns publication_not_ready for Kenya, and the database country route has not been opened for release. The Kenya draft renderer/preview is connected as described below; migration and source-content import remain pending. New blank fields must be completed before saving a structurally valid composition.

Registering the ten schemas changed a shared source dependency. Fresh Kenya, Bespoke Safaris, Concept and Private Aviation captures were compared against their previous retained evidence, excluding only capture time/origin and source hashes. All rendered content, metadata, media and interactive evidence matched exactly before dependency captures were replaced. Public renderers were not changed. Logs: `/private/tmp/kenya-editor-{kenya,guided,concept,aviation}-capture.log`.


Verification: all 1,484 CMS regression tests pass with no skips, and the final production build passes. `scripts/check-cms-kenya-authoring.mjs` passes at 1280/390 pixels using intercepted auth/provider transport. It edits each of the ten groups, saves a structurally valid composition, preserves media identities and query parameters, adds/reorders fact items, edits explicit heading lines/emphasis, clears an optional current breadcrumb link, verifies the Kenya-only template palette and disables fields for a read-only account. The initial browser run exposed an implicit template-select naming issue; the selector now has an explicit accessible name. The saved-draft check waits for reload completion, not just a temporarily disabled save button. Mobile field rendering was inspected. Logs: `/private/tmp/cms-kenya-editor-full.log`, `/private/tmp/cms-kenya-editor-build.log`, `/private/tmp/cms-kenya-editor-browser.log`. These are local draft-authoring checks, not real provider saves or publication acceptance.

## Responsive draft preview

`CmsKenyaSection.tsx` renders all ten section contracts with the existing country layout classes and callback-based image delivery. The CMS adapter supplies private blob previews, local schema validation, heading levels, explicit line emphasis, hero focal position, breadcrumbs and preserved planning query strings. FAQ disclosure, a keyboard-operable native dialog gallery, and existing section-edit focus controls work in the available-space and fixed responsive canvases. Preview clicks do not navigate or submit. Gallery images are not truncated. Itinerary copy remains retained but undisplayed, matching the legacy bento. Shared gallery control labels remain fixed. Full generic background/spacing/width control styling is not yet claimed for this specialized renderer.

Verification: production build and 20 targeted composition/template/Kenya tests pass. The extended `scripts/check-cms-kenya-authoring.mjs` verifies all ten sections, private image delivery, focal position, heading emphasis, query preservation, FAQ disclosure, gallery next/previous/Escape/focus return, section-edit focus, viewport overflow, save and read-only state at desktop/mobile sizes. Synthetic provider data is used; this is not staging or publishing acceptance. Evidence: `/private/tmp/cms-kenya-preview-{build,tests,browser}.log` and viewport screenshots.

## Source-bound migration proposal

`lib/cms/kenya-migration.ts` reconstructs ten valid sections from the retained desktop/mobile capture and the hash-bound Kenya editorial module. It retains source heading lines, prose, FAQs, planning queries, hero focal point, visible credits and undisplayed itinerary copy. It requires the complete exact source/media hash set, checks matching responsive content and rejects unknown/stale/duplicate image bindings and reuse of one processed asset for different originals. Missing media uses clearly marked review placeholders; placeholders cannot be submitted as real bindings. Source credits are not evidence of rights.

Run `node --experimental-strip-types scripts/plan-cms-kenya-migration.mjs [media-bindings.json]` to generate JSON on stdout. The command hashes the actual local files before planning and performs no network or CMS writes. Each optional binding has `sourcePath`, `sourceSha256` and `assetId`. Even with all eight bindings supplied, the result remains `review-only` and `readyToApply: false`; site/revision binding, trusted media review, draft apply/recovery and publication are still pending.

Seven Kenya contract/migration tests and TypeScript checks pass. `scripts/check-cms-kenya-migration-preview.mjs` renders the complete proposal with source photographs through intercepted private-media transport and verifies every section's heading text/level, paragraphs, links/labels/query parameters and image alternatives against the retained capture at 1280/390 pixels. It checks horizontal overflow and rejects content writes. Screenshots were inspected. This establishes content parity in local preview, not complete typography/theme parity or provider acceptance. Evidence: `/private/tmp/cms-kenya-migration-{tests,types,browser}.log`, `/private/tmp/cms-kenya-migration-proposal.json`, and `/private/tmp/cms-kenya-source-preview-*.png`.

## Authenticated migration review

`POST /api/cms/migrations/kenya` accepts only a strict `review` command with a site, nullable record/revision pair and all eight original-image bindings. It reconstructs the proposal server-side; browser-supplied payloads or verification evidence are rejected. Existing targets must be editable English Kenya page records at the supplied revision; new targets require page-create permission. Responses are private and uncached.

Image review reuses `review_contact_migration_media` within its existing two-image limit, passing the caller token and selected site to four independent read-only batches. Each response must match the requested identities and hashes in order; an available image must have matching source, a positive revision and a processed hash. The existing database verifier checks inspected image-1 uploads, delivery keys, processing readiness, archive status and approved/unexpired usage rights. No new database migration or permission broadening was introduced. Review digests bind source, selected site, target/revision and observed image evidence. These separate observations are not an atomic snapshot: future application must recheck all eight under transaction locks.

`applyAvailable` remains false even when every image passes. Client review controls are now connected as described below. Atomic draft application/recovery and public delivery remain pending. Local verification: 1,491 full CMS tests passed with no skips; an additional digest-binding test also passes in the five-test Kenya API suite. TypeScript checks pass. Logs: `/private/tmp/cms-kenya-review-{full,api,types,build}.log`. Provider transport in API tests is synthetic; hosted permissions and storage verification remain unproven.

## Client migration review

The Pages workspace includes **Review existing Kenya content**, with eight source-image library pickers and new/selected-Kenya target modes. Checking invokes the authenticated review API. `kenya-migration-client.ts` validates the full response, reconstructs the expected proposal and verifies scope, content, metadata and evidence digests before display. The interface reports individual image availability, findings, proposed SEO and a responsive draft preview. Duplicate image selections disable checking. Changing images or target invalidates prior results; account/site changes remount the panel; record/revision changes invalidate its review without discarding a pending save request. Discard clears the review. The draft-only save action and durable recovery controls are described below. Publication is not connected.

Verification: 13 Kenya contract, planner, API and client tests pass; TypeScript and production build pass. `scripts/check-cms-kenya-migration-review.mjs` passes at 1280/390 pixels using the real review handler with synthetic library/database transport. It covers all eight pickers, complete source-content preview, unavailable media, duplicate prevention, changed-selection invalidation, forged-response rejection and discard; content writes are rejected by the fixture. Mobile screenshot inspected. Logs: `/private/tmp/cms-kenya-review-ui-{all,types,build,browser}.log`. Hosted provider acceptance remains pending.

## Atomic draft transaction

Migration `232-kenya-migration.sql` adds actor/site-scoped, RLS-protected migration receipts and `apply_kenya_migration` / `get_kenya_migration_result`. Apply accepts the ten Kenya sections in source order, eight distinct media bindings and exact reviewed evidence. It checks current create/edit authority, fixes the target to the English `/destinations/kenya` page, locks existing targets and receipts, rejects revision conflicts and reused request identities, and locks uploads/media in stable ID order before rechecking original hashes, processing, delivery keys, archive status and current rights. All payload asset IDs must equal the reviewed set; unrelated record references are rejected. Save, receipt and audit happen in one transaction. Nothing is published.

Exact completed retries return the immutable historical result after current authority checks; later edits or withdrawn image rights do not create another revision. Status lookup is private to the original actor/site and requires current view access. The new SQL is present locally only; the public HTTP handler and client still expose review only until apply/recovery integration is completed.

Verification: all 1,494 CMS tests pass with no skips. The local PGlite transaction test covers the eighth image (not just the first batch), revoked/expired rights, archived images, changed processing revisions/hashes/storage keys, evidence mismatch, foreign assets/references, missing sections, wrong target/site, anonymous/unauthorized access, rollback of receipts/revisions, unpublished save, audit creation, exact retry, changed-manifest refusal, stale/current revision updates, private receipts and revoked create permission. Hosted multi-session lock contention is not proven by this local test. The offline planner accepts 232 ordered migrations against a synthetic empty ledger; no hosted migration was applied. Evidence: `/private/tmp/cms-kenya-apply-{db,full}.log`, `/private/tmp/cms-kenya-apply-plan.json`.

## Apply API and receipt recovery

The Kenya endpoint now also accepts strict `apply` and `status` commands. Apply reconstructs the proposal server-side, rejects client payload injection, binds the review digest to the selected site/target/revision and all eight reviewed image observations, and rechecks current permissions/media before calling the atomic transaction. A completed receipt is matched against the source/review/request identity, then the same transaction is reentered for current authority and exact-manifest validation. Malformed or inconsistent results fail closed. Status returns an actor-scoped completed receipt or `unconfirmed`; absence of a receipt does not mean a pending request was cancelled.

The client save/recovery flow is now connected as described below. `applyAvailable` is true only when all eight images verify. Nothing publishes through this endpoint.

Verification: the HTTP handler was exercised against actual local SQL, including a synthetic response lost after commit. Status recovered the saved draft, exact replay returned the same result, and revision/receipt counts increased only once. API tests cover injected payloads, altered review/site/image identities, permission loss, changed/unavailable evidence and mismatched receipts/results. All 1,497 CMS tests pass with no skips. Logs: `/private/tmp/cms-kenya-apply-api-{tests,full,types,build}.log`. Hosted provider and concurrent-session acceptance remain pending.

## Client draft save and durable recovery

After a successful image review, clients explicitly acknowledge the copy/images/SEO and choose **Apply reviewed Kenya draft**. The exact request key, site/account/target scope, source/review digests and image evidence are persisted before sending. Recovery stores no page copy or credentials. Web Locks coordinate this migration across tabs. A pending request disables conflicting page edits and migration actions. Failed responses and failed saved-record reloads retain the request; **Check Kenya migration result** and **Retry same Kenya migration** reuse it. Recovery clears only after the returned draft loads. A stale second tab reuses its original request rather than creating a new save. Invalid/unreadable recovery storage blocks saving.

Verification: all 1,498 CMS tests pass with no skips and the production build passes. Client tests reject cross-account/site recovery and mismatched receipts. The browser fixture at 1280/390 pixels exercises review acknowledgement, storage-failure blocking before any save request, lost responses after a synthetic commit, refresh recovery, failed reload retention and exact retries across two tabs with one saved draft. A separate local HTTP-to-SQL test established actual transaction idempotency. Browser transport remains synthetic; hosted storage/auth/concurrency and client acceptance are not claimed. Logs: `/private/tmp/cms-kenya-recovery-{tests,types,full,build,browser}.log`.

## Publication structure and trusted observations

`projectKenyaPage` projects valid English Kenya compositions, checks supported section kinds and requires one hero H1 throughout future visibility boundaries. It retains source layout defaults; region targeting, animations and unimplemented layout overrides are rejected explicitly. Full support for these overrides remains a requirement, not an implied scope reduction. `validateKenyaPublication` checks the saved site/record/revision, SEO, exact image evidence (including hidden images), visible/future links and section-anchor lifetimes. Query-bearing links retain their query strings; availability is checked against the pathname. Another page being published does not prove that its fragment anchors exist.

Migration `233-kenya-publication-evidence.sql` adds a service-only, current-revision-bound evidence RPC with media availability and referenced published paths. Superseded revisions, wrong sites and non-Kenya records return no snapshot; editor/anonymous execution is denied. It exposes no storage keys. Referenced dynamic routes still require trusted availability evidence; a legacy source capture alone is not publication permission.

Verification: all 1,503 CMS tests pass with no skips; TypeScript passes. Local SQL checks verify service-only access and current revision binding. Pure validator tests cover exact media sets, hidden/unavailable images, foreign/stale evidence, scheduled hero gaps, unsupported controls, query preservation, unverified paths and future anchor loss. Offline planning accepts 233 ordered migrations against a synthetic ledger; no hosted application occurred. Logs: `/private/tmp/cms-kenya-publication-{tests,full,types}.log`, `/private/tmp/cms-kenya-publication-plan.json`.

Remaining: connect these checks to both trusted validation workers and receipts, add locked publish-time dependency guards and visitor delivery, complete specialized layout controls/theme parity, then verify review/publish/restore/withdraw and hosted/client acceptance. The generic validator still rejects Kenya publication as not connected; this batch does not enable a release.

## Trusted worker integration

Migration `234-kenya-worker-evidence.sql` extends the latest `get_validation_input` implementation with Kenya evidence while preserving existing page-family, form, download, reference and homepage fields. Both direct and leased queue workers now call the same Kenya evaluator. Only the generic unsupported-page finding is replaced; all generic media and structural errors remain blocking. Evidence must match the requested saved revision. Missing/foreign evidence yields failed findings; malformed transport evidence cannot produce a valid receipt and queued work follows its existing retry path.

Verification: all 1,506 CMS tests pass with no skips, TypeScript and production build pass. Tests cover successful and failed direct/queued results, identical findings and lease-token acknowledgement, malformed/missing/foreign evidence, generic media failures and malformed composition. The actual local SQL worker path obtains the restricted snapshot and records Kenya-specific link failures for source destinations that lack trusted published availability. Offline planning accepts 234 migrations against a synthetic ledger; nothing was applied to a hosted target. Logs: `/private/tmp/cms-kenya-workers-{tests,types,full,build}.log`, `/private/tmp/cms-kenya-workers-plan.json`.

Still pending: publish-time dependency locks/guards, published projection and visitor loader, release rollout/UI connection, actual linked-route availability, layout-control parity, and hosted/client lifecycle acceptance. Worker validation alone does not enable Kenya publication.

## Publish-time dependency safeguards

Migration `235-kenya-publication-guards.sql` adds a private local-link parser, dependency assertion and release trigger. It validates the supported Kenya section/control set, includes future visible links and all stored images, locks referenced page records in ID order, then locks collected media in ID order before rechecking. Own images must be processed WebP with current approved rights, evidence and no archive/expiry. Referenced routes must remain in the deployment-owned public-route table or pass the existing published-content resolver. Planning queries are preserved in stored content while their pathnames select dependencies. External URLs, malformed paths and unverified cross-page anchors are rejected. Self-anchor schedule correctness remains the trusted structural validator's responsibility. The trigger protects the English Kenya route on publication-pointer or route/type/locale changes; withdrawal remains possible.

Local tests exercise the assertion with complete valid image fixtures, fixed-route removal, unverified dynamic paths, query parsing, future unavailable links, unsupported controls, revoked/expired/archived media, hidden unavailable images and denied editor/anonymous invocation. The trigger is registered, but the independent reserved-route gate still prevents Kenya release; a complete public lifecycle test must follow delivery integration. The test cleanup now rolls back before resetting the role so a failed SQL statement does not hide the original error behind an aborted-transaction cleanup failure.

All 1,506 CMS tests pass with no skips. Offline planning accepts 235 migrations using a synthetic ledger. No hosted SQL was applied; multi-session lock contention and linked-route withdrawal during real publication remain pending. Logs: `/private/tmp/cms-kenya-guards-{tests,full}.log`, `/private/tmp/cms-kenya-guards-plan.json`.

## Published projection and anonymous read boundary

Migration `236-public-kenya.sql` adds an explicit field allowlist for all ten section types, current visibility projection, sanitized controls/SEO and `get_public_kenya`. Hidden/future sections, internal labels, time bounds and unknown nested fields are excluded. The reader requires a valid current-policy receipt for the published revision, eligible visible media and currently available links/anchors. Query strings remain in returned content. It reads the published pointer, not the current draft pointer.

Migration `237-kenya-public-images.sql` preserves existing family image rules while routing Kenya image eligibility through that projected reader. It excludes Kenya from the generic raw-page image branch and delegates generic `get_public_page` calls for the Kenya path to the same sanitized reader. Losing Kenya eligibility therefore removes its page-based image access too (an image independently used by another eligible publication can remain available).

Verification: all 1,506 CMS tests pass with no skips. Local SQL tests verify nested field filtering, private labels/hidden/future copy removal, query preservation, locale/hero constraints, anonymous access boundaries, matching specialized/generic responses, revoked media, removed routes, invalid receipts and withdrawal. Delivery tests temporarily bypass only the still-closed custom-route deployment gate inside a rolled-back fixture; structural validation, approval and Kenya dependency checks remain active. This is delivery isolation, not proof that normal Kenya release is enabled. Offline planning accepts 237 ordered migrations against a synthetic ledger; no hosted migration occurred. Logs: `/private/tmp/cms-kenya-public-{tests,full}.log`, `/private/tmp/cms-kenya-public-plan.json`.

Next: server loader, website renderer/metadata and rollout switch, then the normal release gate and a full lifecycle test without bypassing it. Layout controls and hosted/client acceptance remain pending.

## Published server loader

`published-kenya.ts` adds a disabled-by-default `CMS_KENYA_DELIVERY_ENABLED` switch and a published-only loader. With the switch off it performs no network calls. When enabled it requires public delivery configuration and a valid site, reads Kenya and published SEO defaults using anonymous uncached RPC calls, validates the exact website/path/language/type and structural projection, then rereads both to detect withdrawal or changes during loading. Missing content returns null; missing configuration, malformed content, unavailable SEO, transport failure or changed snapshots throw. It never substitutes drafts or legacy content after activation. No service-role key is needed.

`kenya-sitemap.ts` derives sitemap inclusion from the loaded page and published SEO defaults without inventing a modification date. The loader and sitemap helper are now wired into the destination route and sitemap behind the disabled switch (see website integration below). `.env.example` keeps the new switch false.

Verification: five targeted loader/sitemap tests and TypeScript checks pass. Tests cover zero-I/O disabled/misconfigured cases, anonymous no-store calls, complete source content/query preservation, foreign/malformed identities, missing content/SEO, provider failure, changes between reads and sitemap exclusions. Logs: `/private/tmp/cms-kenya-loader-{tests,types}.log`. These transport tests are synthetic; route/browser and hosted checks remain pending.

## Website integration — locally verified

The `/destinations/kenya` route now shares a request-cached published loader between metadata and the server renderer. When disabled, it keeps the original page. When enabled, missing eligible content returns 404; provider/configuration errors propagate without substituting legacy content. `CmsKenyaPage` renders the ten projected section kinds, public-authorized images, content-derived breadcrumb/FAQ structured data and the existing interactive gallery. Gallery capacity is explicitly 30 for Kenya, matching the authoring contract; other callers retain their previous limits. Gallery Escape and close now return focus to the original opening button even after moving between photographs.

The sitemap replaces the legacy Kenya entry only when activated, emits one eligible published URL, respects noindex/exclusion and removes unavailable content. Public media and planning query strings are preserved. No rollout flag was enabled in project configuration.

Verification: production build and all 1,511 CMS tests pass. `scripts/check-cms-kenya-public.mjs` runs the real Next route and media endpoint against an explicitly local provider fixture. Desktop/mobile checks cover ten sections, one H1, loaded images, no horizontal overflow, FAQ interaction, gallery keyboard/focus, canonical metadata, exactly one sitemap entry, noindex, rights revocation and withdrawal. The disabled legacy Kenya/Guided/Concept/Aviation rendered captures remain unchanged; only source dependency hashes were refreshed. Logs: `/private/tmp/cms-kenya-integration-full.log`, `/private/tmp/cms-kenya-integration-final-build.log`, `/private/tmp/cms-kenya-public-browser.log`.

Remaining after website integration: normal release/UI lifecycle (completed locally below), verified linked-route availability, specialized layout-control parity, hosted provider verification and client acceptance. Local browser fixtures do not establish hosted readiness.

## Normal release workflow

Migration `238-kenya-release.sql` adds Kenya to the specialized route exemptions in the current custom-page guard. It preserves migration 229's transaction-bound URL proposal authorization and leaves the Kenya dependency trigger active. The Pages workspace exposes trusted checks, review/approval, confirmed publication/withdrawal and scheduling for English Kenya records, subject to existing permissions, dirty-state and busy-state restrictions. Other languages remain unsupported for publication.

Local SQL acceptance now runs with every records trigger enabled, replacing the previous delivery-only fixture bypass. It covers trusted validation → submit → approve → publish → withdraw → restore as a new draft → revalidate → approve → republish. A rights revocation between approval and publication blocks the actual publish operation and retains an empty published pointer. Editor-only publication is denied; restored public content excludes later draft changes. Existing link, media, public projection, withdrawal and migration recovery checks remain active.

Validation evidence: desktop/mobile Chromium authoring checks pass, including trusted-check requests, review/approval, publish cancellation and confirmation, withdrawal confirmation, non-publisher restrictions and unsupported-language hiding (synthetic API responses; `/private/tmp/cms-kenya-release-browser.log`). All 1,511 CMS tests and production build pass; the offline planner includes 238 migrations against a synthetic empty ledger. No hosted migration was executed. Logs: `/private/tmp/cms-kenya-release-full.log`, `/private/tmp/cms-kenya-release-build.log`, `/private/tmp/cms-kenya-release-plan.json`.

Still required for delivery: actual linked destinations must be eligible, specialized layout/control parity must be completed, and real staging/provider, concurrency and client acceptance must pass before activating the website flag.

## Width, spacing and text alignment

The shared Kenya section renderer now applies content width (reading/content/full), section spacing (compact/standard/generous) and text alignment (start/center) in both private draft preview and published output. Defaults preserve the source layout. Reading width caps the content at 780px; full width keeps 16px side gutters. Compact spacing is 32px; generous spacing is 96px desktop / 56px mobile. Nested original section padding is removed for explicit spacing overrides, and hero navigation clearance is retained. Center alignment includes the hero content that previously forced left alignment.

Migration `239-kenya-layout-controls.sql` preserves dependency locks and public allowlisting while accepting exactly these implemented enum values. The TypeScript projection accepts the same choices. Unsupported background, image/mobile ordering, animation and region targeting remain blocked; these are still outstanding implementation work, not removed requirements.

Verification covers all 18 valid control combinations in publication checks, SQL guard acceptance and public projection preservation, and desktop/mobile browser measurements across ten section kinds for reading/full × compact/generous × centered. Authoring checks select, save and preview reading/compact/center in both responsive viewports. All 1,512 CMS tests and the production build pass. Default legacy Kenya, Guided, Concept and Aviation content remains unchanged after source recapture. Logs: `/private/tmp/cms-kenya-layout-{unit,db,authoring,public,full,final-build}.log`. Hosted verification remains outstanding.

## Hero crop parity

The original hero applies a 1.18 desktop zoom with a 35% / 90% transform origin, in addition to its editable object-position focal point. The CMS media wrapper previously prevented the original direct-child selector from applying. Shared CMS CSS now restores this zoom for preview and public images and removes it below the original 760px mobile breakpoint.

Source capture now records the hero transform, object position and image filter separately for desktop/mobile. Public browser checks compare all three properties directly with this captured evidence; responsive draft checks verify the desktop/mobile transform and focal point. Default rendered content for the four affected source inventories remains unchanged. This fixes a visual parity defect; background, image-order and animation controls are still pending.

Verification: all 1,512 CMS tests, production build, responsive authoring and public browser checks pass. Logs: `/private/tmp/cms-kenya-crop-{full,final-build,authoring,public}.log`. No hosted change or rollout activation occurred.

## Optional public entrance motion

Kenya now implements the saved `none`, `fade` and `reveal` animation choices. `CmsKenyaMotion` follows the existing Aviation Web Animations/IntersectionObserver approach without adding a motion dependency. It animates direct content groups once as they enter the viewport (520ms, opacity plus a 16px rise for reveal). Hero image, scrim and credit are excluded so the original image crop is preserved. Keyboard focus cancels a pending entrance immediately. Reduced-motion preference changes cancel active/paused effects; no JavaScript or missing observer/animation support leaves server content visible. Cleanup cancels animations and disconnects observers on revision changes/unmount.

Migration `240-kenya-motion.sql` accepts exactly the implemented animation values in the dependency guard and public projection; existing media/link locks and other unsupported-control checks remain intact. The pure publication check and public projection retain animation settings without altering content/order. The editor saves the choice; draft previews remain intentionally static, as their existing notice explains. Interactive motion preview remains part of broader preview parity work.

Local evidence: publication tests cover all three values; SQL checks verify fade/reveal preservation; Chromium checks both effects at 1280px/390px, paused entrance frames, focus cancellation, live reduced-motion changes, reduced-motion reload, no-JavaScript and missing-observer fallback. Editor and default legacy captures pass. All 1,513 CMS tests and the final production build pass. Logs: `/private/tmp/cms-kenya-motion-{unit,db,browser,authoring,full,final-build}.log`. Offline migration planning includes 240 migrations without applying them to a provider.

Remaining Kenya controls: background and desktop/mobile image ordering, region targeting and full interactive preview parity. Real linked-route availability, hosted verification and client acceptance remain outstanding; the rollout flag stays off.

## Explicit palettes and image ordering

The editor now offers **Original layout** for Kenya section palettes and supported image arrangements. Optional `kenyaOverrides` flags distinguish an explicit selection of paper/end/text-first from the same enum values used by historical source defaults. Absent flags preserve all previously valid source layouts; non-default draft values are treated as explicit choices. Other section families cannot use these flags.

The hero retains its image-led background. All other Kenya sections support paper, white, forest and ink palettes with coordinated headings, body copy, captions, accents, focus outlines and buttons. Image-overlay itinerary cards retain light text. Explicit bands on container sections extend to the page edges without changing content width. Palettes override global editorial defaults only when explicitly selected.

Places and luxury sections support image start/end on desktop and text-first/media-first on mobile. Other section kinds hide those irrelevant controls; publication rejects unsupported combinations rather than silently ignoring them. Original layout preserves alternating places and the original luxury composition. The shared renderer supplies both private preview and public output.

Migration `241-kenya-presentation-overrides.sql` validates override flag shape, enum values and applicable section kinds, preserves dependency locking, and includes only the three boolean flags in the public projection. Tests cover explicit defaults, inheritance, malformed/irrelevant flags, all palette/order combinations and rejection on unrelated section families. Browser acceptance measures four palettes × two desktop sides × two mobile orders at both viewport sizes, checks text contrast and overflow, and verifies original-layout inheritance. The authoring fixture selects explicit paper/end/text-first and verifies responsive preview.

Hosted provider activation, region targeting, interactive motion preview, other country families and client acceptance remain outstanding.

Regression evidence: all 1,515 CMS tests and production build pass. Default Kenya, Guided, Concept and Aviation content remains unchanged after source recapture. Logs: `/private/tmp/cms-kenya-presentation-{unit,db,authoring,public,regression,full,final-build}.log`; offline migration plan: `/private/tmp/cms-kenya-presentation-plan.json`. No hosted migration or rollout activation occurred.

## Interactive motion preview

The draft preview now offers Play Kenya animations, Replay Kenya animations and Stop animations when Kenya sections contain motion choices. Preview remains static until explicitly played; closing it resets playback. Playback uses the same `startKenyaMotion` engine as the public page. The engine reads browser APIs, element constructors and motion preferences from the element's owning document, so desktop/mobile preview iframes have their own correct viewport and keyboard handling. Revision/content changes and unmount cancel prior animations.

Desktop/mobile authoring acceptance exercises paused entrances inside the iframe, keyboard focus making pending content visible, replay, live reduced-motion cancellation, replay under reduced motion and stop. The fixture asserts no extra save/publish requests. Existing authoring, palette, gallery and workflow checks still pass. Default legacy captures remain unchanged. Public motion regression verifies the shared engine's normal page behavior and no-JavaScript/no-observer fallbacks.

This closes Kenya's saved entrance-motion preview gap. Region targeting, other country coverage, provider activation and independent client acceptance remain pending.

Verification: all 1,515 CMS tests, production build, responsive editor motion checks and public motion regressions pass. Logs: `/private/tmp/cms-kenya-motion-preview-{types,authoring,full,final-build,public}.log`. No hosted configuration or rollout flag changed.
