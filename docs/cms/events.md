# Events implementation

Status: strict draft contract, scoped storage, save/search APIs, client draft workspace and trusted validation are implemented locally. Anonymous readers and guarded database publication are implemented locally; editor review/publication controls and visitor routes are connected locally; discovery is connected locally; Office imports and publication scheduling are connected locally; translation draft/review controls are connected locally; multilingual public delivery and hosted acceptance remain pending. This is not a completed client module.

The retained PRD section 14 requires reusable Events with relationships, search, filters, ownership, revisions, SEO and publishing. The event contract provides title/slug, summary, category, organizer, status and explanation, timing, attendance, physical venue, online information/access URL, registration link, rich body, images, SEO, private notes and related pages/projects/articles/destinations/documents. These are editable content fields; no client event claims or venue facts are seeded.

Timed events require an explicit offset on each timestamp. Start/end ordering compares instants, so an event crossing an offset change is not rejected merely because its ending wall-clock time appears earlier. All-day events use civil dates with an inclusive end date; a one-day event has equal start/end dates. They must not be shifted through the viewer's browser time zone. Empty dates are permitted in drafts, but publication findings require both dates. No automatic expiry or publication schedule is inferred from the event dates.

In-person and hybrid events require venue name, address, city and country before publication. Online and hybrid events require an HTTPS information/access URL. Cancelled, postponed and rescheduled events require an explanation. Registration must be disabled while cancelled or postponed. Past events can remain editorial records; withdrawal is a separate publishing action.

The contract rejects unknown fields, unsafe links, duplicate block/reference identities and over-limit text. Save commands distinguish a recoverable creation request from an update pinned to a current revision. Editorial findings alone cannot authorize publication: server evidence, ownership/permissions, approval, route/language availability, current media rights and referenced-content checks still need integration.

Verification: six focused tests and TypeScript pass. Cases include an offset change, equal timed instants, invalid calendar dates, inclusive all-day ranges, online/hybrid requirements, cancellation registration rules, strict content boundaries and save intent. Evidence: `/private/tmp/cms-events-contract-{tests,types}.log`.

Next acceptance steps:

1. Verify scoped storage, route identity, idempotent creation/cancellation, revision guards and list/search API on the hosted provider (local implementation is connected).
2. Verify the client editor, rich content/media/reference pickers, preview, conflict/recovery, revisions and ownership on the hosted provider; complete event lifecycle/date filters and time-entry usability.
3. Trusted evidence and guarded review/publish/withdraw; anonymous allowlisted routes and discovery.
4. Word/Excel imports, shared scheduling and translation authoring integration.
5. Hosted concurrency, delivery and independent client acceptance; localized public delivery remains part of the full CMS scope.

## Draft persistence and search

Migration 331 registers the event content type, enforces /events/slug draft identity and blocks publication until public delivery is connected. Creation uses the shared durable receipt; cancellation fences a delayed create and returns an already-created result when appropriate. Existing updates retain optimistic revision checks. Restoring an earlier event creates a new draft and restores its list title from that revision.

The dedicated /api/cms/events endpoint validates the strict event contract before save, rejects changed route/language identities, checks current revisions and validates receipts. Search supports attendance, editorial review status, ownership, publication state and bounded literal text search, with permission-scoped cursors and validated results. Event status/date filtering can be added with the client workspace; review status is not event cancellation status.

Persistence verification: all 1,889 CMS tests, production build, TypeScript and the offline 331-migration plan pass. Focused database tests cover creation replay, cancellation, stale saves, attendance search, literal search text, cross-site/inaccessible records, route/publication guards and restored titles. API tests cover strict inputs, receipt checks and bounded pagination. Evidence: `/private/tmp/cms-events-storage-{full,tests,build,types,migrations}.log` and `/private/tmp/cms-events-api-tests.log`. No hosted migration was applied.

## Client event draft workspace

