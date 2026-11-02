# Dealers and service partners

## Scope and local draft foundation — 30 October 2026

Retained PRD §14 requires reusable dealer/service-partner records, relationships, scoped search/filtering, ownership, history, SEO and publication. Partner businesses are distinct from their premises: location records remain the authoritative address/opening-hours records and are selected through relationships.

`lib/cms/partners.ts` provides a strict versioned contract for dealer/servicePartner/both classification, active/inactive status, summary, public contact methods, services, country/region coverage, rich content, optional image, SEO and private notes. Typed relationships connect locations, applications, products, documents and certifications. Country codes use the same two-uppercase-letter format convention as locations. Duplicate services, countries, regions, references and block identities are rejected. Incomplete drafts are allowed; publication findings require summary, services, coverage and contact. Referencing a certification does not grant approval to new claims.

Migration 433 adds partner draft storage, route identity, scoped search, creation cancellation and title-preserving revision restoration. Search supports kind, literal text, review status, ownership, publication status, country and exact service name before pagination; service names are compared without case sensitivity. Existing revision persistence supplies audit history and stale-write rejection. Anonymous delivery remains blocked until trusted validation and publication are implemented.

The `/api/cms/partners` endpoint exposes strict draft save/cancel and search. New saves require recoverable request identities; updates pin the current revision and preserve route/language. Receipts and paginated responses are verified. Invalid requests do not reach writes. These APIs reuse user-token permission checks; no privileged credential is exposed.

## Next required work

1. Client authoring is locally connected; independent client acceptance remains.
2. Trusted validation is locally connected; hosted worker verification remains.
3. Guarded approval/publication, anonymous directory/detail and search/sitemap discovery are locally connected.
4. Structured imports/templates and shared scheduling/translation parity.
5. Hosted migration, provider verification and independent client acceptance.

This foundation does not complete the module or earn an additional full score gate. No hosted database was changed and no public rollout was enabled.

## Verification

All 2,424 CMS tests pass without skips, including the new partner contract/API/storage checks. Production build, TypeScript and offline migration planning pass. Logs: `/private/tmp/cms-partner-foundation-{full,db,tests,build,final-types,migrations}.log`. One initial test used a reserved location URL and correctly hit the existing location namespace guard; the test now uses an unrelated invalid path to exercise the partner route guard directly. No browser or hosted acceptance is claimed for the unfinished partner workspace.

## Client authoring and recovery — 30 October 2026

The CMS navigation now opens a dedicated partner workspace. Editors can manage classification/status, services, country/region coverage, public contacts, rich content, images, SEO and private notes. Named record pickers connect locations, applications, products, documents and certifications. Migration 434 adds certification reference selection through the existing RLS-scoped list/resolve functions; unavailable and cross-site records remain hidden.

The workspace connects country/service/kind search, ownership and review-status filters, private preview, undo/redo, ownership/history, revision restoration, explicit new/saved browser checkpoints, conflict comparison and lost-save reconciliation. Creation retains its exact request before sending and retries that request after a lost response. Preview excludes internal notes. Publication controls remain absent until the trusted lifecycle is implemented.

Verification: all 2,429 CMS tests pass with no skips, including partner checkpoint/conflict/update-recovery tests and actual certification picker isolation. Desktop/mobile browser fixtures at 1280/390 cover service/coverage editing, lost creation response and identical retry, save/undo/redo, certification selection, preview privacy and read-only controls. Screenshots were inspected and horizontal overflow/runtime errors were absent. Evidence: `/private/tmp/cms-partner-editor-{full,browser,types}.log`. Next: trusted validation, current relationship/media evidence and guarded publication/public delivery.

## Trusted saved-revision checks — 30 October 2026

Migration 435 supplies service-only, exact-revision partner evidence and registers partner-1 with the existing validation worker. Checks require active status, summary/services/coverage/contact, matching route/language, current processed image rights, published same-site/same-language typed references and resolvable internal links. Certification references use the current anonymous certification reader, including its claim/evidence eligibility. Unsupported product delivery and non-English public delivery fail closed. Drafts remain editable. The existing partner publication fence remains in place.

