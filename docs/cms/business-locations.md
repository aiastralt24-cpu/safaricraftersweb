# Business locations

## Current implementation

Current release status: migration 369 permits guarded database publication; migrations 370–372 support authenticated draft imports; client review/release controls are connected locally; English visitor routes are connected behind disabled-by-default rollout flags; search/sitemap discovery is connected locally; structured Word/Excel parsing, planning and authenticated review/apply/recovery are implemented (see [import status](location-imports.md)); hosted verification is still pending. Earlier fence notes below describe historical milestones.

The versioned draft contract in `lib/cms/locations.ts` distinguishes business premises from travel destinations. It supports location type, address, optional coordinates, contact methods, time zone, weekly opening intervals, visitor policy, accessibility notes, rich body, image, SEO, private notes and typed relationships to applications, products, projects, articles and documents.

Drafts may omit address/contact details. Publication findings require a summary, premises address, locality, country code and explicit visitor policy. Appointment-only premises require a contact method; opening hours require a valid time zone. Weekdays use ISO numbering (Monday 1 through Sunday 7); an empty interval list means closed on that specified day, while an omitted day is unspecified. Overnight hours must be split across adjacent days; closing at 24:00 is supported. Overlapping intervals and duplicate weekdays are rejected. Holiday exceptions are not yet represented.

Coordinates must be a complete latitude/longitude pair; zero coordinates are valid. Country codes currently have two-uppercase-letter syntax validation, not an authoritative country-list selector. No address verification or geocoding is claimed. The `/locations` namespace is reserved; English delivery is implemented behind rollout flags.

## Verification and next work

Four focused tests pass for incomplete/publishable drafts, appointment contacts, hours/time zones, coordinate bounds, unsafe contact URLs, duplicate relationships/blocks and recoverable creation versus revision-bound updates. TypeScript passes. Evidence: `/private/tmp/cms-locations-contract-{tests,types}.log`.

Next: native Office, multilingual visitor delivery, hosted and client acceptance. Draft authoring, guarded publication, route ownership and English delivery/discovery are connected locally. No completion score increase is claimed.

## Draft storage and API

Migration 364 adds location records, scoped classification/text/status/ownership/publication search, recoverable creation/cancellation and title-preserving revision restoration. The dedicated `/api/cms/locations` GET/POST endpoint validates the contract, verifies save receipts, and rejects stale revisions, wrong record types and changed URL/language identity. Search includes address content. Database publication is explicitly fenced until trusted validation and public delivery are connected. Other content types remain permitted.

Two database tests cover idempotent saves, classification and literal text search, cross-site and outsider isolation, stale writes, cancellation fencing, invalid routes, blocked publication and title restoration. Eight focused contract/API tests pass. The full CMS regression suite, production build, TypeScript and offline migration plan pass; evidence is in `/private/tmp/cms-locations-storage-{api,db,full,build,types,migrations}.log`. No hosted migration was applied.

## Client authoring

Business locations now has a dedicated workspace with kind/text/status/ownership search, bounded address/contact fields, optional coordinates, visitor policy, accessibility notes, local opening hours and rich body/media/SEO/reference editors. Preview includes address/contact/hours and omits private notes. Existing URL/language are locked; location type remains editable. Undo/redo, owner controls, revision restoration, explicit conflict reconciliation, browser copies and actor/site-scoped creation recovery reuse existing CMS mechanisms. Lost updates are read back before offering retry; matching server content avoids duplicate writes. No publication controls are exposed while delivery remains fenced.

Focused contract/API/recovery tests: 12 passing. Browser verification uses synthetic local authentication and APIs, separately from the previous real local database tests; it does not establish hosted or client acceptance.

Client verification: production build and TypeScript pass. Playwright at `http://localhost:3002/cms`, 1280×900 and 390×900, passes new/saved browser copies, undo/redo, lost creation/update response recovery, explicit conflict choices, revision restoration and read-only controls. Address, appointment contact and Monday closing at 24:00 survive save/recovery; preview hides internal notes. Page identity, meaningful content and absence of a framework overlay are checked; zero uncaught page errors. Deliberate network failures and a 409 are fixture scenarios. The fixture does not supply MFA policy data, so its unavailable-policy banner is expected and does not verify real MFA. Browser plugin unavailable; regular Playwright used. Scoped layout correction prevents narrow nested desktop columns. Screenshots `/private/tmp/cms-location-editor-{1280,390}.png` inspected. Evidence: `/private/tmp/cms-location-client-{tests,build,types,browser}.log`. Preview server stopped after verification.