Events now appears in the CMS navigation. Clients can create and search drafts, edit attendance/venue, timing, status, registration, rich body, images, relationships, SEO and private notes. Editorial findings explain incomplete content. Timed entry currently uses explicit-offset ISO text; all-day entry uses civil-date text. Switching timing mode requires confirmation before clearing the old values and remains undoable.

The private preview escapes structured text, excludes internal notes and disables links. It does not display registration for cancelled/postponed events. Shared media/reference pickers and ownership controls are connected. Undo/redo, revision restoration, durable creation/cancellation recovery and opt-in browser draft copies are available. Interrupted updates compare against the current server content; concurrent revisions require field choices rather than overwriting another editor.

Verification: 15 focused tests, production build and TypeScript pass. Desktop (1280px) and mobile (390px) fixture browser runs cover timing/attendance editing, rich text, undo/redo, browser recovery, committed-but-lost creation/update responses, uncommitted retry, conflict choices, private preview, restoration and read-only access. Evidence: `/private/tmp/cms-events-editor-{tests,build,types,browser}.log`. No publication controls are exposed; local fixture success does not establish hosted acceptance.

## Trusted saved-revision validation

Migration 332 adds service-only event evidence, binds it to the current website/record/revision and registers event-1 validation policy. The existing trusted worker now runs event editorial findings plus exact image, related-record and internal-link checks. Internal registration links are included. Missing, duplicate, mismatched or unavailable evidence blocks the content check. Non-English public delivery remains unavailable and fails readiness validation.

The editor can request a trusted check and refresh its result for the saved revision. Unsaved edits disable these controls. The result must match the current revision/policy and be unexpired to display as passed. The panel explicitly states that publication and visitor delivery are not yet connected. A validation receipt alone never bypasses the event publication fence.

Validation verification: all 1,896 CMS tests, production build, TypeScript and the offline 332-migration plan pass. The database integration test checks service-only access, exact evidence identity, revoked rights and invalidation after a new revision. Desktop/mobile authoring checks request and refresh validation and verify unsaved-edit disabling alongside the existing recovery/editor flows. Evidence: `/private/tmp/cms-events-validation-{full,build,types,migrations,db,focused,browser}.log`. No hosted migration or worker activation was performed.

## Anonymous reader boundary

Migration 333 provides strict public event detail and bounded listing readers, plus published-revision evidence and related-card resolution. The field allowlist excludes internal notes and raw relationship IDs. Readers recheck current image rights, internal links, related published content and public document access; revoked or withdrawn dependencies suppress delivery. Listing modification times use the published revision, so later private edits cannot change visitor content or discovery timestamps. The TypeScript projection also rejects unknown/private fields, mismatched routes/languages, unsafe related routes and incomplete event details.

The existing publication fence remains in place. Reader integration fixtures temporarily seed a published pointer inside rolled-back local transactions; they do not demonstrate an authorized publishing workflow or deployment. Route ownership, guarded publication, visitor routes and discovery are the next dependencies.

Reader verification: all 1,899 CMS tests, production build, TypeScript and offline 333-migration planning pass. Focused tests cover private field rejection, date/status/attendance readiness, safe related routes, same-site/language identity, published revision stability, related withdrawal and revoked image rights. Evidence: `/private/tmp/cms-events-public-{focused,full,types,build,migrations}.log`. No hosted migration or deployment was performed; the full acceptance score remains unchanged.

## Public image admission

Migration 334 connects event images to the existing public media authorization boundary. An asset is admitted only when it occurs in the allowlisted payload of a currently deliverable published event. Merely attaching an approved image to a draft does not grant visitor access. Related-content withdrawal, rights revocation or event withdrawal removes admission through that event; other independently eligible published uses retain their existing behavior. The previous internal media helper is revoked from browser roles. Publication remains fenced pending route ownership and release admission.