Saved partner workspaces now expose permission-aware request/status controls. Unsaved edits disable checks; revision changes reset results; expired or mismatched receipts cannot appear valid. Passing a check does not approve or publish content.

Verification: 2,434 CMS tests pass without skips. Actual database checks cover worker execution, service-only access, cross-site isolation, revoked image rights and stale revisions. Focused validators cover incomplete/inactive content, exact relationship/link evidence and certification eligibility. Production build, TypeScript, offline migration planning and desktop/mobile fixtures pass. Browser checks cover request/status, dirty-state disabling and read-only access. The first browser navigation exceeded 10 seconds during initial compilation; the warmed-server retry passed. Logs: `/private/tmp/cms-partner-validation-{full,build,types,migrations,browser}.log`. No hosted execution or independent client acceptance is claimed.

## Guarded publication and visitor pages — 30 October 2026

Migrations 436–438 add published-revision evidence, allowlisted anonymous readers, scoped directory pagination, namespace ownership and guarded publication. Publication requires the current approved revision, an unexpired partner-1 receipt, active status, current media rights and publicly deliverable same-site relationships. Selected record/media rows are locked during release. Certification cards use the certification reader; private document references cannot become public downloads. New drafts preserve the previous published revision. Public readers recheck dependencies and stop serving a partner when its media or related content becomes unavailable. Media admission uses only the deliverable projection. Internal notes and raw relationship identities are omitted.

The editor now connects submit/approve/request-changes, explicit publication/withdrawal confirmation and reload after uncertain responses. Visitor `/partners` and `/partners/[slug]` routes render services, geographic coverage, public contacts, rich content, related cards and editorial metadata. Both global CMS delivery and `CMS_PARTNER_DELIVERY_ENABLED=true` are required; the new switch defaults to false. No hosted configuration was changed.

Namespace checks preserve existing content and reject collisions instead of overwriting records or redirects. The TypeScript custom-page namespace guard adds only `partners`; reviewed source-dependency hashes are retained in `partner-namespace-dependency-review.json` without changing captured legacy pages/assets.

Verification: 2,447 CMS tests, production build, TypeScript and offline migration planning pass. Database cases cover publication permissions, expiry, revoked rights, related withdrawal, anonymous privacy, newer drafts and namespace collisions. Runtime tests verify strict public projections, anonymous-only configuration, bounded pagination, metadata and rollout switches. Desktop/mobile visitor fixtures cover real routes, images, services/coverage/contact, related cards, metadata, withdrawal and fail-closed private/provider error states. Screenshots were inspected. Logs: `/private/tmp/cms-partner-public-{full,build,types,migrations,browser}.log`.

Remaining: import contracts and downloadable Office templates, scheduling and translation parity, multilingual public delivery, hosted verification and independent client acceptance.

Editor browser verification also passed at 1280/390: submit, approve, publication confirmation, withdrawal, private preview and read-only controls. One mobile navigation reset during sign-in refresh; reselecting the observed partner workspace on the same running server resolved the fixture race. Evidence: `/private/tmp/cms-partner-public-editor-browser.log`.

## Search and sitemap discovery — 30 October 2026

Published eligible partners now feed the site search and sitemap through the strict anonymous reader. Search exposes the partner category and matches title, summary and human-readable classification. The settings editor includes a Dealers and service partners checkbox; existing configured/default categories remain unchanged. Noindex and canonical policies exclude content from discovery, and sitemap exclusion affects the sitemap without removing otherwise eligible search results. Withdrawn or currently unavailable records do not enter either result set. The directory sitemap entry exists only when eligible detail entries exist. Disabled rollout performs no partner discovery requests; provider/configuration failures remain explicit.

Verification: 2,450 CMS tests pass without skips. Desktop/mobile checks exercise the real search/sitemap routes and the actual settings/search components: inclusion/exclusion, category selection, summary/classification matching, noindex, external canonical, sitemap exclusion and withdrawal. A missing CMS_SEARCH_SETTINGS_ENABLED switch in the first local fixture run showed legacy categories as expected; the configured fixture passed. Temporary browser fixture source was removed. Source-bound shared type/settings hashes were reviewed in partner-discovery-dependency-review.json; captured legacy page content/layout/assets and existing defaults remain unchanged. Evidence: /private/tmp/cms-partner-discovery-{full,browser,settings-browser}.log. Hosted deployment and client acceptance remain pending.

