# Reusable leadership profiles

Status: versioned draft contract, scoped storage/search and authenticated save/list APIs are implemented locally. The client workspace, private preview and recovery controls are connected locally. Trusted saved-revision validation is connected locally. Guarded publication and editor review/release controls are connected locally. Visitor directory/profile pages are connected locally. Reusable section consumption, imports and hosted/client acceptance remain unfinished. Existing About-page cards are unchanged and are not treated as migrated records.

The retained PRD §14 requires reusable leadership profiles with relationships, search/filtering, ownership, revisions, SEO and publishing. Profiles use a name (`title`), stable slug, role, department, current/former status, display order, summary, optional portrait, rich biography, labeled safe links, related pages/projects/articles/documents, SEO and private notes. They have their own identity, separate from trip-planning specialist records. No real names or biographies are seeded.

The strict contract limits field lengths, rich blocks, links and relationships, rejects duplicate block/reference identities and unsafe URLs, and supports incomplete drafts. Editorial findings require role, summary and a substantive biography paragraph. These findings do not verify image rights or authorize publication.

Migration 341 admits leadership records with `/leadership/<slug>` draft routes, shared ownership/permissions and revision storage. Creation uses durable request IDs and scoped cancellation fences; restoration preserves the original profile name. Search combines literal text, department, review status, ownership and publication state before bounded UUID pagination. Migration 345 replaces the initial publication block with approval, fresh validation and current-dependency guards. Migration 346 reserves the leadership namespace against competing records and redirects.

`/api/cms/leadership` validates saves against the contract and binds updates to the existing type, revision, route and language. Creation and cancellation require verified receipts; list responses verify pagination and reject unexpected fields. API reads use private no-store responses.

Verification: all 1,954 CMS tests, production build, TypeScript and offline planning for 341 migrations pass. Database cases cover durable creation, department/literal search, site isolation, stale updates, cancellation, publication blocking, unauthorized access and restoration. Verification evidence: `/private/tmp/cms-leadership-draft-{tests,full,build,types,migrations}.log`. No hosted migration or deployment has been performed.

Next: reusable section consumption, Word/Excel imports, scheduling/translations, then hosted and client acceptance. The module is not complete until those paths are verified.

## Client authoring

The CMS Leadership workspace now provides structured profile fields, rich biography blocks, portraits, safe links, related-record selection, SEO and private notes. It includes department/text/review/ownership search, undo/redo, permission-aware editing, private preview, record ownership and revision restoration. Preview uses private media access and excludes internal notes and raw relationship IDs; links are shown without navigation.

New/saved browser recovery remains opt-in. Interrupted creation retains its request identity; interrupted updates reread the current record and distinguish an equivalent committed result, unchanged base and a newer conflicting revision. Conflict comparison preserves local edits and requires explicit choices. Recovery is scoped to account, website, record type, language and route.

Verification: ten focused leadership tests, production build and TypeScript pass. Desktop (1280) and mobile (390) synthetic browser workflows cover rich biography editing, undo/redo, new/saved recovery copies, interrupted creation and updates, preview privacy, field conflicts, restoration and read-only controls. Evidence: `/private/tmp/cms-leadership-ui-{tests,build,types,browser}.log`. Provider persistence remains covered by the preceding local database tests; browser fixtures do not establish hosted acceptance.

## Trusted saved-revision validation

Migration 342 supplies service-only evidence for the exact current leadership revision: selected media processing/current rights, typed same-site related records and internal links. The worker uses `leadership-1` policy and matches evidence identity and exact selected dependencies. Missing, duplicate, extra, unavailable, unpublished or wrong-language dependencies block content checks. Profile links and rich biography links are checked; unsupported fragment destinations are blocked. Localized public delivery remains unavailable, so non-English validation reports that limitation.

The editor can queue a trusted check and refresh its revision-bound result. Requests are disabled while edits are unsaved or workspace operations are locked. Expired results are not shown as valid. Passing content checks does not enable publication; migration 345 now supplies the separate approval and current-evidence publication guards.