Image-admission verification: all 1,899 CMS regression tests and offline 334-migration planning pass. The reader integration fixture now verifies draft-only denial, public image access, cross-site denial, withdrawal/revocation denial and browser-role denial on the internal predecessor helper. Evidence: `/private/tmp/cms-events-images-{focused,full,migrations}.log`. This batch changes database authorization only; no hosted migration was applied.

## Event route ownership

Migration 335 reserves `/events` and its descendants for event delivery. Custom page eligibility rejects the whole namespace in both TypeScript and SQL; a record trigger also blocks other content types. The migration locks records and redirects while checking for existing collisions and stops without changing the colliding content. Event records retain `/events/slug` draft identity. Publication is still fenced pending guarded release admission.

Route verification: all 1,900 CMS tests, production build, TypeScript and offline 335-migration planning pass. Focused cases reject competing record types and migration over existing client content while preserving valid event drafts. Concept, Guided Safaris, Private Aviation, Kenya and Tanzania were recaptured from the local production preview; all content, media and interaction inventory fields match, with only capture metadata and source hashes refreshed. Evidence: `/private/tmp/cms-events-routes-{focused,full,build,types,migrations}.log` and `/private/tmp/events-*.json`. The local preview was stopped; no hosted migration or deployment occurred.

## Guarded database publication

Migration 336 replaces the temporary publication stop with event release checks. The shared review/publish/withdraw functions now support events only when the current revision is approved, has an unexpired event-1 validation receipt and matches the English event route identity. The release locks directly selected records and media, rechecks current rights/internal links/related content and resolves public related cards before accepting the published pointer. A later private edit retains the earlier approved public revision until separately reviewed and released. Withdrawal preserves drafts and history.

This supersedes the temporary fence described in earlier milestones. The client editor still does not expose publishing controls, and visitor routes remain pending. Database publication alone does not make event pages available on the website.

Publication verification: all 1,901 CMS tests and offline 336-migration planning pass. The integration test uses the real trusted worker, separate editor/reviewer/publisher roles, review/approve/publish and withdrawal functions. It rejects unauthorized publishers, expired validation and rights revoked after validation; it verifies public delivery of the approved revision and rejects an unapproved replacement. Evidence: `/private/tmp/cms-events-publishing-{focused,full,migrations}.log`. No hosted migration or deployment was performed. This database-only batch did not change the client bundle.

## Client review and publication controls

The event editor now exposes permission-scoped submit, approve, request changes, publish and withdraw controls. Publish and withdrawal require explicit confirmation bound to the selected revision. Unsaved changes, recovery conflicts and active operations disable workflow actions. The client rereads server state after a workflow request; an interrupted or unverifiable response blocks another workflow action until reload. Backend authorization and trusted validation remain authoritative. The interface explicitly states that visitor event pages are not connected yet.

Client workflow verification: 19 focused event tests, production build and TypeScript pass. Desktop (1280px) and mobile (390px) authoring fixtures pass review/approval, cancelled publish confirmation, lost committed publication response with action lockout, reload recovery, unsaved publish/withdraw guards and confirmed withdrawal, alongside prior editor/recovery checks. Evidence: `/private/tmp/cms-events-workflow-{tests,build,types,browser}.log`. The browser provider is synthetic; hosted acceptance remains pending. The prior backend batch verified real database release functions locally.

## Public delivery runtime

The event runtime now calls only the anonymous detail/list RPCs with no-store requests. Both CMS_PUBLIC_DELIVERY_ENABLED and CMS_EVENTS_DELIVERY_ENABLED must explicitly be true, with valid website and provider configuration. Detail responses pass the strict event projection; lists reject unknown fields, invalid/incomplete dates, duplicate paths, unordered IDs and oversized batches. Pagination is capped at 100 batches of 100; provider failures propagate rather than pretending no content exists. Listing order uses event start instants, with civil all-day dates retained unchanged and record ID as the tie-breaker. This does not automatically expire past events.

