# Photography expedition CMS

Status: draft contract, client editor, content previews and save/advisory validation implemented locally. Imports, public delivery and publishing remain incomplete. Existing photography pages and content remain unchanged.

## Inspected sources and editable inventory

Inspected `lib/data.ts` Expedition/ExpeditionDeparture/DayPlan types, `app/photo-expeditions/[slug]/page.tsx`, `lib/departures.ts`, `lib/tour-pricing.ts`, `components/BookingConditions.tsx` and `components/ExpeditionEnquiry.tsx`. This inventory covers detail-page data and identified presentation copy; listing-page composition, form definitions, shared chrome and deeper component controls still require their own complete mappings.

| Existing element | New contract destination / handling |
| --- | --- |
| Slug/title/category/geography | Explicit bounded fields; save URL and title must match |
| Description/introduction/skill/group/duration/season/species/equipment/route | Explicit text fields; no heuristic hiding of years, spots or availability text |
| Legacy publicationStatus | `programmeStatus`: preview or confirmed, distinct from CMS publication state; migration must map explicitly |
| Reviewed availability | `availabilityReviewedAt`, empty or an actual ISO calendar date |
| Legacy free-text date | `dateLabel`, preserved text; never parsed into a departure automatically |
| Departures | Stable ID, actual start/end dates, supported availability status and editorial availability text |
| Price | Exact supplied text, including currencies/taxes/qualifiers; no inferred numeric amount, exchange rate or generated starting-price prefix |
| Listing image | Explicit `image` with contextual alt/decorative/caption/credit |
| Hero image chosen by slug/gallery heuristics | Explicit `heroImage` and optional independent `mobileHeroImage` |
| Hero title and copy, including slug-specific overrides | Explicit `heroTitle` and `heroCopy`; migration must preserve the actual displayed source choice |
| Gallery including Kanha destination-image merge | Stable gallery items with explicit approved images; migration must review and preserve the displayed merged selection |
| Film | Approved asset, title, poster, caption, transcript and captions asset contract; delivery remains blocked |
| Mentor and guide names | Preserved text, plus explicit role-based specialist references; no automatic name matching |
| Days | Stable ID, label, title, copy and stay |
| Highlights/inclusions/exclusions/body paragraphs | Stable identified text items; order preserved |
| FAQs including runtime-generated questions | Explicit identified question/answer items; migration must materialize reviewed current copy, never invent missing answers |
| Detail-page headings, fact labels, departure messages, gallery and FAQ introduction | `labels` object, editable bounded text |
| Booking headings, introduction, cancellation/payment and price copy, contact action | Explicit `booking` fields and validated link; factual/contractual copy defaults blank pending supplied content |
| Enquiry heading/introduction/specialist context | `enquiry` fields and selected form reference; actual form labels/consent remain in form administration |
| SEO | Shared page SEO contract, including title/description/canonical/social/indexing/sitemap controls |

## Contract and validation

`lib/cms/photo-expeditions.ts` defines version 1. New drafts are programme previews, not published records. Images and the enquiry form can remain unselected while editing. Required publication copy and media readiness are separate advisory findings. Arrays have bounded lengths and stable unique IDs. Specialist references are unique per role, allowing the same person to be both mentor and guide. ISO dates reject impossible dates; an end date cannot precede the start. Departures sharing a date are not silently combined, and enquiry availability is not a seat reservation.

Draft save validates the full contract, route `/photo-expeditions/<slug>` and exact title before persistence. Unknown top-level or nested fields are rejected; migration must retain unmapped source separately instead of dropping it. Existing legacy records are not rewritten. A malformed legacy payload must be explicitly migrated before it can be saved through the new contract.

Saved content checks request nested media evidence. Every referenced asset needs exactly one current available result; IDs alone are not proof of rights. Empty itinerary/FAQ/list items are reported. Enquiry context, specialist references, films and complete public delivery remain explicit blockers. `expedition-draft-1` always returns `contentChecksPass: false`; no trusted publication policy has been enabled.

## Verification and remaining work

Full CMS suite: 551 passing after this addition; TypeScript passed. Tests cover contract round trips, unchanged supplied price/date copy, independent hero assets, stable collection IDs, impossible/backwards dates, malformed saves, route/title mismatch and current media evidence. This backend-only milestone makes no browser or production-build claim.

Next: client workspace and collection editors, saved and shared previews, migration of every source field/derived display choice, Word/Excel mappings, published expedition reader and listing, specialist/destination references, dynamic departures, enquiry-context verification, SEO/sitemap/search, trusted publication/rollback and provider-backed client acceptance. Form/booking copy and unavailable assets must be reviewed before migration; no real content has been imported.

## Client expedition workspace

Photography expeditions is now a CMS navigation item. The workspace lists records in pages of 50, creates versioned drafts, loads saved records and preserves invalid/legacy payloads behind a migration message. Record identity/type, route and title must match the parsed contract before editing. Saved URLs and locales are locked; editing respects the returned edit permission. Pending local changes participate in the workspace's discard guard. Load/list generations ignore obsolete responses, and the enclosing workspace is keyed by account and website.

The editor covers facts and exact price/date wording; programme status; independent listing/desktop/mobile images; gallery, departures, itinerary, highlights/inclusions/exclusions/body/FAQs; role-based specialist selection; editorial labels; booking copy and validated contact link; enquiry form/context; and SEO. Text fields expose character limits/counters. Collections retain stable IDs through edits and keyboard-operable move buttons, with confirmed removals. New departures start incomplete rather than inventing dates. Existing film metadata/poster can be edited while film/captions assets are retained; uploads and playback remain unfinished.

Saving sends the current expected revision, reloads the saved result and refreshes the list. A failed or conflicting save preserves local edits. Saved Content checks use existing validation/status APIs with no trusted-publish action. History restoration sends the current expected revision and creates a new draft; restoring an older incompatible payload returns to the migration message rather than rewriting it. Full paginated history and editorial workflow controls remain pending.

Desktop 1280×900 and mobile 390×844 browser QA used the actual workspace/editor with simulated persistence. It exercised legacy preservation, read-only state, invalid blank departure blocking, leap-date entry, itinerary reordering/ID preservation, exact price wording, create/update save/reload, simulated save conflict, saved checks/dirty disabling and history restoration. Exact-label tests exposed ambiguous slug/dropdown names; explicit accessible names were added and the flow rerun successfully. Mobile screenshot inspected. Browser plugin not available; regular Playwright used. The temporary fixture was removed. This is not provider-backed permission/concurrency acceptance; image/reference picker transport, long-list paging and film controls were not included in this browser flow.