Verification evidence: `/private/tmp/cms-leadership-validation-{tests,db,full,build,types,migrations,browser}.log`. Tests cover exact revision/type/path/language identity, missing/duplicate/changed dependencies, revoked media, stale revisions and privileged evidence access. No hosted migrations or worker activation occurred.

All 1,961 CMS tests, production build, TypeScript and offline 342-migration planning pass. Desktop/mobile authoring fixtures also pass trusted-check request/status display and unsaved-edit guards alongside existing recovery flows. The local preview was stopped.

## Public reader boundary

Migration 343 adds anonymous detail/list readers backed only by a published leadership revision and matching successful validation policy. The SQL projection allowlists public profile fields and excludes internal notes and raw relationship identities. Related cards are resolved through each target's public reader; unavailable targets and nonpublic documents suppress the profile. Media rights, processing, internal links and typed related-record availability are rechecked at read time. Later draft edits do not replace the published content or its modification time.

The TypeScript projection independently rejects unexpected/private fields, mismatched route/language identity, incomplete biographies and unsafe or duplicate related cards. The anonymous no-store runtime requires both website delivery and `CMS_LEADERSHIP_DELIVERY_ENABLED=true`; the latter defaults to false. Listings validate pagination, reject duplicate paths, cap delivery at 10,000 records and sort by editorial display order then name.

This reader foundation is now used by the guarded publication workflow. Public media admission is now connected locally. Route reservation is connected locally; visitor pages are connected locally; section consumption remains pending. The database reader fixture simulates released records only inside a rolled-back local transaction; it does not bypass production publication controls. Evidence: `/private/tmp/cms-leadership-reader-{tests,db,full,build,types,migrations}.log`. No hosted writes or deployment occurred.

All 1,968 CMS tests, production build, TypeScript and offline planning for 343 migrations pass. Six focused projection/runtime checks and the local database reader fixture cover private-field rejection, anonymous credentials, provider failures, pagination bounds, display ordering, published-revision isolation and revoked/withdrawn dependencies.

## Public image admission

Migration 344 extends the shared media admission function to leadership images appearing in the currently deliverable, allowlisted published profile. It retains existing page-family checks and revokes direct browser/service execution of the renamed predecessor. Draft-only images do not become public through leadership; selected images remain subject to current processing/rights and profile dependency checks. Withdrawal, revoked portrait rights or unavailable related public content removes leadership-based media admission.

The local database reader fixture verifies anonymous portrait access, website isolation, denial before publication, preservation of the published portrait after a draft replacement, denial of the draft-only replacement and removal after withdrawal or dependency failure. Evidence: `/private/tmp/cms-leadership-media-{db,full,migrations}.log`. Visitor pages are connected locally; publication admission is covered below. No hosted migration was applied.

All 1,968 CMS regression tests and offline planning for 344 migrations pass after the shared media change. The fixture remains local and rolled back.

## Guarded publication

Migration 345 admits only the current approved leadership revision with fresh successful leadership-1 validation, matching English route identity and current selected dependencies. It locks selected media/records while checking rights, internal links, published same-language references and public related cards. Newer draft edits do not require reapproval of the existing published revision. Shared publication/withdrawal permissions remain authoritative.

The editor supports submission, approval/change requests, confirmation of the exact release/withdrawal revision and rereading workflow results. Unsaved edits or an uncertain workflow outcome disable subsequent release actions; reload resolves current status after a lost response. The UI explains that visitor delivery requires both website and leadership rollout switches.

Local database verification covers unauthorized publishing, expired validation, media rights revoked after checking, approved publication, newer unapproved drafts and withdrawal. Evidence: `/private/tmp/cms-leadership-publication-{db,full,build,types,migrations,browser}.log`. No hosted migration or rollout occurred.

All 1,969 CMS tests, production build, TypeScript and offline 345-migration planning pass. Desktop/mobile browser fixtures pass confirmation/cancellation, lost publication response recovery, unsaved release guards and withdrawal alongside prior authoring workflows. Local preview stopped.