Final production build passes after removing the temporary browser fixture. The mobile search screenshot was inspected with no horizontal overflow.

TypeScript passes after clearing the generated development type cache referencing the removed fixture route; no application source was removed for that check. Evidence: /private/tmp/cms-partner-discovery-final-types.log.

## Structured Office import foundation — 30 October 2026

The partner 1.0 import contract and planner support Pages, Content, Blocks, Tables, ListItems, Media, Relationships, Services, Coverage and Regions. A Coverage row has a stable item ID and uppercase two-letter country code. Region rows name that coverage item; no region rows means the whole country. Services and countries preserve explicit order, as do regions within a country. Duplicate service names, country codes or region names are rejected by the draft schema. Region rows cannot attach to another partner or a missing coverage row.

Field limits include title/service/region 200 characters, summary/status note/private notes 2,000, contact email 254, phone 60 and website URL 2,048. Summary guidance warns above 80 words; SEO title/description guidance warns above 60/160 characters. Hard limits block the entire proposal. Batches permit at most 25 partners, 500 rows and 2 million text characters. Numeric contact cells are rejected to preserve leading zeroes; only display order accepts numeric values. Templates create drafts, so incomplete publication fields remain allowed until trusted checks.

Updates require the saved UUID/current revision and preserve URL/language. Omitted collections remain unchanged. Explicit replaceCollections names allow replacing or clearing body, services, coverage, images and typed relationships. Region replacement travels with the complete coverage collection, avoiding ambiguous partial edits. Unknown fields, approval authority, malformed ordering, orphan rows and conflicting routes reject all proposed changes.

Word/Excel parsers reuse the existing bounded Office reader, with CMSPartner metadata and the partner sheet allowlist. Synthetic XLSX and horizontal/vertical DOCX fixtures yield identical drafts while preserving paragraph whitespace, line breaks and list structure. Formula execution, external workbook references, tracked edits and wrong metadata are rejected. This batch adds planning/parsing only; authenticated review/apply, persistent recovery, client upload comparison and downloadable templates remain to be connected.

Verification: all 2,458 CMS tests pass without skips, including eight new partner import planning/parser cases. Production build and TypeScript pass. Evidence: /private/tmp/cms-partner-import-foundation-{full,build,types}.log. No server writes, client upload UI or native Office acceptance are claimed for this foundation.

## Authenticated import persistence — 30 October 2026

The partner import endpoint now supports review/apply/status/cancel using the user's session, with strict file, site, source hash and review identities. Review reads only requested update records within access scope, re-plans their complete snapshots, resolves current media/typed-reference evidence and returns before/after comparisons. Apply verifies that the file, saved revisions and evidence still match the review. Incomplete or changed review evidence cannot be silently applied. Client receipt/comparison validators bind results to the reviewed source and exact expected targets.

Migrations 439–441 provide scoped draft evidence, atomic persistence, actor-bound receipts and cancellation. Apply derives referenced records and images from proposed payloads, locks records/media in deterministic order, compares exact current evidence and saves all drafts in one transaction. Existing route/language identity is preserved. Import source keys cannot be reused to create duplicates. The payload root allowlist rejects injected approval fields. Imports never approve or publish records, and a draft certification reference does not grant claim approval.

Apply/cancel share an actor/site/request lock. Cancellation prevents delayed application; if application already completed, cancellation recovers that existing receipt. Replaying the original request after later edits returns the original receipt without reapplying old content. Other users and nonmembers cannot read that receipt or use the original user's cancellation identity.

Focused verification: 21 partner import tests and four database cases pass. Database cases cover real HTTP review, simulated lost response after persistence, single-write recovery, atomic rollback, stale revisions, rights/reference changes, cancellation fences, actor isolation and injected approval fields. An inherited test fixture initially used a location classification; it was corrected to an allowed partner classification. Client upload/review controls and downloadable templates remain pending; no hosted writes occurred.

Full regression verification: 2,475 CMS tests pass with no skips. Production build and offline migration planning pass. Evidence: /private/tmp/cms-partner-import-api-{tests,db,full,build,migrations}.log.