Next: rendered expedition preview and shared preview, controlled migration/imports, published detail/listing integration and date handling, references/forms, trusted workflow and provider-backed UAT. Production build outcome is recorded in the progress log.

## Expedition content previews and private sharing

The editor now opens an unsaved content preview and exposes the existing saved-revision private-sharing controls. Secure preview dispatch supports `photoExpedition` using the same renderer. Invalid payloads show a repair message without rendering partial content or changing the source. The preview covers hero/listing/gallery images and credits, descriptive copy, facts, exact supplied price, itinerary, identified lists, FAQs, booking copy, film poster/transcript and enquiry context. Film playback remains explicitly unavailable. This is an editorial content preview, not a claim of final public styling parity.

An explicit UTC calendar-date control partitions departures by start date. Dates are sorted by start and stable ID; same-day departures stay separate and full departures retain their status. Earlier departures, including already-started trips, remain inspectable in a separate disclosure. No historical data is removed from the draft. Invalid preview dates are rejected, and free-text date wording is never parsed. A desktop/mobile selector displays the corresponding explicit hero image, with separate alt text/credits; a missing selected hero is reported rather than silently substituted.

Booking and departure actions are disabled and no enquiry is submitted. In the editor, a selected form can use the existing permission-checked latest-form-draft preview; it is labelled as separate from the expedition revision. Shared expedition previews do not receive that loader and do not gain access to linked form or specialist drafts. Private images still require current media permission. Existing recipient assignment, expiry polling and revocation handling remain in the secure viewer.

Full CMS suite: 554 passing. New pure tests cover date boundaries, full status, preserved price/date wording and source immutability, plus malformed content/date rejection. A PGlite scenario creates a shared expedition revision, edits the current draft, verifies the recipient still sees the original dates/copy, rejects unrelated/anonymous viewers, verifies revocation and confirms nothing was published. Desktop/mobile browser QA with controlled WebP responses passed date changes/earlier departures, price, image/credit switching, FAQs, disabled actions, linked-draft access messaging and malformed fallback; no horizontal overflow or page errors were reported. Mobile screenshot inspected. Browser plugin unavailable; Playwright used. Temporary fixture removed.

Pending: provider-backed share/auth/image/form acceptance, final public layout and film delivery, migration/Office imports, published expedition readers/listings, trusted publishing and form/departure context integration. Production build outcome is in the progress log.

## Review-only expedition migration planner

`planPhotoExpeditionMigration` now inventories legacy records without writing, downloading assets or approving publication. Every candidate retains a cloned original snapshot, canonical source digest, proposed payload, explicit mapping and field findings. Mappings are bound to the complete source digest; edits invalidate the old mapping. Legacy itinerary, departures, FAQ and text-list order receive deterministic IDs. Exact price and free-text date wording remain unchanged. Unknown fields, malformed collections/dates, source item identities, films, unmapped images and duplicate URLs prevent draft readiness.

A mapping must explicitly select programme status and specialist references and supply a reviewed display package: hero text/images, final gallery, labels, booking copy, enquiry form/context, additional runtime FAQs, review date and notes. Original source FAQs are retained before additional questions. Original gallery images must each have an inspected mapping even when the reviewed displayed gallery differs, preserving the review trail for the legacy hero exclusion and destination-gallery merge. The original cancellation terms remain in the source snapshot alongside the reviewed booking copy. Date-dependent FAQ wording is flagged as requiring continued editorial review; this planner does not make it dynamic. Asset/form UUIDs and review notes are proposed mappings, not server-verified evidence of permissions, publication or rights.

The current snapshot contains eight expeditions; an unmapped review reports zero ready drafts. No real records were imported. The review/apply API, atomic migration receipts, client review interface, actual image/form/specialist mapping and Office import integration remain pending. Tests cover deterministic output, source/mapping immutability, preserved date/price copy, invalid data and unknown fields, duplicate identity, missing/unused/stale mappings and the real source inventory. TypeScript passed. This pure planner change does not require or claim browser QA.

## Permission-checked migration review endpoint

`POST /api/cms/migrations/expeditions` accepts `action: review`, website UUID, English locale, 1–25 source records and digest-bound mappings. Requests use the shared bounded JSON reader, bearer authentication and same-origin check. Apply requests are rejected because atomic draft creation and recovery are not implemented yet. The endpoint returns the plan, a digest bound to website/locale/mappings/current evidence, and `applyAvailable: false`.

Local migration 084 adds `review_expedition_migration_links`. The caller must be allowed to create photography expeditions. Media checks require media-library access and same-website, ready, approved, unexpired, unarchived WebP images. Reference checks require the expected specialist/form type, same website and record-view permission; the HTTP layer additionally requires the requested locale. These checks allow draft references for migration review and do not establish public delivery readiness. Every retained mapping is checked, including original gallery images omitted from the reviewed display. Missing, reordered, duplicated or unexpected RPC evidence fails the review instead of producing readiness.

Verification: 560 CMS tests pass and TypeScript passes. New HTTP tests cover image denial, wrong language, retained original-gallery images, evidence digest changes, malformed evidence, auth/origin rejection and unsupported apply requests. Local PGlite tests cover website/permission isolation, reference-type mismatches, expired rights, anonymous denial and unchanged publication state. Migration 084 has not been applied to a live provider. The client review screen, atomic apply/receipt recovery, concurrency validation and actual migration remain pending. No rendered UI changed in this milestone.

## Atomic draft import and retry recovery

Local migration 085 adds `apply_expedition_migration`, `get_expedition_migration_result` and private actor/website-scoped batch receipts. This supersedes the review-only endpoint limitation above. The HTTP endpoint now accepts `apply` with the exact current review digest and a UUID request key, and `status` with website/request key. A first apply repeats evidence checks and requires every candidate ready with no unused mappings. The transaction rechecks and share-locks mapped images and typed form/specialist records, creates only new English expedition drafts with exact slug-derived routes, preserves source and mapping provenance and records an audit event. Unsupported films remain blocked. Original image mappings excluded from the final gallery are checked in the transaction too.