## Route ownership

Migration 346 reserves `/leadership` and all descendants for leadership records and excludes that namespace from custom-page eligibility. A table lock protects preflight and installation against concurrent route writers. Existing competing records or redirect sources stop the migration rather than moving or deleting client content. The record trigger also prevents later competing writes; redirect guards use the shared custom-path eligibility function. The TypeScript namespace validator matches the database rule. Similar unrelated roots such as `/leadership-notes` remain eligible.

Local checks cover competing record types, the namespace root and descendants, unrelated roots and a simulated pre-existing collision that remains unchanged after migration refusal. Production build, TypeScript and offline planning for 346 migrations pass. Five read-only source inventories were recaptured; rendered content, media and interaction states match exactly outside capture/source metadata. Evidence: `/private/tmp/cms-leadership-routes-{db,tests,full,build,types,migrations}.log` and `/private/tmp/leadership-routes-*.json`. No hosted migration or rollout occurred; local preview stopped.

All 1,970 CMS tests pass with refreshed inventories and the new route rules.

## Visitor directory and profiles

`/leadership` lists currently deliverable profiles in editorial display order; `/leadership/[slug]` renders verified biography blocks, optional portrait/credits, role, department, former-leadership status, profile links and related public cards. Both routes require the website and leadership rollout switches. Missing or unavailable profiles return 404; an empty directory explains that no profiles have been published. Metadata respects profile overrides and inherited indexing settings. No private notes or raw relationship IDs are rendered.

Eight focused projection/runtime/metadata/namespace tests, production build and TypeScript pass. Desktop/mobile synthetic provider checks cover directory/detail navigation, image delivery, literal escaped text, text-only profiles, related cards, noindex metadata, former status and withdrawal/rights-revoked 404s. Rendered screenshots were inspected. Evidence: `/private/tmp/cms-leadership-pages-{tests,build,types,browser}.log` and `/private/tmp/cms-leadership-public-{1280,390}.png`. The provider uses synthetic profile content; no actual person or client data was published. Search/sitemap discovery is connected locally; reusable page-section consumption remains pending.

## Search and sitemap discovery

Published, currently deliverable leadership profiles now feed site search and sitemap generation through the gated public runtime. Search excludes noindex profiles and alternate-canonical content, uses role/department and summary text, and honors the client's selected search content types. The Leadership filter appears only when eligible results exist. Sitemap inclusion additionally respects the explicit sitemap policy and uses the published revision's modification time. Withdrawn or unavailable profiles disappear through the public reader checks.

The settings editor offers a Leadership checkbox without silently adding it to existing selections. Browser fixtures verify eligible URLs/results, category filtering, summary matching, noindex, alternate canonical, inherited noindex, withdrawal, revoked rights, sitemap-only exclusion and search-category exclusion. Focused discovery checks, production build and TypeScript pass. Five affected inventories were recaptured and match outside source/capture metadata. Evidence: `/private/tmp/cms-leadership-discovery-{tests,full,build,types,browser}.log` and `/private/tmp/leadership-discovery-*.json`. Local previews stopped; no hosted rollout occurred.

All 1,973 CMS tests pass with leadership discovery and refreshed inventories.

## Reusable reference foundation

Migration 347 adds leadership to the existing permission-scoped reference list/resolution APIs and introduces an anonymous reader by record ID. It delegates to the existing published-profile reader, retaining publication, locale, dependency and media-rights checks. Draft payloads and private notes are never reference results.

The TypeScript reader limits selection to 30 distinct profiles, reads at most five concurrently, preserves editorial order, rejects response identity mismatches and omits withdrawn profiles. It requires both rollout switches and uses anonymous no-store requests. The initial foundation has now been connected to English custom-page sections as described below.

Local evidence: /private/tmp/cms-leadership-references-{tests,full,build,types,migrations}.log. No hosted migration or rollout was performed.