## Trusted saved-revision validation

Migration 365 exposes service-only evidence for the exact current location revision and adds the `location-1` validation policy. The shared worker now checks strict location fields and publication findings, route/language identity, exact image/reference/link coverage, processed images with current rights, and published same-language related records. Products and non-English location delivery remain explicitly unsupported. Missing, stale, duplicated or mismatched evidence fails closed. The wrapper preserves existing content-family evidence. This is a validation result, not authorization to publish; migration 364 still fences publication.

Verification: 17 focused location/worker tests and all 2,100 CMS tests pass, along with production build, TypeScript and offline migration planning. The database test covers service-only access, cross-site rejection, trusted receipt execution, revoked media rights and obsolete revisions. Evidence: `/private/tmp/cms-location-validation-{db,tests,full,build,types,migrations}.log`. No hosted SQL or worker was activated. Client check controls are connected; public delivery remains next.

## Client check controls and request-header correction

Saved locations now expose request/refresh controls for trusted checks. Unsaved edits disable both; read-only users cannot enqueue checks. Results are bound to the current revision and `location-1` policy, with explicit expired/not-run/failure states and field findings. These controls do not publish content.

Integration review found that the earlier location client sent `location/json` for save/restore requests. The earlier browser fixture accepted that incorrect header, so its passing interaction checks did not prove request compatibility. The client now sends `application/json`; the fixture asserts that header on every POST, and the API regression test explicitly rejects the old header with HTTP 415. Previous local database evidence remains valid.

Verification after correction: 17 focused location/worker tests, production build and TypeScript pass. Desktop/mobile Playwright checks at 1280×900 and 390×900 pass queue acknowledgement, passed/expired/failed/wrong-revision results, unsaved/read-only guards, and the existing creation/update recovery, conflict and revision-restoration scenarios with asserted JSON headers. No uncaught page errors. Evidence: `/private/tmp/cms-location-check-controls-{tests,build,types,browser}.log`. Tests use synthetic local provider responses; hosted worker execution remains unverified. Local preview server stopped.

## Anonymous reader boundary

Migration 366 adds anonymous detail/list readers and internal revision evidence. Published content is allowlisted to visitor fields, excluding internal notes and raw relationships. Related cards resolve through the existing public application/project/article/document readers; unavailable targets fail closed. Current image rights and internal links are rechecked on reads. A newer draft does not replace the published revision. English-only delivery and the unfinished product relationship boundary remain explicit. `published-location.ts` strictly checks the public envelope, required location fields, route identity and related-card routes.

The reader database fixture bypasses publication triggers only inside a rolled-back local test; this proves reader behavior, not production publication. Publication is still fenced. Next dependencies are public media admission, route ownership, publication guards, visitor runtime/pages/discovery, Office imports and hosted/client acceptance.

Reader verification: all 2,103 CMS tests, TypeScript and offline migration planning pass. Focused tests cover drafts staying hidden, field privacy, wrong-site/language rejection, kind filtering, immutable published content, rights revocation and withdrawal, plus strict client-envelope rejection. Evidence: `/private/tmp/cms-location-public-{db,tests,full,types,migrations}.log`. No UI changed and no deployment or browser verification is claimed for this backend batch.

## Public media and route ownership

Migration 367 admits location images through the current allowlisted public reader, preserving existing content-family media checks. A draft alone cannot expose an image; current rights, website scope and published eligibility are rechecked. Migration 368 reserves `/locations` and its descendants against custom pages, competing record types and redirect aliases. It holds writer locks while checking existing records/aliases and fails without deleting or moving collisions. The client custom-page path policy matches the database. This admission milestone initially retained the publication fence; migration 369 below replaces it with guarded publication.

Focused database checks cover anonymous media before/after publication and revocation/withdrawal, wrong-site rejection, competing records, existing route/alias collision preservation, new alias rejection, and client/database namespace parity. These remain local fixtures, not hosted deployment evidence.