Each source digest uses an expedition-specific import key, preventing another request from importing the same source again. Existing website routes are protected by normal record uniqueness; existing data is not overwritten. The whole batch and receipt roll back if any item fails. An exact completed retry returns the original record/revision IDs before rechecking subsequently withdrawn assets, and the database compares the entire manifest before permitting replay. Reusing a request key with changed source, review or manifest fails. Status is scoped to the current actor and creation permission; an absent receipt means unconfirmed, not proof an in-flight request failed.

Verification: 562 CMS tests passed; TypeScript passed. An HTTP-to-PGlite scenario covers review, stale-digest rejection, apply, saved provenance, unpublished records, status recovery, exact replay after image-rights withdrawal, changed-manifest rejection, duplicate-source prevention and unauthorized receipt access. A separate transaction test verifies a later invalid form rolls back earlier drafts, import keys and receipt; it also checks unavailable original image mappings cannot be bypassed. PGlite tests are sequential and do not establish real PostgreSQL lock/concurrency behavior. Migrations 084/085 remain local, and no real expedition content has been imported. The client review/recovery screen, Office mapping and provider-backed acceptance remain pending.

## Browser review and recovery contracts

The migration mapping schema is now shared between the server planner and browser client in `photo-expedition-migration-contract.ts`. Browser parsing accepts either an expedition array or an exported site's `expeditions` collection, bounded to 25 records/1 MB. Mapping files are bounded to 500 KB and must satisfy the same explicit display/form/image contract. Browser-native hashing matches server canonical hashes without importing Node crypto into client code.

`photo-expedition-migration-client.ts` verifies review candidate count/order, original source hashes, exact normalized mappings, source title/slug identity for ready drafts, schema validity, findings, unused mappings and overall readiness. It rejects malformed or inconsistent server responses. Receipt checks require exactly one unique record, revision and source key for every reviewed expedition. Recovery parsing accepts only identifiers/hashes, scopes them to the website and actor, and binds a completed status to the saved request/source/review digests. An unconfirmed status is not interpreted as failure or permission to start a new import.

Targeted client tests pass using actual HTTP review responses with controlled evidence. They cover parser bounds, browser/server hash parity, source/mapping tampering, inconsistent readiness, malformed receipts, account isolation and unknown/personal source fields in recovery storage. TypeScript passes. These helpers are not yet wired to a rendered expedition migration screen; that interface and browser interaction QA remain pending.

## Visible administrator migration panel

Photography expeditions now includes an “Import existing photography expeditions” disclosure. It accepts source and reviewed mapping JSON files, reports loaded counts, requests a server review, lists findings and renders the proposed expedition content. Import requires an explicit acknowledgement of content, images, dates, booking terms, form mapping and warnings. Changing either file invalidates the review and acknowledgement; changing the source clears the old mappings. This is an administrator migration flow, not the planned client Word/Excel import experience or a visual mapping editor.

Before an apply request, the panel persists validated recovery identifiers under an account/website-specific key. Interrupted or malformed responses retain the pending request; controls offer status checking and an exact same-request retry while in-memory source remains available. Reloaded panels can recover status without storing source content. An unconfirmed response keeps the import pending. Unreadable recovery data blocks new imports for administrator investigation. Completed, verified receipts clear recovery data and refresh the expedition list. Import state participates in the workspace unsaved-change guard and disables concurrent expedition edits; dirty editor content disables migration actions.

Desktop 1280×900 and mobile 390×844 QA used the actual workspace/panel with controlled API evidence and simulated persistence. Tested invalid source handling, source/mapping upload, review and price preview, acknowledgement, review invalidation, disabled competing actions, a lost apply response, unconfirmed status, successful recovery after reload, storage cleanup and corrupted recovery data. There were no page errors, unexpected console warnings/errors, or horizontal overflow; the intentionally simulated 503 was expected. Mobile screenshot inspected. A test initially selected a second file before the disabled upload controls had re-enabled; waiting for the enabled state resolved the timing issue. File validation messages were shortened to field-specific explanations instead of raw schema JSON. Browser plugin unavailable; Playwright used. Temporary fixture route removed.

Remaining: actual provider-backed account/media/form acceptance, same-request retry and storage-write-failure browser scenarios, visual mapping authoring, Office imports, public delivery/publishing and the wider PRD completion work. The QA did not import real content or verify provider concurrency. Build and regression results are recorded in the progress log.

## Structured expedition Office import model

`photo-expedition-import-contract.ts` defines version 1.0 with Pages, Content, Departures, Days, Lists, FAQs, Media, References and Films tables. Content fields cover all scalar expedition/label/booking/enquiry/SEO fields, with per-field hard character limits and separate advisory word/SEO guidance. Media supports listing, desktop/mobile hero, stable galleries, SEO and film poster placements. References distinguish mentor, guide and enquiry form; specialist names remain independent text. Films include explicit processed video/captions IDs and require a poster in Media. This describes proposed content, not verified asset rights or supported public playback.

`planExpeditionImport` creates complete proposed snapshots from validated tables. Create/update intent is explicit; updates require the exact caller-scoped current revision, preserve omitted fields and collections, and cannot change the URL or language. `replaceCollections` must explicitly list every replaced/cleared collection or image. Replacing video includes its poster; conflicting video/poster replacement intent is rejected. Stable IDs and unique positive positions preserve ordering. Blank cells can clear scalar text; absent scalar rows retain existing values. Exact prices and free-text dates are not parsed or rewritten. ISO departure dates and ranges use the expedition contract. Any error prevents all proposed changes from being returned, and existing/source data are never mutated.

Shared Office parsing now exposes `parseExpeditionXlsx` and `parseExpeditionDocx`, with expedition metadata and `CMSExpedition` Word marker. Existing archive/size/formula/external-reference/tracked-change protections apply. Word supports horizontal tables and vertical field/value records. Blank rows retain finding locations; file digest/byte count and Word table locations are preserved. Limits are 25 expeditions per batch, 500 total table rows and 2 million text characters, in addition to archive limits.

Eight targeted tests pass for schema coverage, complete proposed records (including film and references), explicit clearing/preservation, stale revisions, ordering/identity errors, impossible dates, unknown fields, exact whitespace/price/date parity across Excel and both Word layouts, provenance and parser rejection cases. TypeScript/full regression results are recorded below in the progress log. This milestone does not yet provide downloadable client templates, an Office expedition review/apply API, current media/reference evidence, import receipts or a browser upload flow. Film imports must remain blocked at persistence until video/caption evidence is implemented. No real data was imported.