Verification passed: all 1,977 CMS tests, six focused reference/API checks, production build, TypeScript and offline planning for 347 migrations. Database tests cover draft denial, wrong website/type/language, ordered selections, inaccessible records and withdrawal/current-rights changes.


## Reusable custom-page sections

English custom pages now offer a Leadership profiles section with up to 30 distinct selected profiles per page. Editors can reorder selections and privately preview draft summaries. Public sections resolve the current published profile, display its portrait, role, department, status and summary, and link to its profile page. Withdrawn profiles are omitted. About and localized pages do not enable this section yet.

Migration 348 binds trusted evidence to the current page revision and checks selected profiles again at publication. Draft-only, inaccessible or withdrawn profiles prevent release. The website and leadership rollout switches are required for public resolution.

Local projection/runtime and focused database workflow tests pass. Production build, TypeScript and desktop/mobile public browser checks pass, including profile links and withdrawal. Five source inventories were recaptured and their content matches outside capture/source metadata. All 1,979 CMS tests pass (393 database and 1,586 other tests), with 13 focused contract checks also passing. Offline planning covers 348 migrations. The validation integration evaluates the existing input once and avoids another nested wrapper; the final database suite completes in 45.2 seconds. The section picker/private-preview interaction now passes dedicated synthetic browser checks at 1280px and 390px: selection, duplicate prevention, reorder, draft-summary order, private-note exclusion, disabled profile links, save of record references only and unavailable-profile feedback. No runtime or console errors were observed. Evidence: /private/tmp/cms-leadership-section-editor.log, /private/tmp/check-cms-leadership-sections-editor.mjs and /private/tmp/cms-leadership-section-editor-{1280,390}.png. Browser plugin was unavailable; the local Playwright fixture was used. The test waits for the selected row count before reordering so loading state is not mistaken for a disabled-control defect. No product code change was needed for this check. Hosted migration and client acceptance remain pending. Evidence: /private/tmp/cms-leadership-sections-*.log and /private/tmp/cms-leadership-section-{1280,390}.png.


## Structured Office import planning

The leadership v1 table contract, Word/Excel readers, proposed-draft planner, before/after comparison and dependency-evidence verifier are implemented locally. The planning foundation is now connected to the import HTTP/database boundary below; the client import panel is connected as described below.

Pages identifies create/update operations, title, stable slug, locale, expected revision and explicit collection replacement. Content supports role, department, current/former status, display order, summary, private notes and scalar SEO overrides. Blocks, Tables and ListItems retain rich biography structure; Media supports portrait and SEO social image; Links holds ordered profile links; Relationships supports pages, projects, articles and documents.

Hard field limits reject oversized values; summary and SEO guidance generate separate warnings. Display order requires an integer from 0 to 9999. Updates preserve omitted fields, require the current revision, and reject URL/language changes. Collections are replaced or cleared only through explicit replaceCollections intent. Invalid batches return no proposed changes. File parsing retains text whitespace, line breaks and supported inline formatting while rejecting formulas, external package references, tracked edits, unknown sections and mismatched template metadata. Image and typed-reference evidence must cover the exact proposed dependencies; this verifier is not a substitute for the pending permission-scoped database review.

All 80 leadership/import-file regression tests, TypeScript and production build pass. Word horizontal tables, Word vertical records and Excel yield equivalent proposed drafts, including role, display order and profile links. Evidence: /private/tmp/cms-leadership-import-foundation-{tests,types,build}.log. Downloadable blank/example templates remain pending; permission-scoped review and atomic save/recovery/cancellation are now implemented as described below.


## Import database and HTTP boundary

Migrations 349–351 add permission-scoped import review, atomic draft application, actor/site-scoped receipts and cancellation fences. Review resolves processed image rights and exact typed related revisions. Apply locks updated/referenced records and images, rebuilds expected dependency evidence from the proposed payloads, rejects changed evidence or stale revisions and rolls back the complete batch if any item fails. Created drafts are not published. Replaying an existing receipt recovers the original result without reapplying it over later edits.