Runtime verification: 13 focused contract, projection and runtime tests plus TypeScript pass. Tests cover anonymous-key-only requests, rollout/configuration gates, invalid route/locale/private data, provider failure, pagination cursors/cap, duplicate content and offset-aware ordering. Evidence: `/private/tmp/cms-events-runtime-{tests,types}.log`. No visitor route or hosted service was enabled by this batch.

## Visitor event pages

The `/events` listing and `/events/[slug]` detail routes now use anonymous strict readers behind both rollout switches. They show current published event timing, status, organizer, venue/online information, rich content, images and related cards. Registration is suppressed for cancelled/postponed events. Missing or withdrawn public content returns 404. Metadata respects editorial canonical/indexing/social overrides and global indexing defaults. No event structured data, sitemap/search discovery or localized delivery is claimed by this milestone; those remain pending. Date labels currently retain source ISO values to preserve offsets and civil-date meaning.

Visitor-page verification: nine focused metadata/runtime/projection/namespace tests, production build and TypeScript pass. Desktop and mobile browser fixtures verify list/detail navigation, escaped rich text, images, registration, text-only content, canonical/noindex metadata, related cards, cancelled registration suppression and withdrawal/rights-revoked 404s. Screenshots were inspected. Evidence: `/private/tmp/cms-events-pages-{tests,types,build,browser}.log` and `/private/tmp/cms-events-public-{1280,390}.png`. The provider is synthetic, the local preview is stopped and no hosted deployment occurred.

## Event structured data

Event detail pages now emit Schema.org Event JSON-LD from the published projection. It maps scheduled/postponed/rescheduled/cancelled states and physical/online/hybrid attendance, preserves source date/date-time values and includes known venue/virtual location, organizer name and image. It does not invent offers, prices, availability, organizer entity type or previous dates. The shared JSON-LD renderer escapes less-than characters so content cannot close the script element. Search-result eligibility and indexing are not guaranteed and remain subject to Google's guidelines and hosted verification.

References checked: https://schema.org/Event and https://developers.google.com/search/docs/appearance/structured-data/event . Search discovery and Office imports are documented in their subsequent milestones.

Structured-data verification: focused metadata/schema tests and production build pass. Desktop/mobile browser fixtures parse emitted Event JSON-LD and verify hybrid locations and preserved all-day dates alongside existing visitor navigation, image, cancellation and withdrawal cases. Evidence: `/private/tmp/cms-events-schema-{tests,build,browser}.log`. No hosted deployment or external rich-result validation was performed; local fixture stopped.

## Sitemap and site search

Published events now feed the sitemap and site search through the strict public runtime and rollout switches. Search respects global content-type selection, noindex and canonical identity; sitemap inclusion additionally respects the per-event sitemap setting. Sitemap modification times use the published revision. Withdrawn or undeliverable events disappear through the same public reader boundary. The Events search filter appears when eligible results exist. Client settings include an Events checkbox; existing selections are preserved rather than silently enabling a new category.

Discovery verification: all 1,910 CMS tests, production build and TypeScript pass. Browser fixtures verify exactly one eligible sitemap URL and searchable event result, Events filtering, summary matching, noindex/canonical/global-indexing exclusions, withdrawal/rights revocation, sitemap-only exclusion and client search-category exclusion. Five source inventories were recaptured and matched outside source hashes/capture metadata. Evidence: `/private/tmp/cms-events-discovery-{tests,full,build,types,browser}.log`. Both local previews were stopped. Hosted release and acceptance remain pending; Office imports are documented in event-imports.md.

## Publication schedules

Saved events now expose the shared publication/withdrawal scheduler. Publication pins the approved saved revision; withdrawal pins the currently published revision. Controls require publish permission and are disabled for unsaved edits, unresolved workflow outcomes and other workspace locks. Explicit date/time offsets are converted to a visible UTC execution instant. Event start/end dates remain separate from publication schedules. Clients can refresh status and cancel pending/running schedules.