## Downloadable expedition templates

Blank version 1 templates now exist at `/cms/templates/expedition-v1.xlsx` and `/cms/templates/expedition-v1.docx`. Both include creation/update instructions, explicit replacement rules, field limits and guidance, exact date/price handling, and all supported table names. They contain no example data in importable fields. Filled fixtures live separately under `tests/fixtures` for parser regression.

Excel uses text cells for source text and ISO dates, numeric positions, frozen headers/identity columns, categorical dropdowns and red length-warning formatting over the first 100 input rows. These controls are guidance; server validation remains authoritative. Excel's 32767-character cell limit is documented, with Word/editor recommended for longer fields. The Instructions sheet lists field-specific limits and supported enumerations. The workbook was authored/recalculated/rendered with the bundled artifact tool; each sheet and a 201-character title warning were visually inspected. Exported dropdown/conditional-format/freeze metadata and blank tables are tested. Native Excel interaction has not been exercised.

Word uses copyable vertical field/value tables and a field guide. The blank document was rendered with the bundled LibreOffice renderer and all 13 pages visually inspected. Filled Word and Excel fixtures parse into valid expedition proposals and retain multiline introduction text, leap-day start dates and Full departure status. Blank files produce only the expected missing-page error. Both local download URLs returned HTTP 200 with the correct Office MIME types. The client upload/review/save flow and server evidence/application remain pending; instructions explicitly condition upload on that feature becoming available. Films remain unsupported for saving pending video/caption verification.

## Server review of expedition Office uploads

`POST /api/cms/import/expeditions` accepts raw Word/Excel bytes with authenticated `X-CMS-Site`, `X-CMS-Format` and `X-CMS-Action: review` headers. It checks same-origin requests and website membership before bounded file parsing. Requested update UUIDs are resolved through caller-scoped editor reads, in bounded batches, and must match record identity/type/title/path. Existing content is supplied only by those server reads. Source bytes, resulting proposals and current evidence are bound into the returned review digest. Nothing is written; `applyAvailable` remains false until the Office transaction and receipt flow are connected.

Local migration 086 adds `review_expedition_import_links`. New drafts require expedition creation permission; every update target requires same-website expedition edit permission. Media requires library view permission plus ready, approved, unarchived/unexpired WebP evidence. Specialist/form references require matching website/type and view permission, with locale checked by the API. Reference access is draft access, not publication readiness. Evidence must match the complete ordered identity set; incomplete/malformed responses fail closed. Preserved images/references are checked too. Film and captions explicitly block import readiness even if generic evidence says available, while the original film remains in the proposed payload. Findings resolve to the source Pages row, including blank rows.

Verification: 583 CMS tests pass and TypeScript passes. New tests cover actual downloadable Word/Excel fixture uploads, server-content preservation, changed-content/evidence digests, stale revisions, identity/type/path mismatch, nested media, same-person specialist roles, form/language checks, unsupported film evidence, authentication/origin/membership and file limits. PGlite tests exercise create/edit separation, wrong record types/sites, revoked image rights, unauthorized/anonymous calls and unchanged publication state. Migration 086 is local only; real provider acceptance and concurrency are unverified. Office apply/recovery and the browser upload/review flow remain pending.

## Atomic Office draft saving and recovery

The endpoint now supports `apply` with the original file, `Idempotency-Key` UUID and `X-CMS-Review` digest, and `status` with the same request key and site. Valid reviews return `applyAvailable: true`; this supersedes the review-only limitation above. The server reconstructs the manifest and rechecks current records/media/references before accepting a new save. A changed revision, file or evidence requires another review. Completed same-file/same-review requests recover their receipts before rereading changed records; malformed or mismatched receipts fail closed. Review digest version is `expedition-office-review-2`.

Local migration 087 saves each batch atomically through `save_draft`. It locks updated records, checks expected revisions and unchanged routes/languages, and rechecks image rights and typed reference access inside the transaction. Create import IDs are retained as unique source keys. A failure rolls back drafts, import keys and the receipt together. Actor/site-scoped receipts bind the entire original manifest and recover exact retries; another actor cannot read them. Saving never publishes. Film imports remain blocked.

Verification: all 588 CMS tests and TypeScript pass. Tests include a real Word fixture through HTTP review/apply/status into PGlite, exact retry recovery with one persistence call, create/update and stale revisions, duplicate import prevention, altered-manifest rejection, whole-batch rollback, receipt isolation, media rights withdrawal after review, wrong reference types, malformed responses and unchanged publication pointers. These are local sequential tests; real provider deployment/concurrency remain unverified. Browser Office upload/review/save/recovery, provider UAT, films and public expedition delivery remain pending.

## Browser import verification helpers

`photo-expedition-import-client.ts` validates server review responses against the selected Office file's SHA-256, byte size and format. Ready reviews require verified current records/media/references, error-free nonempty changes and no unsupported film. Proposed routes, English locale, create/update identities and duplicate routes are checked before review acceptance. Recovery preparation derives source keys using the same canonical hash as the server and stores only request/digest/target identifiers, scoped to actor and site. Corrupt or cross-account storage is rejected. Receipt verification requires all expected targets, exact updated record identities, and unique record/revision/source IDs.

The helpers are tested against actual server responses from the filled Word fixture, including browser/server hash parity, changed-file and inconsistent-readiness rejection, corrupt/foreign recovery state and incomplete/mismatched receipts. All 592 CMS tests and TypeScript pass. These helpers are ready for the Office panel; they are not yet connected to visible UI, and browser interaction has not been claimed for this milestone.

## Client Office upload panel

The Photography expeditions workspace now includes **Import Word or Excel content**, with template download links, file selection, server findings and a full proposed expedition preview. Clients must acknowledge the content/replacements/warnings before saving drafts. The panel uses the browser verification helpers above. Recovery identifiers are persisted before sending a save; uncertain results retain the request and offer a status check or exact same-file retry. A page reload restores the status-check flow without storing the uploaded document. Corrupt recovery data prevents competing imports. Office import, legacy migration and manual edits mutually lock while changes are pending.