The leadership import endpoint reconstructs proposals from the uploaded Word/Excel bytes, reads current records under the user's token, binds the reviewed proposal/evidence/comparison to a digest and requires a matching review before saving. Status distinguishes an unconfirmed outcome from a completed receipt. Cancellation and application share a request lock; a completed save is returned as completed rather than incorrectly reported as cancelled.

Focused API and database tests cover site/actor isolation, revoked visibility, wrong record type/route, stale revisions, duplicate source IDs, lost-response recovery, changed source/review identity, unavailable media/references, atomic rollback and cancellation/replay. The client upload panel and local browser import acceptance are covered below; downloadable templates and hosted/client acceptance remain pending. No hosted migration has been applied.

Verification passed: all 2,002 CMS tests, TypeScript, production build and offline planning for 351 migrations. The HTTP-to-database test simulates a response lost after saving and recovers the exact original receipt without a second apply call. Evidence: /private/tmp/cms-leadership-import-api-{tests,types,build,full,migrations}.log.


## Client import review and recovery

The Leadership workspace now exposes Word/Excel upload, field-level before/after comparison, private proposed-content preview, explicit acknowledgement and draft saving. Client verification binds reviews to the original file and verifies cancellation/save receipts against website, actor, request and target identities. Pending recovery stores identifiers only; uploaded document contents are not persisted in browser recovery storage.

Pending imports lock ordinary editing and participate in unsaved-work navigation guards. Dirty edits, unresolved profile creation, conflicts and uncertain workflow outcomes disable imports. A Web Lock prevents concurrent imports from separate tabs. A completed receipt is retained until the affected record/list refresh succeeds. Failed refreshes and inconsistent receipts leave recovery available; a lost cancellation response can be recovered through status.

All 22 focused leadership import tests, TypeScript and production build pass. Synthetic browser checks at 1280px and 390px exercise the actual Office HTTP handler with controlled persistence: review, proposed-content preview, explicit consent, cross-tab locking, lost save response, malformed receipt, failed list refresh, recovery, update comparison and lost cancellation response. Evidence: /private/tmp/cms-leadership-import-ui-{tests,types,build,browser}.log; temporary fixture /private/tmp/check-cms-leadership-import.mjs; screenshots /private/tmp/cms-leadership-import-review-{1280,390}.png. Browser plugin was unavailable; Playwright was used. Downloadable templates are now available as described below. Hosted provider/client acceptance remains pending.

## Downloadable Office templates

The Leadership import panel links to `public/cms/templates/leadership-v1.xlsx` and `leadership-v1.docx`. Both contain empty structured records and field guidance. The workbook adds field/category dropdowns, frozen headers, editable-cell shading and character-limit warnings, including limits selected by Content.field. The Word form includes biography, links, image and relationship records. Instructions distinguish draft import from publication and explain explicit collection replacement.

Builders use the leadership contract schema, with synthetic completed fixtures in `tests/fixtures/leadership-v1-filled.*`. Production build, TypeScript and all 23 focused import tests pass, including parsing the actual distributed files, rejecting empty templates and oversized content, and equivalent Word/Excel drafts preserving line breaks, role, status, display order and profile links. All ten blank Word pages and every workbook sheet were rendered and visually checked; the excessive-title warning was also verified. Native Microsoft Office editing and hosted/client acceptance remain unverified. Evidence: `/private/tmp/cms-leadership-templates-tests.log` and `/private/tmp/cms-leadership-templates-qa/`.

## Scheduled publication and withdrawal

Saved leadership profiles now expose the shared schedule controls. Publication pins the approved saved revision; withdrawal pins the currently published revision. Unsaved edits, unresolved creation/import recovery, conflicts and uncertain publication status disable scheduling. Scheduling requires publish permission and an explicit UTC offset; pending schedules can be inspected and cancelled.