Admission verification: four focused database checks, TypeScript, production build and offline migration planning pass. The full 2,105-test run had 2,099 passes and six stale source-inventory failures caused by the shared custom-page path policy change. Fresh production-build captures of Concept, Bespoke Safaris, Private Aviation, Kenya and Tanzania match prior content/metadata/media/interactions exactly after excluding source hashes, capture time and origin. All affected inventory/migration tests pass after recapture. Evidence: `/private/tmp/cms-location-admission-{db,full,types,build,migrations,captures,parity-tests}.log`. No remaining failure from that run is unresolved; the full suite was not redundantly rerun after evidence-only changes. Preview server stopped.

## Guarded database publication

Migration 369 replaces the temporary location publication fence with current-revision approval, fresh `location-1` validation, route/language/classification identity and live evidence admission. It locks directly selected records/media during release and rechecks media rights, internal links and related public delivery. Product relationships and non-English delivery remain blocked. New draft edits preserve the existing published revision; withdrawal remains available through the shared permission-checked lifecycle.

The related-card helper is internal and reused by publication and public reads. Local database lifecycle tests use real save → trusted validation → submit → independent approval → publish → public read → withdraw operations, with no trigger bypass for those lifecycle tests. Cases include wrong publisher, expired receipts, revoked images, unapproved newer drafts, withdrawal before publication and withdrawal of a related application after publication. Hosted concurrency and provider behavior remain unverified. Client review/release controls are now connected; visitor routes remain to be connected.

Publication verification: all 2,107 CMS tests and offline migration planning pass. Evidence: `/private/tmp/cms-location-publication-{db,related,full,migrations}.log`. This batch changes SQL and database tests only; the previous production build remains the frontend baseline. No hosted migration or production deployment was performed.

## Client review and release

Location editing now connects submit, request changes, approve, publish and withdraw through the shared authenticated lifecycle API. Publish/withdraw require explicit revision-bound confirmation. Unsaved edits disable release actions; lost or mismatched workflow responses require reloading the server state before another workflow action. The interface explains that visitor pages are still being connected. Browser mocks test interaction behavior separately from migration 369 database authority checks.

Client release verification: production build, TypeScript and 17 focused location/worker tests pass. Chromium fixtures at 1280×900 and 390×900 pass submit → request changes → resubmit → approve, cancelled publication, lost publication response/reload-required recovery, unsaved-edit guards, and cancelled/confirmed withdrawal. Existing draft recovery/conflict/restoration and validation-result checks also pass with zero uncaught page errors. Screenshots `/private/tmp/cms-location-workflow-{1280,390}.png` inspected; the outdated publishing-unavailable sentence found in them was subsequently corrected in source (copy-only). Evidence: `/private/tmp/cms-location-workflow-{build,types,tests,browser}.log`. These browser fixtures are synthetic; real database authority is separately covered by migration 369 tests. No hosted release or visitor-route acceptance is claimed. Preview server stopped.

## Visitor routes and runtime

`/locations` and `/locations/[slug]` now use anonymous, no-store readers with strict public projection. Delivery requires both `CMS_PUBLIC_DELIVERY_ENABLED=true` and `CMS_LOCATION_DELIVERY_ENABLED=true`; neither is enabled by default. The directory supports all location kinds, validates bounded ordered pagination and sorts display titles. Detail pages show address, contact methods, visitor policy, local hours, accessibility notes, rich content, media and related cards with editorial SEO overrides. Withdrawn/missing content returns no detail; malformed/private payloads and provider outages fail closed. No search/sitemap integration or multilingual delivery is claimed yet.

Verification: eight focused runtime/projection/metadata tests, production build and TypeScript pass. Local Chromium at 1280×900 and 390×900 passes directory-to-detail/back navigation, image loading, escaped content, canonical/noindex metadata, contacts/hours, related cards, text-only rendering, withdrawal/rights revocation and malformed/private/provider-error boundaries. Zero uncaught errors in normal flows and no horizontal overflow; screenshots `/private/tmp/cms-locations-public-{1280,390}.png` inspected. Synthetic provider responds only to read requests and blocks external fetches. Evidence: `/private/tmp/cms-location-pages-{tests,build,types,browser}.log`. Final admin copy was updated to explain that visitor delivery requires activation (copy-only after build). No hosted content was published. Preview server stopped.

## Search and sitemap discovery