Desktop and mobile browser QA exercised actual Office fixtures with the real API handler and mocked persistence: review, preview, acknowledgement, lost-response recovery, unconfirmed status, same-request retry with one write, reload recovery and corrupt storage. Both viewports had no unexpected console/page errors or horizontal overflow. The mobile screenshot was inspected. The temporary QA route was removed; no test interface ships. Build and 592 CMS tests pass. Provider-backed client UAT, browser storage-quota failure and native Office acceptance remain unverified; film/public delivery remain pending.

## Published expedition projection contract

`published-expedition.ts` establishes the public content projection for the forthcoming publication-authorized reader. It requires exact website/route/English identity, complete core editorial facts, explicit listing/hero images and a published form reference. Specialist references must match the exact requested set, website, language and published revision; one specialist can fill both mentor and guide roles without duplicate evidence. Empty list/day/FAQ entries and unsupported films are rejected. All source wording, price and programme/departure status are retained. An explicit UTC calendar date separates sorted upcoming/earlier departures without inferring inventory or confirming a preview programme.

This is a pure transformation, not publication authorization. Its caller must verify published revision eligibility, current media rights and form readiness. It is not wired into public routes and does not enable the draft publication validator. Next work is the database reader and its revocation/permission checks, followed by public rendering, form/departure context, SEO and publication gates. Tests verify exact editorial preservation, both specialist roles, date boundaries, unchanged source, missing/duplicate/foreign references, invalid identities and unsupported/incomplete content. All 595 CMS tests and TypeScript pass.

## Public reader transport (not enabled)

`public-expedition-runtime.ts` prepares the server transport and HTTP response handling for `get_public_expedition`. Configuration requires both `CMS_PUBLIC_DELIVERY_ENABLED=true` and `CMS_EXPEDITION_DELIVERY_ENABLED=true`, plus a valid site UUID and public connection settings. The transport rejects any different website, non-English locale or invalid route before network access. The response must match the published projection contract. Missing records return 404; malformed/unavailable upstream data returns a generic 503 without database details. HTTP input accepts GET and a single optional English locale only, with no-store/noindex response headers. Calendar grouping uses the server date, not a caller-controlled query.

No API or website route imports this transport yet. The `get_public_expedition` SQL implementation, current publication/media/reference/form checks and public media authorization still need completion before wiring routes or enabling flags. Tests use injected transport responses and therefore do not prove database publication authorization. All 598 CMS tests and TypeScript pass; existing live pages remain unchanged.

## Local publication-authorized database reader

Migration 088 implements `get_public_expedition` for anonymous/authenticated public reads. It selects only the website's English published expedition revision at the exact route, applies a nested allowlist projection, requires core facts/listing+hero images, and rejects films. Every referenced image must currently be inspected, approved, unarchived, unexpired WebP media for that website. Linked specialists are resolved through the existing public specialist reader, including its transitive reference and image checks. Both roles can share one specialist; duplicate role assignments are rejected. The enquiry form must have a current published revision in the same website/language with a nonempty supported field array; file-upload forms remain unavailable. Only form identity/revision metadata is returned, never private notification routing.

The SQL reader is a delivery boundary; full schema validation still runs in the server projection and form delivery/intake. Publication policy, expedition-specific form/departure context and media entitlement are not enabled by this migration. No public website/API route has been connected and no remote SQL has been applied.

Verification uses PGlite fixtures with root-set publication pointers solely to exercise the reader before the publication policy exists. Anonymous reads prove draft-only records are hidden, subsequent draft edits do not replace published copy, nested unknown/private fields are stripped, and rights revocation/expiry, archive state, wrong media type, specialist/form unpublication and unsupported film/language withdraw delivery. The database result passes the TypeScript published projection. All 599 CMS tests and TypeScript pass. Real provider permissions/concurrency and complete publishing workflow remain unverified.

## Expedition image authorization and gated API

Local migration 089 extends `media_is_published` using only asset IDs from `get_public_expedition`'s eligible, nested-allowlisted published payload. Listing, hero, mobile hero, gallery and SEO images qualify; draft-only and unknown/private attachment images do not. Revoking any required image or unpublishing the form/expedition removes that expedition's media entitlement. Assets independently used by another eligible published record retain that independent entitlement. The existing public media HTTP handler continues checking descriptors, bytes, hashes and authorization again after fetch.

The dynamic GET route `/api/cms/published/expeditions/[slug]` now delegates to the checked runtime. Both global and expedition delivery flags are required. The local smoke request returned the expected generic 503 with no-store/noindex headers while rollout is disabled. No website page was switched, flags enabled or remote SQL applied.

All 600 CMS tests, TypeScript and production build pass. New database coverage verifies all five image locations, private/draft exclusion, cross-site isolation, form unpublication, required-image revocation and expedition unpublication. Public rendering, enquiry/departure context, SEO, publication gates and provider acceptance remain pending.

## Expedition SEO and sitemap eligibility

`expedition-route.ts` supplies metadata using the existing shared SEO resolver. It respects explicit page titles/descriptions/canonicals/social overrides, website title templates and site-wide noindex restrictions. Without published website defaults, it uses the expedition title, description and explicit hero/listing image. Social images use authorized public media URLs and decorative images receive empty alt text. Canonicals and image URLs are absolute against a validated HTTPS website origin. Titles are absolute Next metadata values to avoid duplicate template application.

The sitemap helper returns a URL only for an indexable canonical page not explicitly excluded, and does not invent modification timestamps. This is eligibility for an already verified published expedition, not enumeration or authorization. Neither metadata nor sitemap output is wired to the legacy website route yet; the renderer and published index enumeration remain pending. Tests cover overrides/defaults, noindex precedence, alternate canonicals, exclusion, unsafe origins and explicit rollout selection. All 604 CMS tests and TypeScript pass.

## Public expedition renderer (route integration pending)

`components/CmsExpedition.tsx` and its scoped CSS render the verified public projection: responsive hero and separate image alt/credits, editorial introduction/body, factual fields, upcoming departures with exact statuses, itinerary, inclusion/exclusion/highlight lists, gallery captions/credits, FAQs, booking conditions/link and published specialist names. Past departures are excluded from the public upcoming list. Price and availability text are never rewritten or inferred. Enquiry is a required React node supplied by the eventual verified form/context integration; the renderer does not silently substitute another form.