The existing worker performs trusted leadership validation before due publication and retains ordinary publication guards. A transactional database test verifies publication, withdrawal and blocking for missing required role, a newer revision and revoked publisher access. The focused database test, 17 scheduler regression tests, production build and TypeScript pass. Evidence: `/private/tmp/cms-leadership-schedule-{db,regression,build,types}.log`. No migration or hosted deployment was needed. Hosted worker activation, concurrency verification and client acceptance remain pending.

Existing leadership authoring regression also passes at both viewports: biography editing, preview privacy, undo/redo, creation/update recovery, conflict reconciliation, restoration and read-only controls. Evidence: /private/tmp/cms-leadership-import-ui-authoring-regression.log. Local preview stopped after verification.

Desktop (1280px) and mobile (390px) browser checks also pass: schedule creation, explicit-offset conversion, cancellation, withdrawal revision targeting, unsaved-edit disabling and read-only controls, alongside the existing authoring/recovery workflow. Evidence: `/private/tmp/cms-leadership-schedule-browser.log`. The mobile rendered editor was inspected. These checks use a synthetic local provider; the local preview was stopped afterward.

## Translation drafts and review

Leadership profiles now reuse the translation creation, family navigation and saved-content review panels. A new language draft copies the saved source content and retains its route within that language, while clearing an explicit canonical URL. This does not translate the words or publish the result. Returned content must match the leadership schema and route before opening. Pending creation receipts survive interrupted responses and are retained until the saved draft is opened successfully.

Unsaved edits, unresolved creation/import recovery, conflicts and uncertain workflow state disable these operations. Active translation creation/navigation locks the surrounding editor and module navigation. Review requires comparison of the saved source and translation followed by explicit acknowledgement; source edits invalidate the earlier review. Existing permission and separate-reviewer rules remain authoritative.

A transactional leadership test verifies repeat-safe creation, preserved content/route, canonical clearing, independent review, source-change invalidation, family navigation and inaccessible-record rejection. This test, 17 shared translation tests, production build and TypeScript pass. Evidence: `/private/tmp/cms-leadership-translation-{db,regression,build,types}.log`. No database migration or hosted write was needed. Multilingual public delivery and hosted/client acceptance remain unfinished.

Desktop (1280px) and mobile (390px) synthetic browser checks pass for unsaved-edit guards, committed-but-lost translation creation, recovery into one draft, comparison before acknowledgement, source-change status and returning to the primary source. Existing leadership authoring and scheduling checks also pass. Evidence: `/private/tmp/cms-leadership-translation-browser.log`. The rendered mobile editor was inspected and the local preview stopped.

## About page reuse

The English About editor now offers reusable leadership sections using the existing profile picker and private preview. Published delivery resolves the selected profiles through anonymous no-store reads, preserving selection order and omitting withdrawn profiles. The existing embedded cards remain available; no client content is automatically converted. Profile delivery must be explicitly enabled when selected sections are present. About now renders per request so runtime rollout and current profile availability are evaluated rather than serving a build-time legacy page.

Migration 352 extends the existing publication dependency guard to English About pages, retaining exact current published-profile checks and the 30-profile page limit. Other fixed routes and non-English reuse remain blocked. Local database tests cover unpublished dependencies, trusted validation, publication and withdrawal revalidation. Hosted migration/application remains pending.

About acceptance evidence: desktop/mobile editor selection, duplicate prevention, ordering, private-preview exclusion of notes and saved references pass. Synthetic public checks cover rendered About cards, links, images and profile withdrawal. Six source inventories were recaptured; all captured content/presentation matches outside capture/source metadata. The About read-only migration proposal was regenerated from the verified inventory. Production build and TypeScript pass; offline migration planning covers 352 migrations. Evidence: `/private/tmp/cms-about-leadership-{editor,public-browser,build,types,migrations}.log`. Both local preview servers were stopped. Hosted verification remains pending.

The final full CMS regression run passes: see `/private/tmp/cms-about-leadership-final-full.log`. Earlier failures were resolved by recapturing verified source inventories, regenerating the source-bound About proposal and isolating the About database test from an existing route fixture.