## Client upload, comparison and recovery — 30 October 2026

The partner workspace now connects the import panel to authenticated review/apply/status/cancel. Editors can select a Word/Excel file, inspect field-level before/after changes including services and country/region coverage, preview proposed public content, see replacement intent and acknowledge warnings before saving. Private notes appear only in the authorized comparison/full proposal and stay absent from the public-content preview.

A selected file or unresolved import locks competing partner edits. Pending recovery stores bounded actor/site/request hashes and expected target identities rather than the uploaded file. Reload can retrieve the saved result without replaying a write. Cancellation requires explicit confirmation; an unconfirmed status keeps the pending identity. Web Locks and storage-change handling protect against competing browser tabs. The tracker clears only after receipt verification and editor/list refresh.

Verification: all 21 partner import tests, production build and TypeScript pass. Browser fixtures pass at 1280/390 for comparisons, services/coverage preview, acknowledgement, lost-response recovery with one write, unconfirmed status, cancel-dismiss/cancel-confirm and editor locks. A navigation-readiness timeout on the first mobile run was resolved by waiting for the selected partner workspace on the same server; the import behavior passed. Mobile screenshot inspected; no horizontal overflow or page errors. Evidence: /private/tmp/cms-partner-import-ui-{tests,build,types,browser}.log. Full persistence regression remains the preceding 2,475-pass suite; no database/shared parser changes were made in this UI batch.

Downloadable partner templates are the next dependency and are not linked until generated and checked. Native Office and independent client acceptance remain pending.

## Downloadable Word and Excel templates — 30 October 2026

The partner import panel now offers partner-v1.xlsx and partner-v1.docx. Builders derive column names, required flags and hard limits from the import contract. Excel includes text-formatted identifiers/contacts, numeric ordering, classification/field dropdowns and over-limit conditional formatting. Word uses 12 readable pages with copyable record forms, supported field names, limits and explicit collection replacement instructions. Services, countries and regions have separate ordered records; an empty region list means the whole country.

Synthetic filled examples preserve phone 0012345678, multiline content, services and two-country coverage with a named region. Both formats produce identical draft proposals; blank templates require Pages content, and a 201-character title fails validation. All 22 partner import tests pass. Every blank Word page and Excel input sheet was rendered and visually checked, including the Excel over-limit warning. TypeScript and desktop/mobile download/import-recovery checks pass; downloads match the generated files byte for byte. Evidence: /private/tmp/cms-partner-templates-{tests,types,browser,excel,word-render}.log. The preceding production build remains valid for the unchanged import components apart from adding the two static links. Native Word/Excel interaction and independent client acceptance remain pending.

Next: shared publication scheduling and translation authoring/review parity, with multilingual public delivery and hosted rollout still separate acceptance requirements.


## Scheduling and translation authoring — 30 October 2026

Saved partner records now expose publication/withdrawal schedules and source-linked translation creation, family navigation, saved comparisons and independent review. Dirty, uncertain, conflicting or recovering drafts disable these controls. Pending translation work locks competing edits/imports. Public partner delivery remains English-only; this is stated in the workspace.

Verification: two actual database scenarios exercise scheduled publication/withdrawal, incomplete content, stale revisions, revoked approvals/publisher access, revoked/expired media and translation idempotency, source changes and separate-reviewer permissions. All 34 shared scheduler/translation tests pass. Playwright fixtures at localhost:3002/cms, 1280 and 390 pixels, cover explicit timezone conversion, revision pins, cancellation, dirty/read-only guards, lost-response recovery, comparison/review and language navigation. Browser plugin was unavailable. The first mobile translation fixture missed workspace readiness; retrying navigation after a readiness check passed on the same server. Screenshots were inspected; no runtime errors were observed. Production build and TypeScript pass. Logs: /private/tmp/cms-partner-schedules-{db,focused,browser,build,types}.log and /private/tmp/cms-partner-translation-browser.log. No hosted verification is claimed.

Remaining: multilingual public delivery, native Office/client acceptance and hosted end-to-end verification. Next broader module: product information management. Existing generic store pages read lib/store; the Shopify adapter supplies book variant pricing/availability and checkout. Preserve this transaction authority while adding CMS editorial product data.