Desktop 1280×900 and mobile 390×844 browser QA passed page identity/content, separate responsive hero alt, exact price/Full status, FAQ expansion, external booking link safety and enquiry-anchor navigation. No page/console errors or horizontal overflow; both screenshots inspected. Browser plugin unavailable, regular Playwright used. QA used synthetic images and an explicit enquiry placeholder; no real submission or production content was tested. Temporary fixture route removed. Production build and all 604 CMS tests pass. The public slug route still uses legacy rendering until enquiry/context and publication gates are complete.

## Enquiry context contract

`expedition-enquiry-context.ts` defines a strict browser selection containing only expedition UUID/revision/slug and an optional departure ID. The server resolver takes a publication-authorized expedition response and verifies the selected expedition revision and associated form revision. It derives title, exact price, programme status and departure dates/status/availability from that published response. It rejects forged text, mismatched site/route/record/revision/form, missing departures and departures earlier than the explicit server date. A general enquiry has a null departure. A Full departure can receive an enquiry while remaining Full; this contract never reserves a place or confirms a booking.

This resolver is not yet wired into generic enquiry intake. The persistence transaction must recheck expedition and form publication before saving, and retry recovery must use the original stored receipt/context before considering date or revision changes. Those steps, the departure selector and lead-detail display remain pending. Tests cover exact editorial preservation, general/Full enquiries, leap-day dates, forged selections, removed/past departures and stale expedition/form revisions. All 607 CMS tests and TypeScript pass.

## Atomic expedition enquiry persistence and intake

Migration 090 adds service-only `accept_expedition_enquiry`. It validates identity-only selections, serializes request keys per website, locks the expedition/form publication pointers, rechecks the public reader and selected form revision, and derives stored context from published content. Selected departures must uniquely match an upcoming UTC start date. Exact programme/price/status wording is retained; Full enquiries remain Full. Context and normalized form answers are saved through the existing lead transaction. Existing receipt recovery runs before current page/date checks and compares the original selection/source path plus form, answers and consents, preventing duplicate or altered retries after withdrawal.

The existing intake now accepts optional strict expedition identities after its normal bounded HTTP/origin/rate/challenge/form validation. The database adapter dispatches these submissions to the new service RPC; generic forms retain their existing path. Client titles/prices/statuses are rejected. There is no departure selector or public page hookup yet.

PGlite tests prove service-only access, forged/stale/past/unknown selection rejection, server/TypeScript context parity, exact receipt replay, changed-input rejection and recovery after expedition/form unpublication with one lead. Adapter tests verify RPC dispatch; intake tests verify challenge/form gates still apply. All 610 CMS tests and TypeScript pass. Real-provider concurrent dependency withdrawal remains unverified: expedition/form pointers are locked and reference/media eligibility is checked, but no multi-connection concurrency proof is claimed. The new migration is local only; deployment, selector UI, lead context display and public route integration remain pending.

## Public enquiry departure selection

`PublicEnquiryForm` now accepts optional published expedition context and rejects a fetched form revision/language that differs from that context. `EnquiryFormBody` offers a general enquiry or an explicit upcoming departure, showing exact dates/status/availability. A separate wrapping summary preserves long text on mobile. It states that an enquiry is not a reservation or confirmation. The request contains only record/revision/slug/departure identities; the server derives editorial context.

On first submission the selected identities are captured alongside the request key and answers. Uncertain results lock all those choices; retries retain the same body identities and answers while obtaining a fresh verification token. Existing before-unload protection remains. This is in-memory retry recovery, not persistent storage of visitor answers.

Desktop/mobile Playwright checks passed selection, Full/waitlist wording, locked answers/selection after a simulated 503, exact request replay and confirmed-success display. Mobile clipping found in the native select was addressed with the wrapping summary and rechecked. No unexpected console/page errors or horizontal overflow. Temporary fixture removed. QA used an injected verification control and mocked endpoint, not live Turnstile/provider intake. All 610 CMS tests and production build pass. Public route integration, lead context display and provider UAT remain pending.

## Opt-in public detail route integration

`app/photo-expeditions/[slug]/page.tsx` now selects the CMS reader/renderer/metadata/enquiry path when `CMS_EXPEDITION_DELIVERY_ENABLED=true`. The reader still requires the global delivery flag and valid connection settings. React request caching shares the verified snapshot between metadata and rendering; the existing dynamic route setting remains, preventing date/rights snapshots from being frozen at build time. CMS mode does not fall back to legacy content when a published record is missing or delivery fails. Static parameter generation skips the legacy list in CMS mode. With the flag absent/false, the existing page implementation remains selected.

The enquiry receives the verified form revision, expedition revision and upcoming departures. Metadata uses published website SEO defaults when enabled and the configured public origin. Browser QA exercised the composed renderer plus fetched public form on desktop/mobile, including form revision mismatch rejection; media/challenge/form endpoints were mocked. The actual existing Kanha route returned 200 with rollout disabled. QA found and fixed a duplicate dynamic export; final production build and all 610 CMS tests pass. Temporary route removed. CMS-enabled real-provider route acceptance, published atlas/sitemap enumeration, lead context display and publication gates remain pending; no flags were enabled or production data changed.

## Historical expedition context in lead administration

The lead workspace now displays a read-only **Expedition at time of enquiry** section before submitted answers. It shows the stored title, exact page price, programme status, requested date range, departure status/availability wording and page path, with saved expedition/form revision references in an expandable section. General enquiries are explicit. It never refreshes these facts from today's page or treats an enquiry as a booking.

`readLeadExpeditionContext` validates the saved snapshot and its original selection together, including record/revision/path/departure identity and actual date ranges. Past dates are valid historical evidence. Malformed/mismatched evidence produces a clear warning and the existing original-source records remain available. Legacy leads without expedition attribution receive no extra section. Existing lead access permissions and editing commands are unchanged.

Two unit tests cover historical/general context, invalid identities/dates/private fields and legacy behavior. Desktop/mobile browser fixtures cover Full/general/invalid/legacy states and revision disclosure, without console/page errors or overflow; mobile screenshot inspected. Temporary QA route removed. All 612 CMS tests and production build/typecheck pass. Real authenticated client acceptance remains pending.

## Published directory pagination

Local migration 091 adds `list_public_expeditions`, returning compact listing/SEO cards only after each record passes the public expedition reader. It limits page size to 50 and published candidates to 1000, with a 5 MB aggregate card budget. Ordering uses immutable record IDs. Every request recomputes eligibility and a fingerprint of the eligible card set; subsequent pages must provide the same fingerprint and an existing cursor. Changes withdraw the traversal with an error rather than mixing snapshots. The MD5 fingerprint is a change detector, not an authorization token.