Published English locations now feed website search and sitemap generation through the gated anonymous reader. Search includes summary text and a Locations category. The global search settings editor can include/exclude Business locations. Noindex, external/alternate canonicals, sitemap exclusions and empty/withdrawn lists are respected; the location directory enters the sitemap only when eligible children exist. Disabled rollout makes no location discovery request.

Local browser checks at 1280×900 and 390×900 pass summary search, category navigation, settings exclusion, noindex/canonical/sitemap exclusions and withdrawal. The initial fixture run omitted its search-settings flag; rerunning with that flag enabled tested the intended configured path. Screenshots `/private/tmp/cms-location-discovery-{1280,390}.png` inspected; no overflow or uncaught errors. Fresh production-build legacy captures confirm unchanged content, metadata, interactions and media for Concept, Bespoke Safaris, Private Aviation, Kenya and Tanzania. Evidence: `/private/tmp/cms-location-discovery-{tests,build,types,browser,captures,full}.log`. Local preview servers stopped.

Discovery verification complete: all 2,116 CMS tests pass, as do production build, TypeScript and desktop/mobile browser checks. No hosted rollout or acceptance is claimed.

## Scheduled publishing and withdrawal

The saved location editor now connects the shared publication schedule panel. It schedules only the approved saved revision or currently published revision, requires explicit time-zone offset and confirmation, lists status and supports cancellation. Unsaved edits, pending import/creation recovery and uncertain workflow outcomes disable the panel. Read-only users cannot create schedules.

Location scheduling reuses the shared durable worker and database admission/execution guards without a new migration. A local database test exercises ready publication followed by withdrawal, incomplete content, stale saved revisions, revoked publisher membership, administrative approval invalidation, and revoked or expired image rights. Ready jobs receive `location-1` validation; unsafe jobs are blocked. Approval invalidation is simulated administratively in the fixture because normal review does not permit changing an approved revision directly to changes-requested. No hosted timer or worker was enabled.

Fifty-four focused location/scheduling tests and the database scenario pass; build and TypeScript are checked separately. Evidence: `/private/tmp/cms-location-schedule-{tests,db,build,types}.log`. Hosted queue concurrency, scheduler setup and client acceptance remain pending.

Scheduling browser verification: the focused synthetic provider run passed at 1280px and 390px. It checks explicit UTC conversion, dismissed/accepted confirmations, schedule cancellation, withdrawal pinned to the published revision, locks after uncertain publication or unsaved edits, and read-only controls. Screenshots were inspected; no framework overlay or page exceptions were observed. The earlier broader script stopped on an over-specific label selector; a focused DOM inspection confirmed the control existed and the corrected combobox selector passed. Evidence: `/private/tmp/cms-location-schedule-focused-browser.log`, `/private/tmp/check-location-schedule-focused.mjs`, `/private/tmp/cms-location-schedule-{1280,390}.png`. The log’s inherited “authoring” completion label is broader than this focused script; only the listed scheduling/release checks are claimed. Production build and TypeScript pass.

## Translation authoring and review

The saved location workspace now connects shared translation creation, family navigation and saved-source review controls. Creation copies the current source into a separate draft, preserves address/contact/hours/coordinates and clears an explicit canonical URL. It uses actor/site/source-scoped recovery and opens the confirmed record; lost acknowledgements retry the same request. Switching records verifies the location schema and path. Translation work locks edits, imports and publication controls until it finishes.

A local database scenario verifies idempotent creation, complete premises detail preservation, URL/language identity, no inherited publication, independent reviewer enforcement, source-change invalidation and outsider denial. Fifty-four focused location/translation tests, production build and TypeScript pass. A synthetic provider browser check at 1280px and 390px verifies lost-response creation recovery with one translated record, comparison before acknowledgement, review recording, dirty guards and source/translation navigation. Both comparison screenshots were inspected and no page exceptions were recorded. Evidence: `/private/tmp/cms-location-translation-{db,tests,build,types,browser}.log`, `/private/tmp/cms-location-translation-{1280,390}.png`.

This is translation authoring/review, not automatic language translation or non-English public delivery. Location public routes and trusted publication checks still allow English only; multilingual delivery and hosted/client acceptance remain separate unfinished requirements.

Integration regression: all 2,145 CMS tests pass after location scheduling and translation controls were connected (`/private/tmp/cms-location-translation-full.log`). This remains local verification; no hosted services or migrations were changed.