Verification: a real local database worker integration test covers ready publication and withdrawal, incomplete content, stale revisions and revoked publisher access. It verifies event-1 trusted validation at execution. All 17 shared scheduling regression tests, production build and TypeScript pass. Desktop (1280) and mobile (390) authoring fixtures verify scheduling, offset conversion, cancellation, draft guards and published-revision withdrawal selection alongside existing recovery and publication flows. Evidence: `/private/tmp/cms-events-scheduling-{db,regression,build,types,browser}.log`. No hosted scheduler or provider was activated.

## Translation authoring

Saved events now include shared translation creation, family navigation and source comparison/review controls. Opening a translation validates its event schema and route identity, resets editor/recovery state and retains exact language identity. Translation operations lock competing workspace actions and participate in the unsaved-navigation guard. Interrupted creation retains its recovery request until the created draft is safely opened.

Local database verification covers repeat creation recovery, preserved source content, cleared explicit canonical, independent reviewer enforcement, source-change detection, family navigation and inaccessible-record denial. All 1,944 CMS tests, production build and TypeScript pass. Evidence: `/private/tmp/cms-events-translations-{db,regression,full,build,types}.log`. Multilingual public delivery and hosted/client acceptance remain pending.

Desktop (1280) and mobile (390) browser fixtures also pass: translation creation with lost-response recovery, unsaved-edit guards, required source comparison and acknowledgement, source-change warnings and navigation back to the English source. Existing scheduling, publication, recovery and read-only checks remain green. Evidence: `/private/tmp/cms-events-translations-browser.log`. The local fixture was stopped; no hosted writes occurred.

## Event date entry

Timed events now use native local date/time inputs with separate, explicitly labeled UTC offset selectors. The editor displays the saved timestamp and retains an exact timestamp field for imported precision or uncommon offsets. It never converts through the browser timezone. Picker values without seconds gain `:00` to satisfy the saved contract; existing fractional seconds and offsets are preserved. All-day events use native date inputs and retain inclusive civil end dates. Switching timing modes still requires confirmation and supports undo.

Focused tests cover exact round trips, minute-input normalization, unusual imported offsets, daylight-saving instant ordering and leap-day validation. Production build and TypeScript pass. Evidence: `/private/tmp/cms-events-time-{tests,regression,build,types}.log`.

All 51 event regression tests and desktop/mobile authoring checks pass. Browser checks cover date/offset selection, all-day leap-date entry, undo back to timed mode and exact saved timestamps, alongside existing import-independent recovery, scheduling, publication and translation controls. Evidence: `/private/tmp/cms-events-time-browser.log`. Local preview stopped; hosted/client acceptance remains pending.

## Event library filters

The event library now combines lifecycle state (scheduled, postponed, rescheduled, cancelled) and inclusive local start-date bounds with its existing search, attendance, review-status and ownership filters. Labels distinguish lifecycle from approval status. Date filtering uses the event's own stored civil start date, without conversion through a browser or database timezone; it is not an overlap filter. Undated drafts are excluded only when a date bound is supplied.

Migration 340 replaces the scoped search RPC with optional lifecycle/date parameters while retaining existing positional/default calls. Filters apply before UUID pagination and access checks remain enforced. API validation rejects invalid dates, reversed ranges, unsupported states and duplicate arguments. Local database cases cover opposite UTC offsets, inclusive leap-day bounds, undated drafts, combined lifecycle filtering, pagination and unauthorized access. All 1,948 CMS tests, production build, TypeScript and offline planning for 340 migrations pass. Evidence: `/private/tmp/cms-events-filters-{api,db,full,build,types,migrations}.log`. No hosted migration was applied.

Desktop (1280) and mobile (390) browser checks confirm lifecycle/date selection, exact filter arguments, clearing filters and the existing date-entry, recovery, scheduling, publication and translation workflows. Evidence: `/private/tmp/cms-events-filters-browser.log`. Local preview stopped; hosted/client acceptance remains open.