`public-expedition-directory.ts` traverses bounded pages, validates exact website/route/image identity, rejects duplicate/backward records, malformed cursors or fingerprint changes, and returns no partial result on failure. The RPC transport requires both rollout flags and stays scoped to the configured website. Neither the listing UI nor sitemap consumes it yet.

PGlite tests create multiple eligible published expeditions, traverse actual pages, and verify publication withdrawal invalidates the original fingerprint. Unit tests cover empty/multiple pages, drift, duplicate/foreign/malformed entries and transport request scoping. All 616 CMS tests and TypeScript pass. Provider performance/concurrency at scale remain unverified; migration is local only.

## Sitemap integration

`app/sitemap.ts` now uses the complete verified expedition directory when expedition rollout is enabled. `expeditionSitemapItems` applies the shared page/site SEO resolver, omitting effective noindex pages, explicit exclusions and alternate canonical URLs. It rejects duplicate/mismatched paths and does not invent modification timestamps. Directory errors propagate rather than reverting to legacy expedition URLs. Published website SEO defaults are read once per sitemap request.

With rollout disabled, existing expedition URLs retain their previous sitemap behavior. Local HTTP verification returned a valid 200 XML sitemap containing all eight legacy expedition detail URLs, including Kanha. All 618 CMS tests and TypeScript pass. Real-provider CMS-mode sitemap acceptance and the CMS-managed atlas/listing presentation remain pending; no rollout setting changed.

## CMS-managed atlas composition contract

Added the approved `expeditionDirectory` section contract and draft factory. It includes editable title/introduction, cards/calendar/both display choice, empty/no-departure messages, view/duration/price/programme labels, calendar title, geography/month filters and clear-filter text. Labels have explicit limits and cannot be blank. Existing composition controls govern ordering, headings, visibility, spacing and appearance.

`expedition-page.ts` projects a published ordinary page at `/photo-expeditions`, supporting hero, text, CTA and one configured expedition directory. It validates English context, one currently visible H1 and supported controls, including checking scheduled sections before they become visible. Directory data is read only when its section is currently visible, through the verified snapshot-aware reader. Page metadata uses the shared SEO resolver. Existing generic page publication remains blocked.

Tests cover composition order, independent hero images, SEO overrides, unsupported/scheduled controls, hidden directory reads, missing/failed upstream content, label limits and display options. All 622 CMS tests and TypeScript pass. This is a data/projection milestone only: composer controls, preview, interactive listing/calendar, route wiring and publication checks are still pending. No visible page or production configuration changed.

## Expedition directory composer controls

The page composer now offers **Add expedition directory**. `ExpeditionDirectoryFields` exposes every directory-copy field with character counts/limits and the cards/calendar/both display selector. Standard section controls support visibility, order, duplication and removal. Editing updates the composition draft without replacing the underlying expedition records. Duplicated sections remain hidden by default. Public listing/preview integration is explicitly marked pending in the editor.

Desktop/mobile browser QA exercised add, custom labels/messages, display changes, duplicate content preservation/hidden state, reordering, confirmed removal and readonly locks. A selector-label ambiguity found during QA was fixed with an explicit accessible label and the checks rerun. No unexpected console/page errors or horizontal overflow; mobile screenshot inspected. Temporary fixture removed. Production build/typecheck and all 622 CMS tests pass. No provider persistence or public listing activation is claimed by this UI milestone.

## Interactive directory and chronological calendar

`CmsExpeditionDirectory` renders CMS-authored labels, cards and/or a month-grouped chronological departure calendar. Region/month filters combine; clearing resets both. Undated expeditions remain visible with all months selected. Actual ISO start dates determine upcoming departures against an explicit server-supplied UTC date; free-text date labels are never parsed. Full statuses, availability wording, preview/confirmed programme labels, prices and image credits remain exact editorial content. A shared pure projection rejects duplicate identities/paths, invalid dates and unsupported filters without mutating source data.

Desktop/mobile browser QA covered combined filters, undated cards, Full status, exact route links, both empty states and reset behavior. Explicit accessible filter labels were added and the tests rerun. No unexpected console/page errors or horizontal overflow; mobile screenshot inspected. Synthetic images were used and the temporary fixture removed. All 624 CMS tests and TypeScript pass. Composer preview, complete atlas section rendering and actual `/photo-expeditions` route wiring remain pending; no rollout changed.

### Atlas route integration (2026-10-22)
`/photo-expeditions` now selects the published composition renderer when `CMS_EXPEDITION_DELIVERY_ENABLED=true`; it also requires public-delivery configuration and published SEO defaults. Hero/text/CTA/expedition-directory sections use the existing validated composition projection. Metadata and content share one request-cached result and UTC date. Missing pages produce not-found; configuration/dependency failures do not substitute legacy content. Rollout remains disabled. Atlas sitemap eligibility and composer preview remain pending; do not enable rollout before publication-policy and provider acceptance work is complete.

### Atlas sitemap eligibility (2026-10-22)
Superseding the sitemap limitation above: migrated atlas sitemap inclusion now resolves the fully readable page's SEO and published website defaults. Noindex, exclusion, alternate canonical and absent-page states omit the atlas URL. Detail-page indexing remains independent. Rollout-disabled sitemap output is unchanged. Tests cover eligibility; real-provider rollout remains pending.

### Composer directory preview (2026-10-22)
The composition preview now renders the shared directory using unsaved section labels/layout and the selected preview date. The published endpoint returns only a complete, eligible directory for the configured website and English locale; browser validation rejects identity and route mismatches. Loading failures are shown explicitly with refresh rather than as an empty directory. Expeditions are current published records, not frozen with the preview revision, and unsaved expedition changes remain excluded. Live rollout/provider acceptance and publication policies remain pending.

### Trusted reference input (2026-10-22)
Local migration 092 supplies expeditionStatus to trusted validation from stored revisions and current published specialist/form eligibility. Published revision IDs are returned only for available same-website English dependencies; unavailable dependencies expose only their ID/status. Anonymous reads are prohibited and authenticated evidence reads require expedition view access. This supersedes the missing database-evidence limitation; publication-time rechecks, remote deployment and provider acceptance remain pending.

### Publication dependency rechecks (2026-10-22)
Local migration 093 adds a release/rollback pointer trigger for current dependency eligibility, locking linked records, specialist journey dependencies and their media while rechecking public specialist/form availability. Publication policy remains disabled. Sequential PGlite tests prove withdrawal/revocation blocks pointer changes; real PostgreSQL concurrency and remote deployment are still pending.

### Supported expedition publication (2026-10-22)
Superseding earlier unconditional draft-gate notes: local migration 095 enables expedition-1 validation receipts for complete supported English expedition records. The normal independent review/publish flow is now tested with real worker validation and public delivery projection. Incomplete records, unverified references/images and films still fail validation. The migration is local only; production rollout and provider/concurrency acceptance remain pending, as do full film support and broader PRD completion.

### Restoring an expedition revision
The editor's **Revision history → Restore expedition draft** action copies an older payload into a new draft. It preserves history and the currently published revision, and rejects a stale expected revision. Restoration is not immediate publication.

The restored draft must pass current expedition-1 validation, independent approval and release-time dependency/media checks before replacing the published page. An old validation receipt cannot be reused for the new draft. If media rights were revoked after validation, publication is rejected; the published pointer stays on the existing revision (public delivery may itself be unavailable while shared media rights are revoked).

Local database acceptance now verifies the complete restore/reapprove/revalidate/publish sequence. The expedition workspace still needs review/publish controls and trusted-validation request wiring; its existing restoration button alone does not provide this complete client workflow. Real-provider concurrency and deployment acceptance remain pending.

### Client workflow controls (2026-10-22)
The expedition workspace now exposes permission-based submit, approve/request changes, publish and withdraw controls, plus **Request trusted check**. Publication/withdrawal requires an explicit revision-specific confirmation; unsaved edits block workflow changes. **Check saved content** refreshes advisory and trusted results, and publication remains server-gated by current approval, validation and dependency checks. This supersedes the missing-controls limitation above.

Local migration 096 also keeps restored payload and list titles consistent. Rollout and worker configuration are required on the deployed backend; they have not been enabled in this work.

### Listing page publication policy (2026-10-22)
The supported ordinary page at `/photo-expeditions` now uses expedition-page-1 validation and local migration 097. Hero/text/CTA/directory content may publish after full current/future composition checks, media/SEO checks and independent approval. Unsupported sections/controls remain invalid. Other ordinary pages and homepages remain outside this policy. The real worker/review/publish flow is tested in PGlite; public rollout also requires published SEO settings. Page-editor workflow controls, remote setup and production acceptance remain pending.

### Listing page editor controls (2026-10-22)
Pages now offers trusted-check requests and review/publish/withdraw actions for `/photo-expeditions`, subject to record permissions. Saved changes require approval and a current trusted receipt; confirmations name the selected revision and unsaved edits disable publication. This supersedes the missing page-editor controls note. Other page routes retain their unsupported-publication message. Live setup and full authenticated acceptance remain pending.

### Page validation version update (2026-10-22)
Local migration 098 replaces expedition-page-1 with the shared composition-1 version for ordinary page receipts. Expedition listing support is unchanged. Other ordinary pages finish validation with unsupported-publication findings instead of worker retries. Existing atlas receipts require a fresh trusted check after this migration. Homepages remain unsupported.

## Unsaved expedition history

The workspace now uses shared bounded draft history for the entire expedition payload and locale, including departures, itinerary, media, references and SEO. Undo/redo marks restored content dirty, stays disabled during pending imports/operations or read-only access, and resets on new/load/save/restore boundaries. The existing account/site key and load-generation guards remain in place. History stays in memory and does not publish or persist snapshots separately.

Verification: 42 targeted expedition/history tests and TypeScript passed. A browser fixture using the actual workspace verified departure deletion recovery with original availability text, redo, busy locking, save reset, switching records and new-draft locale history. No browser page errors occurred. The in-memory API fixture and temporary route were removed. Expedition autosave/conflict recovery and real-provider/client verification remain pending.

## Concurrent saves and autosave

Existing expedition drafts now support opt-in three-second autosave through the ordinary revision-checked draft endpoint. New drafts require a manual first save. Invalid content and pending operations suspend autosave; save failures preserve unsaved content and turn it off without a retry loop. Loading or creating another draft resets the setting. Active saves lock the editor and preserve leave protection. Existing load-generation guards are retained for save and conflict-fetch responses.

On a save conflict, the latest caller-scoped record must match identity, type, language and route, retain edit permission and have a different revision. Approved schemas validate all compared content, including optional images, mobile hero and video. Overlapping fields require an explicit choice; departures, itinerary, gallery and other compound fields are selected whole. Applying choices updates only the local draft, resets undo history and uses the latest revision for the next explicit save. Cancel preserves local edits. Autosave stays disabled after a conflict until explicitly enabled again.

Verification: 44 targeted expedition/conflict tests and TypeScript passed. Browser checks with the real workspace and in-memory API covered debounce, invalid fields, manual-save cancellation, offline failure/no retry loop, explicit re-enabling, conflict pause/cancellation, required choices, preservation of a remote mentor edit and revision-safe explicit save. The new-record autosave exclusion also passed. The fixture was removed. Real-provider concurrency, durable delivery and client acceptance remain unverified.

## Homepage booking notes — 2026-10-28

Each departure now has an optional `homepageNote` (200 characters), separate from its existing `availability` wording. The client editor accepts line breaks; the shared homepage preview/public renderer shows nonblank notes between the date and duration, escaping entered markup. The Departures import table exposes the same optional column. Existing drafts and templates remain valid without it. Migration 218 adds only this field to the existing public expedition allowlist; private departure fields remain excluded.

Legacy migration mappings may include `departureHomepageNotes`, keyed by deterministic source departure ID, with `{date, text}`. A source `enquiryDeparture` requires explicit reviewed notes for its full departures. Missing mappings, mismatched dates, unknown departure IDs, invalid source departures, or a changed source digest block the proposal. Source snapshots are retained; years are never inferred or approved automatically. The homepage source comparison checks the captured card text including this note, so missing or changed booking wording blocks parity review.

Verified locally: import preservation, migration failure paths, caller-scoped review/apply regression checks, anonymous SQL projection including private-field removal, and Chromium rendering at 1280/390px. Fresh Concept, Bespoke Safaris and Aviation captures show unchanged legacy rendered content. No actual provider records were migrated or published. Real source mapping approval and hosted workflow verification remain required.
