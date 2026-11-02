# CMS implementation progress

## 22 October 2026 — Goal started

- Created a tracked goal for the complete client CMS.
- Preserved the supplied PRD and created the Safari Crafters implementation plan.
- Inspected current auth, admin content endpoint, enquiry persistence and route structure.
- Identified the shared-token/filesystem admin as a legacy surface, not a production foundation for client roles.
- Backend choice requested: independent replacement or custom admin over Sanity. Content/import contracts can proceed independently.

Current milestone: M0, discovery and contracts. No claim of a finished backend, deployment or completed migration.

### Foundation checkpoint

- Owner confirmed independent backend; Sanity stays as a migration source until cutover.
- Added source inventory generator: 28 public route templates, 1,582 candidate editable elements across 89 source files. The register explicitly marks entries pending; expressions, constants and runtime states still need manual mapping.
- Implemented versioned journey import contract: Pages, Itinerary, FAQs and Media sheets, character/word guidance, hard limits, stable IDs, revision checks, URL-change protection and per-cell findings. No file parser or import UI is claimed yet.
- Added independent PostgreSQL migration with scoped memberships/permissions, immutable revisions, RLS, revision-bound approval, trusted validation gate, publication outbox, audit events and restore-as-draft.
- Added embedded PostgreSQL dev dependency for isolated tests. No external database was modified.
- Tests: 9 import-contract tests and 9 database integration tests pass. TypeScript check passed after initial contract implementation; final check recorded below.

Next work: finish the role/section contracts and per-route inventory mapping; add real managed-auth staging integration and the client admin shell; build versioned Excel/Word template generation/parsing and persisted draft review before publication integration.

### File parsing checkpoint

- Added bounded, sequential OOXML archive reading and real `.xlsx` / structured `.docx` parsers, using direct dependencies yauzl and fast-xml-parser.
- Both formats feed the existing revision-aware journey contract. Source digest, file size and Word table locations are retained.
- Fixed diagnostic row numbers after malformed or blank rows. Blank update cells continue to preserve current values.
- Rejected formulas, external relationships, macros, unsafe/oversized archives, ambiguous headings, Word embedded content and unresolved tracked changes in data cells.
- Added local `cms:import-check` command. It is read-only and has no database access or publication capability.
- Verification: 19 import/OOXML tests and 9 database tests pass; TypeScript check passes. Fixtures cover minimal real ZIP/XML structures; Microsoft Office round trips have not yet been tested.
- Added `import-file-format.md` with exact format and limitations. Downloadable polished templates were not generated in this checkpoint; authenticated upload/review/apply also remain pending.
- Existing dependency audit still reports 28 vulnerabilities and the Sanity Portable Text React peer warning; no claim of dependency-security clearance.

Goal remains active. Next: produce and inspect the client templates against these parsers, then implement authenticated persisted import review and the client admin workflow. Full M0–M6 scope remains unchanged.

### Draft import persistence checkpoint

- Added `002-imports.sql`: transactional draft-only batch saves, per-item permissions/revision checks, source-key deduplication, actor-bound retry receipts and batch audit provenance. A later-item failure rolls back all prior writes and the receipt.
- Added server review merger and before/after field diffs. Blank fields, unmentioned collections and existing optional item values are preserved. Existing stable IDs are required; conflicts detected after merging are blocking. Unchanged updates produce no save item.
- Reviews include a deterministic manifest digest. Future HTTP handlers must rebuild from authorized current records and compare this digest before saving; no HTTP endpoint currently trusts a submitted manifest.
- Fixed delivery-job visibility for content-type-scoped publishers.
- Verification: 25 import/review tests and 15 embedded PostgreSQL integration tests pass, including a review-to-database save. TypeScript check passes. Network concurrency, managed-auth integration and deployed migrations remain unverified.
- No external database was modified. Client download templates, upload/review UI, authentication integration and M0–M6 acceptance remain pending. This is backend progress, not a client-ready CMS.

### Approved composition checkpoint

- Added strict Zod contracts for all 20 initial PRD section families and common presentation, schedule, locale and region controls.
- Implemented immutable insert/move/replace/remove/duplicate draft commands with stable identities, unique anchors and validation of the result. Copies start hidden for review.
- Added separate desktop/mobile image references, alt-text requirements, safe link validation, nested item identity checks and explicit document-version references.
- Added `composition-contract.md` describing implemented behavior and required rendering, shared-content, persistence and publication integration. No live page was switched to the new contract.
- Verification: 8 composition tests and TypeScript check pass. Previous import/database coverage is unchanged; no new broad end-to-end claim.
- Asked the owner whether staging should use an existing Supabase project or a new client-owned project. Independent contract work proceeded while this optional architecture/setup answer is pending.

The previous turn and this turn both made concrete repository progress. The full goal remains active; client-facing UI, templates, infrastructure and the remaining PRD requirements are not complete.

### Private preview checkpoint

- Added recipient-bound, revision-pinned preview sessions with bounded expiry, revocation and current creator/recipient permission checks. Creation/revocation are audited; anonymous and direct table reads are denied.
- Added a private preview JSON API and user-JWT PostgREST gateway. No service credential is used, legacy admin cookies do not grant access, and missing staging configuration fails closed. Responses prohibit caching and indexing.
- Added separate CMS environment placeholders and staging requirements in `preview-access.md`. No external schema or environment was changed.
- Verification: 18 PostgreSQL integration tests, 5 gateway/route tests and TypeScript checks pass. Managed-auth staging, rendered previews and protected asset delivery remain pending; UAT-17 is not marked complete.
- The active goal remains unchanged. This turn made concrete database/API progress; staging selection is still awaiting the owner's response while independent implementation continues.

### Unpublish and delivery recovery checkpoint

- Added transactional, revision-bound unpublish with audit history and idempotent retries. Drafts and immutable revisions are retained.
- Added worker-only queue claiming, lease tokens, stale acknowledgement rejection, exponential retry delay, superseded-job handling and a final-attempt reaper.
- Added a delivery orchestration module that requires real deployment adapters and never reports unacknowledged work as successful. No cache/search adapter or live scheduler is configured yet.
- Verification: 22 PostgreSQL tests, 3 worker tests, TypeScript and whitespace checks pass. These are local integration/unit checks; real multi-connection concurrency and delivery propagation remain unverified.
- Documented operational behavior and remaining deployment/UAT work in `delivery-operations.md`. No external migration, production content change or cutover occurred.

This turn made concrete implementation progress. The full CMS goal remains active and incomplete, including the client UI, templates, staging connection and remaining PRD acceptance requirements.

### Editor API checkpoint

- Added RLS-preserving read functions for accessible websites, paginated content lists and current-record payload/history/permission state.
- Added authenticated `/api/cms/content` reads and fixed-allowlist editorial commands: save, review, publish, unpublish, restore, create preview and revoke preview.
- Added streaming JSON size enforcement, strict command fields, cross-origin write rejection and safe, actionable conflict/workflow errors. Fixed successful void RPC handling.
- Verification: 23 PostgreSQL integration tests, 6 editor API tests, 5 gateway tests and TypeScript checks pass. API tests use injected transports; deployed JWT/PostgREST and browser flows remain unverified.
- Documented the API contract in `editor-api.md`. No external migration or deployment occurred. Client UI, templates, managed login and other full-scope acceptance items remain pending.

Previous and current turns made implementation progress. The full goal remains active; no completion or blocked claim is made.

### Document upload API checkpoint

- Added authenticated raw Word/Excel upload with membership checks, streaming file-size limits and per-record user-scoped current-content reads.
- Connected file parsing to review diffs and atomic draft application. Acceptance digests bind website, source bytes and rebuilt manifest; outdated reviews cannot silently apply.
- Added private reviewed-import receipts so ambiguous successful requests can be retried without duplicates or false stale-revision failures. Receipt conflicts are rejected.
- Verification: 30 import tests, 24 PostgreSQL integration tests and TypeScript checks pass. Handler tests use real Word archive fixtures with an injected database transport; deployed end-to-end and actual Office round trips remain unverified.
- Added `import-api.md`; no external schema or production content changed. Client templates and the upload/review UI remain pending, along with the full remaining CMS scope.

This turn made concrete integration progress. The goal remains active and incomplete.

### Excel template checkpoint

- Created the actual downloadable journey workbook with all five sheets, field guidance, dropdowns, editable-cell styling, frozen identifiers and button-length highlighting. Data sheets contain no sample records.
- Used the bundled spreadsheet artifact runtime and inspected every sheet/column group visually. Preserved a regeneration script and a populated test fixture.
- Corrected parser row accounting so trailing formatted blank rows do not consume the data-row limit.
- Verification: 32 import tests and TypeScript checks pass, including both the distributed blank workbook and the populated generated workbook. Native Microsoft Excel save/reopen remains unverified.
- Word template and client interface remain pending. The full goal remains active; the existing site has not been migrated or deployed.

### Word template checkpoint

- Created the five-page downloadable Word journey template with readable field/value tables, instructions and content-length guidance. All data cells start blank.
- Extended the parser to support repeated vertical record tables and per-record source-table locations while retaining existing horizontal-table support.
- Generated a separate populated test fixture and added tests for the actual document plus repeated child tables.
- Verification: 34 import tests, TypeScript and whitespace checks pass. Every final page was rendered using bundled LibreOffice and visually inspected. Native Word edit/save/reopen remains unverified.
- Both journey template formats now exist. Client screens, login/staging, remaining content modules and the rest of M0–M6 are still incomplete; the active goal is not complete.

### First client workspace checkpoint

- Added `/cms` with managed login integration, website/journey selection, scalar editing, workflow commands, revision restoration and Word/Excel review/application screens.
- Added public-key configuration filtering and scalar merge logic that preserves unrendered structured content. Four focused tests, TypeScript and whitespace checks pass.
- Created a desktop concept and inspected the actual unconfigured setup state on desktop and mobile. Authenticated browser flows and full concept fidelity remain unverified because staging is not connected.
- Documented scope and visual evidence in `client-workspace.md`. No external migrations, deployment, live content changes or public-site cutover occurred.
- The independent backend decision is confirmed. The full CMS goal remains active; this interface is an initial journey implementation, not completed client handover.
- Production verification: `npx next build` succeeds, including TypeScript, all 173 generated pages and the new dynamic CMS routes. The content-sync script was intentionally not invoked by this build check.

### Stored revision validation checkpoint

- Added full journey-payload validation distinct from partial import updates. Required fields, all stored child items, plain text, hard limits, IDs/positions and URL agreement are checked without changing copy.
- Added authenticated revision-bound `validate` editor command. It reads the stored RLS-authorized record and rejects stale revisions and browser-supplied payloads.
- Unsupported types/fields and unresolved media verification fail closed. Advisory checks cannot grant publication or write trusted validation receipts.
- Added five validator tests and expanded editor API coverage to seven tests. See `content-validation.md` for the remaining trusted service, asset checks and UI integration.
- This and the preceding goal turn made implementation progress. Full CMS scope remains active and incomplete; no live deployment or migration occurred.

### Trusted validation gate checkpoint

- Added migration 007 with deployment-owned validator versions, service-only revision reads and receipt writes, bounded receipt lifetime, audited checks, and authorized validation status reads.
- Publication now rejects expired or obsolete validator receipts. Existing receipts require rechecking; already-published content remains untouched.
- Added a trusted worker runner that validates fetched stored content and propagates stale-write/acknowledgement failures. It requires an explicit server transport; no privileged credentials or public worker endpoint were introduced.
- Verification: 28 PostgreSQL integration tests, seven validator/worker tests, eight editor API tests, TypeScript and whitespace checks pass. A local integration test executes the actual validator through receipt storage and publication, and verifies an invalid new revision cannot replace the published one.
- Staging deployment, dispatch, asset validation, remaining content types and client findings UI are still pending. Full CMS goal remains active. This and the preceding turn made concrete progress; no external migration or production changes occurred.

### Client validation panel checkpoint

- Added a Content checks panel to the journey editor with advisory findings, trusted status, expiry and explicit refresh. Unsaved edits hide earlier results; revision/user/site/record changes reset the panel.
- Browser-verified the actual component using a temporary synthetic-response fixture: required content, guidance, current/expired checks, failure, revision mismatch and unsaved edits. Desktop/mobile rendering passed with no console errors or horizontal overflow. The fixture was removed afterward.
- TypeScript and whitespace checks pass. Applied frontend testing and React guidance; no live backend or authenticated end-to-end claim is made.
- The goal remains active. Managed staging, trusted-worker dispatch, assets, remaining content modules and client acceptance still require implementation and verification.

### Media verification checkpoint

- Added migration 008 with website-scoped immutable image object identities, quarantine/rights/expiry states, private storage metadata and restricted service updates.
- Connected reference availability to advisory and trusted journey validation; advanced validator policy to journey-2. Publication rechecks referenced media under row locks, so rights changes after validation cannot bypass the gate.
- Verification: 30 PostgreSQL integration tests, eight validator/worker tests, nine editor API tests and TypeScript pass. Catalog metadata is tested; no real upload or scan is claimed.
- Documented the remaining upload/storage/inspection, media UI, version/usage management and post-publication rights withdrawal work in `media-verification.md`. No external migrations or production changes occurred. Full goal remains active; consecutive turns made implementation progress.

### Image byte inspection checkpoint

- Added byte/signature/type/extension checks, required scanner adapter, bounded decoding and metadata-stripped WebP derivatives while retaining exact private originals.
- Made the existing Sharp dependency explicit. No real scanner, upload endpoint, storage writes or automatic ready-state transition is configured yet.
- Verification: six image tests using generated real-format bytes, TypeScript and whitespace checks pass. Tests cover corrupt files, scanner failures, mismatches, bounds, metadata/orientation and buffer ownership. See `image-inspection.md` for deployment limits and remaining integration.
- Full CMS goal remains active. This and the preceding turn made implementation progress without changing production data.

### Upload reservation checkpoint

- Added authenticated reservation/status/cancellation API and migration 009 with owner/site binding, private generated storage keys, retry identity, expiry, audit events and pending-capacity limits.
- Browser requests cannot choose storage paths, upload ownership, processing state or inspection results. Current permission is checked on every operation.
- Verification: 33 PostgreSQL integration tests, two upload API tests, TypeScript and whitespace checks pass. Byte transfer, signing, processing transitions and the upload UI remain pending, documented in `upload-reservations.md`.
- No external migration, storage operation or production change occurred. The complete CMS goal remains active; consecutive turns made concrete implementation progress.

### Upload processing checkpoint

- Added service-only receipt/claim/finish/failure functions with original-byte binding, expiring worker leases, stale-token rejection and three-attempt limits. Successful completion atomically registers the derivative with usage rights pending.
- Connected the existing image inspector through required bounded-read, scanner and verified immutable-write adapters. Lost final acknowledgements are reported as uncertain rather than successful or contradictory failures.
- Verification: 35 PostgreSQL integration tests and five upload API/worker tests pass, including real PNG decoding/WebP generation/catalog registration using in-memory storage and a scanner test double. TypeScript and whitespace checks pass.
- External storage, signing/transfer, real scanner, dispatch and client upload UI remain pending. No production data changed; the full goal stays active and consecutive turns made implementation progress.

### Private file transfer checkpoint

- Added user-token-only raw-byte transfer with reservation authorization, bounded exact-size reads, fixed destination binding and non-overwriting private storage writes.
- Added Supabase-specific migration 011 with a private original bucket and restrictive policies protecting it even alongside unrelated permissive policies. No remote bucket was created.
- Verification: 36 local PostgreSQL tests, eight upload API/worker/transfer tests, TypeScript and whitespace checks pass. Storage policy tests use a minimal schema model, and provider HTTP is mocked; managed service behavior remains unverified.
- Successful transfer reports awaiting verification. Worker discovery/dispatch, real storage/scanner staging checks, resumable uploads and client UI remain pending. The full CMS goal stays active; consecutive turns made implementation progress.

### Client image upload screen checkpoint

- Added Image uploads navigation, image selection, private transfer, retry-preserving reservations, explicit awaiting-verification messaging, status refresh and cancellation controls.
- Added migration 012 and an authenticated recent-upload list, scoped to the current owner and website without exposing storage locations. The latest 50 entries survive workspace reloads through database reads.
- Verified the actual file picker, transfer/status progression, refresh and reset in a temporary local fixture with synthetic responses. Mobile width 390 had no horizontal overflow and browser logs showed no errors/warnings. The browser file chooser took unusually long, but completed. The fixture was removed.
- Verification: 37 PostgreSQL tests, nine upload tests, TypeScript and whitespace checks pass. Full authenticated staging, live storage/worker processing, client cancellation/error flows and broader browser coverage remain unverified.
- Full CMS goal remains active. No real file was transferred to external storage during this test, and no production changes occurred.

### Media editor API checkpoint

- Added migration 013 and authenticated search/read/metadata/rights APIs. Image identity remains immutable, while title, descriptions, alt, caption, folder and tags can be edited with expected-revision checks.
- Rights management requires separate configure permission and evidence; ordinary editors cannot change rights or read evidence. Every metadata/rights change is audited, and service updates also advance the concurrency revision.
- Verification: 38 PostgreSQL integration tests, two media API tests, TypeScript and whitespace checks pass. UI, thumbnail access, usage/version management and live withdrawal on rights revocation remain pending, documented in `media-editor.md`.
- Full goal remains active; consecutive turns made implementation progress. No remote migrations or production changes occurred.

### Media withdrawal checkpoint

- Added migration 014 so public CMS journey reads immediately fail closed when a referenced image becomes unavailable, including rights expiry after publication.
- Added a service-only bounded withdrawal sweep that preserves drafts/history, clears published pointers, queues invalidation and records an audit event. Repeated sweeps do not duplicate jobs; corrected rights do not silently republish withdrawn pages.
- Verification: 40 PostgreSQL integration tests and whitespace checks pass, covering revocation/expiry/archive/rejection, retained drafts, one invalidation job, no automatic republication and website isolation.
- Scheduling, production caches and non-journey dependencies remain pending. The existing Git-backed public site is unchanged. The full CMS goal remains active; consecutive turns made concrete implementation progress.

### Media usage and archive checkpoint

- Added nested reference discovery with permission-filtered draft/published usage results and stable pagination.
- Added audited reversible archive/restore with separate delete permission, expected-revision checks, and protection for current drafts, published content and active previews. New revisions/previews reject archived references while holding shared asset locks.
- Verification: 42 PostgreSQL tests, three media API tests, TypeScript and whitespace checks pass. Real multi-connection races and large-site dependency-query performance remain unverified.
- Client usage/archive screens and global replacement/version-management workflows remain pending. Full CMS goal stays active; consecutive turns made implementation progress without production changes.

### Media library client checkpoint

- Connected library navigation, search/pagination, metadata editing, separate rights editing, usage lookup and permission-aware archive/restore controls. Added archive permission to media read responses in the still-local migration set.
- Preserved independent unsaved metadata/rights changes and guarded navigation. Fixed clicking the current library tab so it cannot clear the unsaved indicator.
- Browser-verified the actual component with synthetic data: metadata save retains rights edits, rights save updates status, search/usage work, and archived state exposes Restore. Desktop/mobile checks found no horizontal overflow or console errors. Temporary fixture removed.
- Database suite remains green at 42 tests. Private thumbnails, real authenticated staging and wider failure/restore browser coverage remain pending. Full goal remains active; no external migrations or production changes occurred.
- Production build passes with TypeScript, all 173 generated pages and the CMS media/upload routes; temporary test routes are absent from the build.

### Private media preview checkpoint

- Added migration 016 for a private processed-image bucket with current-permission read checks and ordinary-user write denial.
- Added a user-token-only binary preview API with destination, MIME, length and checksum verification, and connected temporary/revoked blob URLs to the library detail panel with loading/error/retry states.
- Verification: 43 PostgreSQL tests, seven media API tests, TypeScript and whitespace checks pass. Browser checks exercised the actual preview component with synthetic image bytes, including failure/retry and decoded dimensions; temporary fixtures were removed.
- Live provider/authenticated-library checks, worker bucket configuration and optimized grid thumbnails remain pending. Full CMS goal stays active; consecutive turns made concrete implementation progress without remote changes.

## Journey collection editor checkpoint — 2026-10-22

Added direct itinerary and FAQ draft editing with stable IDs, add/move/remove controls, template word guidance and preservation of unknown fields. Integrated collection changes into the explicit draft save and existing dirty-state guards. Four collection tests include import-after-reordering compatibility; the workspace suite has eight passing tests. Synthetic FAQ browser checks verified add, reorder, edit, word count and 390px overflow/console health. Temporary fixture removed. See `journey-collections.md`. Authenticated staging persistence and full CMS UAT remain outstanding; goal stays active.

## Journey media editor checkpoint — 2026-10-22

Implemented template-compatible journey media collection editing and authenticated searchable library selection, with current-status recheck on selection and private preview reuse. Page-specific descriptions/captions/credits survive image replacement. Ten workspace tests and TypeScript passed. Rendered picker and authenticated staging persistence are not yet verified. See `journey-media-editor.md`. Goal remains active.

## Picker verification and composition persistence — 2026-10-22

Verified the image picker in a synthetic browser fixture: search, approved selection, pending-rights disablement, changed-rights rejection, replacement opening and preview error display. Mobile overflow and console checks passed; fixture removed. Added picker spacing and wrapping styles. Added revision-bound composition draft commands to the authenticated content endpoint, preserving other stored page fields and existing permission/concurrency enforcement. Nineteen composition/editor API tests and TypeScript passed. Visual composer and composed-page publication/rendering remain incomplete; managed staging integration is not verified.

## Pages workspace checkpoint — 2026-10-22

Added Pages navigation, list/create/save/restore UI and section outline with initial text/CTA forms, visibility, background, reordering and hidden duplication. Saves preserve other page fields; unsupported existing compositions are not overwritten. Synthetic browser create/edit/duplicate/save/reload flow passed, as did mobile overflow and console checks. Temporary fixture removed. Detailed forms for other section families, page publishing/rendering and managed staging verification remain outstanding. See `pages-workspace.md`.

## Structured section forms checkpoint — 2026-10-22

Added reusable paragraph/list/link and CTA-button editors, plus FAQ/tab section forms and insertion controls. Content stays structured; tab IDs and initial-tab references survive reordering. Browser checks covered lists, unsafe-link validation/correction and tab creation/default selection/reordering, with clean 390px overflow/console checks. Temporary fixture removed. Full section coverage, rendering, staging and UAT remain outstanding.

## Image section forms checkpoint — 2026-10-22

Added hero, image-and-text and gallery forms using library image selection, placement-specific copy, optional mobile hero and gallery ordering. Separated permissive local outline edits from strict save validation so incomplete image sections can be moved/removed. Twenty composition/editor API tests passed. Synthetic hero selection/alt/mobile form browser checks and 390px overflow/console checks passed; fixture removed. Complete public rendering, publication validation and staging integration remain pending.

## Nested image validation checkpoint — 2026-10-22

Added local migration 017: nested asset evidence, publication locks/checks, public-read suppression and bounded withdrawal now cover composed records. Added composed-page advisory structure/media validation that explicitly keeps publication unavailable; editor endpoint fetches nested evidence. Forty-four database tests, 21 validation/API/worker tests and TypeScript passed. Page advisory UI, complete publication validation/rendering, remote migration and staging concurrency remain outstanding. See `nested-media-verification.md`.

## Rendered draft preview checkpoint — 2026-10-22

Added an in-editor draft layout preview for seven section families, authenticated image-loader reuse, responsive image/text/gallery layout, audience/time visibility and explicit unsupported-section placeholders. Keyboard tabs, FAQ expansion and region filtering passed synthetic browser checks; 390px overflow/console checks and TypeScript passed. Temporary fixture removed. This is not the live-site renderer or shareable preview; complete rendering/publication/staging remain outstanding. See `composed-preview.md`.

## Common section controls checkpoint — 2026-10-22

Exposed layout, heading, anchor, animation, visibility dates and locale/region controls in the page composer; preview locale is now adjustable. Browser tests verified timezone conversion and inclusive-start/exclusive-end visibility with region matching. Mobile overflow/console checks passed; fixture removed. Section visibility does not implement publish/unpublish scheduling. See `section-controls.md`; full CMS goal remains active.

## Collection section forms and preview checkpoint — 2026-10-22

Added cards, statistics, timeline and logo editor/preview support, stable item controls and optional/required image handling. Ten composition tests and TypeScript passed; synthetic statistics editing/preview and mobile overflow/console checks passed. Temporary fixture removed. Detailed evidence and remaining browser coverage are in `collection-sections.md`. Full publication/rendering/staging and remaining PRD modules are incomplete.

## Content reference service checkpoint — 2026-10-22

Added local migration 018 and authenticated reference API for bounded candidate search and ordered selection resolution under caller RLS. Added the PRD project content type to persistence/editor input. Forty-five database tests, two reference API tests and TypeScript passed. Visual record selection, reference dependency validation/rendering and managed staging remain pending. See `content-references.md`.

## Visual record selection checkpoint — 2026-10-22

Added searchable/paginated record picker and testimonial/listing/project/related section forms, ordered manual selections and access recheck before adding. Browser fixture verified stale-access denial, duplicate prevention, draft status and reordering; mobile overflow/console checks passed. Eleven composition tests passed. Fixture removed. Live reference rendering, dependency publication checks, automatic listings and staging remain incomplete.

## Global settings contract and impact checkpoint — 2026-10-22

Added versioned global settings schema spanning PRD shared-content areas and potential-impact comparison, including indexing/maintenance flags. Added read-only impact-review API bound to authorized stored settings revision, rejecting client baselines/stale input. Five tests and TypeScript passed. UI, database approval enforcement, singleton/settings migration, complete usage inventory and publication/runtime integration remain outstanding. Updated architecture note to distinguish historical pending statements from current progress. See `global-settings.md`.

## Global settings database guards — 2026-10-22

Added local migration 019 for per-site/locale settings uniqueness, null page paths and database-enforced configure permission on sensitive indexing/maintenance revisions, approvals and releases. Restore and later ordinary edits cannot bypass pending-sensitive-change requirements. Forty-six database tests passed; remote migration, explicit impact acknowledgment, settings UI/full validation/runtime consumers remain outstanding.

## Settings workspace checkpoint — 2026-10-22

Added locale-scoped settings read (local migration 020), full-contract API save validation and Settings navigation/form. Core shared text and toggles support impact review before draft saving; sensitive controls reflect configure permission. Edits invalidate impact review. Synthetic browser edit/review/save/reload and mobile checks passed. Database suite has 47 passing tests. Structured settings forms, DB-bound impact acknowledgment, remote migration and runtime consumers remain outstanding.

## Structured settings forms — 2026-10-22

Added address/social/footer/legal lists, shared brand/fallback images and partner marks using stable IDs and existing image/link contracts. Connected changes to impact-review invalidation and draft persistence. Synthetic footer group/link editing and unsafe-URL correction passed browser checks; 390px overflow/console checks passed. Temporary fixture removed. Remaining menu/message forms, exhaustive UI checks and live/staging integration remain pending.

## Navigation contract and reference support — 2026-10-22

Added versioned nested-menu contract, stable-ID insert/move/remove operations and ancestor-aware visibility; editor saves reject malformed trees and page paths. Local migration 021 enables permitted navigation selection through the reference service. Sixty-four combined database/editor/navigation tests and TypeScript passed. Visual editor, header settings wiring, target checks, live rendering and staging remain incomplete. See `navigation.md`.

## Visual menus and header assignments — 2026-10-22

Added Menus workspace and nested editor with draft persistence, internal-record/URL targets, sibling reorder and explicit subtree-removal warning. Added main/utility/mobile assignments in Settings. Synthetic browser create/nest/link/save flow passed with clean mobile overflow/console checks; fixture removed. Local incomplete draft operations retain strict structural safety. Live header delivery, remaining menu controls, assignment browser checks and staging remain pending.

## Private rendered preview route — 2026-10-22

Added recipient-authenticated `/cms/preview/[id]` viewer for page/homepage compositions, scoped private image requests, strict response identity/expiry validation, timed expiry and periodic/focus/manual access rechecks. Local migration 022 adds website identity without widening preview permissions. Forty-eight database tests, two preview-contract tests and TypeScript passed. Browser checked the real setup state; signed-in staging remains unverified. Issuance UI, other renderers and deployment remain pending. See `secure-preview-viewer.md`.

## Page preview management controls — 2026-10-22

Added authorized reviewer search and author-scoped active preview listing (local migration 023), private API, and Page editor create/open/revoke controls. Draft changes disable issuance; creation rechecks current recipient permission. Forty-nine DB tests, two management API tests and TypeScript passed. Synthetic browser create/revoke and 390px checks passed; fixture removed. No external sharing or remote migration occurred. Actual staging authentication and other content previews remain pending.

## Shared messages and actions settings — 2026-10-22

Added settings forms for announcements, header/sticky buttons, cookie policy, error/maintenance wording, and searchable content types. Existing impact review and draft validation apply; maintenance activation stays permission-controlled. Eight settings tests and TypeScript passed. Synthetic browser validation confirmed missing-button rejection and valid correction, plus clean 390px layout/console. Fixture removed. Live consumption, consent behavior, complete settings approval and staging remain pending.

## Page SEO draft controls — 2026-10-22

Added page-level SEO contract/editor for metadata, canonical, indexing/following, social image, breadcrumb and sitemap preference. Saves preserve other payload fields; malformed existing SEO remains untouched and blocks editing save. API/advisory checks reject unsafe canonical/schema values and warn on indexing conflicts. Twenty-three SEO/editor/validation tests and TypeScript passed; synthetic mobile browser checks passed, fixture removed. Defaults resolution, remaining SEO requirements and actual delivery are still pending. See `page-seo.md`.

## SEO default resolution — 2026-10-22

Added pure SEO inheritance resolver, private revision-bound API using authorized locale settings, and a page-editor source/value panel. Site noindex dominates page overrides; proposed sitemap excludes noindex and alternative canonicals. Six SEO/resolve tests and TypeScript passed. Synthetic mobile/browser source display and stale-result clearing passed, fixture removed. Deployment origin configuration and actual public metadata/sitemap consumption remain unfinished.

## Form definitions and submission validation — 2026-10-22

Added versioned approved form-field schema, conditional-question constraints, optional separate marketing consent, strict server-side answer validation and independently verified file-reference checks. Editor API now validates form drafts before persistence. Nineteen form/editor tests and TypeScript passed. Visual builder, durable enquiry submission, anti-spam, notification delivery, lead administration and staging remain unfinished. See `forms.md`.

Production build checkpoint: `npm run build` completed successfully after the form module, including TypeScript, 173 static pages and the new preview/SEO API routes. No temporary QA routes were included. This build uses the existing reviewed Git content snapshot; it does not demonstrate independent CMS production cutover.

## Visual form builder — 2026-10-22

Added Forms navigation/workspace and approved field builder with stable identities, choices, conditions, consent versioning, file-limit configuration and draft persistence. Six form tests and TypeScript passed. Synthetic browser create/save/reload and optional-marketing checks passed, with clean mobile overflow/console; fixture removed. Public preview/submission, lead storage, notification routing, restore UI and staging remain pending.

## Durable enquiry database foundation — 2026-10-22

Added local migration 024 with separate lead/events/notification-job tables, explicit lead-only RLS permissions, service-only revision-bound intake, retry conflict detection and atomic queueing. Fifty database tests passed, including injected queue failure rollback and membership revocation. No remote migration or public intake was enabled. Trusted submission orchestration, abuse checks, delivery workers, lead UI and real concurrency/staging remain pending. See `enquiry-storage.md`.

## Lead management API — 2026-10-22

Added local migration 025 for permission-filtered inbox/detail, versioned lifecycle/assignment updates and append-only notes/activity. Added private strict lead API. Fifty-one DB tests, two API tests and TypeScript passed, including stale edits, owner eligibility and membership revocation. Visual inbox, advanced workflow, export/merge, reminders/CRM and staging remain outstanding.

## Visual enquiry inbox — 2026-10-22

Added Enquiries workspace with lifecycle/owner/follow-up/note editing, source/consent/activity display and notification state. Local migration 026 scopes owner search and submitted-form labels to explicit lead authority. Fifty-two database tests, two API tests and TypeScript passed; synthetic browser assignment/save/note and mobile checks passed, fixture removed. Real intake, worker delivery, advanced lead workflows and staging remain unfinished.

## Notification worker foundation — 2026-10-22

Added local migration 027 for fenced worker leases, pinned-form input reads, retry backoff, terminal failure reaping and activity events. Added adapter-driven batch worker with stable idempotency keys and safe error codes. Fifty-three database tests, three fake-adapter worker tests and TypeScript passed. No real message sent. Provider/routes, multi-route receipts, scheduler, manual retry and concurrent staging verification remain unfinished.

## Trusted enquiry intake core — 2026-10-22

Added local migration 028 for published/pinned retry form input and private atomic rate buckets/cleanup. Added intake orchestration that validates stored definitions/consents and returns success only after a durable receipt. Fifty-four DB tests, three intake tests and TypeScript passed. Public HTTP adapter, real abuse/challenge service, file authorization, form publication and deployment remain outstanding; legacy enquiry flow unchanged.

## Interactive form preview — 2026-10-22

Added Try this form panel with shared validation, accessible field errors, conditional-answer pruning, consent/choice interaction and explicit simulation-only success. Eight form/visibility tests and TypeScript passed; synthetic browser required/conditional/reset-state/mobile checks passed. Fixture removed. No real enquiry/notification/redirect occurred; public renderer, uploads and deployed intake remain incomplete.

## Enquiry HTTP boundary and regression checkpoint — 2026-10-22

Added configured-origin POST/JSON handler with streamed 350KB limit, strict UTF-8/JSON, private response headers, Retry-After and safe failure responses. The required service-adapter factory remains unconfigured and no public route was enabled. Fixed Node strip-types compatibility during tests. Complete CMS suite: 212 tests passed; TypeScript passed. Provider/ingress adapters, form publication/rendering and deployed UAT remain pending.

## Database-backed intake integration — 2026-10-22

Added restricted server-only enquiry RPC transport and website-bound adapter with keyed rate identity and mandatory challenge verifier. Fifty-five database tests, two transport tests and TypeScript passed. Integrated local HTTP/validator/SQL test proves durable receipt and identical retry produce one lead/job, with rejected answers/challenge never saved. Real ingress/challenge credentials, public route, attachment authorization and staging remain pending.

## Configured enquiry route — 2026-10-22

Wired disabled-by-default public intake route, fixed-endpoint Turnstile verifier and signed trusted-ingress identity checks. Six runtime/HTTP tests, TypeScript and production build passed (173 static pages plus new API route). Provider verification was mocked; no real message or external database request occurred. Direct shell smoke check could not reach the previous dev port. Proxy/widget/provider configuration, public form delivery, publication and staged real-service UAT remain pending.

## Published form lookup — 2026-10-22

Added local migration 029 and configured public form-read route with a visitor-only projection and no-store responses. Published revision pinning and withdrawal tested; routing/configuration fields excluded, attachment forms fail closed. Fifty-six DB tests, two projection/API tests and TypeScript passed. Public renderer/widget, form publication policy and real deployment/UAT remain incomplete.

## Visitor enquiry renderer — 2026-10-22

Added standalone noindex enquiry page, shared accessible fields, challenge lifecycle and durable-receipt-only success. In-memory retries retain answers/request identity; pending unload guard and provider render failure handling added. Sixteen focused tests passed. Synthetic mobile browser test demonstrated required validation, locked uncertain state, two identical request payloads and confirmed receipt with no horizontal overflow at 390px. Fixture removed; no real provider request or lead created. Production build passed (173 static pages plus dynamic enquiry route); final retry-preservation adjustment passed TypeScript. Publication/configuration, durable recovery across forced reload, file uploads and staging remain unfinished.

## Form review and publication policy — 2026-10-22

Added form-1 full-definition validator and local migration 030 enabling trusted publication for supported inbox-only forms. Existing approval, revision pinning and expiring-receipt rules retained; unsupported attachments/routes blocked. Inbox-only intake now omits notification jobs. Added review/publish/withdraw/history-restore controls and published-form link. Fifty-nine database/publication tests passed, including real workflow permission checks and published-pointer withdrawal. Synthetic mobile UI exercised review transition, validation status and history at 390px without overflow; fixture removed. No remote migration, publication, real enquiry or provider call occurred. Trusted-worker deployment and full staged UAT remain incomplete.

## Requested trusted checks — 2026-10-22

Added local migration 031 with user-authorized, revision-bound validation requests and service-only fenced worker leases. Requests deduplicate per revision, terminal refreshes throttle for 30 seconds, expired attempts retry with backoff, and superseded revisions cannot receive current certification. Receipt persistence and job completion are atomic. Added queue consumer and request controls for journey/form editors; editor APIs remain user-token-only. Fifty-eight DB tests plus worker/API regression checks and TypeScript passed. No deployed scheduler or privileged HTTP worker transport is configured; requests can remain queued until that deployment work is complete. Full CMS delivery/UAT remains outstanding.

## Runnable validation worker endpoint — 2026-10-22

Added disabled-by-default Node GET/POST validation consumer with a dedicated scheduler bearer secret and restricted service RPC transport. Fixed-length authentication digests, HTTPS-only database origin, redirect rejection, bounded strict response parsing and timeouts protect the server boundary. Responses distinguish invalid content from retryable failures and omit content/credentials. Four runtime tests plus two queue worker tests and TypeScript passed. Deployment instructions added; production build checked separately below. No scheduler, remote credentials, migrations or real provider requests were installed or run.

Production build passed with 173 static pages and the dynamic validation-worker route. Final response-bound tests also passed (four runtime tests total).

## Linked form and location previews — 2026-10-22

Added authorized linked-form draft loading to page previews, strict identity/schema checks, refresh/error states and interactive simulation. Added pinned form rendering in the private preview viewer and sharing controls in the Forms workspace. Location sections now render addresses/contact/coordinates and map links; requested embedded maps are explicitly unavailable. Fourteen composition/reference/preview tests and TypeScript passed. Synthetic 390px browser verification confirmed linked form validation success states are simulation-only, with no horizontal overflow. Fixture removed; no real enquiry or external map request occurred. Other referenced section renderers, live page delivery and full publication dependency checks remain unfinished.

## Independent testimonial editing and previews — 2026-10-22

Added strict versioned testimonial fields, user-token save validation, independent collection editor, image picker, locale/revision handling, restore controls and private shares. Anonymous projection strips attribution/image and internal evidence. Added private pinned testimonial rendering and selected-testimonial composition preview through existing authorized reads. Three focused schema/projection/API tests and TypeScript passed. Synthetic mobile editor check verified consent evidence requirement, disabled invalid save and anonymous display, with no 390px overflow; fixture removed. No real quote saved/published and no migration run. Public delivery/withdrawal policy, legacy migration and full reference publication checks remain incomplete.

## Testimonial migration review — 2026-10-22

Implemented pure migration planner and no-overwrite CLI for local testimonial snapshots. Full source preservation, stable digests, duplicate blocking, stale mapping reports, explicit media mapping and conservative consent/verification handling added. Three tests and TypeScript passed. Actual local snapshot produced three draft candidates, each pending consent/unverified wording with unmapped destination retained. Review artifact: /private/tmp/safari-testimonial-migration-review-v2.json. No records imported, published, deleted or fetched remotely. Applying reviewed migrations and reconciling current remote source data remain unfinished.

## Reviewed testimonial draft application — 2026-10-22

Added local migration 032 and user-token review/apply API. Server reconstructs manifests from original source and reviewed mappings; source/website/locale/payload changes invalidate review digests. Create-only transactions retain full source, enforce source-key uniqueness, preserve edits on retries, and never publish. Fifty-nine database tests, two API tests and TypeScript passed. Tested permission denial, atomic rollback, request-key conflicts and safe retries after client edits. No live/staging data imported. Client import UI, updates to existing migrated identities and remote reconciliation remain incomplete.

## Testimonial migration review screen — 2026-10-22

Added bounded JSON snapshot upload/review within Testimonials, original/proposed content display, per-record findings, explicit review acknowledgement, and reviewed-draft application. Pending retries retain input/request identity; mismatched receipts cannot report success; migration state participates in workspace leave protection. Four focused client/API tests and TypeScript passed. Browser upload flow, mapping controls, durable cross-session recovery and real staging imports remain unverified/incomplete. No real data was applied.

Production build passed with the testimonial migration API and review screen; no temporary fixture routes were present.

## Migration browser validation — 2026-10-22

Synthetic browser upload exercised JSON selection, source/proposed review, visible consent/verification/unmapped warnings, acknowledgement gating, uncertain response locking, identical retry payloads and verified success receipt. Test endpoint returned fabricated IDs and performed no database writes; temporary routes removed. Mobile 390px panel had no horizontal overflow. Added discard-review action, file-input reset after completion and rejection of receipts mapping distinct source records to one created record. Three client tests and TypeScript passed. Real staging execution and durable cross-session recovery remain pending.

## Public delivery boundary — 2026-10-22

Added local migration 033 restricting public page types and projecting known top-level fields, plus disabled-by-default published-content API and anon-only transport. Reads bind server-configured website and requested locale/path, validate stored structure, and never cache withdrawn/missing responses. Sixty database tests, three public API/runtime tests and TypeScript passed. Existing website source remains unchanged. Actual CMS page rendering, public media, references/settings/navigation consumers and full staging cutover remain unfinished.

## Published image delivery — 2026-10-22

Added local migration 034 for publication-scoped processed image access while keeping originals/private bucket protections. Added disabled-by-default public media route using anon credentials, bound descriptor/storage keys, bounded MIME/length/hash verification and post-fetch authorization recheck. Sixty-one database tests, eight public/private media tests and TypeScript passed. No remote policies applied or provider reads performed. Live renderers, deployed storage/CDN verification and website cutover remain outstanding.

## Opt-in published journey renderer — 2026-10-22

Connected journey detail route to independent published reader behind disabled CMS_JOURNEY_RENDERING_ENABLED. Added validated sorted view data, published SEO text, no legacy fallback on CMS failure/withdrawal, public-image URLs and renderer for facts/itinerary/FAQ/gallery. Journey route is now request-rendered to avoid static retention. Two focused loader tests and TypeScript passed; synthetic 390px browser check verified layout and FAQ expansion without overflow. Fixture removed. Actual enabled staging route, image UX, listings/sitemap/search, structured data, remaining journey fields and complete source cutover remain unfinished.

## Published journey listing and sitemap — 2026-10-22

Added migration 035 published summary RPC, bounded validated pagination, public-key transport and independent journey listing component. Under the existing disabled journey switch, listing and sitemap journey URLs now use current published CMS records with no legacy fallback. Both routes are request-rendered. Sixty-two database tests, three list-reader tests and TypeScript passed. Live source switch, catalogue visual/staging UAT, other-collection journey links and full search synchronization remain incomplete.

## Published journey search — 2026-10-22

Connected request-rendered search journey entries to the published catalogue under the disabled journey switch; no fallback to legacy journeys in CMS mode. Added shared filtering and published description/duration/season search text. Two focused tests and TypeScript passed. Synthetic browser test matched winter via journey season, then removed that journey after a supplied-catalogue withdrawal while retaining the journal result; mobile 390px width passed. Temporary fixture removed. Open-tab live updates, other content migrations, staging and full cutover remain pending.

Full current CMS regression checkpoint: 262 tests passed, zero failures. This remains local unit/integration evidence, not production readiness or completion of the PRD.

### Access directory foundation — 2026-10-22
- Added migration 036: read-only, website-scoped role/permission and membership directories with UUID pagination. Requires explicit `configure/access` permission; wildcard configuration and record-scoped access grants do not qualify.
- Role/permission RLS now uses the same explicit gate. Membership output contains identity IDs, role, expiry/revocation and derived status; no authentication profile/email data is exposed.
- Embedded database tests cover wildcard/scoped denial, cross-website denial, pagination, expiry, revocation and anonymous denial. No remote migration applied.
- Remaining: access administration API/UI, audited membership/role mutations, initial administrator provisioning, provider session revocation and staging checks.

### Access directory API — 2026-10-22
- Added authenticated GET `/api/cms/access` for paginated roles and memberships using the caller's token and migration 036's explicit access permission.
- Strict query/result validation, duplicate parameter rejection, monotonic cursors, and no-store responses prevent ambiguous or malformed directory reads.
- Three targeted API tests passed. See `access-administration.md` for deployment/grant compatibility and remaining administration work.

### Audited membership management — 2026-10-22
- Migration 037 adds membership versions and existing-member role/expiry/revoke/restore operations. Site locking, reauthorization, optimistic versions, site-scoped roles and a permanent access-administrator invariant protect writes.
- Added strict authenticated POST `/api/cms/access` and actionable conflict/validation messages. Every successful change records before/after state and actor; failed operations roll back.
- Database scenarios and API tests passed, along with TypeScript checks. Full CMS regression suite passed (268 tests). No remote membership changes or migrations were performed.
- Remaining: client UI, invitations/bootstrap, custom-role editing and real concurrent/provider-session verification.

### Access workspace — 2026-10-22
- Added Access navigation and client screen for membership lists, role permission inspection, UTC expiry, revoke/restore and explicit before/after review.
- Integrates workspace unsaved-change protection; uncertain saves require a reload before further changes. Roles are fully paginated before editing; member lists load incrementally.
- Verified synthetic browser flow from selection through role/revocation review to updated status/version. Temporary fixture removed; no actual account permissions changed. TypeScript and 268 CMS tests passed.
- Initial screen identifies members by UUID. Friendly account labels, invitations, custom roles and production verification remain outstanding.

### Custom-role backend — 2026-10-22
- Added migration 038 with versioned role creation/update, complete permission replacement, strict action/module/record validation, duplicate rejection, case-insensitive name checks and audit history.
- Website locking and the permanent-administrator invariant apply to role changes as well as membership changes.
- Added authenticated POST `/api/cms/access/roles`, verified result handling and actionable conflict errors. Role reads now include versions.
- TypeScript and full CMS regression suite passed (270 tests). No production grants or memberships changed. Custom-role UI and real concurrent-client validation remain pending.

### Membership assignment binds reviewed permissions — 2026-10-22
- Migration 039 removes the old membership-update RPC signature and requires the reviewed target-role version under the shared website lock.
- API and workspace now supply the loaded role version; audit events retain it. Stale role permission changes require reloading before assignment, even when the membership version is unchanged.
- Verified stale rejection, current-version success, removed-signature denial and audit binding in embedded SQL, plus required-field API validation. TypeScript and all 270 CMS tests passed. No remote access changes performed.

### Custom-role editor — 2026-10-22
- Added role creation/editing to Access, with action/module/record rows, validation, added/removed permission review and required impact acknowledgement.
- Shared unsaved protection covers role and membership edits; simultaneous edits are blocked, and uncertain saves require reloading.
- Synthetic browser workflow passed from creation through acknowledged save; temporary test page removed. Two draft/diff tests added; all 272 CMS tests and production build passed.
- No actual account permissions changed. Friendly identities, invitations, member impact counts and production verification remain pending.

### Access identities and history API — 2026-10-22
- Migration 040 returns account email only for members of the authorized website; the access screen now shows email alongside the stable user ID.
- Added protected, newest-first access history RPC/API limited to role and membership events, preserving bigint cursors and validating before/after payloads.
- SQL tests cover unrelated-account and website isolation, event filtering and pagination; API tests cover cursor precision and malformed inputs/results. TypeScript and all 275 CMS tests passed.
- No provider data was queried or permissions changed. A dedicated history viewer and production identity verification remain pending.

### Access-history viewer — 2026-10-22
- Added on-demand history loading, older-event pagination and readable role/membership before-and-after tables to Access.
- Includes actor and stable target/event IDs, UTC timestamps, reviewed role versions, and clear wording about current directory labels.
- Clears stale history after access changes and ignores obsolete responses. Browser check used a synthetic membership event; fixture removed. TypeScript and all 275 CMS tests passed.
- Production/staging auth verification, invitations and initial bootstrap are still outstanding.

### Destination drafting milestone — 2026-10-22
- Added the independent Destination v1 contract and HTTP save validation covering the complete existing individual destination model, with explicit media/reference migration requirements. Publication remains blocked.
- Added Destinations navigation/workspace, paginated selection, create/save, optimistic revision handling, legacy-payload preservation and revision restore.
- Editor covers narrative/editorial fields, ordered collections, media/gallery, related records/pairings, sources, video descriptors and SEO with limits and validation.
- Synthetic create/edit/save/reload browser check passed; temporary fixture removed. All 278 CMS tests, TypeScript and production build passed. No live source switched.
- Next: destination preview and secure sharing; then complete reference/media publication checks and public delivery. Country/atlas templates, migration, remaining modules and production handover remain pending.

### Destination preview milestone — 2026-10-22
- Added schema-validated destination content preview in the editor and secure recipient-bound viewer; existing private sharing controls pin saved revisions and prevent sharing unsaved changes.
- Preview renders narrative, field intelligence, images/gallery, FAQ, editorial notes, planning copy and sources. Related records remain explicit references; video and planner actions are disabled.
- Destination-specific SQL test confirms revision pinning, wrong-recipient denial and revocation. Synthetic browser preview/FAQ check passed; fixture removed. TypeScript and all 279 CMS tests passed.
- Next: destination reference/media publication validation and public rendering. Migration, country/atlas coverage, remaining modules and production handover remain pending.

### Destination advisory readiness — 2026-10-22
- Added required-copy/image checks, nested current media evidence, stored-reference resolution, same-language published-reference checks and self-pairing rejection.
- Destination workspace exposes advisory validation for the saved revision. Evidence comes from user-scoped RPCs; browser availability claims cannot authorize publication.
- TypeScript and all 281 CMS tests passed. Destination publishing remains disabled pending public rendering and trusted reference validation/rechecks; no production content changed.

### Destination public renderer implementation — 2026-10-22
- Added visitor renderer/styles covering hero, editorial narrative, facts, field notes, gallery, related cards, FAQs, citations and planning CTA.
- Added a strict projection with typed, locale-matching published-reference descriptors and local route checks; raw relationship IDs do not enter visitor cards. This is not publication authorization.
- TypeScript and all 284 CMS tests passed. No live route switched; browser visual validation and published SQL/media/worker integration remain pending.
- Next: trusted destination publication inputs and transaction-time reference checks, followed by public delivery integration and visual verification.

### Trusted destination relationship input — 2026-10-22
- Added migration 041 service-only relationship evidence from the current saved destination revision, checking website/type, published route/slug and current media availability.
- Direct and queued workers pass reference evidence and locale into destination validation. No destination publication policy was enabled.
- TypeScript and all 285 CMS tests passed, including SQL isolation, withdrawal, route mismatch and revision identity scenarios.
- Next: transaction-time relationship rechecks and public delivery readers; then renderer integration and visual checks. Migration and production deployment remain outstanding.

### Destination publication relationship guard — 2026-10-22
- Added migration 042 to recheck and lock related records/media when a destination's published revision changes. Guards shape/bounds, duplicate/self references, website/type, language, published route and current media rights.
- Rejection leaves the publication pointer and draft intact. The destination publication policy remains disabled.
- All 286 CMS tests and TypeScript passed, including related record/media changes after earlier evidence. No remote migrations applied.
- Next: public destination reader with current availability checks and integration of the visitor renderer. Concurrent-provider verification, migration and remaining CMS modules are pending.

### Public destination reader — 2026-10-22
- Added migration 043 with published-revision-only destination reads, public field filtering and bounded recursive checks of related destinations, journeys, expeditions and current image rights. Circular destination pairings terminate safely; unavailable nested dependencies stop delivery.
- Added an opt-in server endpoint using only the public anonymous key and strict destination projection. Delivery remains disabled with the current configuration; no live route or source changed.
- TypeScript and all 289 CMS tests passed, including draft isolation, nested withdrawals, rights revocation, cycles and API failure handling. No remote migration or production verification performed.
- Next: destination public-media authorization, live renderer integration and visual verification, then trusted publication enablement. Remaining content modules, complete imports/migration, production provisioning and client handover remain pending.

### Destination public-image authorization — 2026-10-22
- Migration 044 extends the existing public media reader and private-bucket read policy to published destinations whose dependency graph remains available.
- Only published listing, hero, gallery and SEO social-image fields authorize destination image access. Draft-only and private-note references do not. Current rights, inspection, archive and website checks remain enforced.
- All 290 CMS tests passed. The new embedded SQL scenario checks both metadata reads and storage RLS, unpublished/draft isolation, private-field exclusion, linked withdrawal, image-rights revocation/restoration and destination withdrawal.
- No remote migration applied or live source changed. Next: connect destination visitor rendering behind an explicit delivery option and verify it visually; trusted publication enablement and production integration remain pending.

### Destination route and metadata integration — 2026-10-22
- Connected the destination visitor renderer behind `CMS_DESTINATION_RENDERING_ENABLED=true` (default false), requiring public delivery configuration. Missing published records return not-found rather than legacy content; upstream errors propagate.
- Preserved reserved country/atlas routes and aliases. Individual CMS pages use published SEO titles/descriptions, canonical, robots, social copy and processed images. Request-scoped reads avoid persistent content caching; the destination route is now dynamic.
- TypeScript, all 292 CMS tests and the production build passed. Tests cover rollout selection and SEO mapping; these do not establish browser appearance or managed-provider integration.
- Next: browser visual verification, destination catalogue/list/search/sitemap integration and trusted publication enablement. No flag enabled, remote migration applied or production content changed.

### Published destination catalogue reader — 2026-10-22
- Added migration 045 with website/language-scoped, UUID-paginated published summaries, current dependency/media availability checks and an explicit public field projection.
- Added an anonymous-key server reader with strict summary validation, monotonic cursor/duplicate-route checks, bounded traversal and deterministic display sorting. Summary fields include listing images and saved indexing/sitemap preferences.
- TypeScript and all 295 CMS tests passed. Database tests verify publication/draft isolation, pagination, website/language isolation, withdrawal and revoked rights; unit tests verify malformed responses and credential selection.
- The reader is not yet connected to destination lists/search/sitemap. Those consumers, browser visual verification, trusted publication enablement and production integration remain next. No remote migration or source switch performed.

### Destination search and sitemap integration — 2026-10-22
- Search and sitemap now use the published destination catalogue when the destination rendering flag is enabled. Disabled mode makes no CMS catalogue request; enabled mode replaces individual legacy entries without missing-record or upstream-error fallback.
- Centralized reserved country/atlas URLs across detail routes and discovery. Specialized legacy entries remain authoritative at those URLs, and conflicting CMS summaries are excluded.
- Sitemap respects explicit exclusion and noindex (including noindex combined with include). Internal site search still includes published noindex pages because search-engine indexing is separate from visitor discovery.
- TypeScript, all 297 CMS tests and production build passed. Browser checks, destination landing/list integration, global SEO inheritance and trusted publication enablement remain pending. No production setting or data changed.

### Destination landing catalogue — 2026-10-22
- Added opt-in CMS destination landing cards with published listing images, descriptions, best months, text search, region filtering, result counts and empty-state planning links. Regional atlas links retain their existing templates; reserved URLs are excluded from CMS cards.
- The landing page uses the same destination rollout flag and published catalogue as detail/discovery. Disabled mode retains the existing landing page. The route is dynamic; no real flag or content changed.
- Browser verification with a temporary synthetic fixture passed text filtering, region filtering, clearing and no-results behavior; images rendered. Temporary page/image route and browser tab were removed. Screenshot: `/private/tmp/cms-destination-listing.png`.
- TypeScript and production build passed after implementation; the existing 297-test suite was last verified in the preceding milestone. Mobile and real-provider checks, full detail-page visual verification, landing/global copy editing and trusted publication enablement remain pending.

### Destination responsive detail and planner handoff — 2026-10-22
- Browser-checked the real destination renderer using a temporary synthetic published projection at 390px and 1280px. Both loaded images and document widths matched the viewport; mobile FAQ expansion and the destination planning link worked.
- Found and fixed the planner's legacy-only destination lookup. With destination rollout enabled, individual destinations now use the published CMS reader for context; reserved routes keep their existing source. Missing CMS records do not revive legacy destination context, and upstream failures propagate.
- All 297 CMS tests and production build (including TypeScript) passed. Browser handoff used the existing Kanha destination with rollout disabled; the new CMS-backed planner branch still requires managed-provider end-to-end verification.
- Removed the temporary fixture/image route and tab and reset the viewport. Screenshot: `/private/tmp/cms-destination-mobile.png`. Next: trusted destination publication enablement; mobile listing checks, broader layout/content cases, full migration and remaining CMS modules are still pending.

### Nested destination readiness evidence — 2026-10-22
- Publication-path review found that trusted validation checked a paired destination's own published pointer/media but not its nested dependencies, although public delivery already checked the graph.
- Migration 046 makes trusted destination reference evidence require the paired destination's current delivery graph to be available. A nested withdrawal now marks that pairing as not publishable while preserving its available identity; restoring the dependency restores readiness.
- All 298 CMS tests passed, including a new service-worker-input scenario and continued editor denial of the trusted evidence RPC. No remote migration or publication policy enabled.
- Next: complete publication eligibility for reserved routes, supported live locales/content types and processed-image requirements, then register the trusted validator and connect editorial publication controls. The complete CMS goal remains outstanding.

### Destination format and delivery eligibility — 2026-10-22
- Destination advisory/trusted shared checks now explicitly flag non-English live routes and related photography expeditions whose independent renderer is not connected. Draft editing remains available.
- Migration 047 requires processed WebP images in destination media evidence and public availability. The publication media trigger rechecks MIME under its existing asset lock, preventing a stale or bypassed earlier check from publishing unsupported images.
- TypeScript and all 300 CMS tests passed. The new SQL test covers approved-but-unprocessed image denial, publication rejection, processed-image success and subsequent delivery denial after MIME change. No remote migration or policy enablement occurred.
- Next: reserved URL eligibility, trusted destination validator registration and editorial workflow controls. Remaining language/expedition delivery, migration, provider UAT and complete CMS scope remain pending.

### Destination URL ownership — 2026-10-22
- Centralized the country/atlas/alias URL inventory in a deployment-owned manifest used by visitor route selection and destination validation. Reserved URLs produce a clear readiness finding.
- Migration 048 adds a protected matching database registry and a publication/path/type-change trigger. Drafts remain editable for migration review; reserved individual destination publication and moving a published record onto a reserved URL are rejected.
- TypeScript and all 302 CMS tests passed. Tests verify current country/atlas/alias coverage, exact database/application registry agreement, editor denial of registry modification, publication rejection and published-route move rejection.
- No remote migration or publication policy enabled. Next: trusted validator registration and editorial publication controls; full CMS migration, remaining modules and provider UAT remain pending.

### Destination trusted publication workflow — 2026-10-22
- Registered `destination-1` in migration 049 and removed the blanket draft-only finding from the complete shared validator. Advisory browser checks remain non-authorizing; only the service worker can write trusted receipts.
- Added destination editor actions for trusted validation requests, submit/approve/request changes, publish and withdraw, with permissions, review state and unsaved-edit guards. Revision restore remains a new draft requiring fresh review.
- All 303 CMS tests passed, including a real stored-revision validator/database sequence: separate reviewer, publication denied without receipt, validated publication, public snapshot read, invalid replacement rejected and old published revision preserved. Production build including TypeScript passed after UI integration.
- No remote migrations applied, worker configured or source flags enabled. Browser workflow QA and managed-provider integration remain pending. Remaining modules, complete migration/imports, operations and client handover are unfinished.

### Destination workflow browser QA — 2026-10-22
- Checked the actual workflow component through a temporary synthetic browser fixture: unsaved-change blocking, submit/request-changes/resubmit/approve transitions and permission-based action visibility.
- Replaced native confirmation dialogs with inline revision-bound confirmation and Cancel controls. Pending confirmation resets when revision, review state, publication, permissions or disabled state changes; confirmation rechecks the selected revision before dispatch.
- Browser verified cancellation without publication, explicit publication and withdrawal targeting the published revision. Fixture and tab removed; screenshot `/private/tmp/cms-destination-workflow.png`. TypeScript passed.
- These checks exercise component behavior, not real API/provider integration. The preceding milestone's 303 backend tests remain the latest full suite result. Managed-provider end-to-end verification, remaining CMS modules, migration and handover remain pending.

### Destination migration planning and inventory — 2026-10-22
- Rechecked local provider configuration without exposing values: CMS URL, anonymous key, website ID and validation worker secret are absent, so managed-provider verification remains unavailable.
- Added a review-only destination migration planner preserving full source snapshots and deterministic digests. Explicit field-path mappings are required for images and related record identities; unknown fields, malformed values, duplicate URLs, stale/unused mappings, video and reserved routes remain review blockers.
- Generated `docs/cms/destination-migration-inventory.json` from the current 102 source records. Seventeen are specialized country routes; zero are ready for automatic draft creation without mapping review. No source content or database was changed.
- TypeScript and all 306 CMS tests passed, including full source retention, conversion, invalid/stale mappings and repository inventory. Next: migration review/apply integration and structured destination imports. Provider setup, remaining modules and handover remain pending.

### Authenticated destination migration review — 2026-10-22
- Added POST `/api/cms/migrations/destinations` review-only endpoint, with bounded source batches, caller authentication, same-origin enforcement and deterministic review digests covering site, language, plan and evidence.
- Migration 050 adds a create-permission-gated evidence reader. Mapped media must be visible, processed and currently approved; related records must be visible within the website and match the requested type. The API additionally checks language and exact evidence response identities.
- TypeScript and all 309 CMS tests passed, covering permission/site/type isolation, changed image availability, language mismatch, response mismatch and rejected unsupported apply requests. No source or remote database changes performed.
- Next: atomic draft-only migration apply with replay protection and review UI. Complete destination imports, remaining CMS modules and managed-provider verification remain pending.

### Atomic destination migration apply — 2026-10-22
- Added migration 051 with actor/site-scoped batches, retained source manifests, create-only drafts, source-key uniqueness, audit events and request-key replay protection. Entire batches roll back on URL/source conflicts or verification failure.
- Apply rechecks and locks mapped images and related records, enforcing current processed-image approval and reference website/type/language/visibility. Reserved routes remain excluded. No publication occurs.
- API apply requires the exact current review digest and validated full payloads; changed source/mappings/evidence require a new review. Review responses now expose whether apply is available.
- TypeScript and all 311 CMS tests passed, including draft-only creation, original source retention, identical retry, changed-request rejection, conflict rollback and mapped-resource denial. No remote migration or content writes performed.
- Next: migration review/apply interface and structured destination imports. Provider UAT, remaining CMS modules, migration execution and handover remain pending.

### Destination migration review interface — 2026-10-22
- Added the destination-workspace migration panel with bounded JSON snapshot batches, mapping input, locale, original/proposed payload review, issue lists and explicit acknowledgement before creating drafts.
- Client verifies review source/index correspondence and receipt source keys/unique record IDs. Source/mappings/request key lock once apply begins, supporting same-request retry after uncertain outcomes; parent navigation sees pending migration state.
- All 313 CMS tests and production build passed; TypeScript rechecked after fixture removal. Synthetic browser flow passed file selection, review expansion, acknowledgement and verified creation receipt. Scoped panel styles added; temporary fixture/input/tabs removed. Screenshot `/private/tmp/cms-destination-migration.png`.
- This is an administrator migration interface using JSON mappings, not the client Word/Excel import experience. Persistent uncertain-request recovery, visual mapping pickers, provider UAT, destination templates and remaining CMS scope are pending.

### Migration result recovery — 2026-10-22
- Migration 052 and the status API retrieve completed results by actor, website and request ID without repeating apply or requiring unchanged media evidence. Responses exclude original source/manifest data and validate receipt identities.
- The panel now saves only request/review/source digests and website identity in browser storage before apply, restores pending lookup after reload, and offers a saved-result check. Missing results remain explicitly unconfirmed, never treated as proof of rollback.
- TypeScript and all 316 CMS tests passed, covering actor/site/permission isolation, malformed/mismatched receipts and bounded recovery metadata. New recovery UI browser/reload testing remains pending; no remote migration applied.
- Original uploads/mappings are not persisted. An unconfirmed result after reload still needs outcome investigation before retrying; the UI prevents starting a duplicate request. Next: recovery UI QA and structured destination imports, alongside remaining CMS work.

### Reload recovery browser verification — 2026-10-22
- Verified the real migration panel against a temporary synthetic status-only fixture: pending metadata survives reload, source/mapping controls remain locked, unconfirmed results retain the lock, and a matching completed receipt unlocks the panel without an apply call.
- Reload after successful recovery confirmed that the tracker was cleared. The synthetic browser storage key, fixture and tab were cleaned up; no real backend/content was used. Screenshot: `/private/tmp/cms-migration-recovery.png`.
- Corrected singular recovery-result wording; TypeScript passed. The latest full CMS suite remains 316 passing tests from the preceding milestone.
- Next: destination Word/Excel import contracts and templates. Provider integration, unconfirmed-outcome operator recovery, other CMS modules and handover remain pending.

### Destination Office table contract — 2026-10-22
- Added a portable versioned destination table definition covering Pages, Content, Lists, Media, Related, FAQs, Sources and Notes. Scalar paths include narrative, editorial, field intelligence and SEO; repeatable content stays in dedicated tables.
- Added table-level validation with exact sheet/row/field findings, explicit required cells, hard character limits, separate editorial word/character guidance, unknown-field rejection and bounded total rows/text. Numeric normalization is limited to display order.
- TypeScript and all 319 CMS tests passed, including scalar coverage, guidance versus errors, malformed/unknown inputs and prototype-name rejection.
- This is table validation only, not a complete import plan or downloadable Office file. Next: identity/relationship semantics, update preservation and draft change planning, then Word/Excel generators/parsers and review UI integration.

### Destination import draft planning — 2026-10-22
- Added full-snapshot draft planning with create/update identity checks, exact revision matching, unchanged URL/language rules and reserved-route rejection. Any error rejects the complete batch; planning performs no writes.
- Updates preserve omitted scalar/nested fields and collections. Collection/image replacement or clearing requires explicit `replaceCollections` intent; supplied rows form the complete replacement ordered by unique positive positions.
- TypeScript and all 324 CMS tests passed. New tests cover ordered creates, input preservation, omitted-field preservation, explicit replacement/clearing, stale revisions, ambiguous identities, malformed references, duplicate placement/order and atomic rejection.
- Next: Word/Excel template generation/parsing and authenticated review/apply integration with current media/reference evidence and write-time concurrency checks. These destination imports are not enabled uploads yet. Provider integration, other CMS modules, migration and client handover remain pending.

### Destination Office file parsing — 2026-10-22
- Reused the bounded OOXML reader for destination-specific Word/Excel parsers while retaining journey entry points and accepted sections. Destination metadata/type/version and permitted section names are checked.
- Blank table rows preserve later diagnostic positions without producing empty draft records. Word source table locations and both formats' source digests remain available for review provenance.
- TypeScript and all 328 CMS tests passed. New file-level tests cover equivalent Word/Excel proposals, blank-row locations, wrong-template rejection, formulas, external links and tracked changes; existing journey template/parser tests continue passing.
- Next: downloadable destination templates and generated-file round trips, followed by authenticated upload/review/apply integration. Actual Office application testing, provider integration, remaining CMS modules, migration and handover remain pending. No destination upload route enabled or content written.

### Destination Excel template — 2026-10-22
- Generated the blank destination workbook with eight data sheets, field/limit reference, explicit preservation/replacement instructions, categorical selections, ordered-position validation and conditional length warnings. No sample records appear in the client template.
- Added a reproducible bundled artifact-tool builder and internal populated fixture. Actual exported files pass the real parser/planner: blank template stays empty, populated fixture plans one draft. All 5 destination file tests pass; latest full suite remains the preceding 328-test result.
- Rendered and visually checked opening views for all nine sheets. Native Excel interactions and full field-guide visual review remain unverified. No upload route enabled or content applied.
- Next: complete template verification and Word template generation, then authenticated destination upload/review/apply. Provider integration, remaining CMS modules, migration, production testing and client handover remain pending.

### Destination Word template — 2026-10-22
- Added a reproducible Word builder and blank document containing eight reusable record forms, explicit preservation/replacement instructions and the full scalar field-limit reference. Sample content exists only in an internal fixture.
- Rendered with bundled LibreOffice and inspected all eleven final pages. Removed inherited title borders and improved spacing and maximum-limit wording after the first render.
- All 330 CMS tests passed, including real generated Word/Excel parsing and draft planning. Blank Word forms do not become accidental records, and the populated fixture retains source table locations.
- Next: authenticated destination file upload/review and atomic draft apply. Native Office editing checks, Excel field-guide visual verification, provider integration, remaining CMS modules, migration, production testing and client handover remain pending. No content was applied or published.

### Authenticated destination file review — 2026-10-22
- Added a read-only raw Office upload endpoint using caller-token membership and current-record reads. Reused the streaming file limit, enforced same-origin requests and verified returned record identity/type/route before planning.
- Reviews preserve server-held content, bind digests to website/source/proposal and explicitly identify media/reference checks as unfinished. Saving is disabled; apply actions are rejected.
- TypeScript and all 334 CMS tests passed. Tests cover real Word file review, stored-content preservation, changed digests, stale revisions, mismatched/missing records, authentication, membership, origin and oversized/malformed files.
- Next: current media/reference evidence and atomic reviewed draft apply, then client upload/review UI and provider verification. Remaining CMS modules, migration, operations and handover remain pending. No remote content written or published.

### Destination import availability review — 2026-10-22
- Added migration 053 with create-or-per-target-edit authorization and bounded, caller-visible image/reference evidence. Imported images require processed WebP and current rights; references are website/type scoped.
- Connected evidence to file review, checking language and self-reference, preserving original Pages row locations, and binding current evidence into the review digest. Saving remains disabled pending atomic apply.
- TypeScript and all 337 CMS tests passed. New tests cover database permission/site/type isolation, unavailable assets, changed evidence digests, response mismatch, wrong-language references and self-pairing.
- Next: atomic destination import draft apply with replay recovery and write-time evidence/concurrency checks, then client review UI. No remote migration applied. Remaining modules, real-provider UAT, migration execution, operations and client handover remain pending.

### Atomic destination import persistence — 2026-10-22
- Added migration 054 with atomic create/update draft manifests, namespaced source identities, per-actor/site request receipts and replay conflict detection. Batch limits are 25 destinations and 1.1 MB.
- Database rechecks permissions, revisions, unchanged URL/language, reserved routes, locked media rights and typed/visible related records. Self-pairing and video import are rejected; public pointers remain untouched.
- All 339 CMS tests passed. Tests prove draft creation/update, identical replay, changed-digest denial, stale-revision whole-batch rollback, receipt isolation and write-time dependency/route checks in embedded PostgreSQL.
- Next: connect authenticated API apply/recovery with recomputed reviewed manifests and matching limits, then client upload/review UI. Migration remains local only; real-provider concurrency, remaining modules, migration execution, operations and handover remain pending.

### Destination import API saving and recovery — 2026-10-22
- Connected apply with mandatory review digest/request ID, fresh file parsing, caller-scoped stored records, current availability evidence and server-built manifests. Review now enforces 25-record/compact-manifest bounds and rejects unsupported video imports.
- Added receipt-first retries and status recovery without the original upload. Save/receipt identities are validated; unknown outcomes explicitly require recovery instead of assuming failure. Valid reviews expose draft saving, never publication.
- TypeScript and all 342 CMS tests passed, including a generated Excel file through API review, embedded-database saving and identical retry. Additional tests cover changed reviews, preserved content and malformed/mismatched receipts.
- Next: client destination import upload/review/confirmation and persistent recovery UI, then browser/provider end-to-end testing. Database migrations remain local; remaining CMS modules, migration, operations and client handover are pending.

### Destination client import interface — 2026-10-22
- Added Word/Excel downloads, file review/findings, proposed draft inspection, replacement disclosure and explicit save acknowledgement to the destination workspace.
- Added client source/readiness/receipt verification and pre-write persistent recovery metadata. Unknown results lock new selection; same-file retry and reload status lookup retain the request identity. Pending imports participate in navigation guards and block overlapping edits/migrations.
- All 345 CMS tests and production build passed. Tests cover source-hash parity, recovery metadata bounds/site isolation, inconsistent readiness and mismatched receipts. TypeScript was rechecked after adding overlapping-edit guards.
- Next: browser file upload/review/save/reload/recovery and responsive QA. Real-provider setup/verification, remaining CMS modules, migration, operations and handover remain pending. No remote content or production flags changed.

### Destination recovery browser check — 2026-10-22
- Verified the real import panel in a temporary local fixture using synthetic status responses: pending requests disable file selection, unconfirmed receipts retain the lock, reload preserves recovery, and a verified completed receipt clears the guard and re-enables selection. A further reload remains clear. No browser warnings/errors were captured.
- Removed the temporary fixture and cleared its synthetic recovery state. No real drafts were saved or published. Full file upload/review/save, responsive checks and real-provider verification remain pending.
- Overall planning estimate: approximately 60% of the full client-ready scope complete, 40% remaining; allow roughly 2–4 further weeks of focused implementation and testing, conditional on provider access and client feedback. This is a scope estimate, not a measured completion score or delivery commitment.

### Readable destination import previews — 2026-10-22
- Connected proposed Office drafts to the existing destination content preview with caller-authorized private image loading. Only the selected preview mounts, and new reviews/discard/save clear preview selection. Full raw content remains available for detailed inspection.
- Updated preview wording to describe content-preview limitations accurately now that destination delivery exists.
- Browser QA on a temporary synthetic review fixture at localhost:3001 passed file selection → review → destination expansion → content preview → FAQ expansion → close → acknowledgement → discard. Save was disabled until acknowledgement; discard removed the proposal. Desktop and 390×844 mobile rendered without framework overlays or console errors. Used CUA in-app browser; Browser plugin is absent. Temporary fixture removed; no backend write was performed.
- TypeScript and 11 focused destination import API/client tests passed. Private media loading and real-provider upload/save remain to be exercised with configured backend access; full CMS coverage, migration, production operations and client handover remain pending. Overall estimate remains approximately 60%; this incremental milestone does not justify a new precise percentage.

### Journal draft contract and API validation — 2026-10-22
- Inspected current public article and legacy Sanity fields. Added a strict independent journal model with stable structured body blocks, private image references, author/date/read-time fields, SEO, sources and editable article CTA.
- Connected article saves to schema/title/route validation and advisory checks to stored-revision caller-scoped media evidence, including inline and social images. Incomplete drafts can be saved; journal publication remains blocked until delivery is implemented.
- TypeScript and all 350 CMS tests passed. Five new tests cover model preservation, legacy/unsafe input rejection, nested media checks, publication blocking and authenticated save/validation boundaries.
- Documented migration preservation requirements, including existing hero selection and unsupported videos. No content migration, production flag or database policy changed.
- Next: journal editor and readable preview, then independent public delivery and publication checks. Remaining modules, complete live integration, migration, operations and client handover are still pending. Overall rough estimate remains 60% complete.

### Journal client editing and draft preview — 2026-10-22
- Added Journal navigation and a client workspace with article creation/listing, strict draft loading, all v1 fields, media/SEO editors, block creation and keyboard-operable ordering, save/reload, revision restore and private preview sharing. Existing slugs/locales are locked; incompatible records are preserved for migration.
- Added escaped structured content rendering with disabled navigation actions in local and recipient-bound secure previews. Preview images mount only when the local preview is requested.
- TypeScript and production build passed. Browser QA used CUA (Browser plugin absent) with a temporary synthetic API at localhost:3001: create → edit → add paragraph/heading → invalid-heading save gate → reorder → preview → save/reload. Saved fields/order survived and URL editing locked. Desktop and 390×844 mobile screenshots showed readable previews, no framework overlay and no console warnings/errors. Temporary fixture was removed.
- Real-provider persistence, media, permissions, shared preview/restore tests remain pending, along with journal live delivery, migration and imports. No production content changed. Next: immutable journal public delivery and publication checks. Overall planning estimate remains approximately 60%.

### Journal public projection and transport contract — 2026-10-22
- Added a strict public article envelope bound to published revision identity, route and English locale. The projection requires complete editorial content and excludes editor research provenance and unknown fields.
- Added a dedicated anonymous-RPC transport gated by both general public delivery and a journal-specific flag. Request overrides and unsupported methods/locales are rejected; absent content differs from unavailable/malformed service responses, with generic errors and no-store headers.
- TypeScript and three focused projection/transport tests passed. Tests cover content preservation, provenance exclusion, incomplete/incorrect envelopes, fixed RPC credentials, dual opt-in, route bounds, request override rejection and private error suppression.
- This is an unconnected delivery contract: the database reader, route consumers, public media authorization, publication policy and listing/search/sitemap integration remain pending. No production flags or content changed. Next: published-revision database reader with current media checks and isolation tests, then public rendering.

### Journal published database reader — 2026-10-22
- Added local migration 055 with a published-pointer-only journal reader, website/route/English isolation, nested public-field projection and current processed-image rights checks. Internal projection helpers are not granted to anonymous callers. Research sources and unknown nested notes never enter its response.
- Connected a dynamic GET endpoint to the dual-opt-in journal transport; added an explicitly disabled example flag. No journal publication policy enabled, no remote migration run and no content changed.
- All 355 CMS tests and TypeScript passed. New embedded-database checks demonstrate newer drafts remain hidden, nested notes are omitted, cross-site/language reads miss, revoked/expired/wrong-MIME assets suppress delivery, unpublishing removes output and anonymous helper calls are denied. Invalid nested scalar/list payloads fail closed.
- A local HTTP smoke request could not connect to port 3001; endpoint runtime smoke remains unverified. Function-level transport tests passed. Next: journal public-media authorization and website rendering, followed by publication validation and listing/search/sitemap integration. Real-provider checks, migration and handover remain pending.

### Journal published image authorization — 2026-10-22
- Added local migration 056, extending existing public image authorization only for assets in the filtered, currently deliverable published journal payload. Images referenced solely by private source notes or newer drafts remain unavailable. Existing content-type authorization branches are preserved.
- All 356 CMS tests passed. Added embedded-database evidence for published versus newer-draft assets, internal provenance exclusion, cross-site denial, revoked/archived rights and unpublishing.
- Verified the actual local journal GET endpoint returns a generic 503 with no-store/noindex headers while disabled. Sandbox-restricted requests initially failed; an approved read-only request reached the already-running server. No replacement server was started. This resolves the previous HTTP-smoke evidence gap.
- No remote migration, production flag or content changed. Next: public journal renderer and route integration, followed by publication policy and listing/search/sitemap consistency. Whole-site coverage, migration, operations and client handover remain incomplete.

### Public journal renderer and route integration — 2026-10-22
- Connected the journal article route and metadata to the published reader behind the existing disabled journal flag, with no legacy fallback when enabled. The dynamic route avoids a stale static published snapshot; request caching shares metadata/content reads.
- Added the public structured article renderer using existing article styles, all six body block types, public images, accessible headings, full gallery, editable CTA, SEO/social overrides and Article JSON-LD. Existing legacy content remains selected while the flag is off.
- All 359 CMS tests and production build passed. Three new route tests cover SEO overrides, article structured data and opt-in behavior. CUA browser QA (Browser plugin absent) verified a synthetic renderer fixture at localhost:3001 on desktop and 390×844 mobile, including article-link navigation; no console errors/overlays. Temporary fixture page and image handler removed.
- Real-provider full-route and error-path verification remains pending. Next: published journal listing, search/sitemap consistency and publication validation before enabling delivery. Global SEO inheritance, migration, other content modules, operations and client handover remain incomplete. No production flag or content changed.

### Journal catalogue and discovery integration — 2026-10-22
- Added local migration 057 for published journal summaries using the same filtered, current-media-checked reader. Pagination is site/English scoped with bounded page sizes and published revision timestamps.
- Added a strict bounded catalogue client with deterministic editorial-date ordering, duplicate-route/cursor checks and anonymous RPC transport. Connected search and sitemap to replace legacy journal entries when enabled, honoring explicit noindex/sitemap exclusions without fallback.
- All 364 CMS tests, TypeScript and production build passed. New tests cover database pagination/isolation/rights suppression, safe summary fields, client traversal bounds and ordering, discovery exclusions and RPC authority.
- Public journal listing UI remains to be connected. Real-provider discovery/route checks, global SEO inheritance and publication validation remain pending. No remote migration or flag change. Next: journal listing consumer and browser verification, then publication gate and migration.

### Journal listing UI integration — 2026-10-22
- Connected the dynamic public Journal listing to the published catalogue behind the disabled delivery flag. Added derived category filters, counts, direct rights-checked image URLs, article cards and an empty state. Disabled mode preserves the existing listing; enabled errors do not fall back.
- TypeScript, production build and seven focused catalogue/route tests passed. CUA browser QA with synthetic data at localhost:3001 verified category filtering, empty/restored catalogue states, desktop/mobile layout and expected article-link URL navigation. The synthetic unpublished article returned 404 as expected. No console errors/overlays. Temporary page/image fixtures removed.
- Next: journal publication validation and workflow with database tests, then real-provider checks and migration. Listing hero copy, UI labels and empty-state copy still need CMS controls as part of whole-site editability. No production flags, remote migrations or content changed.

### Journal revision-bound publication checks — 2026-10-22
- Enabled actual journal-1 content readiness validation with English-only publication checks, replacing the temporary delivery-not-ready error. Added local migration 058 with publication policy, trusted stored-locale input, current processed-WebP evidence and locked write-time MIME/rights checks.
- Added a published journal route/locale guard so changing a published identity cannot detach its URL from its revision. Existing destination/journey validation and media behavior remain covered by the full suite.
- All 365 CMS tests and TypeScript passed. The new embedded-database workflow proves self-approval denial, missing-receipt denial, trusted validation, wrong-MIME/revoked-rights rejection even after a valid receipt, published delivery, rejection of invalid replacement drafts while retaining live content, and successful valid replacement.
- Next: expose journal validation/review/publish/unpublish controls and delivery status in the client workspace, followed by real-provider verification and migration. Migrations remain local, flags remain disabled and no live content was published. Wider modules, whole-site controls, operations and handover remain incomplete.

### Journal client review and publication workflow — 2026-10-22
- Added saved-content validation/trusted-check requests and permission-dependent review, publish and withdraw controls to the Journal workspace. Publication confirmations are bound to the displayed revision and reset when state, revision, permission or editability changes. Withdrawal targets the published revision.
- Workflow actions reload records and summaries, display draft/publication distinctions and avoid claiming visitor delivery without the configured rollout. Detailed delivery-job status remains pending.
- TypeScript, production build and focused journal/editor API tests passed. CUA browser QA on a synthetic fixture verified submit/approve, stale-confirmation cancellation, permission removal, exact publish/withdraw revision dispatch and unsaved-edit disabling. Desktop and 390×844 mobile displayed readable controls with no console errors/overlays. Fixture removed; no real article published.
- Next: journal migration inventory and safe draft conversion, plus real-provider end-to-end verification and delivery status. Office imports, editable listing labels, other CMS modules, operations and handover remain incomplete. No production flags or remote database changes.

### Journal migration conversion and source inventory — 2026-10-22
- Inspected the actual website journal snapshot: 15 articles, legacy English month dates, paragraph arrays and gallery-derived hero selection; no video fields in this snapshot.
- Added a read-only digest-bound migration planner preserving original source data/mappings and exact paragraph text, strict calendar conversion, legacy hero/visible-gallery selection, SEO handling and explicit image mapping requirements. Unsupported fields/video, attribution changes, duplicate URLs and unused mappings block draft eligibility.
- Added reproducible audit script and journal-migration-inventory.json: 15 articles, zero ready drafts without asset mappings, 62 errors/warnings. Four focused tests pass, including real snapshot paragraph/date checks and synthetic fidelity/failure cases. TypeScript passed after adding the planner.
- No content written or downloaded. Next: authenticated media-evidence review, atomic migration apply/recovery and client review UI. Live-source reconciliation, provider verification, imports, whole-site controls, operations and handover remain pending.

### Authenticated journal migration review — 2026-10-22
- Added read-only migration review endpoint and local migration 059 for caller-scoped image evidence. Review batches are bounded to 25 articles, require bearer/same-origin checks, and bind source/mappings/current evidence to website and locale.
- Evidence checks require article create permission and current site-scoped processed image availability. Mismatched/incomplete evidence fails closed, including retained hidden-gallery mappings. Apply remains explicitly disabled and rejected.
- Full CMS run passed 374 tests; an additional hidden-gallery API test passed afterward (five focused API tests total). TypeScript passed. Database tests cover create/site/anonymous restrictions and MIME/expiry failures; API tests cover digest changes, malformed evidence, request bounds/auth/origin and apply denial.
- Next: atomic journal migration persistence with digest-bound replay recovery, then client mappings/review UI. No remote migrations, content writes or production flag changes. Real-provider verification, live-source reconciliation, imports, whole-site editing and handover remain pending.

### Atomic journal migration saving and recovery — 2026-10-22
- Added local migration 060: actor/site-scoped batch receipts, exact-manifest idempotency, atomic draft creation, original source and mapping retention, import-key duplicate prevention, and locked current-media checks including hidden-gallery mappings. No publication or source overwrite occurs.
- Connected authenticated review/apply/status API. New applies require current reviewed evidence; completed requests recover before current-rights review and replay through exact SQL manifest matching. Missing receipts remain unconfirmed. Response receipts are structurally checked.
- Verified 379 CMS tests passing and TypeScript passing. New database tests prove all-or-nothing rollback, draft-only output, retained provenance, replay after rights revocation without overwriting newer edits, denied roles/site/anonymous access, and API-to-database review/save/recovery integration. Focused API tests cover stale review rejection and malformed recovery receipts.
- Next: client journal image mapping, draft review and persistent request recovery UI. Real-provider deployment/verification, live-source reconciliation, remaining Office imports, whole-site controls, operations and client handover remain pending. Overall estimate remains approximately 60% complete / 40% remaining; 2–4 weeks of focused work is a conditional planning estimate.
- No remote migrations, production flags or real website content changed. Previous status-only goal turn was no progress; this turn advances authoritative implementation and verification.

### Journal browser migration verification — 2026-10-22
- Added browser-safe source hashing and bounded journal snapshot/mapping parsing. Review verification matches actual API responses to source order, source digests, exact source content and image mappings; inconsistent readiness is rejected.
- Added receipt and recovery verification with account/website-scoped storage identifiers. Duplicate/substituted records, wrong request or source/review identities, malformed persisted state and content-bearing recovery data are rejected. Unconfirmed status is never treated as success. Asset mapping preserves exact legacy alt text/credit.
- Seven new focused tests pass, including actual API review responses and browser/server hash parity. Full CMS suite: 386 passed; TypeScript passed.
- The preceding goal turn made verified implementation progress. This turn adds the client contracts needed for safe UI wiring; the visible migration panel is still pending, so no browser-flow completion is claimed. Next: guided mapping/review/preview panel and persistent recovery interaction QA. Overall remains roughly 60% complete, with full-site coverage, provider verification, operations and handover outstanding. No real content or production configuration changed.

### Guided journal migration UI — 2026-10-22
- Connected upload, source image/library matching, exact credit/alt preservation, readable article previews, warning acknowledgment and draft saving in the Journal workspace. Mapping/locale edits invalidate prior review. Existing article controls and navigation dirty state reflect active migration work.
- Pending identifiers are persisted before apply, scoped to account and website. Ambiguous saves lock source changes, preserve same-request retry, survive reload for result lookup, and unlock only after a verified complete receipt. Storage failures block writes or keep recovery available.
- Synthetic browser flow passed at desktop 1280×900 and mobile 390×844 with zero page runtime errors. The first fixture omitted a JSON header; the API correctly rejected it, the fixture was corrected, and the complete flow passed. Browser plugin absent; regular Playwright used with an approved sandbox escalation for Chromium. Temporary fixture removed afterward.
- Full CMS suite: 386 passing. TypeScript passed. Production build validation recorded below when complete. Real-provider authorization and migration, concurrent-tab behavior, remaining Office content types, whole-site settings and client handover are still pending. Overall estimate remains approximately 60% complete; no live content or rollout flags changed.
- Production build completed successfully after removing the temporary QA route.

### Structured journal template contract and draft planner — 2026-10-22
- Added journal v1 portable tables for Pages, Content, Blocks, ListItems, Media and Sources, covering every current journal block type, scalar SEO field and CTA/button setting. Defined hard character limits and advisory word/SEO limits without truncation, with bounded rows and source-row findings.
- Added read-only full-draft planning for create/update. Updates require exact caller-supplied existing revision evidence and preserve omitted fields; complete collection replacement/clearing requires explicit intent. URLs/languages cannot change, orphan rows and unused block data are rejected, and any error returns no batch changes.
- Five new focused tests cover all block types, exact text/order, nested booleans/SEO/media, update preservation and clearing, stale identity/route errors, orphan lists, unsupported fields, unsafe links, limits and warnings. Full CMS suite: 391 passed. TypeScript passed.
- Previous goal turn was verified progress; this turn advances the client Word/Excel import requirement. Next: journal Office file parsers/download generators and round-trip checks, then current-evidence review, atomic apply/recovery and UI. Word/Excel journal uploads are not enabled yet. No remote content, deployment or publication changes. Overall estimate remains roughly 60% complete / 40% pending, with 2–4 weeks conditional on backend access and feedback.

### Journal Office file parsers — 2026-10-22
- Connected journal-specific metadata and table allowlists to the bounded shared XLSX/DOCX parser. Standard Word column tables and repeatable vertical record tables produce equivalent journal draft proposals with Excel.
- Fixed shared Word data-cell whitespace loss: only the parser-added terminal paragraph separator is removed; original spaces and explicit line breaks survive. Structural table/field headings still normalize. Existing generated journey and destination templates continue passing their parser checks.
- Four journal Office tests cover structured text/list fidelity, source digest/table provenance, wrong metadata/sections, formula/external-link/tracked-edit rejection and preserved diagnostic row numbers. Full CMS suite: 395 passed; TypeScript passed.
- Previous goal turn made verified progress; this turn completes the parser portion of journal Office imports. Downloadable journal templates, visual/native Office checks, authenticated evidence/apply/recovery and client upload UI remain next. Journal Office upload is not enabled. No production content/configuration changed; the full CMS goal remains incomplete at approximately 60% overall.

### Journal Office authenticated review/save/recovery — 2026-10-22
- Added current image evidence for journal import proposals, caller-scoped original-record resolution, file/review identity binding and a bounded Office upload endpoint. Review checks nested and preserved images as well as new media.
- Added local migration 061 for permission-scoped evidence, atomic create/update with revision/route/media rechecks, duplicate import-key prevention, audit records and actor/site-scoped recoverable receipts. Completed retries resolve before mutable record/media checks and cannot overwrite later edits.
- Seven API tests and three database tests added. Actual synthetic DOCX bytes completed API review, database draft creation and recovery; tests cover stale updates, rights revocation, denied actors, malformed receipts and whole-batch rollback. Full CMS suite: 405 passing; TypeScript passed after correcting the Next route wrapper signature.
- Previous goal turn was progress; this turn completes the local backend path for journal Office imports. Next: downloadable templates, rendered/native Office validation and client upload/recovery UI. Real-provider migrations/access verification and broader CMS scope remain pending. No remote migrations, publication or production flag changes; overall estimate remains approximately 60% complete with the full goal active.

### Client journal Word template — 2026-10-22
- Created a reproducible eight-page blank Word template with import identity, update/replacement instructions, field limits, and repeatable Pages/Content/Blocks/ListItems/Media/Sources forms. Added a separate populated parser fixture with exact multiline content.
- Used Documents skill and bundled Python/renderer. Inspected every final rendered page; removed inherited title rule and normalized caption styling before final QA. No clipping/overlap found. Native Word interaction and long filled-form pagination are still unverified.
- Download template produces no accidental draft; filled fixture produces one draft with preserved text and line break. Full CMS suite: 406 passing; TypeScript passed.
- Previous goal turn was verified progress; this turn completes the initial Word deliverable. Excel template, Office client upload/recovery UI, real-provider checks and full CMS handover remain pending. Overall estimate remains approximately 60% complete / 40% remaining, with the full goal active. No content imported to a real backend or published.

### Client journal Excel template — 2026-10-22
- Created a reproducible blank seven-sheet workbook and separate populated fixture using the Spreadsheets skill and bundled artifact-tool runtime. Included instructions, scalar/column limits, dropdowns, numeric order validation, frozen headings/identities and amber input cells.
- Rendered and visually inspected every sheet. A disposable 201-character title visibly triggered red warning formatting. Export checks found 11 validation rules, 46 conditional length rules and no cell formulas. Native Excel UI behavior remains unverified.
- Blank workbook imports zero content rows; populated fixture produces one valid article proposal preserving multiline text. Full-suite result recorded below. The previous goal turn was verified progress; this turn completes the initial Excel artifact.
- Next: journal Office client upload/preview/recovery panel, then real-provider and client verification. Whole-site controls, operations and handover remain incomplete. Overall estimate remains roughly 60% complete / 40% pending; no real content was imported or published.
- Full CMS suite: 407 tests passed.

### Journal Office client integration — verification recorded 2026-10-22
- Connected template downloads, upload, file-bound review, readable preview, replacement acknowledgment and draft apply in the Journal workspace. Account/site-scoped identifiers are persisted before writes; ambiguous saves remain locked across reload until a matching receipt confirms completion.
- Synthetic desktop/mobile browser checks passed for both formats, interrupted saving, unconfirmed/complete recovery and downloads, with no runtime errors. Temporary QA route removed. The prior status turn verified 410 passing tests and successful production build; TypeScript also passed during implementation.
- Real-provider execution and native Office/client acceptance remain pending. No production data or flags changed.

### Canonical-aware destination and journal sitemaps — 2026-10-22
- Previous turn was a status verification rather than implementation progress. This turn closes a concrete SEO delivery gap: published destination/journal catalogues now carry the published canonical URL, and sitemap projection excludes URLs whose canonical points elsewhere, even with explicit inclusion. Self-canonical URLs remain eligible; noindex and explicit exclusion still win. Internal destination discovery remains available.
- Added local migration 062, preserving existing publication/media/website filtering and function permissions. Canonical fields are required in CMS catalogue responses, so deploy migration 062 before the matching application code; missing fields fail closed rather than silently ignoring a client's canonical setting. Legacy destination summaries have no canonical override unless one is supplied.
- Two new regression tests cover same-origin alternate paths, external canonicals, query variants, normalized self-canonical URLs, invalid canonical inputs and discovery-to-sitemap propagation. Database tests verify the published canonical and that an unpublished destination edit cannot leak its canonical. Full CMS suite: 412 passing. TypeScript passed. Production build result follows.
- Remaining: website-wide SEO defaults and consumers, journey SEO parity, all remaining page controls/content modules, provider migration, operations and client handover. Full goal remains active; overall estimate remains approximately 60% complete / 40% pending. No remote migration or deployment performed.
- Production build passed after the canonical delivery changes.

### Published SEO settings delivery boundary — 2026-10-22
- Previous goal turn made verified implementation progress. Added migration 063 with an English, website-scoped reader for the immutable published settings SEO projection. Only title template, description, indexing and sharing-image fields are exposed; arbitrary/private fields are stripped. No draft fallback or implicit locale fallback exists.
- Sharing-image delivery now recognizes this published projection. It checks processed WebP availability, rights, expiry and archival state; unrelated settings images remain private. Missing or unavailable configured images make the projection unavailable rather than exposing a stale asset. Existing media delivery tests continue to pass.
- Added strict application reader and anonymous RPC configuration with website/language binding. Refactored SEO resolution to accept validated SEO defaults directly, preserving the existing draft-settings API. Canonical identity comparison now normalizes equivalent HTTPS URLs consistently with sitemap delivery.
- Three application tests and one actual database scenario added: published-vs-draft isolation, private-field stripping, website/language isolation, sharing media access, revoked/expired rights, malformed data, RPC identity, default inheritance and noindex precedence. Full CMS suite: 416 passing; TypeScript passed.
- This is the delivery boundary, not an enabled website feature. Settings publication validation remains disabled; public page metadata/layout/sitemap consumers, remaining shared controls, provider rollout, operations and client handover remain pending. No remote migrations or production changes performed. Overall remains approximately 60% complete / 40% pending.

### Actionable settings validation and publication-time image checks — 2026-10-22
- Previous goal turn made verified implementation progress. Replaced the generic unsupported-type settings result with strict schema, route/language, shared-copy, enabled-message, search-content and footer-group checks. Menu/featured references explicitly require publication-aware evidence. Missing/duplicate/conflicting image evidence is rejected at every nested usage.
- Kept an explicit settings delivery blocker: complete draft fields alone cannot authorize publication while shared consumers and reference delivery are incomplete. No settings publication policy has been enabled.
- Added migration 064 to require processed WebP for settings media in advisory evidence, whole-record availability and the publication trigger under its media locks. The database scenario confirms changing an image to JPEG makes evidence unavailable and prevents publication before restoring the processed format.
- Four new validation tests pass. Full CMS suite: 420 passing; TypeScript passed. The database suite was rerun after adding the publication-time MIME regression and passed. No remote migration, publication or deployment performed.
- Next: publication-aware navigation/reference delivery and shared website consumers, then settings workflow enablement. Remaining full-site modules, provider rollout, operations and client handover keep the overall goal active at approximately 60% complete / 40% remaining.

### Published navigation resolution — 2026-10-22
- Previous turn made verified implementation progress. Added migration 065 for website/English-scoped published navigation reads with explicit scalar/nested allowlists. It returns no draft fallback and strips unknown/private menu fields. Referenced records resolve only through existing journey, destination and journal public readers; unsupported types, other websites/languages and unpublished targets return unavailable evidence.
- Added strict application projection with exact reference-set verification, identity/type/path checks, ordered hierarchy, locale/region/time visibility, unavailable-target subtree suppression and empty-group pruning. Featured references are emitted only when available. Anonymous transport is bound to the configured website.
- Four application tests plus an actual database scenario cover publication/draft isolation, field projection, missing/withdrawn targets, evidence mismatch, wrong routes/types, visibility boundaries and RPC arguments. Full CMS suite: 425 passing; TypeScript passed.
- Navigation publication and public header wiring remain disabled. Direct URL items retain the existing safe URL schema but do not yet get route-existence checks; featured summaries/presentation and remaining page types still need consumers. No deployment, remote migration or production flags changed. Overall remains approximately 60% complete / 40% pending, with the full goal active.

### Published menu header consumer — 2026-10-22
- Previous goal turn made verified progress. Connected the projected menu to the existing header dialog through an opt-in server wrapper. CMS menus render ordered nested groups, descriptions, record/direct links, featured published titles and new-tab behavior. The existing focus trap, Escape handling, focus restoration and scroll lock remain in use. Header context labels derive from CMS links when configured.
- Extended migration 065/reference projection with titles sourced from target published revisions for featured links. Invalid/missing titles make a reference unavailable. This migration has not been applied remotely.
- Added CMS_NAVIGATION_DELIVERY_ENABLED (false by default) and CMS_MAIN_NAVIGATION_ID. Disabled mode makes no backend read. Enabled mode requires a published configured record and propagates failure rather than silently restoring legacy menu content. Publication workflows remain disabled until their validation gates are complete. Brand, CTA and other shared header settings remain separate pending work.
- Full CMS suite: 426 passing; TypeScript passed. Synthetic browser flow passed at 1280×900 and 390×844: hierarchy, featured links, safe new-tab attributes, focus containment, Escape/restoration and navigation. No page/console errors. Browser plugin unavailable; Playwright used with approved escalation after sandbox Chromium MachPort denial. The existing server already owned port 3001; no duplicate server was started. Screenshots in /private/tmp/cms-header-{desktop,mobile}.png were inspected. Temporary QA route removed.
- Production build result follows. Real provider, full settings publication, region-aware request context, other browsers and client acceptance remain pending. Overall estimate remains approximately 60%; no production flags or content changed.
- Production build passed after removing the synthetic QA route.

### Navigation draft reference verification — 2026-10-22
- Previous goal turn made verified implementation progress. Extracted the published navigation reference resolver into an internal SQL helper and reused it for authorized draft-revision checks in migration 066. Another website, inaccessible menu or wrong record/revision pairing cannot return draft evidence; anonymous callers cannot invoke the helper or draft RPC.
- Added actionable navigation validation: schema/hierarchy, null route, English locale, nonempty menu/groups, unique featured targets, exact available published reference evidence, matching type/language/path and unsupported internal URL verification. Hidden items are checked too. Final publication remains explicitly blocked until database release-time rechecks, internal URL inventory checks and workflow enablement are implemented.
- Connected the advisory editor API to caller-scoped reference evidence after current-revision verification. Also corrected settings advisory validation to fetch nested media evidence and preserve the stored locale rather than incorrectly reporting missing evidence/language.
- Three validator tests, two API tests and one database scenario added. Full CMS suite: 432 passing; TypeScript passed. Tests cover inaccessible/withdrawn targets, stale revision rejection before evidence lookup, exact RPC scope and settings media evidence. No remote migrations, production switches or publication performed.
- Remaining next: navigation release-time checks and route inventory, trusted validation policy and review/publish controls. Shared settings, remaining content modules, provider setup, operations and handover remain outstanding; full goal remains active at approximately 60% complete.

### Navigation publication reference guard — 2026-10-22
- Previous goal turn made verified progress. Migration 067 now guards publication-pointer changes and published navigation route/language changes. It locks direct target records in identity order, checks their published revision/type/language/route, locks their referenced media and rechecks processed format/current rights. It then refreshes public reference evidence and checks declared target types.
- Unpublication remains allowed. A rejected release leaves the previous published menu revision intact. No navigation validation policy or client publish control has been enabled; direct URL inventory checks and trusted workflow integration remain required.
- Updated the public navigation database test to require a target publication before a menu may be released. Added a regression scenario where valid earlier evidence becomes stale through withdrawal, rights revocation or MIME change; each release is rejected. It also covers type mismatch and published locale change, preserving the old publication pointer.
- Full CMS suite: 433 passing; TypeScript passed. These are isolated sequential transaction tests, not a live-provider concurrent-session rehearsal. Transitive destination dependency concurrency still requires a fuller rehearsal; ongoing public reads continue checking deliverability. No production migration or content changes performed.
- Next: internal-link inventory/evidence, trusted navigation validation and publication workflow. Shared settings/remaining modules, provider rollout, operations and client acceptance remain incomplete. Overall approximately 60% complete; full goal stays active.

### Fixed public-route verification for menu URLs — 2026-10-22
- Previous goal turn made verified implementation progress. Inventoried 22 fixed public page routes from actual app sources and added a shared application route policy. Draft validation and public menu projection now reject/hide unknown relative paths, administrative/API surfaces and unverified anchors. Dynamic page links require published record references so withdrawal is reflected.
- Added deployment-owned SQL route inventory and a publication URL trigger in migration 068. Editors/anonymous callers cannot mutate/read the table directly. Relative routes are rechecked under a share lock at release; query strings retain an existing route's identity. HTTPS external URLs retain syntax checks only; no network reachability is claimed.
- Three route/application tests plus a database scenario added. Source files must exist for each fixed path and SQL inventory must match the application inventory. Full CMS suite: 437 passing; TypeScript passed. No remote changes or publication flags enabled.
- Remaining before trusted workflow enablement: absolute same-site origin normalization (HTTPS URLs currently use external-link treatment), verified anchor handling and broader dynamic/legacy route support. Menu publishing controls, shared settings, remaining content modules, provider rollout and handover remain pending. Full goal stays active at roughly 60% complete.

### Owned-domain menu URLs and verified layout anchors — 2026-10-22
- Previous goal turn made verified progress. Extended application URL policy so absolute Safari Crafters/www links use the fixed-route inventory, including hostname case, trailing dot and explicit default HTTPS port. Other owned subdomains and nonstandard owned-domain ports remain unverified. Encoded/credentialed authorities cannot bypass classification.
- Added support for the shared `main` anchor, verified against the root layout, on fixed routes and as `#main`. Other anchors remain blocked pending an explicit inventory. External HTTPS links receive syntax checks, not a reachability claim.
- Migration 069 updates the database URL release guard with matching owned-domain and anchor handling, locking the route inventory during release. Added application checks and database/application parity cases; expanded actual release tests for accepted/rejected absolute URLs and anchors.
- First run caught an ambiguous SQL local/column name; renamed it and reran. Full CMS suite: 439 passing; TypeScript passed. Database suite passed again after expanded trigger assertions. No real backend migration, publication or deployment performed.
- Remaining: trusted navigation validation policy, queue evidence and client review/publish controls; other shared settings, remaining content modules, operations and client handover. Non-Safari custom domains require deployment policy updates. Overall remains approximately 60% complete with the full goal active.

### Trusted navigation validation and publication policy — 2026-10-22
- Previous goal turn made verified implementation progress. Promoted complete menu checks to navigation-1, connected navigation reference evidence through direct and queued trusted workers, and added local migration 070 with the matching validation policy. Advisory editor results still explicitly deny publication authorization; only worker receipts qualify the approved revision.
- The database workflow test exercises separate author/approver/publisher identities: self-approval and forged editor receipts fail; publishing without validation fails; a validated menu still cannot publish after a target is withdrawn. Restoring the target permits release. An edited menu with an admin URL receives invalid findings and cannot publish using an older valid receipt.
- Added queue tests for available/missing/unavailable/malformed reference evidence and unsupported language. Authorized unsupported/malformed draft evidence now returns an empty array for actionable invalid findings rather than an endless retry; missing/inaccessible record identity still fails closed.
- Five new tests added in total. Full CMS suite: 444 passing; TypeScript passed. Migration policy is local only; no provider migration, real menu publication or rollout flag change occurred.
- Next: client-facing navigation review/validation/publish/history controls and browser acceptance. Remaining shared settings, content modules, real-provider setup, operations and handover keep the full goal incomplete at roughly 60% overall.

### Client menu review, publication and history controls — 2026-10-22
- Previous goal turn made verified progress. Connected saved-content checks, trusted worker requests, review/approval/changes-requested actions, revision-bound publication/withdrawal confirmations and revision-history restoration in MenusWorkspace. Unsaved edits disable workflow actions; restoring creates a draft and does not replace the live menu. Responses are checked for the requested navigation record/type/path before loading.
- Added MenuWorkflow using the existing revision/permission confirmation reset pattern. Publication messaging explains that visitor delivery requires selecting this menu in the configured rollout. Separate reviewer/publisher authorization remains database-enforced.
- Synthetic browser QA passed at desktop 1280×900 and mobile 390×844: check/request, cancel/confirm publication, unsaved-change blocking, save, submit/approve, restore and withdraw. First run found a React key collision when synthetic record/revision IDs matched; component keys now include their purpose and the rerun had no page/console errors. Browser plugin absent; Playwright used with approved escalation. Screenshots in /private/tmp/menu-workflow-{desktop,mobile}.png inspected; temporary fixture removed.
- Full suite: 444 passing; TypeScript passed. Production build result follows. Transport was simulated for UI QA, backed by separate actual database workflow tests; real-provider client acceptance remains pending. No remote migration or live publication performed.
- Next: complete remaining navigation visibility/featured editing controls and shared settings consumers. Full-site modules, provider/operations work and handover remain incomplete; overall approximately 60% complete.
- Production build passed after removing the synthetic menu workflow route.

### Client menu visibility and featured-content fields — 2026-10-22
- Previous goal turn made verified progress. Added editable start/end timestamps with explicit timezone guidance and inline date-range validation, per-language/region rows with explicit removal, and mixed-type featured content selection. Existing timestamps retain their exact offset text until edited; clearing removes the limit deliberately.
- Featured selections resolve labels through caller-scoped journey/destination/journal reference APIs with exact identity/order checks. Added reorder/remove controls, six-record limit and duplicate-selection feedback. Failed resolution preserves selections. Region guidance explains that restricted items remain hidden until a matching visitor region is supplied by the website.
- Synthetic desktop/mobile browser flow passed: invalid range correction, timezone preservation, language addition, region removal, featured selection/duplicate rejection/removal, explicit date clearing and preservation of the item's destination. No page/console errors. Browser plugin unavailable; approved Playwright escalation used. Screenshots in /private/tmp/menu-rules-{desktop,mobile}.png; mobile screenshot inspected. Temporary QA route removed. Mixed-type reordering and real-provider acceptance remain unverified by this browser fixture.
- Full suite: 444 passing. TypeScript/build results follow. No production changes. Remaining: shared settings consumers, other content modules, provider setup, operational checks and client handover; full goal stays active at approximately 60% complete.
- TypeScript and production build passed after removing the QA fixture.

### Published shared-settings contract — 2026-10-22
- Previous goal turn made verified progress. Added migration 071 with a private bounded recursive field projector and an explicit deployment-owned settings shape. Published branding, contact, header/footer, messages, cookies, SEO, search and fallback image fields are projected; arbitrary nested additions are omitted and structural mismatches fail closed.
- Added website/English-scoped published settings reader and strict application response validation. Missing publication remains null; errors never substitute draft/default settings. Configured public transport refuses another website before calling the backend.
- Public media authorization now covers images actually present in the filtered published settings, including branding/footer assets, while unknown private image properties remain excluded. The full settings payload is unavailable when a referenced processed image loses current rights. Settings publication remains disabled until consumers and reference validation are complete.
- Four tests added: application identity/schema/transport, database published-vs-draft and media isolation, and a complete optional-field roundtrip with private objects injected at every populated nesting level. Full CMS suite: 448 passing; TypeScript passed. No remote migration, deployment or production setting changes.
- Next: shared header/footer consumers and reference-aware settings publication checks. Other content modules, provider/operations work and handover remain outstanding. Overall approximately 60% complete with the full goal active.

### Published settings footer consumer — 2026-10-22
- Previous goal turn made verified progress. Added an opt-in server footer consumer for published branding, contact email/phone/addresses, link groups, social profiles, footer marks, legal links, copyright and disclaimer. Image paths use the existing published media endpoint; new-window links include safe rel attributes. Narrow footer data is selected from the validated settings response.
- Added optional footer CTA fields, their client message editor, draft validation and migration 072 projection support. Older settings remain valid. The CMS footer renders only configured CTA text/button, so legacy marketing copy is not injected into the new consumer.
- CMS_FOOTER_DELIVERY_ENABLED defaults false. Disabled delivery performs no settings read; enabled delivery fails if the published settings are missing instead of substituting draft or legacy content. Settings publication policy remains disabled pending remaining consumers/reference checks.
- Full suite: 450 passing; TypeScript passed. Synthetic browser QA passed at 1280×900 and 390×844 for text/contact/social links, live CTA edit/toggle, internal navigation and footer overflow bounds. Initial locator failures were QA-only (nested footer landmark and select-label matching); corrected script reran with no page/console errors. Desktop/mobile screenshots in /private/tmp/cms-footer-{desktop,mobile}.png inspected. Browser plugin unavailable; approved Playwright escalation used. Temporary fixture removed.
- Production build result follows. Real-provider data, logo/mark image variants and client acceptance still need browser verification. No deployment or rollout flag changed. Shared header/settings consumers, remaining modules, operational checks and handover remain pending; full goal active at roughly 60% overall.
- Production build passed after removing the footer QA route.

### Published header settings and reference assembly — 2026-10-22
- Previous turn made verified implementation progress. Migration 073 assembles the immutable published settings revision with main, optional utility/mobile menus and current featured-content evidence in one website/language-scoped read. A configured but unavailable menu fails the assembly; a missing mobile-menu configuration explicitly uses the main menu at application projection time.
- Added strict header projection with settings/menu identity checks, exact featured reference sets, supported route/type checks, ordered featured titles/links and suppression of unavailable featured records. Only header/brand presentation data reaches the resulting model; contact/footer settings are not included.
- Added a disabled-by-default header-settings loader. It is not wired to the visible Header yet and does not enable deployment. Missing configuration/publication never falls back to drafts or unrelated menus.
- Three application tests plus one database scenario added. Full CMS suite: 454 passing; TypeScript passed. Coverage includes draft isolation, unpublished/withdrawn configured menus, separate mobile selection, unavailable features, identity substitution and anonymous RPC arguments.
- Next: apply this model to visible branding, menu variants, utility/mobile selection and CTA, then browser QA and shared-settings publication validation. Full goal remains incomplete, roughly 60% overall; no remote changes performed.

### Published branding and header settings consumer — 2026-10-22
- Previous turn made verified progress. SiteHeader now uses the published header model when CMS_HEADER_SETTINGS_ENABLED is true, superseding the standalone menu source. The switch defaults false; existing navigation rollout still works when shared-header settings are disabled.
- Connected brand name/logo/mobile logo/tagline, configured CTA/new-window attributes, main/mobile menus, utility menu, featured links, standard/transparent/compact presentation and sticky behavior. Header context labels use published brand/menu content. Missing CTA does not inject legacy button copy. Language-selector activation now fails explicitly until localized route delivery exists and produces a settings validation finding.
- Synthetic browser QA passed at 1280×900 and 390×844: brand/CTA attributes, different desktop/mobile menus, utility/featured links, focus containment/Escape restoration, compact class and non-sticky positioning, and navigation. No page/console errors. Desktop/mobile screenshots in /private/tmp/header-settings-{desktop,mobile}.png inspected. Browser plugin absent; approved Playwright escalation used; temporary fixture removed.
- Full CMS suite: 455 passing; TypeScript passed. Production build result follows. Logo image variants, transparent styling on actual hero routes, region resolution and real-provider acceptance remain unverified in this fixture. No deployment or rollout flag changed.
- Remaining: messages/cookies/search/error settings consumers, SEO/default metadata integration, shared-settings reference validation and publication workflow, other modules, provider setup and operational handover. Full goal active at approximately 60% overall.
- Production build passed after removing the header settings QA route.

### Published announcement and floating CTA consumers — 2026-10-22
- Prior status-only goal turn was no progress; revalidated current files and completed the next available implementation. Added a disabled-by-default published message loader and root-layout consumer, selecting only announcement/sticky CTA settings. Missing publication and wrong-site responses fail closed; disabled rollout performs no backend call.
- Added public announcement copy/link and floating CTA with mobile safe-area spacing, focus styles, safe new-window attributes and header/menu overlay precedence. Promotional controls are suppressed on CMS/Studio/preview paths. No existing floating contact control was found to duplicate.
- Synthetic QA at 127.0.0.1:3001/messages-qa passed at 1280×900 and 390×844: page identity/content, announcement/link attributes, both controls toggling off/on, CTA navigation and no horizontal overflow or page/console errors. Browser plugin unavailable; approved Playwright fallback used. Screenshots /private/tmp/messages-{desktop,mobile}.png inspected; temporary fixture removed.
- Full CMS suite: 456 passing; TypeScript passed. Production build result recorded below. Actual-provider acceptance, long-copy/other-route layouts and overlay/keyboard coexistence remain unverified. No remote migration, publication or rollout switch changed.
- Next: remaining cookies/search/errors/SEO consumers and shared-settings reference validation/publication workflow. Remaining modules, operations, migration and client handover keep the full goal active at approximately 60% overall, with the same conditional 2–4 week planning estimate.
- Production build passed after removing the QA fixture.

### Published search settings consumer — 2026-10-22
- Previous goal turn made verified implementation progress. Connected opt-in published search settings to the public route and search component: configured placeholder/empty copy, enabled state and collection selection. Disabled search returns not-found before catalogue reads; deselected types are not loaded. Client filters also enforce selected types and hide excluded category controls.
- Added a shared pure category policy, separate from server transport. Unsupported page/product/project collections produce explicit draft findings and reader failures until their sources exist. These modules remain required; no scope reduction or publication-policy enablement occurred.
- Added two policy/transport tests. Updated the complete-settings validation fixture to select supported types after the first test run correctly exposed its unsupported page selection. Full CMS suite: 458 passing; TypeScript passed before the temporary browser fixture. Production build result follows.
- Synthetic browser QA at 127.0.0.1:3001/search-settings-qa passed desktop 1280×900 and mobile 390×844: identity, configured copy, excluded collection/results, category filtering, no-match wording, clear filters, disabled/re-enabled control and result navigation. No page/console errors or horizontal overflow. Browser plugin unavailable; approved Playwright fallback used. Screenshots /private/tmp/search-settings-{desktop,mobile}.png inspected; fixture removed. Live-provider route disabling and all real catalogue combinations still require acceptance testing.
- Next: cookies/error/SEO consumers, settings reference verification and publication workflow; unsupported search collections and remaining modules, provider rollout, operations and handover remain outstanding. Full goal active, approximately 60% overall; conditional 2–4 week estimate unchanged. No remote changes or rollout flags enabled.
- Production build passed, including TypeScript, after removing the QA fixture.

### Published SEO defaults for migrated detail routes — 2026-10-22
- Previous goal turn made verified progress. Added opt-in narrow published SEO loader and shared Next.js metadata adapter, connected CMS journey/destination/journal detail branches, and applied website noindex to the sitemap before catalogue reads. Missing publication or identity mismatch fails; disabled rollout makes no settings call.
- Absolute titles prevent double application of parent title templates. Page SEO copy/canonical/sharing overrides are retained; website noindex overrides a page's index request. Published sharing image URLs are absolute and article type/date/authors remain present.
- Added three tests for metadata precedence/image URLs, destination/journal consumers and loader identity/offline behavior. Full CMS suite: 461 passing; TypeScript passed; production build result follows. Diff whitespace checks passed for edited route files. No live backend metadata or browser-head acceptance claimed.
- Remaining: root/static/legacy/country metadata consumers and richer journey SEO fields before declaring sitewide coverage; cookies/errors and settings reference/publication workflow, remaining modules, provider migration, operations and client handover. Full goal remains active at roughly 60% overall. All rollout flags remain off; no remote changes performed.
- Production build passed, including TypeScript.

### Cookie preferences and optional analytics enforcement — 2026-10-22
- Previous goal turn made verified progress. Found existing funnel events had no consent check. Added versioned expiring preferences, explicit accept/reject, Do Not Track enforcement, strict malformed/future/expired rejection and scoped analytics-session cleanup. Storage failures block tracking for the current visit and are reported rather than represented as saved choices.
- Added opt-in published cookie-copy reader and root preference controls with policy link, equal accept/reject actions and reopening. Default working controls are shown if analytics is enabled before CMS settings rollout; otherwise flags off preserve the existing view. Public controls are suppressed on CMS/Studio/preview paths.
- Added four tests covering schema/expiry, storage cleanup, actual mocked funnel sends before/after consent/revocation/DNT/storage failure and published copy transport isolation. Full CMS suite: 465 passing; TypeScript passed. Production build result follows.
- Synthetic browser QA at 127.0.0.1:3001/cookie-settings-qa passed desktop 1280×900 and mobile 390×844: meaningful page identity, initial prompt, rejection, persistence after reload, reopening, acceptance, policy navigation, no overflow or page/console errors. Browser plugin unavailable; approved Playwright fallback used. Screenshots /private/tmp/cookie-settings-{desktop,mobile}.png inspected; fixture removed.
- Remaining acceptance includes provider wording, cross-tab/restart flows, keyboard/screen-reader behavior and third-party integrations. The raw event endpoint is not a consent-authentication boundary. Settings publication, error/remaining SEO consumers, other modules, migration, operations and client handover remain incomplete. Goal active, roughly 60% overall; no remote changes or rollout flags enabled.
- Production build passed, including TypeScript.

### Settings reference evidence and shared-link preparation checks — 2026-10-22
- Resumed the live check process after user status questions; it completed successfully. The status-only exchange made no implementation progress, but the prior reference implementation was revalidated and extended here.
- Migration 074 adds authorized settings reference evidence bound to website, record and revision, using actual published menu/featured readers. Wired it through editor advisory checks, strict validation input and both trusted worker paths. Current publication, type and language evidence replaces unconditional reference warnings; generic settings-delivery blocker remains.
- First run exposed an unaliased SQL result column and an outdated advisory test stub; corrected both and reran successfully. Database tests cover anonymous denial, unauthorized caller, cross-site/missing revision, withdrawn menu/feature, current published evidence and worker-input schema.
- Added shared link checks using the existing navigation URL policy. Admin/unknown paths and unverified anchors receive field-level findings. Added queue evidence tests proving absent/unavailable references cannot pass and malformed evidence retries without claiming validation success.
- Final full CMS suite: 470 passing; TypeScript and diff whitespace checks passed. Production build passed for the reference wiring before the final link-policy/queue-test additions. No rendered UI change; no browser QA claimed. No remote migration, publication-policy enablement or rollout switch changes.
- Next: publish-time reference rechecks/locking, remaining settings consumers and publication workflow. Remaining content modules, provider migration, operations and client acceptance/handover keep the full goal active. Overall estimate remains approximately 60%, with 2–4 weeks provisional rather than a delivery commitment.

### Settings publication direct-reference and URL guard — 2026-10-22
- Previous turn made verified progress. Added migration 075: publication-time checks for settings route/locale, bounded UUID references, direct-record locks in identity order, current configured menu/featured availability, self-reference rejection and shared URL verification under the route-inventory lock. Withdrawals remain allowed; no settings validation policy was enabled.
- Updated the public-header database fixture to establish valid references before settings release, and asserted publication fails while its menu/featured target is unavailable. Added a release scenario where earlier valid evidence becomes stale after menu withdrawal, restoring publication permits release, and wrong featured type/self-reference/admin URL/unknown anchor/locale mutation all fail. A valid policy link publishes and the settings can be withdrawn. Tests explicitly verify settings policy is still absent.
- Full CMS suite: 471 passing; database tests and diff whitespace checks passed. SQL/test-only change; no new frontend build or browser QA needed. No real-provider migration, publication or rollout flag changes.
- Remaining release work includes transitive reference/media concurrency verification, settings completeness and remaining consumers, and client publishing workflow. Other modules, migration, operations and handover remain outstanding. Full goal active at approximately 60% overall; the 2–4 week estimate remains conditional.

### Published missing-page message — 2026-10-22
- Previous goal turn made verified progress. Connected an opt-in published error-message reader and reusable missing-page surface to app/not-found.tsx. Configured title/body/button replace built-in copy; multiline text and safe new-window attributes are preserved. Missing/disabled/invalid/unavailable settings use the existing fallback; gateway reads have an additional 1.5-second deadline.
- Added two tests covering disabled no-network behavior, valid message selection, identity/language rejection, blank/inactive copy, backend/configuration failures and actual abort-timeout fallback. Full CMS suite: 473 passing; TypeScript passed. Production build result follows.
- Synthetic browser QA at 127.0.0.1:3001/error-settings-qa passed desktop 1280×900 and mobile 390×844: identity, configured copy, toggle back to fallback, recovery navigation and no overflow/runtime errors. Direct navigation to /nonexistent-cms-error-qa returned HTTP 404 and fallback copy. Browser plugin unavailable; approved Playwright fallback used. Screenshots /private/tmp/error-settings-{desktop,mobile}.png inspected; temporary fixture removed.
- Real-provider/custom published 404 and production streaming behavior remain unverified. Server-error/maintenance settings and root-layout failure recovery remain pending, alongside remaining SEO, settings publication, content modules, migration, operations and handover. Goal remains active at roughly 60% overall. No remote changes or rollout flags enabled.
- Production build passed, including TypeScript, after removing the fixture.

### Published server-error copy with immediate fallback — 2026-10-22
- Previous goal turn made verified progress. Added a narrow same-origin no-store public server-error message endpoint and wired app/error.tsx to an immediate fallback view that asynchronously adopts validated published copy. Retry remains independent of settings; the optional client-configured recovery link uses safe new-window attributes.
- Client message fetch omits credentials, rejects redirects/invalid copy and aborts after 2.5 seconds/on unmount. It sends no exception details. The existing bounded server settings reader returns null on unavailable copy; no draft fallback.
- Added two client-contract tests covering accepted copy, disabled/blank/extra-field/unsafe-link responses, HTTP/JSON/network failure and cancellation. Full CMS suite: 475 passing; TypeScript passed. Production build result follows.
- Browser QA at 127.0.0.1:3001/server-error-qa passed desktop 1280×900 and mobile 390×844: page identity, configured text, reset callback, recovery navigation, default fallback and no overflow/runtime errors. Verified the real endpoint returns null/no-store with rollout disabled; configured copy used route interception. Browser plugin unavailable; approved Playwright fallback used. Screenshots /private/tmp/server-error-{desktop,mobile}.png inspected; temporary fixture removed.
- Pending: actual production error-boundary/retry acceptance, root-layout error fallback, maintenance routing and provider-sourced messages. Remaining SEO/settings publication, other modules, migration, operations and handover keep the full goal active at roughly 60%. No remote changes or rollout switches enabled.
- Production build passed, including TypeScript, after removing the fixture.

### Published maintenance response and request interception — 2026-10-22
- Previous goal turn made verified progress. Added an off-by-default Next.js proxy that checks published maintenance settings for visitor GET/HEAD requests, preserving admin/CMS/API/assets access. Standalone escaped HTML returns 503, retry interval, no-store/noindex and restrictive CSP; it does not depend on the shared layout. Missing/unavailable settings fail open with a bounded settings read.
- Added three tests for route/method exemptions, safe HTML/link serialization and 503/HEAD headers, plus published settings identity/offline/disabled behavior. Full CMS suite: 478 passing; TypeScript passed. Production build result follows.
- Browser QA at 127.0.0.1:3001/maintenance-qa passed desktop 1280×900 and mobile 390×844: title/content, HTTP 503/retry header, keyboard focus/link, no overflow/runtime errors, HEAD body and ordinary contact route with rollout off. First request preceded route discovery and returned 404; rerun passed without code changes. Browser plugin unavailable; approved Playwright fallback used. Screenshots /private/tmp/maintenance-{desktop,mobile}.png inspected; fixture removed.
- Actual enabled provider/proxy integration, RSC navigation, redirect/CDN behavior and latency remain unverified. Internal visitor links remain subject to maintenance; an external support link is needed for recovery during activation. This does not disable APIs or provide access control. Root-layout recovery, remaining SEO/settings publication, other modules, migration, operations and handover remain pending; full goal active at roughly 60%. No remote changes or rollout flag activation.
- Production build passed, including the Next.js proxy and TypeScript, after removing the QA fixture.

### Root-layout emergency recovery — 2026-10-22
- Resumed the recovery work after the user requested the CMS link. The preceding user-facing link exchange did not complete the implementation; revalidated current files and resumed the failed browser check.
- Added the missing global error boundary with standalone HTML/body, noindex metadata and a dependency-free recovery view. Inline styles and plain links avoid relying on a broken layout/router/CMS; retry uses the framework reset callback, with home and support email alternatives.
- Investigated the earlier no-CSS overflow: six hidden navigation images became full-width after stylesheet disabling. Removing the unrelated hidden menu from the isolated fixture resolved it; no recovery-component overflow was found. Desktop 1280×900/mobile 390×844 reruns passed no-CSS layout, retry callback, home navigation and mail link checks with no page errors. Browser plugin unavailable; approved Playwright fallback used. Screenshots /private/tmp/global-recovery-{desktop,mobile}.png inspected; fixture removed. Screenshots retain the fixture's skip link, which is not part of the global boundary.
- Production build result follows. This was a rendered fallback change; no new unit tests or repeated full CMS suite were added (latest full suite remains 478 passing). Actual production root exception capture/reset and assistive-technology acceptance remain pending.
- Remaining work includes sitewide SEO completion, settings publication and reference concurrency coverage, remaining modules, provider migration, operations and handover. Full goal remains active at roughly 60%; no deployment or rollout flag changes.
- Production build passed, including TypeScript, after removing the fixture.

### Shared root SEO defaults and noindex response header — 2026-10-22
- Previous turn made verified progress. Replaced fixed root metadata export with the opt-in published SEO loader and a metadata adapter preserving site identity/base/canonical fields. Shared title template, description and sharing image now flow to inheriting pages. Added website noindex HTTP header on visitor proxy responses so child robots metadata cannot relax it; no positive indexing header is emitted. SEO/maintenance reads run in parallel.
- Added two tests for preserved metadata, template/default image behavior, noindex metadata/header and unchanged restrictions. Full CMS suite: 480 passing; TypeScript passed. Initial production build passed; clean build after fixture removal follows.
- Browser metadata QA first expected a same-segment layout title template to apply; both development and a temporary production server showed the parent template. Corrected the fixture to a child route, matching root-to-child inheritance. Browser then verified exact title 'Forest | Field Notes', page-description override, shared social description and noindex. No rendered-page changes/screenshots were needed. Browser plugin unavailable; approved Playwright fallback used. Temporary fixture removed and temporary production server on 3002 stopped; existing development server on 3001 preserved.
- Real-provider enabled headers, latency/failure handling and deployment/CDN behavior remain unverified. Existing page-specific overrides are not automatically editable; remaining metadata/content migration, settings publication, other modules, operations and handover remain pending. Goal active at roughly 60%; no remote changes or rollout activation.
- Clean production build passed, including TypeScript, after removing the fixture.

### Client-visible settings readiness checks — 2026-10-22
- Previous turn made verified progress. Connected SettingsWorkspace to the shared ValidationPanel, scoped by site/locale/record/revision. Clients can check a saved settings draft and see current field/reference/link/release findings; unsaved edits disable checking. No trusted-check request or publish controls were enabled.
- Added settings response type/path/locale identity checks and a load-generation guard against old requests overwriting newer loads. These are client consistency checks; backend authorization remains authoritative.
- Browser QA at 127.0.0.1:3001/settings-checks-qa passed desktop 1280×900/mobile 390×844 using actual SettingsWorkspace and validation logic with simulated transport: saved findings, release blocker, editing disables checks, no publication/trusted request actions, no page/console errors. Browser plugin unavailable; approved Playwright fallback used. Screenshots /private/tmp/settings-checks-{desktop,mobile}.png inspected; fixture removed.
- TypeScript and production build passed. Latest full CMS suite remains 480 passing; not rerun for this UI-only wiring. Real-provider permissions/status and cross-site/locale race browser acceptance remain pending.
- Full goal remains active at roughly 60%: settings release completeness/concurrency, other modules, provider migration, operations and client handover are still outstanding. No remote changes, policy enablement or rollout activation.

### Published browser branding and structured website identity — 2026-10-22
- Previous turn made verified progress. Inspected the remaining settings consumers and found favicon and root Organization/WebSite identity still disconnected. Added a strict published brand/contact/social loader and metadata/JSON-LD adapters, wired to root metadata/layout behind CMS_BRAND_METADATA_ENABLED=false.
- Configured favicon uses the published media endpoint; application/Open Graph site names and organization name/logo/contact/addresses/social profiles now come from published settings when enabled. Optional absent values are omitted. Page SEO/canonical/indexing metadata is retained, and the request-scoped root read is cached between metadata/rendering.
- Added three tests covering metadata preservation, icon removal, organization graph/profile/contact/media mapping, invalid origin rejection and published settings transport identity. Full CMS suite: 483 passing; TypeScript passed. Production build result follows. No visible page UI changed; browser favicon/provider and structured-data acceptance remain unverified.
- Remaining settings work includes fallback-image usage, release completeness/transitive concurrency, client review/publish/history and enabled-provider acceptance. Remaining content modules, migration, operations and handover remain incomplete. Full goal active at roughly 60%; no remote changes or rollout activation.
- Production build passed, including TypeScript.

### Rights-aware fallback sharing image — 2026-10-22
- Previous turn made verified progress. Inspected fallback-image usage and connected the published settings field to sharing metadata through migration 076. Precedence is page sharing image, explicit website sharing image, then website fallback image. Required editorial image contracts are unchanged.
- Added the same fallback precedence to draft SEO resolution, with an explicit fallback source label. Public fallback projection strips private fields and checks current processed WebP media rights. A revoked explicit sharing image fails the read rather than silently changing the editor's choice.
- Added resolver precedence and database publication/media tests. Full CMS suite: 485 passing; TypeScript and diff checks passed. No visible UI change or browser-rendering claim. No production build repeated for the SQL/resolver-only change.
- Remaining: visible optional-image policy where applicable, settings release completeness/concurrency and client workflow, remaining content modules, provider migration, operations and handover. Full goal active at roughly 60%. Migration remains local; no rollout flags or production content changed.

### Settings history and draft restoration — 2026-10-22
- Previous turn made verified progress. Added client settings history with current/published labels and restore confirmation. Restoration sends exact source/expected-current revision, is disabled for busy/unsaved/non-editor states, and reloads the new draft without publishing. Existing sensitive-setting permission guards remain authoritative.
- Added a database scenario proving fresh draft identity, previous publication preservation, history retention, approval reset and stale-revision rejection. Full CMS suite: 486 passing; TypeScript passed. Production build result follows.
- Browser QA at 127.0.0.1:3001/settings-history-qa passed desktop 1280×900/mobile 390×844: cancel makes no request; confirmed restore uses expected revision; new draft fields/history appear; unsaved edits disable restore; no page/console errors. Used actual workspace/history components with simulated API transport. Browser plugin unavailable; approved Playwright fallback used. Screenshots /private/tmp/settings-history-{desktop,mobile}.png inspected; fixture removed.
- Real-provider permissions/conflicts, older-history pagination and remaining settings review/publication workflow are pending. Other modules, migration, operations and handover keep the full goal active at roughly 60%. No production content, rollout switches or remote migrations changed.
- Production build passed, including TypeScript, after removing the fixture.

### Settings editorial review controls — 2026-10-22
- Previous goal turn made verified progress. Added submit/approve/request-changes controls to settings, bound to saved revision and backend permissions. Busy/unsaved state blocks actions; reload resets older impact acknowledgement/check context. Approval messaging makes clear that the website is unchanged. Publication remains unavailable.
- Added a database scenario for self-approval/stale-approval rejection, changes-requested/resubmission, separate approval, unchanged published pointer and publish rejection without validation. Initial test expected a broader error name; corrected it to the actual validated_revision_required exception. Full CMS suite: 487 passing; TypeScript passed. Production build result follows.
- Browser QA at 127.0.0.1:3001/settings-review-qa passed desktop 1280×900/mobile 390×844: submit, request changes, resubmit, unsaved-state blocking, approval, exact revision callback and no publication action. No page/console errors. Used the actual review component with simulated state/transport; backend authorization tested separately. Browser plugin unavailable; approved Playwright fallback used. Screenshots /private/tmp/settings-review-{desktop,mobile}.png inspected; fixture removed.
- Remaining: settings release completeness/transitive concurrency and provider acceptance, remaining content modules, migration, operations and handover. Full goal remains active at roughly 60%; no remote changes, policy enablement or rollout activation.
- Production build passed, including TypeScript, after removing the fixture.

### Settings completeness checks — 2026-10-22
- Previous link-sharing turn supplied verified runtime evidence: the local CMS at http://127.0.0.1:3001/cms returned HTTP 200, and opening its Codex browser panel was queued. This does not prove an authenticated client workspace or deployed backend is available.
- Verified the pending completeness work (488 tests passing), then extended it after inspecting footer and structured-data consumers. Saved checks now catch missing main menus, duplicate featured records, whitespace-only link labels, empty configured address labels/bodies and whitespace-only social labels. Optional empty address/profile collections remain valid; drafts are never mutated or forced to publish.
- Full CMS suite: 489 passing, zero failures. TypeScript and scoped diff checks passed. No rendered component changed, so no new browser QA or production build was claimed. Latest prior build remains the settings-review milestone.
- Settings publication remains blocked pending complete consumers, concurrency coverage and real-provider acceptance. Other content modules, migration, deployment operations and client handover remain incomplete. Full goal stays active at roughly 60%; this is a coarse estimate, not a measured release score. No rollout flags, remote migrations or production records changed.

### Paginated revision-history backend — 2026-10-22
- Previous turn made verified progress on settings completeness. Inspected the current editor read and confirmed history is capped at 20 revisions. Added migration 077 and an authenticated history endpoint to retrieve older revisions without exposing revision payloads or bypassing record permissions.
- Pagination resolves a revision cursor in the database and orders by creation time plus UUID. Tests cover 26 revisions including 25 equal timestamps, complete/nonduplicated traversal, final/empty pages, incorrect record/website cursors, invalid limits, outsider/anonymous denial, bounded API parameters and malformed upstream results.
- Full CMS suite: 492 passing, zero failures; TypeScript and scoped diff checks passed. No rendered UI changed; no new browser QA or build claim. Migration has not run against a remote provider.
- Next: connect older-history loading to settings, then verify restore selection and UI races. Settings publication, remaining modules, migration, operations and handover remain outstanding. Goal remains active at roughly 60%; no production writes or rollout activation.


### Older-history editor integration — 2026-10-22
- Previous turn made verified backend progress. Connected settings history to the paginated endpoint, preserving loaded revisions/cursor after request errors and appending successful pages. Older entries are accepted by the existing restore selection check; restore still sends the expected current revision and creates a draft. Loading and restore are disabled with unsaved changes/busy state.
- Settings reload now clears the old record/draft/history cursor while fetching; generation checks discard stale history responses. A request ref prevents duplicate in-flight history reads. Full initial 20-entry pages offer another page; terminal responses show all available revisions.
- Browser plugin unavailable; used regular Playwright fallback with actual SettingsWorkspace and simulated transport at /settings-pagination-qa. Desktop 1280×900 and mobile 390×844 passed: 20 initial entries, unsaved blocking, failed request preserving list, successful retry to 26, terminal message, cancellation, and exact older/current revision restore. No page or console errors/framework overlay. Screenshots /private/tmp/settings-pagination-{desktop,mobile}.png inspected; they show the temporary route's public header and plain fixture styling, not a final admin visual acceptance. Temporary fixture removed.
- TypeScript and scoped diff checks passed. Production build result follows. Latest full CMS suite remains 492 passing; not rerun for UI-only changes. Live-provider permissions/conflicts and cross-site request races remain unverified. Full goal remains active at roughly 60%, with settings publication, other modules, migration, operations and handover incomplete. No remote writes or rollout changes.
- Production build passed, including TypeScript, after fixture removal.


### Settings release dependency safeguards — 2026-10-22
- Previous turn made verified editor-history progress. Inspected release/reference SQL and found settings considered any existing public menu ready even when the menu's linked content was unavailable. Added migration 078 to make advisory/reference evidence and release checks reject that state.
- Added a private, bounded published dependency traversal that locks record publication pointers and current media-rights rows, expanding navigation/destination links. It retains public reader/type/route checks, rejects settings self-reference and preserves current public navigation fallback behavior. No publication policy enabled.
- Regression test covers a published menu whose journey is withdrawn, whose media rights are revoked, restoration to availability and private helper access denial. Initial run exposed unsupported min(uuid); replaced it with ordered UUID selection. Final full CMS suite: 493 passing; TypeScript and scoped diff checks passed. SQL-only change; no new browser/build claim.
- PGlite does not prove real PostgreSQL multi-session races. Concurrent publish/withdrawal, graph-boundary fixtures, contention/deadlock retry and expiry acceptance remain pending. Migration is local only. Settings release readiness, remaining modules, migration, operations and client handover keep the goal active at roughly 60%.


### Deep settings dependencies and actionable errors — 2026-10-22
- Previous turn made verified release-safeguard progress. Checked local runtime availability: psql/postgres/initdb/pg_ctl/docker were not on PATH. No server was provisioned and no remote credentials were accessed. Multi-session concurrency acceptance remains open.
- Added database regression coverage for settings → destination → paired destination → journey, with pairing cycles, a withdrawn/restored deep leaf, repeated roots, wrong website/language and settings self-reference. Verified the graph terminates and unavailable deep content blocks release. Unique-record/edge limit tests remain pending.
- Added safe user-facing messages for settings reference, URL, route and history cursor failures. Gateway tests verify actionable text and exclusion of upstream details/hints. No automatic publication retry was introduced.
- Full CMS suite: 495 passing, zero failures; TypeScript and scoped diff checks passed. No rendered layout changes, browser QA or new production build claimed. Settings publication is still disabled; provider concurrency/acceptance, remaining modules, migration, operations and handover keep the full goal active at roughly 60%.

### Specialist profile contract and saved-draft checks — 2026-10-22
- Previous turn made verified deep-dependency/error-message progress. Moved to a missing client module while real PostgreSQL concurrency testing remains unavailable. Inspected the actual specialist directory, data types, Sanity fields and Person schema; documented field-by-field mapping and remaining shared directory content in specialists.md.
- Added a strict versioned profile draft model covering name/role/expertise/bio/field note/portrait, explicit visibility/order/person-versus-team kind, planning button copy, typed trip references and optional film/caption/transcript assets. New profiles start hidden. Existing public website and name-based joins remain unchanged pending migration.
- Added API schema/null-route/matching-title checks and saved-revision media evidence for advisory validation. Missing copy, ambiguous media evidence, film/reference readiness and locale/path problems are actionable findings. Specialist publication remains blocked; this is not a completed editor or live module.
- Full CMS suite: 499 passing, zero failures; TypeScript and scoped diff checks passed. No rendered UI change or new browser/build claim. Next is the specialist workspace, followed by preview/public projection/migration. Full goal remains active at roughly 60%; settings publishing, other modules, provider acceptance, operations and handover remain outstanding.


### Client specialist draft workspace — 2026-10-22
- Previous turn made verified contract/API progress. Added Specialists to CMS navigation and a client profile workspace with creation, saved-profile list/search/pagination, identity/copy, portrait fields, explicit visibility/order/person/team, planning copy and stable related-trip pickers. Existing film metadata is retained and copy editable; film upload/playback remains unfinished.
- Saves use expected current revision; malformed/mismatched loaded records are preserved and not edited. Backend edit permissions disable saved-record fields. Unsaved changes require discard confirmation and disable saved-content checks. No specialist publishing controls were enabled.
- Browser plugin unavailable; regular Playwright fallback exercised the real workspace with simulated transport on desktop 1280×900/mobile 390×844. Passed hidden default, related journey selection, create and exact-revision update, cancel discard, loaded-title search, saved findings and dirty-check blocking. No page/console errors. Initial browser attempts stalled on an overly exact select label locator; corrected to the select's accessible name. Screenshots /private/tmp/specialist-editor-{desktop,mobile}.png inspected. Temporary fixture removed.
- TypeScript passed. Production build result follows. Latest full CMS suite remains 499 passing; no redundant rerun for UI wiring. Provider authorization/conflicts, actual portrait selection, long-list paging and cross-site races remain pending. Preview, review/restore, published delivery and migration remain incomplete for specialists. Overall goal active at roughly 60%; no rollout or remote writes.
- Production build passed, including TypeScript, after removing the temporary specialist fixture.


### Specialist profile content and secure preview — 2026-10-22
- Previous turn made verified editor progress. Added a shared specialist content renderer, live profile preview in the editor and specialist dispatch in the secure preview viewer. Connected existing saved-revision preview sharing controls; no authorization bypass or new public reader was added.
- Preview includes visibility/person/team status, portrait, copy, field note and non-submitting planning text. Film transcript/metadata and related-record counts are explicit partial representations; film playback, final related cards and full directory parity remain pending.
- Added a database regression proving pinned specialist revision after edits, recipient/anonymous denial, revocation and unchanged null publication. Full CMS suite: 500 passing; TypeScript passed.
- Browser plugin unavailable; regular Playwright fallback verified actual editor/renderer with simulated transport at desktop 1280×900/mobile 390×844. Confirmed preview copy/hidden status, disabled enquiry button, saved sharing controls and existing edit/check flow with no page/console errors. Screenshots /private/tmp/specialist-preview-{desktop,mobile}.png; mobile inspected, fixture removed. Real-provider auth/sharing/media remains unverified.
- Production build result follows. Specialist public delivery, migration, review/restore, films and remaining modules/operations/handover are incomplete; full goal stays active at roughly 60%. No remote changes or rollout activation.
- Production build passed, including TypeScript, after fixture removal.


### Specialist source migration planner — 2026-10-22
- Previous turn made verified preview progress. Added a deterministic review-only specialist migration planner preserving original profile/trip sources, copy, explicit legacy visibility/team rules, ordering and planning text. Requires portrait, related-trip and film mappings before draft readiness; reports ambiguous names/slugs, collapsed target mappings, unknown source fields and unused mappings.
- Inspected the actual repository snapshot: 3 profiles, all missing CMS portrait mappings; 0 exact journey links, 3 exact expedition references, no profile films. Found unmatched assignment names Safari Crafters / Team Safari Crafters and added explicit reporting instead of guessing aliases. Source files remain unchanged; nothing imported or published.
- Tests cover determinism, source immutability, duplicate identities, retained films/unknown fields, required mappings and actual directory parity/unmatched assignments. Final full CMS suite: 504 passing; TypeScript passed. No rendered component or remote action changed. Migration apply/evidence/UI and specialist public delivery remain pending; full goal active at roughly 60%.

### Specialist migration evidence API — 2026-10-22
- Previous turn made verified source-planner progress. Added a bounded authenticated review endpoint and migration 079 evidence RPC. Specialist create permission gates the RPC; approved processed portrait media and same-website typed trip access are checked before readiness. Locale is checked in the API.
- Evidence shape, order and identities are verified; stale/unavailable mappings become findings and malformed responses fail closed. Added website/locale/plan/evidence review digest. Apply remains unavailable and unsupported film verification blocks film candidates; no imported records or receipts yet.
- Added API/database tests for stable digest, locale changes, media rights, wrong types, denied access, cross-origin/anonymous requests and malformed evidence. Full CMS suite: 509 passing; TypeScript and scoped diff checks passed. Backend-only work; no new browser/build claim.
- Next: transactional specialist draft import and recovery, then client migration review controls. Migration remains local. Public specialist delivery, remaining modules, settings release acceptance, operations and handover keep the full goal active at roughly 60%.

### Transactional specialist import foundation — 2026-10-22
- Previous turn made verified evidence-API progress. Added migration 080 for actor/site-scoped import receipts, atomic specialist draft imports, retained source/trip provenance/mappings and receipt recovery. Rechecks and locks media/typed references before new writes; films remain blocked and every imported record remains unpublished.
- Exact completed replay returns the same receipt even after later media revocation. Changed manifests/request identities and already-imported source keys are rejected. Any later-item error rolls back the complete batch, source keys and receipt.
- Added database scenarios for persistence, retained source, recovery, mismatch/duplicate prevention, permission denial and batch rollback. Initial test expected a reviewer without create permission to see an empty receipt; actual permission denial was correct, and the assertion was corrected. Final full CMS suite: 511 passing; TypeScript and scoped diff checks passed.
- SQL is local only; no real content imported. HTTP apply/recovery wiring and the client migration panel are next. Concurrent provider execution, specialist publication and remaining modules/operations/handover remain incomplete. Full goal active at roughly 60%.


### Specialist import API and recovery — 2026-10-22
- Previous turn made verified transactional SQL progress. Connected specialist migration apply/status to the review endpoint. New apply rechecks evidence/digest and refuses errors, unused mappings or unmatched source assignments; complete retries verify the original manifest and recover before newer availability changes.
- Manifests preserve profile/trip source and explicit mappings; results are checked for exact planned source coverage and unique record/revision/source identities. Status distinguishes complete from unconfirmed, never treating a missing receipt as proof of failure. No publication action added.
- Added handler tests for manifests, stale evidence, receipt recovery/mismatch, status and unresolved assignments, plus an actual PGlite HTTP-handler-to-RPC review/apply/replay/status integration scenario. Full CMS suite: 516 passing; TypeScript and scoped diff checks passed. No new rendered UI or browser/build claim.
- Client migration controls and explicit source-name alias resolution are next; live provider transport/concurrency, public specialist delivery and broader modules/operations/handover remain incomplete. Goal active at roughly 60%. No remote migration or real content import.

### Explicit specialist source-name resolution — 2026-10-22
- Previous turn made verified apply/recovery progress. Added explicit legacy assignment aliases targeting candidates in the same source snapshot. Rejects overriding existing profile names, missing candidate targets and blank names; original trip source names remain preserved. Unused aliases block apply and affect the reviewed digest/manifest.
- Added regression coverage for mentor/guide labels mapping to the same profile once, source preservation, invalid aliases and API apply provenance. The first test exposed short-circuit matching that marked a second role alias unused; changed matching to evaluate both roles before selecting the trip. Also precomputed source-slug counts to avoid repeated full-catalogue scans.
- Full CMS suite: 518 passing; TypeScript and scoped diff checks passed. No aliases assigned to real content, no imports or remote changes. Client migration controls are next, followed by provider acceptance and specialist public delivery. Full goal remains active at roughly 60%; broader modules, operations and handover remain incomplete.


### Client specialist migration review and recovery controls — 2026-10-22
- Previous turn made verified alias-resolution progress. Added a specialist migration panel with bounded JSON source upload, explicit legacy-name targets, portrait and typed-trip pickers, review findings/proposed content, acknowledgement and draft import. Mapping changes invalidate approval. Integrated pending state with workspace unsaved-work handling.
- Added browser contract checks for source/review identities and readiness, complete unique receipts and actor/site-bound recovery. Recovery identifiers persist before apply; pending imports lock new/discard actions and survive reload. Exact retry/status do not create a replacement request key. Completion clears identifiers and refreshes profiles; uploaded source remains in memory only.
- Full CMS suite: 521 passing; TypeScript passed. Browser plugin unavailable; regular Playwright fallback used actual panel/handler with simulated database/media transport. First 127.0.0.1 run hit existing origin protection because Next's request URL was localhost; reran at http://localhost:3001 without relaxing checks. Desktop 1280×900/mobile 390×844 passed explicit alias, portrait/trip pick, reviewed apply, simulated lost response, reload recovery and cleanup with no browser errors. Fixture image preview deliberately unavailable. Screenshots /private/tmp/specialist-migration-{desktop,mobile}.png; mobile inspected. Temporary UI/API fixtures removed.
- Production build result follows. Real-provider auth/media/origin/concurrency, browser storage failures, film imports, complete migration UAT and specialist public delivery remain pending. Broader modules, operations and handover keep full goal active at roughly 60%. No real content or remote infrastructure changed.
- Production build passed, including TypeScript, after removing temporary migration fixtures.

### Published specialist profile boundary — 2026-10-22
- Previous turn made verified client migration progress. Added migration 081 and strict application public reader for visible, English, published specialist profiles. Nested allowlisting excludes private data; draft edits remain separate. Current portrait rights gate both profile reads and public media authorization.
- Added exact journey-reference identity/route checks and encoded planning query projection. Films and photography-expedition profiles remain unavailable until their delivery is implemented; no data is silently dropped. No specialist publication policy, rollout flag or public page was switched.
- Tests cover anonymous read boundaries, draft/published/hidden states, private nested field stripping, media revocation and public access, transport scoping and malformed/mismatched references. Full CMS suite: 525 passing; TypeScript and scoped diff checks passed. Backend-only change; no new browser/build claim.
- Next: public directory listing/order and composition, related expedition delivery, publication checks/workflow and provider acceptance. Remaining modules/operations/handover keep full goal active at roughly 60%. SQL remains local; no real content or production settings changed.

### Published specialist directory pagination — 2026-10-22
- Previous user-facing turn verified the running local CMS preview and shared http://localhost:3001/cms; that provided current runtime evidence. Continued the directory implementation and inspected its completed full-suite result: 528 tests passed.
- Migration 082 lists only available published specialists, ordered by display order and UUID, with bounded paired cursors. The application reader validates identities, exact continuation position, unique/increasing records and complete traversal. Empty lists are valid; partial or malformed traversals are rejected.
- Added traversal-bound regression coverage: exhausting 20 pages and exceeding 1,000 records reject; exactly 1,000 records completing on page 20 succeeds. All six specialist public-reader tests and TypeScript passed after this addition. No rendered UI changed, so no new browser/build claim.
- Stable-data pagination is tested; separate pages are not a shared snapshot and concurrent changes can still cause omissions. Public page composition, expedition/film delivery, trusted specialist publishing and provider acceptance remain pending. No remote SQL, real import, publication policy or rollout flag changed. Full CMS goal remains active; the earlier roughly 60% estimate is not a measured release-readiness score.

### Public specialist profile renderer — 2026-10-22
- Previous turn completed directory validation and documentation. Inspected the existing public page's name-based exclusions, trip matching, fixed heading and first-name planning behavior. Added a published-profile renderer driven by explicit CMS values, with all selected journeys, image caption/credit/decorative semantics, preserved copy and supplied page labels/empty state.
- Added stable-identity Person structured data governed by explicit person/team kind. Two unit tests passed for identity stability, public image URLs, profile fields and team exclusion. TypeScript passed. No source switch or publication policy was enabled.
- Browser plugin not available; Playwright checked a temporary two-profile fixture at desktop 1280×900 and mobile 390×844. Passed HTML-text/script escaping, exact planning URLs, journey links, captions/alt, paragraph whitespace, Person count, mobile image-before-copy order, horizontal overflow and empty state. Inspected mobile screenshot at /private/tmp/specialist-display-mobile.png. Images were controlled placeholders; no real-provider delivery claim. Temporary route removed.
- Production build result follows. Next: saved page-level hero/SEO/labels and integration, related expedition/film delivery, publishing validation, provider acceptance. Full goal remains active; broader module coverage, migration, operations and handover remain pending.
- Production build passed after removal of the temporary display fixture.

### Specialist directory page-composer controls — 2026-10-22
- Previous turn made verified renderer progress. Added `specialistDirectory` to the approved composition contracts, with heading, related-journey heading and empty-state message. Added a draft factory and client composer controls; standard moving, visibility and hidden duplication apply. Existing hero/mobile-image and SEO controls can be composed alongside it.
- Preview shows saved labels and explicitly states that profile loading is pending. No false empty-list or live-publication claim. Added contract coverage for hero/directory serialization, bounds, unknown fields, hidden duplication and continued draft-only validation. Full CMS suite: 532 passing.
- Browser plugin not available; local Playwright fixture passed desktop/mobile adding/editing, draft round trip, preview labels, hidden duplicates and field limits. First run coincided with local server loss; verified connection refusal and restarted at localhost:3001. A repeat exposed exact-label lookup ambiguity on the textarea; accessible textbox role passed. Inspected mobile screenshot /private/tmp/specialist-composer-mobile.png. Temporary fixture removed. Production build result follows.
- Pending profile resolution in page previews, published page/hero/SEO integration, visibility/layout support and trusted page publication, plus expedition/film delivery and provider acceptance. No production settings, real records or publication policies changed. Full CMS goal remains active; rough overall estimate remains approximately 60%, not measured readiness.
- Production build, including TypeScript, passed after temporary fixture removal.

### Composed specialist public-page adapter — 2026-10-22
- Previous turn made verified directory-preview progress. Added a fixed-route published-page loader/projector with explicit composition and schedule validation, one configured directory and one current H1. Supports hero, text, CTA and directory sections; unsupported enabled/future sections, animations and region targeting fail explicitly. Hidden sections remain preserved. Directory data loads only when visible.
- Added shared SEO metadata resolution and a page renderer preserving hero desktop/mobile images with independent alt/credits, section order and supported presentation controls, rich text, safe buttons and nested directory headings. Person metadata is emitted only with the directory. The real `/specialists` route remains unchanged pending integration and publication gates.
- Three unit tests passed, plus TypeScript. Corrected the initial test expectation after inspecting the existing SEO resolver: explicit page titles are absolute, while only inherited titles use the global template. Browser plugin not available; local Playwright desktop/mobile fixture passed image/alt/credit switching, headings, mobile order, lists, links and overflow. Visual inspection caught dark supporting copy on the forest hero; fixed scoped inheritance and verified white text on the dark background at both widths. Temporary routes removed.
- Initial production build passed; final build after the contrast fix follows. Next: runtime/route integration, trusted publication and media checks, broader section support, coordinated releases, expedition/film delivery and provider UAT. Full goal remains active; broader CMS/migration/operations/handover remain incomplete. No production record, remote migration or flag changed.
- Final production build, including TypeScript, passed after the contrast correction and fixture removal.

### Published specialist profiles in page previews — 2026-10-22
- Previous turn made verified composer progress. Added a bounded public directory HTTP endpoint with website/language scoping, strict request/response checks and no-store handling. Only published envelopes are returned; browser code validates them again and derives safe links. Empty complete lists and failed delivery remain distinct.
- Connected unsaved composition previews and shared page previews using their website identity. Current published profiles, copy, portraits/credits, selected journeys and planning buttons render with a refresh action. Preview explains that profiles are not pinned to the page revision/time. Request cleanup ignores obsolete responses; image failure is explicit. No new draft access or publication authorization.
- Two runtime tests passed, covering validation, foreign-site rejection, malformed input, empty lists and upstream/configuration failures. TypeScript passed before fixture addition. Desktop/mobile Playwright QA passed loading, failed portrait, credits, trip links, encoded enquiry, refresh recovery, empty/error distinction and wrong-site responses. Browser plugin not available; intercepted fixture data used. Scoped alert selectors to avoid Next's route announcer. Mobile screenshot inspected at /private/tmp/specialist-directory-preview-mobile.png; temporary fixture removed. Production build result follows.
- Still pending public page/hero/SEO integration, full section control support, coordinated releases, expedition/film delivery and trusted publishing/provider acceptance, plus broader CMS modules, migration, operations and client handover. Goal remains active. No live records, remote SQL or rollout flags changed.
- Production build, including TypeScript, passed after temporary fixture removal.


### Opt-in Specialists route integration — 2026-10-22
- Previous turn made verified composed-renderer progress. Connected the real /specialists route behind CMS_SPECIALISTS_DELIVERY_ENABLED=false. Enabled delivery requires the independent public backend and published SEO defaults; no missing-data or configuration fallback mixes legacy content. Page scope is fixed to the configured website, English and /specialists, using anonymous published RPCs only.
- Metadata and rendered content share a request-cached loader; page and SEO settings reads start together. Missing page becomes not-found; invalid dependencies/settings fail. The legacy branch retains its existing content and metadata. No actual rollout flag or provider data changed.
- Full CMS suite: 539 passing. Runtime tests cover flag/configuration, scope, credentials, missing/foreign settings and failed directory data. Desktop/mobile browser QA checked the actual legacy route and a temporary enabled-runtime fixture with controlled RPC responses: title, description, canonical, noindex, empty state and no legacy mixing passed. Browser plugin unavailable; Playwright used. Mobile screenshot inspected at /private/tmp/specialist-route-mobile.png. Fixture removed; production build result follows.
- Still pending provider-backed enabled-route acceptance, publication/media/scheduling gates, sitemap consistency, coordinated snapshots, broader section rendering, expedition/film delivery and the remaining modules, migration, operations and client handover. Goal remains active. Local integration is not release readiness.
- Production build, including TypeScript, passed after temporary route removal.


### Specialist sitemap consistency — 2026-10-22
- Previous turn made verified opt-in route progress. Migrated sitemap generation now removes the static Specialists entry when the CMS route is enabled, reads the same validated published page/dependencies and applies the shared SEO decision. Missing pages produce no entry; failures do not fabricate a legacy entry. Page/site noindex, explicit exclusion and alternate canonicals dominate include. No invented last-modified timestamp is emitted.
- Two focused tests passed for normalized and alternate canonicals, missing pages, noindex/exclusion and agreement with rendered metadata. TypeScript and production build passed. Actual served legacy sitemap was fetched and XML-parsed: one Specialists entry and no duplicate URLs. No visual UI changed, so no browser screenshot claim.
- The sandbox localhost probe failed. Before restarting, inspected prior server handle and the known PID outside the sandbox: PID 48854 is still the live next-server and an escalated localhost request succeeded. Thus the previous assumption that refusal necessarily meant the server stopped was too strong; the earlier replacement process had exited because the original already existed. No restart was needed this turn. Preview remains at localhost:3001/cms.
- Enabled-provider sitemap UAT, authoritative publication timestamps, coordinated directory snapshots, full publication checks, broader sections, expeditions/films and remaining CMS migration/operations/handover still pending. Goal active; no rollout value, real record or remote infrastructure changed.


### Specialist page readiness and future schedule checks — 2026-10-22
- Previous turn made verified sitemap progress. Added specialist-page advisory findings to saved page validation, sharing the public renderer's supported-section list. Reports route/language, extra payload data, directory count, unsupported sections, animation and region controls without changing publication authorization.
- Heading checks examine now and every future visibility boundary, including exclusive end times, and report the first missing/nonblank-H1 failure. No fixed lookahead hides a distant expiry. Generic composition/media/SEO checks remain in place and complete publication checks remain gated.
- Added revision-bound Content checks to Pages. No trusted-request/publish control enabled. Dirty drafts cannot reuse saved-content results. Three targeted tests and full CMS suite passed: 544 tests. TypeScript passed. Desktop/mobile Playwright fixture exercised actual Pages workspace with server-computed findings and simulated content/status API; future heading errors, publication-gate message and dirty disabling passed. Browser plugin unavailable. Temporary fixtures removed; final production build result follows.
- Remaining: trusted page/specialist publication, complete media/dependency checks, provider-backed authorization/UAT, broader sections, expedition/film delivery, coordinated snapshots and remaining CMS modules/migration/operations/handover. Goal remains active; no rollout or real data changed.
- Production build, including TypeScript, passed after fixture removal.


### Specialist published-reference readiness — 2026-10-22
- Previous turn made verified page-readiness progress. Added migration 083 for revision-scoped specialist reference evidence under profile-view/service-role permissions. Current published dependency availability is checked within website/language; responses omit titles/paths. Drafts, wrong languages and revoked media remain unavailable; anonymous callers are denied.
- Connected evidence to editor saved checks and trusted-worker input. Validation now reports exact missing/wrong-type/wrong-language/duplicate evidence per selected trip, plus unexpected IDs. Expedition delivery and complete specialist publication remain blocked. No publication policy enabled.
- Full CMS suite: 546 passing, including PGlite revision/access/publication/media scenarios. Added a subsequent worker-flow regression: all six specialist tests passed, proving reference evidence is consumed while the trusted result remains invalid. TypeScript passed. Backend-only change; no new browser/build claim. SQL remains local.
- Remaining: full specialist/page trusted publication, real-provider acceptance/concurrency, expedition/film delivery, coordinated releases, broader composition support and remaining modules/migration/operations/client handover. Goal active; no real content, remote infrastructure or rollout settings changed.


### Photography expedition inventory and draft contract — 2026-10-22
- Previous turn made verified specialist reference-check progress. Began the missing photography-expedition module by inspecting legacy data types, detail-page rendering, departures/pricing, booking copy and enquiry context. Recorded explicit mappings and hidden slug-based/image/FAQ behaviors in docs/cms/photo-expeditions.md; listing and shared-form inventory still need completion.
- Added a versioned full draft contract for trip facts, separate hero images, exact price/free-text date copy, stable departures/itinerary/lists/FAQs/gallery, specialist roles, films, editorial labels, booking/enquiry and SEO. Programme preview/confirmed is distinct from CMS publishing. Invalid dates/ranges and duplicate collection IDs are rejected; no missing facts, dates or prices are inferred.
- Connected contract/title/route checks before save and nested-media evidence during advisory validation. Required fields/empty items are reported; complete delivery, forms, references and films remain blocked for publication. No legacy content changed or migrated.
- Full CMS suite: 551 passing; TypeScript passed. Backend-only change; no new browser/build claim. Next: expedition editor, previews, migrations/imports, public delivery and reference/enquiry integration, trusted workflows/provider UAT. Broader CMS scope, operations and handover remain active and incomplete.


### Client photography-expedition editor — 2026-10-22
- Previous turn made verified expedition-contract progress. Added Photography expeditions navigation and an account/site-keyed workspace for paginated record loading, new drafts, edit permissions, unsaved-work guards, optimistic saves and revision restoration. Invalid legacy records retain their data and require migration. Obsolete list/load responses are ignored.
- Added full contract editing for facts, exact price/date copy, departures, itinerary and identified collections, independent images/gallery, specialist/form selections, page labels, booking/enquiry copy, existing film metadata and SEO. Collections preserve IDs and support move/remove controls; character limits are visible. Saved-content checks remain advisory and publication is unavailable.
- TypeScript passed before browser fixture. Browser plugin unavailable; Playwright actual-editor fixture with simulated persistence passed desktop/mobile legacy preservation, read-only state, blank/valid departures, collection order/IDs, price preservation, save/reload, simulated conflict keeping edits, saved checks and draft restoration. Stabilized slug/dropdown accessible names after exact-label timeouts. Mobile screenshot inspected at /private/tmp/expedition-editor-mobile.png. Temporary fixture removed; production build result follows.
- Still pending rendered/shared preview, import/migration, picker/long-list/provider acceptance, published expedition detail/listing/departures, specialist/destination references, enquiry integration, trusted workflow and broader CMS migration/operations/handover. No real content, production flags or remote infrastructure changed. Goal active.
- Production build, including TypeScript, passed after fixture removal.


### Photography expedition previews and saved sharing — 2026-10-22
- Previous turn made verified editor progress. Added an unsaved expedition content preview and enabled existing saved-revision private preview controls/secure-viewer dispatch for photoExpedition. Covers explicit desktop/mobile media, copy, dates, exact prices, itinerary/collections, FAQs, booking, film poster/transcript and enquiry context; unsupported playback/submission is explicit.
- Preview dates use an explicit UTC calendar date. Start-date sorting and historical disclosures retain all departures, including full and earlier entries, without mutating source. Booking/departure actions are disabled. Editor linked-form previews use separate authorized reads; shared previews do not grant access to linked drafts.
- Full CMS suite: 554 passing. New date/projection tests and a PGlite expedition-share scenario verify source preservation, pinned revision after later edits, recipient/anonymous boundaries, revocation and no publication. TypeScript passed before fixture. Browser plugin unavailable; desktop/mobile Playwright fixture passed dates/history, price, hero alt/credits, FAQs, disabled actions, linked-draft boundary, malformed fallback and overflow/page-error checks. Controlled image bytes used; provider acceptance not claimed. Mobile screenshot inspected; fixture removed. Production build result follows.
- Remaining: real-provider auth/media/form acceptance, migration/Office imports, public expedition detail/listing/reference delivery, film playback, trusted publishing, enquiry/departure context and broader CMS operations/handover. Goal active; no real content, remote infrastructure or rollout flags changed.
- Production build, including TypeScript, passed after fixture removal.

### Expedition migration planning — 2026-10-22

- Added a pure, source-digest-bound legacy expedition review planner. Preserves original records and explicit display mappings; produces deterministic collection IDs without changing money or free-text dates.
- Requires explicit reviewed hero/gallery, runtime FAQ, booking/enquiry and programme-status decisions. Blocks unknown/malformed data, unsupported films, unmapped original media, unused mappings and duplicate URLs. No writes or publication authorization.
- Inventoried all eight current source expeditions: zero ready without mappings. Three targeted tests and TypeScript passed. Full-suite result follows below.
- Pending for this milestone: review/apply API and client interface, verified asset/form/specialist identities, atomic/idempotent draft creation, Office templates. Public expedition delivery, trusted publishing and provider-backed acceptance remain incomplete.
- Full CMS regression suite passed: 557 tests, zero failures (`/private/tmp/cms-expedition-migration-tests.log`). This backend-only milestone leaves the running preview unchanged.

### Expedition migration permission checks — 2026-10-22

- Added authenticated, bounded, same-origin migration review endpoint and local migration 084 for expedition creation permission, image rights and specialist/form access checks.
- Review includes original-gallery mappings omitted from final display; validates complete ordered evidence and locale; binds returned digest to the reviewed website/source/mappings/evidence. Reports readiness without exposing import or publication.
- Verification: all 560 CMS tests and TypeScript passed. PGlite covers scoped permissions, wrong reference types, expired rights and no publication; HTTP tests cover evidence corruption and caller validation. No UI changes or new browser/build claims.
- Pending: client review screen, atomic migration apply and recovery, provider deployment/concurrency acceptance, actual content migration, Office imports and expedition public delivery.

### Expedition atomic draft imports — 2026-10-22

- Added local migration 085 and connected HTTP apply/status. Imports preserve source/mappings, enforce unique expedition source keys and slug routes, recheck mapped media and typed references, and save drafts only.
- Added actor/website-scoped request receipts and exact-manifest retry handling. Interrupted responses can be recovered without duplicate drafts; failed batches roll back all items and receipt state.
- Full CMS suite passed 562 tests and TypeScript passed. HTTP-to-PGlite coverage includes stale review, real apply/status, source preservation, rights withdrawal after completion, replay, duplicate prevention and permission denial. Added direct original-gallery-rights and import-key rollback assertions to the transaction regression.
- Pending: client migration/recovery UI, live PostgreSQL concurrency and provider acceptance, Office templates/import integration, public expedition delivery and publication validation. No remote migration or real content import performed.

### Expedition browser migration contracts — 2026-10-22

- Shared the explicit migration mapping contract between browser/server and added bounded snapshot/mapping parsers with browser-native canonical hashing.
- Added review-response verification against the selected source/mappings, complete unique receipt checks and account/website/request-scoped recovery validation. Recovery accepts identifiers only; uploaded source content cannot be persisted through this schema.
- Three targeted tests passed against actual endpoint responses with controlled media/reference evidence; TypeScript passed. Rendered migration UI and browser QA are still pending.
- Full CMS regression suite passed: 565 tests, zero failures (`/private/tmp/cms-expedition-client-tests.log`). No rendered UI changed in this milestone.

### Visible expedition migration and recovery panel — 2026-10-22

- Connected source/mapping upload, reviewed findings/content preview, acknowledgement and draft import to Photography expeditions. Added actor-scoped recovery, status checks, exact retries, verified completion/list refresh and unsaved-work protection.
- Desktop/mobile browser QA passed the upload/review flow, stale-review invalidation, lost-response/reload recovery, unconfirmed status, corrupt storage and competing-action locks. Console clean apart from intentional 503; no horizontal overflow. Mobile screenshot inspected. Browser plugin unavailable; regular Playwright used and temporary fixture removed.
- This administrator JSON migration flow does not replace the client Office import requirement. Provider-backed UAT, visual mapping authoring, same-request retry/storage-write-failure browser scenarios and expedition public delivery remain pending. Build/regression outcomes follow below.
- Production build (including TypeScript) passed; all 565 CMS tests passed. Logs: `/private/tmp/cms-expedition-migration-ui-build.log` and `/private/tmp/cms-expedition-migration-ui-tests.log`.

### Expedition Word/Excel import contracts and parsing — 2026-10-22

- Added versioned expedition table contract with field limits/editorial guidance and complete proposed draft planning for facts, departures, itinerary, galleries, FAQs, specialists/forms, films, labels/booking and SEO.
- Update proposals preserve omitted content, require explicit collection replacement/clearing and current revision, and reject URL/language changes. No writes; any error blocks the entire proposal.
- Connected shared Excel/Word parsers with expedition metadata, preserved text/date/price wording and source provenance. Eight targeted tests pass, including malformed input and Office safety checks.
- Pending: downloadable Word/Excel templates, server evidence/review/apply/recovery, client upload flow, film/caption verification, provider acceptance and public expedition delivery. Full regression/typecheck results follow.
- TypeScript passed and the full CMS suite passed 573 tests (`/private/tmp/cms-expedition-office-tests.log`). Backend/parser work only; no new browser/build claim.

### Downloadable expedition Excel and Word templates — 2026-10-22

- Added blank Office templates with full field guide, explicit replacement instructions, stable IDs, dates/price wording, and separate filled parser fixtures. Reproducible builders use bundled artifact-tool and Python document dependencies.
- Excel includes dropdowns, frozen headers and red length warnings. Every sheet and the over-limit boundary were rendered/inspected. Word's 13 pages were rendered with bundled LibreOffice and visually inspected.
- Both blank templates reject empty imports as expected; filled fixtures produce valid exact-text/date proposals. Tests inspect exported Excel controls. Both local download URLs returned HTTP 200 with correct MIME types.
- Pending: native Office user acceptance, live evidence checks and atomic Office apply/recovery, client upload/review UI, film verification and public expedition delivery. No actual expedition data imported.
- Full CMS suite passed: 575 tests (`/private/tmp/cms-expedition-template-tests.log`). Template/static-file work only; no application UI or production build change claimed.

### Expedition Office server review — 2026-10-22

- Added raw Word/Excel review endpoint with bounded parsing, site membership, caller-scoped current record reads, identity/revision checks and evidence-bound review digests.
- Added local migration 086 for create/edit permission checks, current image rights and typed specialist/form access. Preserved dependencies are checked; unsupported films remain explicit blockers without being dropped.
- All 583 CMS tests and TypeScript passed. Actual downloadable fixtures run through HTTP review; database tests cover permission/site/type boundaries and rights withdrawal. No UI changes or remote deployment.
- Pending: atomic Office create/update and retry receipts, browser review/save flow, provider UAT, film support and public expedition delivery.

### Expedition Office atomic draft saving — 2026-10-22

- Connected server apply/status to local migration 087: original-file review binding, atomic create/update, revision conflicts, locked media/reference rechecks, unique create IDs and actor/site-scoped retry receipts. Successful review now enables backend apply; saving remains unpublished.
- Verified actual Word fixture HTTP-to-PGlite saving/recovery, rollback of an entire failing batch, duplicate prevention, changed manifest/revision rejection, receipt isolation, withdrawn rights and wrong typed references. Malformed save responses remain recoverable rather than claiming success.
- All 588 CMS tests passed (`/private/tmp/cms-expedition-office-apply-full.log`); TypeScript passed. No UI change or remote migration applied. Provider concurrency is not proven by local sequential tests.
- Pending: client Office upload/review/save/recovery interface, provider acceptance, film support and public expedition delivery; the wider PRD scope remains active.

### Expedition browser import verification — 2026-10-22

- Added browser-safe review/file binding, identity/readiness checks, actor/site-scoped recovery preparation and complete receipt matching. Recovery stores identifiers only and rejects duplicate revisions, cross-account state and mismatched update IDs.
- Tests use real Word fixture server review responses and verify canonical source-key parity with the server. All 592 CMS tests passed (`/private/tmp/cms-expedition-import-client-tests.log`) and TypeScript passed.
- Next: connect the visible Office upload/review/save/recovery panel and exercise desktop/mobile workflows. This helper-only milestone does not claim browser UI or production build validation. Wider PRD delivery remains active.

### Visible expedition Office import panel — 2026-10-22

- Connected template downloads, Word/Excel selection, review findings, proposed content preview, explicit acknowledgement and draft saving to Photography expeditions. Pending recovery is written before the save request; status/retry and reload recovery use the same verified request identity.
- Office imports, legacy migration and manual editing now mutually block competing changes while work is pending. Corrupt recovery data blocks new imports instead of discarding uncertain results.
- Desktop 1280×900 and mobile 390×844 Playwright checks passed: actual Word/Excel fixtures through the real HTTP handler with mocked persistence, preview, acknowledgement, simulated lost response, unconfirmed status, exact retry, reload recovery, corrupt storage and edit locking. No unexpected console/page errors or horizontal overflow. Mobile screenshot inspected. Browser plugin unavailable; regular Playwright used. Temporary fixture route removed.
- Production build and all 592 CMS tests passed. Logs: `/private/tmp/cms-expedition-office-ui-build.log` and `/private/tmp/cms-expedition-office-ui-tests.log`. Browser script: `/private/tmp/expedition-office-qa.mjs`; screenshots: `/private/tmp/expedition-office-desktop.png`, `/private/tmp/expedition-office-mobile.png`.
- Remaining: real-provider deployment/concurrency and client UAT; native Office acceptance; storage-quota failure browser testing; film support and public expedition delivery, plus the wider PRD backlog. No real content was imported or published.

### Expedition public content projection — 2026-10-22

- Added strict public projection contract for complete expedition content with exact site/route identity, published specialist/form reference metadata and deterministic calendar-date departure grouping. Preserves exact editorial prices, programme status and Full departure status.
- Tests cover duplicate/foreign/missing reference evidence, both specialist roles, leap-day boundaries, malformed identities, incomplete content and unsupported films. All 595 CMS tests and TypeScript passed (`/private/tmp/cms-published-expedition-tests.log`).
- This is a pure projection only. No public route or publication gate was enabled. Pending: authorized database reader with live media/reference/form checks, public renderer and enquiry context, SEO, publication validation and provider UAT; broader PRD scope remains active.

### Expedition public reader transport — 2026-10-22

- Added opt-in public transport and bounded route/site/language checks, strict published projection validation and generic fail-closed HTTP responses. Separate expedition rollout flag prevents accidental activation with the global CMS flag.
- Verified expected RPC request shape, source identity, query/method rejection, missing-record vs upstream-failure responses and no-store headers. All 598 CMS tests and TypeScript passed (`/private/tmp/cms-expedition-public-runtime-tests.log`).
- SQL publication authorization remains pending; tests use injected transport responses. No route has been connected or rollout flag enabled. Next: implement the authorized database reader and media/reference/form revocation tests before public rendering and publication gates.

### Expedition published database reader — 2026-10-22

- Added local migration 088 for published-only expedition reads, nested public field allowlists, current WebP rights checks and published specialist/form resolution. Private form routing and unknown nested data are excluded; unsupported films/file-upload forms fail closed.
- PGlite anonymous-reader tests cover unpublished records, newer draft isolation, cross-site/language reads, both specialist roles, private-field removal, revoked/expired/archived/wrong-type images, specialist/form unpublication and unsupported films. Returned data passes the TypeScript public projection.
- All 599 CMS tests and TypeScript passed (`/private/tmp/cms-expedition-reader-full.log`). Tests set publication pointers as database root for fixtures; this is not proof of an enabled publication workflow.
- Pending: expedition public media authorization, route/rendering integration, complete enquiry/departure context and publication policy, SEO/provider UAT and broader PRD scope. Migration remains local; no live data or rollout settings changed.

### Expedition public images and gated API — 2026-10-22

- Added local migration 089 for eligible published expedition image entitlement, preserving existing media authorization branches. Only allowlisted public payload images qualify; draft/private image IDs remain inaccessible.
- Connected the dynamic expedition public API behind both rollout flags. Local HTTP smoke returned expected generic 503 and no-store/noindex headers with rollout disabled. Existing website pages and production configuration unchanged.
- All 600 CMS tests, TypeScript and production build passed. Database checks cover listing/hero/mobile/gallery/SEO images, private and draft isolation, cross-site access, form withdrawal, image revocation and expedition unpublication. Logs: `/private/tmp/cms-expedition-public-media-tests.log`, `/private/tmp/cms-expedition-public-api-build.log`.
- Remaining: public expedition renderer and SEO, enquiry/departure context, publication policy, provider-backed UAT and wider PRD requirements. No remote migrations applied.

### Expedition SEO metadata helpers — 2026-10-22

- Added metadata and sitemap-eligibility helpers using shared published SEO rules: absolute titles/canonicals, authorized image URLs, explicit overrides and website noindex precedence. No inferred prices, offers or modification timestamps.
- Verified defaults/overrides, canonical exclusions, noindex restrictions, decorative image alt, safe origins and opt-in rendering selection. All 604 CMS tests and TypeScript passed (`/private/tmp/cms-expedition-seo-tests.log`).
- Helpers are not wired into the legacy route or sitemap yet. Public renderer, index enumeration, enquiry context, publication gates and provider/client acceptance remain pending. No visible page or production configuration changed.

### Public expedition renderer — 2026-10-22

- Implemented responsive expedition rendering for published content: hero/mobile media, facts, departures, itinerary, gallery, FAQs, booking copy and specialist names. Explicit enquiry slot awaits verified form/departure integration.
- Desktop/mobile Playwright QA passed meaningful page render, responsive hero, exact price/status, FAQ interaction, safe external booking link and enquiry anchor. No overflow or unexpected console/page errors. Both screenshots inspected; images were synthetic. Temporary QA route removed.
- Production build and 604 CMS tests passed. Logs: `/private/tmp/cms-expedition-renderer-build.log`, `/private/tmp/cms-expedition-renderer-tests.log`. Browser script/screenshots: `/private/tmp/expedition-renderer-qa.mjs`, `/private/tmp/expedition-renderer-desktop.png`, `/private/tmp/expedition-renderer-mobile.png`.
- Remaining: real enquiry/departure context, route/SEO integration, published index/sitemap enumeration, publication gates, provider UAT and broader PRD backlog. No public route or rollout changed.

### Expedition enquiry context contract — 2026-10-22

- Added identity-only browser selection and server context resolution from the verified published expedition. Exact price/title/programme/departure information comes from server content; form and expedition revisions must match.
- Tests reject forged copy, wrong identities, stale revisions, removed/past departures and mismatched form revisions. General and Full-departure enquiries retain their meaning without making booking claims.
- All 607 CMS tests and TypeScript passed (`/private/tmp/cms-expedition-enquiry-context-tests.log`). Resolver not yet connected to intake: transaction rechecks, original-receipt retry handling, selector UI and lead-detail context remain required before public activation.

### Atomic expedition enquiry intake — 2026-10-22

- Added local migration 090 for service-only, server-derived expedition/departure attribution, locked expedition/form pointers and original-context retry recovery. Existing form validation and rate/challenge/origin gates are retained through intake/adapter integration.
- Verified wrong/forged/stale/past selections, permissions, exact context parity, no duplicate leads, changed retry rejection and recovery after publication withdrawal. Generic enquiries keep the existing persistence path.
- All 610 CMS tests and TypeScript passed (`/private/tmp/cms-expedition-enquiry-final-tests.log`). No remote SQL applied; provider multi-connection concurrency remains unverified.
- Next: departure selector and form UI, lead context display, route/SEO integration and publication gates. Broader PRD and client handover remain active.

### Expedition enquiry selector and retry UI — 2026-10-22

- Added optional expedition context to public forms, form-revision/language binding, general/departure selection and identity-only submission. Pending retries retain selection, request key and answers and lock conflicting edits.
- Desktop/mobile Playwright QA passed a Full departure selection, simulated uncertain response, unchanged retry body and success. Fixed clipped mobile departure copy with a wrapping summary; rechecked screenshot. No unexpected console/page errors or overflow. Verification/provider responses were mocked.
- Production build and all 610 CMS tests passed. Logs: `/private/tmp/cms-expedition-enquiry-ui-build.log`, `/private/tmp/cms-expedition-enquiry-ui-tests.log`; script `/private/tmp/expedition-enquiry-qa.mjs`; screenshot `/private/tmp/expedition-enquiry-mobile.png`. Temporary route removed.
- Pending: public expedition route/SEO integration, lead-context display, publishing gates and provider UAT, plus broader PRD work. Existing public pages unchanged.

### Expedition detail route integration — 2026-10-22

- Connected opt-in CMS expedition detail rendering, shared request snapshot, metadata and revision-bound enquiry form. Existing legacy branch remains selected with rollout disabled; CMS failures do not silently fall back to legacy content.
- Desktop/mobile composed page/form QA passed, including rejecting a changed form revision. Actual legacy Kanha route returned 200. Fixed duplicate dynamic export found by route smoke testing; final production build/typecheck and 610 CMS tests passed.
- Logs: `/private/tmp/cms-expedition-route-build.log`, `/private/tmp/cms-expedition-route-tests.log`; browser script `/private/tmp/expedition-route-qa.mjs`. Provider/media/challenge responses were mocked for CMS composition; real CMS-enabled provider route not validated. Temporary QA route removed.
- Remaining: lead context display, published index/sitemap enumeration, publication validation/gates, real-provider UAT and broader PRD work. Rollout remains disabled.

### Expedition context in lead details — 2026-10-22

- Added validated, read-only historical expedition/departure context to lead details, preserving exact submitted-page facts and revision references. General/legacy leads and invalid snapshots have explicit handling; existing permission/editing paths unchanged.
- Desktop/mobile browser fixtures passed Full/general/invalid/legacy states and revision disclosure with no unexpected errors/overflow. Mobile screenshot inspected. Temporary fixture removed.
- Production build/typecheck and all 612 CMS tests passed. Logs: `/private/tmp/cms-lead-expedition-build.log`, `/private/tmp/cms-lead-expedition-tests.log`; browser script `/private/tmp/lead-expedition-qa.mjs`; screenshot `/private/tmp/lead-expedition-mobile.png`.
- Remaining: published expedition directory/sitemap, publication policy/gates, provider-backed client UAT and broader PRD scope. No rollout enabled.

### Published expedition directory reader — 2026-10-22

- Added local migration 091 for bounded eligible listing/SEO cards, stable record-ID cursors and complete-set change detection. Every page rechecks publication eligibility; changes reject traversal instead of mixing versions.
- Added browser-independent server traversal/transport with strict route/site/image validation and no partial success. Real PGlite pagination tests and malformed/drifting response tests pass.
- All 616 CMS tests and TypeScript passed (`/private/tmp/cms-expedition-directory-tests.log`). No UI/route or remote migration changed. Provider scale/concurrency remains unverified.
- Next: connect listing and sitemap, then publication gates and real-provider/client acceptance; full PRD remains active.

### Expedition sitemap integration — 2026-10-22

- Connected CMS-mode sitemap to the verified published directory and shared SEO rules. Excludes noindex, explicit sitemap exclusions and alternate canonicals; rejects duplicate/path mismatches and emits no invented modification dates.
- Local disabled-rollout sitemap returned HTTP 200 and all eight existing expedition URLs. All 618 CMS tests and TypeScript passed (`/private/tmp/cms-expedition-sitemap-tests.log`). Production build result follows.
- Remaining: CMS-managed expedition atlas/listing, publication gates and real-provider/client acceptance, plus wider PRD scope. No production flag or data change.
- Production build passed (`/private/tmp/cms-expedition-sitemap-build.log`).

### Editable expedition atlas contract — 2026-10-22

- Added approved expedition directory section with editable interface copy, filters, empty states and cards/calendar display selection, plus draft factory and published atlas composition projection.
- Projection preserves ordered hero/text/CTA/directory content and SEO, rejects unsupported visible/future sections/controls, and avoids directory reads while scheduled off. Generic publication remains blocked.
- All 622 CMS tests and TypeScript passed (`/private/tmp/cms-expedition-page-contract-tests.log`). Updated approved-family count from 21 to 22 for the new section. No visible UI change or build/browser claim.
- Next: composer editing/preview and interactive atlas renderer, then route wiring/publication gates and provider/client UAT. Full PRD scope remains active.

### Expedition directory composer controls — 2026-10-22

- Added visible directory creation and all editable labels/messages/display options with character limits/counts. Standard section editing, hidden duplication, reorder/removal and readonly behavior retained.
- Desktop/mobile Playwright checks passed after fixing selector-label ambiguity. No unexpected errors/overflow; mobile screenshot inspected; temporary QA route removed.
- Production build/typecheck and 622 CMS tests passed. Logs: `/private/tmp/cms-expedition-composer-build.log`, `/private/tmp/cms-expedition-composer-tests.log`; script `/private/tmp/expedition-composer-qa.mjs`; screenshot `/private/tmp/expedition-composer-mobile.png`.
- Pending: directory preview and interactive public listing/calendar, atlas route connection, publication gates and provider/client UAT, plus broader PRD requirements. No rollout changed.

### Interactive expedition directory — 2026-10-22

- Built CMS-labelled expedition cards and chronological departure calendar with combined geography/month filters and reset. Undated tours remain in unfiltered cards; dates/status/price wording are not inferred or rewritten.
- Added pure projection tests for calendar boundaries, filters, immutable input and invalid identities. Desktop/mobile Playwright checks passed combined filters, empty states, route links, reset and Full/undated behavior; mobile screenshot inspected. Temporary fixture removed.
- All 624 CMS tests and TypeScript passed (`/private/tmp/cms-expedition-directory-view-tests.log`). Final production build result follows. Browser script: `/private/tmp/expedition-directory-qa.mjs`; screenshot `/private/tmp/expedition-directory-mobile.png`.
- Pending: composer preview, complete atlas renderer and route wiring, publication gates and real-provider/client UAT, alongside wider PRD work. No rollout enabled.
- Final production build passed (`/private/tmp/cms-expedition-directory-view-build.log`).

### 2026-10-22 — Expedition atlas public route integration
- Added `expedition-page-runtime.ts`: fixed English `/photo-expeditions` published page reader, snapshot-checked expedition directory and mandatory published SEO defaults, using anonymous credentials only. Both rollout flags/configuration are required; failures never fall back to legacy content. One UTC date drives scheduled sections and departure filters.
- Added `CmsExpeditionPage` with ordered hero/text/CTA/directory sections, controlled headings, widths/backgrounds/spacing/alignment, independent desktop/mobile images and credits. The directory owns its heading to avoid duplicate titles.
- Connected `/photo-expeditions` metadata and rendering to a request-cached loader behind the existing expedition rollout flag. Disabled rollout preserves the existing page. No deployment, data migration or flag changes performed.
- Verified: 626 CMS tests pass; TypeScript check and production build pass. Browser plugin unavailable; existing Playwright verified a temporary composed-page fixture at 1280×900 and 390×844 (headings, responsive credits, anchor navigation, geography/reset interaction, CTA target, no overflow or runtime errors). Synthetic media and empty directory used; fixture removed. Screenshots/scripts in `/private/tmp/expedition-page-*`. Initial immediate URL assertion raced navigation; changed test to wait for URL and both viewports passed.
- Pending: atlas-specific sitemap eligibility, composer directory preview, complete trusted expedition/page publishing policies, film/captions support, configured-provider and real-data acceptance, migration/cutover and client handover. This milestone does not establish production readiness.

### 2026-10-22 — Expedition atlas sitemap eligibility
- The migrated `/photo-expeditions` index now enters the sitemap only through the fully readable published page and its resolved page/site SEO. Missing pages, noindex, sitemap exclusion and alternate canonical URLs omit it; website noindex cannot be overridden by a page. No modification timestamp is invented for the published envelope.
- Removed the unconditional legacy atlas entry only when expedition rollout is selected. Detail URL eligibility remains independent of atlas visibility, so hiding the listing page does not hide otherwise indexable expedition details.
- Verified 627 CMS tests and TypeScript pass. Local `/sitemap.xml` returned valid XML containing exactly one legacy atlas URL and eight expedition detail URLs with rollout disabled. The enabled eligibility helper is covered with published-composition fixtures; live-provider rollout remains unverified and disabled.
- Remaining expedition work: composer directory preview, complete trusted publication policies, film/captions, provider acceptance and real-data migration. Full CMS goal additionally retains all outstanding PRD modules, operational readiness and client handover requirements.

### 2026-10-22 — Expedition directory composition preview
- Added a no-store published expedition directory endpoint with fixed configured website, English-only query validation, full snapshot-checked traversal and browser-side card/tenant/route/order validation. Invalid queries, missing delivery configuration, foreign websites and upstream failures are distinct from a valid empty directory; responses do not leak upstream diagnostics.
- Composition preview now renders the shared expedition directory with draft labels, section heading level and the selected preview UTC date. Refresh retries failures. Preview explains that expedition records are currently published, not pinned to the page revision; unsaved expedition edits are excluded. Directory headings are rendered once. Missing-site and unsupported-language states are explicit.
- Verified 629 CMS tests, including private-field/cross-site/route rejection, empty results, disabled delivery and changed-snapshot failure. Browser plugin unavailable; regular Playwright checked a temporary composition fixture at 1280×900 and 390×844: malformed response -> error -> refresh -> valid empty directory; heading count, filter/reset, preview date and no horizontal overflow/runtime errors. Screenshot reviewed. Fixture used the outer public shell, whose fixed header overlaps the initial preview note; this fixture is not a full authenticated CMS-shell acceptance test. Removed fixture after checks.
- Remaining: trusted expedition and page publishing policies, film/captions, configured-provider acceptance, live-data migration and client handover; the entire PRD remains the goal. Delivery flags unchanged.
- Final production build (including TypeScript) passed; log: `/private/tmp/cms-expedition-preview-build.log`.

### 2026-10-22 — Expedition atlas readiness checks
- Added expedition-page advisory checks to stored-content validation for `/photo-expeditions`: ordinary-page identity, English delivery, supported payload fields, exactly one configured visible directory, supported visible section kinds, no unsupported animation/region controls, and one nonblank H1 at the current time and every future visibility boundary.
- Schedule checks have no arbitrary future cutoff and catch a heading expiring in 2040 as well as an immediately missing, blank or locale-excluded heading. Existing generic composition validation continues to reject multiple configured H1 headings even when scheduled separately; scheduled heading handoffs are not claimed as supported.
- These findings are exposed through the existing validation worker path; the composition publication gate remains closed. Corrected stale expedition draft messages: enquiry rendering exists, but trusted published-form evidence and deployment acceptance remain required.
- Verification: focused tests cover current/future schedule gaps, hidden unsupported sections, locale/route/payload/control findings, directory-only heading expiry and preservation of the publication gate. Full-suite and TypeScript results recorded below.
- Full suite: 633 tests passed; TypeScript passed. No rollout flag, deployed policy or existing content changed.

### 2026-10-22 — Expedition reference evidence contract
- Added strict evidence for published specialist/form references: expected record IDs, exact content type, English locale and published revision UUID. Missing, unavailable, duplicate, unexpected, malformed and self-referential evidence produces field findings. A single specialist can legitimately fill both mentor and guide roles using one evidence row.
- Replaced blanket specialist/enquiry readiness messages with evidence-based findings, retaining the unconditional expedition publication gate. Stored-content and direct/queued trusted validation accept the new optional evidence. Fixed the queued worker's omission of existing specialist reference evidence while forwarding the new expedition evidence.
- This is the validator contract, not proof of a trusted database read: database extraction of expeditionStatus and publication-time rechecks are still pending. Existing callers without evidence continue to fail reference checks. No publication policy or rollout flags enabled.
- Focused tests verify evidence failures, shared mentor/guide identity, and queued-worker propagation while publication remains blocked. TypeScript passed. Full regression result recorded below.
- Final regression suite: 635 tests passed. Updated the legacy test's blanket `enquiry` expectation to retain the precise `enquiry.form` missing-selection check; blanket enquiry rendering blockers were intentionally replaced above.

### 2026-10-22 — Database-backed expedition reference evidence
- Added local migration `092-expedition-reference-status.sql`. The evidence RPC reads the requested stored expedition revision, scopes all related records to the same website and English locale, deduplicates mentor/guide references and reports current published revision IDs. Specialist availability uses the existing public eligibility reader (including media/dependency checks); forms require an eligible published definition with 1–50 fields and no unsupported file upload field.
- Anonymous execution is denied. Authenticated reads require view permission on the expedition; unrelated/foreign-site/missing-revision requests return no evidence. Trusted validation input now includes this evidence for expeditions, preserving prior type-specific evidence.
- Verified 636 CMS tests with the full migration chain in PGlite. New database tests cover anonymous/outsider access, website/revision scoping, unique shared specialist evidence, trusted-worker input, specialist-media rights revocation and form withdrawal. Tests use synthetic root-published fixtures and do not establish production publishing workflow or concurrent dependency locking.
- No remote SQL or rollout changes. Remaining before enabling publication: dependency rechecks at commit, complete expedition/page policy, provider/concurrency acceptance and all outstanding PRD migration/operational/handover work.

### 2026-10-22 — Expedition publication dependency recheck
- Added local migration 093 with a publication-pointer trigger that rechecks expedition dependencies before a release/rollback pointer change. It locks same-website published English reference records, follows specialist journey references, locks referenced media, and rechecks specialist public eligibility and supported published form definitions. Missing/self/invalid references, withdrawn forms and revoked/expired/archived media prevent release. Unpublishing remains possible.
- The trigger is private defense in depth; it does not enable the expedition validator policy or authorize client publication. Bounded graph traversal prevents unbounded dependency walks. Pointer-unchanged updates skip unnecessary release validation; public readers continue to check current eligibility after later withdrawal.
- Full database migration chain and 135 database tests passed in PGlite, including failed releases preserving null pointers after form withdrawal/media revocation, successful release after restoration, and continued rejection through the publisher API. Initial SQL variable/column ambiguity was fixed and tests rerun. Synthetic root publication fixtures are used.
- Actual multi-connection PostgreSQL lock ordering/deadlock and provider concurrency acceptance remain unverified; sequential PGlite tests do not prove concurrent correctness. Full expedition/page publishing policy, media/film completion, deployment and PRD handover work remain pending. No remote migration or rollout changes.
- Final full CMS regression suite: 637 tests passed.

### 2026-10-22 — Expedition validation/delivery consistency
- Local migration 094 aligns expedition image evidence, public eligibility and locked release-time media checks with the renderer's processed WebP requirement. Approved source JPEGs can no longer pass the image evidence check and then disappear from public delivery.
- Malformed expedition reference extraction now becomes an empty evidence array in trusted validation input. The strict content validator can report invalid fields/missing evidence rather than the transport schema rejecting null and retrying indefinitely. The direct permission-gated evidence RPC still preserves null for inaccessible/missing/malformed requests.
- 136 database tests passed, including JPEG evidence failure and blocked pointer update, plus malformed-reference input parsing into a failed content validation. No policy enabled or remote migration applied. Full regression result follows.
- Full regression suite: 638 tests passed. Remaining: final expedition/page publication policy, live PostgreSQL concurrency/provider acceptance, film/captions, broader PRD migration/operations and client handover.

### 2026-10-22 — Supported expedition publication policy
- Supersedes the unconditional expedition draft gate: `expedition-1` now returns valid only when the strict payload, required copy/images, route/locale, SEO, media evidence, nonempty content items and published specialist/form evidence pass. Film remains explicitly unsupported and invalid; this is still outstanding full-PRD work.
- Added local migration 095 with the deployment-owned expedition-1 receipt policy and a published route/slug/English identity trigger. Existing independent review, current-revision validation receipt expiry/version checks, media locks and reference rechecks remain required. No remote migration or public delivery flags changed.
- Added full database workflow coverage using the real trusted validator and receipt RPC: independent approval required; publishing before validation rejected; valid expedition passes; withdrawing form after validation blocks release; restoring it permits publication; anonymous public reader/projector delivers the result; invalid replacement draft cannot replace the published revision. Unlike prior root-pointer fixtures, this test publishes through the publisher RPC.
- TypeScript passed. Complete-content unit checks also cover supported success, unavailable reference/media rejection and continued film rejection. Full suite result follows.
- Remaining: rollback acceptance for expeditions, atlas/specialist publishing policies, film/captions, real PostgreSQL concurrency/provider acceptance, data migration, remaining PRD modules and client handover. Local policy support is not a claim of production readiness.
- Final full regression suite: 640 tests passed.

### 2026-10-22 — Expedition rollback acceptance
- Verified restore-as-new-draft using the real expedition save/review/trusted-validation/publish path. Stale restore expectations fail; historical revisions remain immutable/retained; restoring does not replace published content; fresh independent approval and a new valid receipt are required.
- Verified media revocation after validation rejects publication and preserves the existing published pointer. Restoring rights permits the restored draft to publish, and public delivery returns its historical content under the new revision ID.
- All 138 database tests passed. This adds backend acceptance evidence, not a new immediate rollback API. Inspection confirmed the expedition workspace still lacks review/publish controls and does not yet enable trusted-validation requests; completing that client workflow is the next implementation step. Existing revision-history restore UI is present.
- No remote changes. Full PRD scope, provider concurrency, remaining page policies, film support, deployment and client handover remain pending.

### 2026-10-22 — Expedition client review and publishing controls
- Added permission-aware expedition review actions (submit, approve, request changes), publish/withdraw confirmation bound to the selected revision, and trusted-validation requests to the expedition workspace. Dirty/busy/import-pending states disable workflow changes; changing revision/state clears pending confirmation. Successful actions reload record/list state and explain the separate website rollout requirement.
- Advisory validation now reads authenticated expedition reference evidence, so the editor's saved-content check includes current linked form/specialist status. Advisory success never authorizes publication.
- Fixed restoration title consistency in local migration 096: restoring an expedition now restores its payload title into the record's list title, preventing the workspace from rejecting a restored older title as inconsistent. Existing non-expedition restore behavior is preserved. Database rollback test asserts title consistency.
- Browser plugin unavailable; regular Playwright verified real Workflow/ValidationPanel components in a temporary fixture at 1280×900 and 390×844: request check, submit/approve, confirmation clearing on dirty state, publish/withdraw confirmation and cancel, read-only controls, no runtime errors/horizontal overflow. Fixture backend actions were simulated; full authenticated workspace/provider acceptance remains pending. Screenshot reviewed; fixture public-shell styling/scroll position is not final CMS visual acceptance. Fixture removed.
- Production build including TypeScript passed. Full suite result follows. No live migration, deployment or rollout flag changed.
- Final full regression suite: 642 tests passed. Updated the existing advisory transport test to expect the newly required expedition evidence read.

### 2026-10-22 — Expedition listing page publication policy
- `/photo-expeditions` ordinary pages now emit expedition-page-1 validation results after strict composition, SEO/media, supported section/control, directory-count and current/future heading checks. Other page routes and homepage publication remain unsupported; the full page-composition goal is not reduced to this route.
- Local migration 097 registers the page policy version and prevents a published expedition atlas from changing its route/type or using an unsupported locale. Public delivery still requires separately configured rollout and published SEO settings; no live flags or remote migrations changed.
- Full trusted-worker/database workflow verifies submit/independent approval/current receipt/publish, anonymous published composition projection, invalid replacement rejection and preservation of the published revision. Unsupported animation is explicitly rejected. Direct published route/language mutation is rejected.
- Verified 643 CMS tests and TypeScript passed. This is local backend policy acceptance. Page-editor review/publish controls and trusted-check requests still need connection for this route; provider/concurrency acceptance, other page policies, film support, migration and client handover remain pending.

### 2026-10-22 — Expedition listing page editor workflow
- Connected trusted-check requests and permission-aware review/publish/withdraw controls to the `/photo-expeditions` page in Pages. Other page routes remain explicitly unsupported for publication. Shared expedition workflow supports a listing-page label, exact-revision confirmation and disabled dirty/busy states. Successful actions reload record/list data and distinguish recorded publication from rollout configuration.
- Page loads now reject wrong-record/type responses before populating editor state.
- Browser QA uncovered duplicate React sibling keys: repeated updates duplicated SEO panels. Added distinct prefixes to page preview/workflow/SEO/sharing panels and expedition sharing/validation panels. Retest asserts exactly one SEO panel and captures console errors as well as runtime errors.
- Browser plugin unavailable; Playwright exercised the real PagesWorkspace with a simulated API at 1280×900 and 390×844: load, request trusted check, submit/approve, publish/withdraw confirmations, resulting messages and dirty-state disabling. Final runs pass with no console/runtime errors. Temporary fixture removed. Screenshots reviewed; fixture uses public shell and unstyled admin controls, so full authenticated CMS visual/provider acceptance is still pending.
- Regression suite passed 643 tests; final production build result follows. No remote changes, publication or rollout changes.
- Final production build including TypeScript passed after the duplicate-key fixes.

### 2026-10-22 — Ordinary page validation version consistency
- Fixed a policy mismatch introduced when adding the expedition atlas: unsupported ordinary pages emitted composition-draft-1 while the type-wide policy expected expedition-page-1, so invalid drafts could fail receipt acknowledgement and repeatedly retry.
- All ordinary pages now emit the common composition-1 validator version; only the supported expedition atlas can pass its route-specific checks. Unsupported routes still return publication_not_ready. Homepages retain their disabled draft-only policy.
- Local migration 098 updates the page policy version, invalidating older atlas receipts so they must be rechecked. No public support is silently added for other page types.
- Real database queue test requests/claims/validates/acknowledges an unsupported ordinary page: one attempt, completed job, invalid receipt with actionable findings, no worker error/retry. Old-version receipts are rejected. Full regression suite: 644 tests passed; TypeScript passed.
- No remote migrations/deployment. Remaining full PRD modules, other publication policies, film/media, provider/concurrency acceptance and client handover remain pending.

### 2026-10-22 — Specialists directory page publication
- Extended supported ordinary-page validation to `/specialists` using its existing hero/text/CTA/directory renderer and route-specific readiness checks. Generic composition/SEO/media and future heading-boundary checks still apply. This does not enable individual specialist profile publication or other ordinary pages.
- Local migration 099 updates the shared ordinary-page validator policy to composition-2 and protects the published Specialists page from route/type/language changes that its renderer cannot support. Older page receipts require revalidation.
- Added actual database save/submit/independent approval/trusted worker receipt/publish/public-projection coverage for the Specialists directory. Unsupported replacement controls fail validation and preserve the published revision; direct route/locale mutation is rejected. Updated earlier draft-only assertions to reflect supported publication rather than retaining obsolete blockers.
- TypeScript passed; full regression result follows. Page-editor workflow controls for `/specialists`, specialist profiles, film support, global settings/other PRD work and live/provider acceptance remain pending. No remote migrations or delivery flags changed.
- Final full regression suite: 645 tests passed.

### 2026-10-22 — Specialists directory editor workflow
- Enabled Pages trusted-check requests and permission-aware review/publish/withdraw controls for `/specialists`, alongside `/photo-expeditions`. Other routes retain their unsupported-publication state.
- Shared confirmation UI now receives the correct specialist/expedition rollout context; successful publication messages use the selected page's delivery requirement. Existing dirty/busy protection and revision-bound confirmation remain intact.
- Browser plugin unavailable; regular Playwright exercised real PagesWorkspace with simulated API responses at 1280×900 and 390×844. Request check, submit, approve, publish/withdraw, resulting messages and dirty-state blocking passed. One SEO panel remains after repeated updates; no console/runtime errors. Screenshot reviewed; fixture uses public shell, not final authenticated CMS visual acceptance. Temporary fixture removed.
- Production build result follows. Individual specialist publication, film, remaining PRD modules, real provider acceptance/deployment and client handover are still pending. No live changes.
- Production build including TypeScript passed after the workflow changes.

### 2026-10-22 — Specialist portrait publication consistency
- Added local migration 100 aligning specialist portrait media evidence, record eligibility and locked release checks with the public reader's WebP requirement. Approved source JPEGs remain unavailable for profile delivery; processed approved images pass. Rights/expiry/archive checks remain enforced.
- Database test verifies JPEG evidence/release rejection, WebP eligibility/public reading and withdrawal after MIME change. Synthetic root-published fixture tests media behavior only, not specialist workflow authorization.
- Found and fixed save-boundary normalization for specialist and expedition editor APIs: schema defaults (notably image.decorative) were validated but raw payloads were persisted. Parsed payloads are now saved so public readers receive the validated/defaulted image fields. Added API regression coverage.
- Full suite: 647 tests passed; TypeScript passed. The first public fixture assertion exposed its missing decorative flag, prompting the normalization fix rather than only adjusting fixture data.
- Individual specialist publication policy/dependency rechecks remain pending, along with film, other PRD modules, live/provider acceptance and handover. No remote migrations or rollout changes.

### 2026-10-22 — Supported specialist profile publication
- Replaced the unconditional specialist draft gate with specialist-1 validation for complete supported profiles. Required copy/planning labels, portrait evidence, correct route/locale and typed available journey evidence remain mandatory; self-references are rejected. Films and related expedition links remain explicitly unsupported and invalid, preserving outstanding PRD scope.
- Local migration 101 registers the specialist policy and adds locked release-time journey/media rechecks plus null-path/English identity enforcement. Malformed reference extraction becomes empty trusted evidence so validation reports findings rather than transport retries. Profiles without a currently deliverable linked journey cannot release; later withdrawal also removes them from public delivery.
- Added real save/independent approval/trusted-worker receipt/publish/public-read workflow coverage. A linked journey is also validated and published through its normal workflow. Withdrawing it after profile validation blocks profile release; restoration allows release; subsequent withdrawal makes public reading unavailable. Invalid route mutation is rejected.
- Full regression suite: 648 tests passed; TypeScript passed. Updated obsolete always-invalid tests to assert supported success while retaining incomplete/media/reference/video rejection checks.
- No remote migration or rollout enabled. Specialist editor publication controls, rollback acceptance, expedition cross-links/film support, real-provider concurrency, remaining PRD modules and client handover remain pending.

### 2026-10-22 — Specialist profile editor publication controls
- Connected trusted-validation requests, submit/approve/request-changes and publish/withdraw confirmation to the specialist profile workspace. Actions bind to the saved revision, reload state after success and explain that directory visibility and specialist rollout still control display. Dirty/busy states disable actions; migration-pending state now also blocks editing, navigation and workflow changes while allowing recovery in the migration panel.
- Reused the tested confirmation component with specialist-specific labels/rollout context; no backend authorization rules were relaxed.
- Browser plugin unavailable; Playwright exercised the real SpecialistsWorkspace with a simulated API at 1280×900 and 390×844: record loading, request check, review, publish/withdraw, success messages and dirty-state blocking. One validation panel remains and no console/runtime errors occurred. Screenshots reviewed; temporary fixture/public shell is not full authenticated CMS visual acceptance. Removed fixture after checks.
- TypeScript passed; final production build result follows. Specialist rollback/history UI, films, related expedition links, remaining PRD work, live provider/concurrency acceptance and handover remain pending. No remote changes.
- Final production build including TypeScript passed.

### 2026-10-22 — Specialist restore/rollback acceptance
- Local migration 102 keeps the specialist list name aligned with the historical payload name when restoring a profile, while preserving expedition restore behavior and other content types' existing behavior.
- Added full real-database restore-as-new-draft acceptance: stale expected revision rejected; new draft ID created; published profile remains unchanged; review approval reset; separate reviewer and fresh trusted receipt required; a journey withdrawn after validation blocks restored publication; restoring dependency eligibility permits release. Original, replacement and restored revisions remain retained.
- Full regression suite: 649 tests passed in local PGlite. This proves sequential workflow behavior, not real PostgreSQL concurrent scheduling/provider acceptance. No remote migration or public rollout changes.
- Next: specialist revision-history/restore UI. Films, related expeditions, other CMS/PRD modules, live acceptance/deployment and client handover remain pending.

### 2026-10-22 — Specialist revision history and restore UI
- Added profile revision history with current-draft and published labels, permission-gated restore buttons and explicit restore-as-new-draft confirmation. Restore sends the selected historical ID plus current expected revision, guards dirty/busy/migration state and refreshes the profile/list after success. It explains that approval and trusted validation are required before publishing.
- Browser plugin unavailable; Playwright verified real SpecialistsWorkspace with a simulated restore backend at 1280×900 and 390×844: cancel makes no request; confirm sends exact historical/current IDs; restored name and new history refresh; published history stays marked; dirty state disables restore; read-only users see history without restore buttons. No console/runtime errors. Screenshots reviewed. Temporary fixture/public-shell presentation is not final authenticated CMS visual acceptance; fixture removed.
- TypeScript passed; final production build result follows. Backend rollback coverage was previously verified in the 649-test suite. Films, expedition cross-links, remaining PRD modules, provider/concurrency acceptance/deployment and handover remain pending. No live changes.
- Final production build including TypeScript passed.

### Featured header selection milestone
Settings now expose mixed-type featured header content authoring: search journeys/destinations/journal articles, add up to 12 unique records, reorder and remove, with draft/publication status hints and read-only guards. Changes retain the existing impact-review/save workflow. Thirteen relevant tests, TypeScript and production build passed; desktop/mobile synthetic browser interaction checks passed without captured browser errors. No temporary QA route remains. Settings release policy, provider acceptance, remaining PRD modules and client handover are still outstanding; no rollout enabled.

### Settings backend release milestone
Local settings policy 103 and `settings-1` now allow complete, supported settings revisions through the trusted publication workflow. The unconditional draft-only gate is replaced by actual schema/content/reference checks. Normal authenticated publish acceptance, dependency withdrawal, invalid replacement isolation and fresh-review rollback are covered. Full CMS suite: 652 tests passed; TypeScript passed. Settings admin release controls, managed-provider acceptance, rollout and remaining PRD work are still pending. No remote migration or delivery switch was changed.

### Settings admin publishing milestone
Settings admin now connects trusted validation requests, approved-revision publication and exact-revision withdrawal, with confirmation, busy/dirty guards and permission-based controls. The backend remains authoritative for sensitive configuration authority and release eligibility. Actual workspace behavior passed synthetic desktop/mobile browser QA; production build (including TypeScript) passed. No temporary QA route remains. Provider deployment, account-level acceptance, remaining content modules and complete client handover remain outstanding. Rollout flags remain unchanged.

### Legal page delivery foundation
Privacy, terms and cookie pages now have disabled-by-default CMS route branches with structured text composition, editable presentation/visibility, shared SEO resolution and strict published readers. Existing legal content remains intact. Four contract/runtime tests, desktop/mobile renderer QA and production build (including TypeScript) passed. Legal publication gates, migration/parity review, sitemap integration and provider acceptance remain pending; this is not a completed legal-page editing/release workflow. Full remaining PRD scope is unchanged.

### Legal page publication backend
Migration 104 and ordinary-page policy `composition-3` now cover privacy, terms and cookie text compositions. Existing ordinary-page receipts require renewal for subsequent publication. Current and future heading/anchor visibility, verified links, SEO and media checks apply; database release checks lock/recheck public route availability and retain legal route/language identity. Normal workflow acceptance covers all three routes and invalid replacement isolation. Full suite: 658 tests passed; TypeScript and production build passed. Admin release controls, copy migration/parity, sitemap integration and production acceptance remain pending. No live migration or rollout performed.

### Legal editor and sitemap milestone
Legal pages now participate in the Pages workspace's review, trusted validation, confirmed publish and withdrawal workflow with legal-layout guidance. Enabled legal delivery replaces static sitemap entries with readable published pages filtered by canonical/indexing rules. Full local suite: 659 passed; desktop/mobile workspace QA and production build (including TypeScript) passed. Existing legal copy migration/parity, provider acceptance, all other pending PRD modules and handover remain outstanding. Live rollout unchanged.

### Legal migration inventory and review candidates
Captured ordered source content and hashes for all three existing legal routes. Terms/cookies now have source-parity review candidates; privacy is explicitly blocked on three inline email links and one heading-only parent section, with exact source fragments preserved. Four migration tests and TypeScript passed. No CMS write/publication performed. Completing those representation gaps, reviewed draft application, provider acceptance and the remaining full PRD scope are still pending.

### Privacy content representation milestone
Inline paragraph links, safe single-recipient email destinations and heading-only legal sections now preserve the existing privacy content. All three legal migration review candidates are generated without representation findings. Normal database publish acceptance preserves the captured privacy payload. Full suite: 666 tests passed; browser editor/render parity checks and production build/TypeScript passed. No real CMS import/publish was performed. Conflict-safe reviewed application, provider acceptance and the full remaining PRD scope remain active.

### Atomic legal migration backend
Migration 106 adds transactional create/update draft batches and actor/site-scoped retry receipts. Tests prove stale-batch rollback, no duplicate revisions on retry, unchanged publication, permission revocation and cross-site isolation. Full local suite: 668 passed. API review/apply/status wiring, user-facing migration recovery and real provider acceptance remain pending; no live content was imported or published.

### Legal migration API milestone
Authenticated review/apply/status endpoint now rebuilds candidates from server-owned captured source, binds reviews to exact site/target revisions and recovers completed retries through real database receipts. No client-supplied policy text or automatic publication. Full suite: 674 tests passed; production build/TypeScript passed. User-facing review/apply/recovery, provider verification, other PRD modules and final handover remain pending. No remote migration or content publication performed.

### Legal migration client workflow
Pages now exposes controlled legal migration review, before/after content, explicit draft application and account/site-scoped persistent request recovery. Page editing and migration guard each other's unsaved/pending state. Full local suite: 677 passed; desktop/mobile lost-response/reload QA and production build/TypeScript passed. No production import or rollout occurred. Real-provider acceptance, broader content coverage/remaining PRD modules and client handover remain pending.

### About page delivery foundation
Inspected About source and mapped its hero/story/leadership/principles/SEO fields in the editability register. Added disabled-by-default published About route and renderer for hero, text, imageText, cards and CTA, including independent mobile accessibility/credits and shared SEO resolution. Four projection/runtime tests, desktop/mobile rendered QA and production build/TypeScript passed. Publication policy, release UI, sitemap and source/media migration remain pending; legacy focal point, heading emphasis and motion need representation or an explicit approved exception. Existing website remains unchanged by default.

### About publication backend and composed-page media consistency
About now has trusted validation and database release guards under `composition-5`; ordinary-page receipts need renewal for subsequent release. Page/homepage media checks now consistently require processed WebP and approved current rights, matching public delivery. Actual local approval/validation/publish acceptance covers JPEG rejection, rights/link changes after validation and successful anonymous rendering. Full suite: 684 passed; TypeScript passed. Editor release controls, sitemap, source/media migration, production acceptance and all broader PRD work remain pending. No live migration applied.

### About editor and sitemap milestone
About now participates in the Pages workspace's trusted check/review/publish/withdraw flow with supported-layout guidance. Enabled delivery uses the actual published page and SEO rules for sitemap eligibility. Full local suite: 685 passed; desktop/mobile workflow and migration-pending guards passed; production build/TypeScript passed. Source/media migration, original presentation details, provider acceptance and the broader remaining PRD modules remain pending. No production migration or rollout performed.

### About presentation and source-derived migration workflow
Implemented optional hero/portrait framing, heading emphasis, section labels, numbered principles, grouped leadership, full-width overlay hero, split story/button treatment and scoped About motion with reduced-motion/focus cleanup. Source capture records five dependency hashes, four source image hashes, all nine headings, emphasis, biographies, principles, labels and links. The deterministic review proposal preserves the captured content; it remains explicitly review-only until mappings and approvals are supplied.

Local migrations 109–110 add source-provenance/media-rights evidence and transactional draft application/receipts. The API now verifies review/apply/status identities, rechecks current target/media state, handles lost responses and returns exact completed retries without overwriting later edits. Browser helpers validate digests and store bounded account/site-scoped recovery identifiers/evidence without page copy or credentials. The Pages panel maps four images, displays before/proposed content, requires acknowledgement, blocks competing edits and preserves uncertain outcomes for recovery.

Evidence through the panel milestone: 716 CMS tests and production build/TypeScript passed. Desktop/mobile rendering, content parity, responsive layouts, reduced-motion changes, keyboard visibility, source/media validation, transactional rollback, later-edit preservation, storage-write failure before apply and lost-response/reload recovery were exercised locally. Detailed evidence and limitations are in `about-page.md` and `about-migration-plan.md`. No remote migrations, real-media import, production publication or rollout occurred.

Remaining scope is unchanged: real-provider/media/concurrency validation and client design/task acceptance, other inventoried page/template coverage, remaining PRD modules, operational backup/restore/load/security evidence and client handover. Passing local tests is not completion of those gates.

### Integrated Pages migration guards verified
Actual PagesWorkspace browser checks at 1280px/390px verified simultaneous restored legal/About recovery, usable recovery controls, page-operation blocking until both requests resolve, selected About replacement mode and unsaved-edit guards. No production code change was needed; a strict test locator was corrected after inspection. Temporary fixture removed. Previous full suite remains 716 passing; this turn added integrated browser evidence rather than rerunning unchanged unit/database tests. Provider validation, client acceptance and wider PRD coverage remain pending.

### Homepage source coverage inventory — 2026-10-22

Completed a manual dependency trace of the homepage route, its separate menu and imported corporate/partner/guest-note sections. Recorded ten potentially visible content sections (two depend on available data), four disabled sections, metadata and global-shell boundaries in `homepage-editability-inventory.json`. The initial working count omitted the concierge; the recorded ten-section inventory is authoritative. Candidate composition mappings explicitly identify unsupported presentation and field contracts rather than claiming generic schemas provide complete editability.

Added `homepage-migration-plan.md` with the source-preserving implementation sequence and validation gates. Added a read-only source freshness checker; all 16 traced hashes match. No production code, live content or publication flags changed. This step is inventory/planning progress, not a working CMS homepage. Next: implement the missing homepage field contracts and renderers, followed by published reference integration and reviewed migration. Real provider validation, whole-site coverage and client acceptance remain outstanding.

### Homepage heading and hero contracts — 2026-10-22

Added source-preserving editorial heading lines/fragments, an escaped text renderer, and a reusable heading editor with exact character counts and validation. Added the separate homepage hero draft contract for uniquely identified ordered frames and responsive poster/video references. These additions leave existing page contracts and live homepage behavior unchanged. Five new contract cases plus two existing heading tests pass; `npx tsc --noEmit` passes. This is a foundation milestone: the new editor is not yet mounted in Pages, media publication checks and the rotating hero renderer remain pending, and no homepage release is enabled.

### Homepage hero composer controls — 2026-10-23

Connected the new homepage hero contract to the page composer and static composition preview: headline frame add/remove/reorder, multiline/emphasized heading editing, poster selection and responsive framing. Video references are preserved but not selectable/playable yet. Desktop/mobile Playwright interaction checks passed with no page errors; temporary test route removed. All 721 CMS tests pass. Root homepage record editing/delivery, remaining homepage sections, video verification, live provider checks and client acceptance remain pending; this does not enable homepage publication.

### Separate homepage draft workspace — 2026-10-23

Added Homepage to the CMS navigation and connected the shared composition/SEO editor to homepage records at `/`. Draft create/save/reload/update flows use the existing authorized content API and expected revision. The API requires root identity, valid composition and matching title while preserving unrelated payload data. Existing unmigrated content is not overwritten. Desktop/mobile synthetic browser save-flow checks passed; the temporary route was removed. Root record creation is now wired in the editor, superseding the earlier pending note; source migration, direct-RPC identity guard, final rendering, publication and provider/client acceptance remain outstanding.

### Homepage database identity guard — 2026-10-23

Added migration 111 to require `/` for new/updated homepage records at the database boundary, including direct RPC callers. Legacy records are preserved in place; invalid legacy routes require explicit migration before further edits. Verified root creation/update, route uniqueness, expected-revision conflicts, unauthorized callers and unchanged publication through the full local database harness, plus legacy migration preservation. All 157 database/migration tests passed. No remote migration or publication occurred. Remaining homepage work includes source migration, complete section contracts/renderers, media/video release validation and live delivery; provider validation and client acceptance remain pending.

### Homepage story/experience editor — 2026-10-23

Added the grouped homepage story and experience section to the composer and static preview, including multiline/emphasized heading, copy/link, ordered statistics, numeric suffixes and internal evidence notes. Browser checks passed at desktop/mobile sizes for editing, ordering, formatting, evidence omission and responsive layout. Contract tests reject invalid figures, duplicate item identities and unsafe links. Source migration, count-up motion, final public projection (including stripping internal evidence), full homepage fidelity and publication remain pending. No current website content or rollout flag changed.

### Homepage journey-planning choices — 2026-10-23

Connected a dedicated concierge section to the composer/preview with separate formatted headings, reorderable region choices and contact action. Existing encoded planning-form queries are preserved. All 728 CMS tests pass; desktop/mobile browser interaction checks passed with no page errors after correcting a test-only label selector. Source migration, remaining homepage sections, final public rendering and trusted publication remain pending. No existing homepage content was changed.

### Ways to journey editor — 2026-10-23

Added the homepage journey-type cards contract, editor and static preview: formatted section/card headings, inline strong-emphasis descriptions, media metadata, safe links and stable reordering. Desktop/mobile browser checks pass after a test-only selector correction; temporary route removed. All 731 CMS tests pass. Remaining work includes source migration, approved final presentation/motion, other homepage sections, public delivery and provider/client acceptance. Existing website content remains unchanged.

### Rendered homepage migration evidence — 2026-10-23

Created a repeatable read-only local homepage capture, binding rendered content to 16 source hashes and 100 original image hashes. Captured all 10 visible sections at desktop/mobile widths, all three partner regions, six guest notes, menu links and metadata. Three new evidence tests pass, including exact partner-state matching and duplicate-free counter extraction. This does not migrate or publish content. Remaining capture/migration scope includes rotating hero/video, hidden sections and decorative menu images, followed by source-preserving draft proposals, final renderer validation and client acceptance.

### Preferred partners editor — 2026-10-23

Connected grouped partner-region editing and static preview to the composer: labels, default region, ordered partner names/logos and image metadata. The model represents all 78 existing logos across three regions, including Africa's 38. Desktop/mobile checks passed for keyboard tabs, stable selection/reorder and safe removal of the selected/default region; temporary route removed. Final marquee/style fidelity, media mapping, source migration and published homepage delivery remain pending.

### Corporate journeys editor — 2026-10-23

Connected corporate-journey composition editing and static preview: two independently managed images/captions, formatted heading, ordered paragraphs and travel-format links, and separate CTA. Desktop/mobile browser interactions passed with no page errors, and two new contract tests passed. Source asset migration, final source-theme fidelity, remaining homepage sections and public delivery remain outstanding. No CMS records or current website content were changed.

### Private aviation editor — 2026-10-23

Connected private-aviation composition controls and static preview, including label/heading/summary, ordered benefits, CTA, image metadata and desktop/mobile framing. Desktop/mobile browser checks passed after retrying a page-load timeout with a DOM-ready navigation wait; no server restart or production data change. All 740 CMS tests and TypeScript pass. Next: collection-backed homepage journeys/departures/guest notes, then complete source migration, final visual/motion fidelity and publication/provider/client acceptance. Hidden sections and the separate homepage menu remain in scope.

### Curated homepage journeys — 2026-10-23

Added CMS journey record selection and ordered card preview with editable per-record kickers retained across reorder. Draft previews enforce requested identity/type/path/one hero and show an explicit whole-collection error if any record is unavailable. Added a separate strict published-summary resolver preserving published revision IDs and rejecting missing/duplicate/malformed selections; public route/release integration is still pending. Desktop/mobile interactions passed after an initial page-ready timeout and read-only reinspection. All 743 CMS tests pass. Next: departures and guest-note integration, source migration, final presentation, trusted publication/provider verification and client acceptance.

### Homepage departure board — 2026-10-23

Connected homepage departure-board editing and preview to the existing published expedition directory endpoint. Shows one nearest upcoming date per expedition with editable labels and optional title/location overrides, without conflating unavailable responses with empty schedules. Desktop/mobile browser tests passed for dates, labels, keyboard focus and error/empty states; temporary fixture removed. Real provider validation, automatic scrolling/final source fidelity, source migration and homepage publication remain pending. Guest-note integration is next.

### Homepage guest-note carousel — 2026-10-23

Connected testimonial selection to the homepage guest-note editor and carousel preview, with independent landscape image/link, editable labels and next/previous controls. Draft/public projection helpers omit internal evidence and withheld identity/portrait fields; public projection rejects unverified or non-consented notes. Desktop/mobile browser checks passed after correcting an overly broad test-only secret marker; temporary route removed. Films, trusted published-testimonial delivery/dependency locking, source migration, final fidelity and provider/client acceptance remain pending. All ten visible homepage section families now have draft controls/previews, which is not a completed homepage migration or production release.

### Homepage source-to-editorial conversion — 2026-10-23

Added bounded, strict conversion of captured heading/paragraph structures to CMS editorial fields, preserving line breaks, emphasis and visible whitespace. Unknown markup blocks migration instead of being stripped. Added non-executing AST extraction and source resolution of all five hero frames; refreshed the read-only homepage inventory. Seven focused tests and TypeScript passed. Complete reviewed migration composition, media/record mappings, hidden sections/menu/video fidelity and trusted public delivery remain pending; no content was applied or published.

### Homepage hero video migration evidence — 2026-10-23

Extended the read-only homepage capture with a separate normal-motion desktop inspection of the hero video declaration. The artifact now preserves both ordered responsive source declarations, poster/label, playback attributes, byte lengths and SHA-256 hashes of the desktop/mobile MP4 files. Reduced-motion content snapshots remain separate. Refreshed the local inventory and passed eight focused capture/editorial tests. This verifies declarations and source bytes, not playback, rights, processed CMS video assets or public release. Complete migration composition, asset/record mappings, guest films, source fidelity, trusted delivery and provider/client acceptance remain pending.

### Homepage migration dependency review — 2026-10-23

Added a reproducible file-only review command and artifact covering all 10 captured visible section families, 102 image/video files, three curated journey records, seven captured expedition records and six guest notes. Proposed bindings are scoped to the exact capture digest and source bytes; unknown/stale/duplicate/placeholder mappings fail. Missing IDs remain explicit nulls rather than synthetic CMS records. Fully mapped inventories still cannot apply or publish. Twelve focused tests and TypeScript passed. Complete source-preserving composition, final presentation, provider-backed mapping/rights/consent/revision checks, recoverable application and public delivery remain pending; no live content changed.

### Complete mapped homepage composition proposal — 2026-10-23

Added the schema-validated proposal builder for all 10 visible homepage families, using complete proposed media/record bindings and captured semantic detail. It preserves source order, five hero frames/video variants, editorial headings/strong copy, statistics, journey kickers, departure display overrides, corporate formats/captions, aviation framing/benefits, 78 partner logos, six guest-note selections and planning/contact links. Missing mappings produce no composition instead of fabricated references. All 760 CMS tests and TypeScript passed. No live data was applied/published. Remaining: provider-backed mapping and source-record comparison, corporate crops and full presentation/motion review, guest films/hidden sections/navigation migration, recoverable application, trusted homepage delivery, broader PRD modules and client acceptance.

### Corporate responsive crop controls — 2026-10-23

Added independent desktop/mobile focal points for main/inset corporate images, editor reset controls, responsive preview rendering and captured-source migration mapping. Browser checks at 1280/390 passed for independent changes, mobile inheritance/override removal, reset isolation and read-only disabling with no runtime errors. The initial temporary-route request returned 404 before the running dev server discovered the route; a read-only recheck returned 200 and the same server then passed. Synthetic screenshots inspected; temporary route removed. All 761 CMS tests and TypeScript passed. Final homepage fidelity, real media/record migration, provider-backed publication and client acceptance remain pending.

Production build also passed after temporary fixture removal; the homepage source inventory freshness check remained valid.

### Homepage mapped-record source comparison — 2026-10-23

Added site/type/route checks and captured-source comparison for the three journeys, seven expeditions and six guest notes. Checks cover homepage-visible copy, journey/expedition imagery, guest display identity/consent/verification and captured departure dates. Reports contain revision identities and field-level findings without raw private payloads or consent evidence. The review CLI accepts optional record evidence; matching remains review-only and does not attest provider origin or authorize application. The full 766-test CMS suite and TypeScript passed, followed by six focused comparison tests including an additional malformed/private-payload case. Real provider reads/locks, media rights, current availability, visual acceptance, migration application and public release remain pending.

### Authenticated homepage migration comparison — 2026-10-23

Added the read-only `/api/cms/migrations/homepage` endpoint, checking new/existing homepage permissions and current target revision before fetching all mapped dependencies through caller-token, site-scoped invoker/RLS reads. It rejects unavailable/mismatched provider responses without partial success, accepts no client record payload or apply action, and returns a private review digest, proposal and field-only comparison. Automated tests use simulated provider responses; this is not live-provider validation. All 772 CMS tests, TypeScript and production build passed. Media original/processed-byte and rights checks, review UI, live provider validation, atomic/recoverable draft application, source presentation and public homepage delivery remain pending.

### Homepage migration review screen — 2026-10-23

Added the Homepage workspace's read-only mapping-file review panel, with bounded/unique manifest parsing, strict response identity/coverage checks, comparison findings and section-order display. It clears stale results on target/dirty-state changes and aborts/discards late responses after website switches. Desktop/mobile Playwright checks passed with simulated API responses for invalid/valid files, matching/differing records, busy/dirty guards, no apply/publish controls and stale response handling; the initial 404 cleared after the existing dev server discovered the temporary route. Fixture removed. Screenshots are synthetic behavior checks outside the normal CMS shell, not final visual acceptance. All 775 CMS tests, TypeScript and production build passed. Actual mappings/media verification, live-provider checks, recoverable draft application, final source fidelity and public homepage delivery remain pending.

### Homepage image provenance and rights checks — 2026-10-23

Connected all mapped homepage images to the existing caller-scoped source-hash/processed-WebP/rights database checks, in bounded four-image batches. Exact complete evidence is required; mismatches and revoked/expired/unavailable images remain visible. Media evidence now participates in review identity, and the UI shows passed-image counts and unresolved hero videos without claiming overall media readiness. Local database coverage verifies batching, revoked rights and outsider denial; desktop/mobile synthetic-browser checks verify pass/fail counts and pending videos. All 780 CMS tests, TypeScript and production build passed; temporary fixture removed. Video inspection/delivery/rights verification, real provider exercise, atomic/recoverable application, final source presentation and public homepage rollout remain pending.

### Background-video input policy — 2026-10-23

Inspected the image-only upload/storage/worker path and confirmed no local FFmpeg/FFprobe runtime in the checked executable/runtime locations. Added bounded MP4 source preflight and background-video metadata limits, including track/codec/dimensions/frame-rate/duration consistency and an explicit requirement for a silent delivery derivative. Both captured hero originals passed header checks with unchanged source hashes; four focused tests and TypeScript passed. This is preflight only: no decoder, malware scanner, video storage, video rights or delivery readiness has been claimed or enabled. Next: isolated real video processing and its worker/storage integration, followed by media verification/application and full homepage delivery.

### Real hero-video processing — 2026-10-23

Installed local FFmpeg/FFprobe and implemented bounded worker-side probing, H.264 silent transcoding, derivative validation/full decode and temporary-file cleanup. Both actual homepage originals processed successfully, preserving 15-second mobile and 69.333333-second desktop durations; browser playback advanced frames at expected dimensions with no media errors. Local scanner callbacks were test stubs, so no production malware/rights clearance is claimed. All 787 CMS tests (including real processing tests, zero skips) and TypeScript passed. Remaining: production scanner/isolation, video reservation/storage/completion and rights/recovery/public delivery integration, migration application and broader CMS/client acceptance. No original file was overwritten or published.

### Video reservation and worker lifecycle — 2026-10-23

Added local migration 112 for separate video reservation/claim/completion, bounded silent-video metadata, uploader idempotency/quota, lease recovery and retry limits. Image transfer/claims/completion and current publishing/media-delivery checks reject video assets. Added the video worker orchestration with exact original hashes, immutable derivative storage contract and lost-acknowledgement handling. Database tests verify permission/type isolation, invalid completion rejection, stale leases/retry caps and pending rights; real-processor worker tests verify successful processing and outage/recovery paths. Fixed a test-only temporary-directory race by using an isolated configurable scratch root. All 793 CMS tests and TypeScript passed. Migration not applied remotely; private video storage/API/UI, production scanner/worker adapter, rights checks and public video/homepage delivery remain pending.

### Private video storage and reservation API — 2026-10-23

Added local migration 113 for separate private original/processed-video buckets, exact reservation-owner inserts and restrictive no-read/no-overwrite/no-delete guards, with cross-image/video isolation. Added caller-scoped video reserve/status/cancel API; new uploads are disabled by default while existing status/cancel remain usable for recovery. Local database tests verify owner/site/type/expiry/cancellation boundaries even with broad unrelated storage policies; API tests verify input bounds, feature gating, identity and caller credentials. All 798 CMS tests, TypeScript and production build passed. No remote migration or upload was performed. Remaining: byte transfer, live provider storage/scanner/worker validation, video UI and rights checks, public delivery, homepage migration/application and overall client acceptance.

### Private video byte transfer — 2026-10-23

Added the gated video-transfer endpoint with caller-scoped reservation authorization, canonical destination checks, exact declared/streamed byte limits, private disk spooling, request cancellation and bounded transfer deadlines. Provider writes use the caller token, private originals bucket and no-overwrite semantics; successful transfer reports awaiting verification only. Fixed cancellation so an uncooperative stream cannot hold cleanup open. Tests cover invalid identity/type/size, interrupted streams, provider failures, temporary-file cleanup and transport headers. All 802 CMS tests passed with zero skips; TypeScript and production build passed. These are local/mocked transport checks, not live provider validation. Uploads remain disabled by default. Remaining: production storage/scanner/worker integration, video editor and rights review, public video delivery, homepage migration application, source fidelity and broader client acceptance.

### Video worker private-storage adapter — 2026-10-23

Added a trusted-worker adapter for video-specific claim/completion RPCs and lease-bound failure reporting, bounded private-original reads and immutable derivative writes. Both new writes and duplicate retries require full stored-byte checksum verification; different existing bytes are never overwritten. Configuration requires a root HTTPS provider URL, credentials are confined to worker transport, and redirects are refused. Four focused simulated-provider tests and TypeScript passed. This adapter is dependency-injected and not yet connected to a production dispatcher: original-byte confirmation, scanner configuration/isolation, live provider exercise and deployment remain pending, along with video editing/rights/delivery and homepage migration. No credentials were configured, remote operations performed or upload flags enabled.

### Trusted original-video reception — 2026-10-23

Added local migration 114 with a service-only, site-bound lookup of unexpired reserved video originals. The worker adapter now reads the expected object with exact bounds, computes its checksum from stored bytes and confirms receipt through the existing idempotent lifecycle RPC. No event-provided checksum, size or storage path is trusted. Tests verify caller denial, cross-site/expired/already-confirmed lookup behavior, matching receipt retries, changed-hash rejection and adapter identity/byte-derived evidence. All 166 database/adapter tests and TypeScript passed. Migration remains local only; production dispatch, scanner/isolation configuration, live-provider checks, video controls/rights/public delivery and homepage migration/application remain pending.

### Recoverable video processing dispatch — 2026-10-23

Added local migration 115 for service-only, bounded discovery of transferred reservations, uploaded/failed jobs and expired processing leases. Missing original objects and active leases are excluded; the existing atomic claim remains the concurrency fence. Added sequential dispatch from original confirmation through processing, preserving durable recovery after lost acknowledgements and continuing other jobs after failures. Database/dispatcher tests cover bounds, access, discovery and recovery; a real FFmpeg fixture passes through dispatch to verified completion with simulated storage/scanner callbacks. All 813 CMS tests passed with zero skips; TypeScript passed. Production scheduling, scanner/isolation and live provider deployment remain unconfigured. Video editing, rights/public delivery, homepage migration and the broader client acceptance scope remain pending; no remote migration or upload enablement occurred.

### Video migration provenance and rights evidence — 2026-10-23

Added local migration 116 with a caller-scoped video evidence RPC binding original checksum, completed video inspection, canonical derivative identity, silent H.264 metadata and current rights. It excludes archived/revoked/expired assets and returns no private rights evidence. Added a strict TypeScript evidence verifier rejecting missing, duplicate, mismatched and contradictory responses. All 163 database tests plus two focused verifier tests and TypeScript passed. Homepage review API/UI integration remains next; the current screen still shows videos as pending. This read-only evidence does not authorize application/publication or attest live playback. No remote migration was applied. Production worker/scanner deployment, video editing/public delivery, atomic homepage migration and broader client acceptance remain pending.

### Homepage review API video evidence — 2026-10-23

Connected caller-scoped video provenance/rights reads to homepage migration review, preserving exact mappings, bounded batches and full-review failure on missing/mismatched evidence. Video evidence now participates in review digests; client parsing checks its asset and captured-source identity and availability consistency. Updated video fixture identities to match real UUID upload assets. All 818 CMS tests passed with zero skips; TypeScript passed. Public delivery remains unverified, so overall media readiness remains false and apply/publish remain unavailable. The current screen still gives a pending-video summary; detailed video evidence display/browser validation is next. Remote migrations, production worker/scanner deployment, video editing/delivery, atomic homepage migration and broader acceptance remain pending.

### Homepage review video results UI — 2026-10-23

The review panel now shows passed-video counts, per-file source mismatch/processing-or-rights findings, unavailable evidence and a distinct public-delivery validation notice. Applying/publishing remain unavailable. Browser plugin not available; regular Playwright used with approved sandbox escalation after Chromium's sandbox launch failed. Desktop 1280 and mobile 390 checks passed with mocked provider evidence for success/failure counts, malformed mappings, dirty/busy guards and stale-site response rejection; no page runtime errors. Corrected the synthetic fixture website ID and an assertion that ran before React's clearing effect. Screenshot inspected; fixture lives outside the CMS shell and inherits the website header overlay, so this is behavior evidence rather than final visual acceptance. Temporary route removed; production build including TypeScript passed. Live-provider validation, production workers/scanner, video editing/public delivery, recoverable homepage application and broader client acceptance remain pending.

### Image-picker media type isolation — 2026-10-23

Found that image selection previously checked inspection/rights without checking MIME, so approved video catalog entries could be chosen for image fields. Added a required processed-image MIME guard used both for list buttons and the fresh get-before-selection check. Unknown, source-image and video types fail closed. All 819 CMS tests and TypeScript passed. Desktop/mobile Playwright checks (Browser plugin unavailable; approved external-sandbox runner) verified disabled video selection and rejection when a listed image becomes a video before selection; no page runtime errors. Screenshot inspected; temporary synthetic fixture removed. General media-library video presentation/preview and editing, public delivery, production provider integration, homepage application and broader acceptance remain pending.

### Private verified-video preview transport — 2026-10-23

Added local migration 117 and a caller-token preview route for verified, unarchived silent video derivatives. Storage originals remain unreadable; processed reads require workspace document-view permission, canonical identity and completed video inspection. The route enforces MIME, exact bounded bytes and checksum before returning private/no-store MP4 bytes. Private review remains allowed for revoked rights so staff can inspect issues; this does not bypass publication checks. All 168 database/preview tests, TypeScript and production build passed. Transport tests use synthetic bytes/provider responses; UI playback and live-provider delivery are not yet validated. Remote migration, media-library video controls, production processing/scanner configuration, public delivery, recoverable homepage application and broader acceptance remain pending.

### Media-library private video playback — 2026-10-23

Connected workspace-authenticated video preview loading to the media library. MP4 assets render a bounded private Blob player with manual controls, muted inline playback, retry and object-URL/abort cleanup; image preview remains separate. Library copy now uses media/asset terms for shared metadata, rights and usage operations. Desktop/mobile Playwright checks passed for a failed preview followed by retry, actual processed 1280×720 video playback, metadata edits, rights edits and old URL revocation, with no page runtime errors. Provider writes were mocked; the test used the locally processed original video. Corrected a test locator to match the select's accessible name. Browser plugin unavailable; approved Playwright fallback used. Synthetic fixture screenshot inspected but lies outside the CMS shell, so final visual acceptance remains pending. Fixture removed; TypeScript and production build passed. Live provider validation/deployment, video upload UI, homepage video selection/composition playback, public delivery and recoverable homepage application remain pending alongside broader PRD acceptance.

### Separate video upload history and capability — 2026-10-23

Added local migration 118 for owner/site-scoped recent video uploads, while keeping the existing image upload history image-only. The video list API validates bounded, unique video records and reports the current new-upload feature flag; history remains readable when new uploads are disabled. Tests cover image/video separation, tenant/owner boundaries, expired reservations, duplicate/mixed provider responses and disabled capability. All 170 database/video-command tests and TypeScript passed. The client-facing upload panel still needs implementation and browser recovery testing; this is supporting API work, not a completed upload UI. No remote migrations or feature enablement occurred. Production processing/scanner validation, homepage selection/public delivery/application and broader acceptance remain pending.

### Client video upload panel — 2026-10-23

Added background-video uploads to the CMS upload workspace: MP4/100 MB validation, server-reported enablement, idempotent reservations, private transfer, explicit status recovery after ambiguous responses, recent processing history and reservation cancellation while new uploads are off. Image/video controls share workspace busy state. Desktop/mobile Playwright with simulated API responses passed feature gating, lost-response recovery, successful transfer/ready status, invalid extension rejection and disabled-mode cancellation; screenshot inspected, no page runtime errors. Browser plugin unavailable; approved Playwright fallback used. Temporary fixture removed. All 826 CMS tests, final TypeScript and production build passed (final closed-upload label adjustment also typechecked). Production uploads remain disabled and no remote data changed. Live worker/scanner/provider validation, homepage video selection/preview, public delivery and recoverable homepage application remain pending alongside broader acceptance and handover.

### Background-video selection evidence — 2026-10-23

Added local migration 119 to expose video duration/frame rate/audio/codec/pixel format and caller-scoped verified-derivative status through the existing media catalog, without exposing storage paths. Added video selection guidance requiring verified silent H.264 processing, bounded duration and current approved rights; unknown/incomplete metadata fails closed. All 167 database/selection tests and TypeScript passed. These are the data/validation prerequisites; the homepage video picker is not yet connected. Remote migrations and production validation remain pending, as do homepage playback/public delivery, recoverable application and broader PRD acceptance.

### Homepage desktop/mobile video selection — 2026-10-23

Connected a video-only eligibility picker to homepage hero draft controls, with desktop selection, optional mobile override, desktop inheritance and posters-only reset. Picker re-fetches the chosen asset and rechecks identity, verified silent processing and current rights before updating the draft; stale list/selection responses are invalidated on site/disabled changes. Desktop/mobile Playwright checks passed type/pending-rights guards, revoked rights between listing and selection, desktop/mobile updates/reset and read-only behavior with simulated API data; no page runtime errors. Browser plugin unavailable; approved Playwright fallback used. Synthetic screenshot inspected; temporary fixture removed. TypeScript and production build passed. Layout preview remains poster-only; composition video playback and public delivery remain pending, along with live provider validation, recoverable homepage application and broader PRD acceptance.

### Homepage draft private video playback — 2026-10-23

Threaded the authenticated video loader through homepage workspace, page-preview and composition-preview components into the hero preview. Added explicit, non-autoplay private video review selecting the mobile override at 760 px; poster previews remain present. Viewport or reduced-motion changes close the player, preventing unrequested reload/playback; deliberate manual preview remains possible with reduced motion. Desktop/mobile Playwright checks with local processed video bytes passed no-load-before-request, actual decoded playback, selected asset identity, no autoplay and cleanup on viewport/motion changes. Adjusted request-count assertions for React development effect replay while retaining strict asset-identity/no-unrequested-load checks. No page runtime errors; synthetic fixture screenshot inspected and fixture removed. Browser plugin unavailable; approved Playwright fallback used. TypeScript and production build passed. Final animated/layout fidelity, public delivery, production provider/scanner validation, recoverable homepage application and broader client acceptance remain pending.

### Video reference and archive protection — 2026-10-23

Publication-path inspection found that generic media usage/archive checks tracked `assetId` but missed homepage `desktopAssetId` and `mobileAssetId`. Added local migration 120 to include both fields in usage detection and ordered shared-lock checks for new revisions/previews. Existing archive logic now protects referenced video assets in current drafts, published revisions and active previews through the shared predicate. Tests explicitly verify desktop/mobile draft usage, active-preview protection after draft removal, successful archive after preview revocation, rejection of new references/previews to archived videos and outsider usage denial. All 167 database tests passed. Migration not applied remotely. Homepage publication eligibility/public delivery still need explicit video checks; production validation, recoverable migration application and broader acceptance remain pending.

### Homepage video eligibility and publication fence — 2026-10-23

Added local migration 121 with internal video eligibility checks for exact completed upload/derivative provenance, silent H.264 metadata, current approved rights and canonical site identity. Generic record media availability now includes desktop/mobile video references, permitted only for homepage records. Added a publication trigger that locks upload and media evidence and rechecks video eligibility before a published revision changes. All 169 database tests passed, including invalid types/tenant/source inspection, revoked/expired rights and a focused trigger harness verifying late rights rejection. The trigger harness isolates this guard; it does not prove full homepage publication, which remains disabled by other unfinished checks. Media-status reports/advisory validation integration, public delivery, production validation and recoverable homepage application remain pending. Migration not applied remotely.

### Video validation reports — 2026-10-23

Added local migration 122 to include desktop/mobile video identities in caller-scoped media-status reports, deduplicate repeated references and fail assets used in incompatible image/video roles. Homepage advisory validation now reports field-specific video verification findings for absent, duplicate or unavailable evidence. Complete homepage release remains explicitly blocked. Tests cover current rights, unsupported record types, outsider denial, repeated IDs and mixed image/video usage; corrected fixture ownership and caller identity during database tests. All 833 CMS tests passed with zero skips; TypeScript passed. No remote migrations applied. Public video delivery, full homepage release validation/layout fidelity, production integration and recoverable migration application remain pending alongside broader PRD acceptance.

### Public video response and byte ranges — 2026-10-23

Added a disabled-by-default public video response module with canonical site/key checks, bounded full-file checksum verification and a fresh authorization/descriptor check after fetching. Single bounded/open/suffix ranges return verified subsets; malformed/multiple/unsatisfiable ranges return 416, while If-Range requests fall back to a verified full response. Uses only anonymous provider credentials, private/no-store responses and no redirects. All 839 CMS tests and TypeScript passed. The handler is not yet exposed through a route: published-homepage authorization/storage policy and real playback integration remain pending. Full-file verification per range is bounded but requires performance validation before production. Added CMS_PUBLIC_HERO_VIDEO_ENABLED=false to the example configuration only. Public delivery, full homepage release/layout fidelity, live production validation and recoverable migration application remain pending.

### Published-homepage video authorization — 2026-10-23

Added local migration 123 binding public video metadata to an English root homepage's active published revision, current media eligibility and an unexpired `homepage-1` receipt matching deployment validation policy. Only desktop/mobile references inside visible homepage hero sections qualify; hidden/future/expired sections, locale exclusions, malformed schedules and unsupported region restrictions fail closed. All 173 database tests passed, including immediate rights/receipt-expiry withdrawal and a synthetic published-state fixture. The fixture temporarily bypasses publication triggers only in the ephemeral test database to isolate authorization, then restores them; it does not establish working full homepage publication. Public storage permissions and the HTTP route remain unchanged/closed until integration validation. No remote migration or production configuration change occurred. Storage/route integration, real playback/performance, full homepage validation/rendering/application and broader acceptance remain pending.

### Published video storage and HTTP route — 2026-10-23

Added local migration 124 for anonymous processed-video storage reads only when the published-homepage authorization predicate passes; originals remain private and private workspace preview retains its separate permission path. Connected `/api/cms/published/videos/[asset]` to the separately gated range-response handler. All 179 database/public-video tests, TypeScript and production build passed. Desktop/mobile Chromium played and sought within the actual locally processed 3.4 MB video through a localhost HTTP server using the real response handler and simulated publication/storage callbacks; requests returned 206 and a subsequent request after withdrawal returned 404. Screenshot inspected. Local in-memory handler timings (about 2–5 ms) are not provider/network or production-load performance evidence. Browser plugin unavailable; approved Playwright fallback used. No migration was applied remotely and public delivery flags remain off. Full homepage validator/rendering fidelity, provider caching/load validation, production scanner/workers and recoverable migration application remain pending alongside broader acceptance.

### Homepage public section projection — 2026-10-23

Added a strict, pure homepage projection preserving the ten supported section families and their order, applying current visibility/locale/schedules and rejecting unsupported region targeting. It verifies a hero H1 remains available at future visibility boundaries and strips internal statistic-source evidence without mutating the draft. Referenced record IDs and media IDs remain unresolved; this module does not authorize publication or provide public URLs. All 845 CMS tests and TypeScript passed, including ordered captured content, evidence exclusion, schedule/locale filtering and missing future hero rejection. Remaining: eligible published dependency resolution, complete publication validation and source-faithful renderer, live provider/performance checks, recoverable homepage migration and broader PRD acceptance/handover.

### Homepage published dependency assembly — 2026-10-23

Added a server-side dependency resolver joining projected homepage sections with published journey summaries, upcoming expedition departures and privacy-filtered guest cards. It checks website envelopes and every expedition website identity, preserves editorial selection order, deduplicates/bounds guest reads to four concurrent calls and skips hidden dependency sections. Missing/mismatched dependencies fail the whole result, with no bundled or draft fallback. Private guest names/consent evidence are excluded from output. All 848 CMS tests and TypeScript passed. Reader callbacks are injected and tested with fixtures; concrete provider readers and complete release/rendering integration remain pending. Production validation/performance, recoverable homepage migration and broader PRD acceptance/handover remain unfinished.

### Public homepage provider readers and guest privacy boundary — 2026-10-23

Added concrete anonymous-token homepage dependency readers using published journey pagination, snapshot-bound expedition pagination and a new visitor-safe guest RPC (local migration 125). The guest provider response contains only record/revision identity, permitted display name, quote, trip and category; private consent, portrait and withheld identity never cross the public RPC boundary. Updated dependency assembly to accept this safe contract rather than full private testimonial payloads. Scope/locale mismatches, missing guests and disabled expedition delivery fail without fallbacks. All 181 database/dependency/guest tests plus two provider-reader tests and TypeScript passed. Synthetic published-state fixtures isolate public guest reads; full testimonial/homepage publishing and production provider behavior are not established by these tests. No remote migration or rollout occurred. Full homepage validation/rendering, release integration, production checks and recoverable migration remain pending with broader PRD acceptance.

### Homepage editorial pre-publication findings — 2026-10-23

Connected homepage-specific editorial findings to advisory content validation: English root identity, public projection/hero schedule validity, supporting evidence for visible statistics and verified links/anchors across future visibility boundaries. Exact dynamic published paths may be supplied by trusted readers; worker integration for that evidence is still pending, so unknown dynamic links remain findings. Statistic evidence never appears in findings or the public projection. All 855 CMS tests and TypeScript passed, covering precise missing-source findings, scheduled anchor withdrawal, dynamic path evidence and hidden-section behavior. Full homepage publication remains blocked. Trusted reference evidence integration, renderer/source fidelity, production checks and recoverable migration application remain pending with broader PRD acceptance.

### Trusted homepage link evidence — 2026-10-23

Local migration 126 derives exact, deduplicated homepage link destinations from the current stored revision and the same website/language public page reader. Both direct and queued trusted validation now forward that evidence into editorial checks; browser payloads do not supply it. Database tests verify current published availability, withdrawal, foreign-site and wrong-revision rejection; worker tests verify link findings change while homepage publication remains blocked. All 857 CMS tests and TypeScript passed. No remote migration or rollout occurred. This is validation-time evidence only: publication-time locking/rechecks and public-delivery dependency withdrawal behavior still require complete homepage integration. Source-faithful rendering, recoverable homepage migration, production provider validation and broader PRD acceptance/handover remain pending.

### Homepage selected-record validation — 2026-10-23

Added local migration 127 and typed reference findings for selected homepage journeys, guest notes and expedition display overrides. Evidence is scoped to the current stored homepage revision, website and language, uses public readers, and exposes only record/revision identity, type and eligibility. Journey eligibility also requires a hero image; guest eligibility uses the consent-filtered public reader. Both trusted validation workers forward evidence. Hidden/expired sections do not block; future configured sections require currently eligible selections. Duplicate, missing, unavailable and wrong-type evidence yields field-specific findings. The full 860-test CMS suite and TypeScript passed, followed by the added direct/queue forwarding regression (all three reference unit tests passed). Database coverage verifies journey eligibility, image-rights withdrawal, unpublishing, deduplication, permissions and site/revision isolation; full guest/expedition end-to-end publishing remains pending. No remote migration or rollout occurred. Homepage publication still remains disabled pending complete publish-time dependency checks, rendering/source fidelity, recovery/migration and production validation; broader PRD acceptance and client handover remain outstanding.

### Testimonial publication backend — 2026-10-23

Implemented the `testimonial-1` trusted validator and local migration 128. Publication requires English shared-content identity, verified wording, granted consent with private evidence, and eligible optional portrait media. The database rechecks critical consent/identity invariants and locks/checks portrait eligibility at publication; media validation now requires processed WebP for testimonials. The complete local database workflow passed through save, review, approval, actual trusted validation, publish, anonymous public read and unpublish, without bypassing publication triggers. Additional tests reject unconsented publication despite a deliberately incorrect trusted receipt, permission violations, unsupported identity, missing/duplicate media evidence and private-source leakage in findings. All 865 CMS tests and TypeScript passed. The testimonial editor's workflow/validation controls still need connecting and browser verification; full reviews-page delivery and production migration remain pending. No remote migration or rollout occurred. Homepage rendering/publication, recoverable homepage migration, production checks and broader PRD acceptance/handover remain unfinished.

### Testimonial editor publication workflow — 2026-10-23

Connected the testimonial workspace to saved-content/trusted validation, submission, approval, changes requests, explicit publish/withdraw confirmation and current published-revision history labels. Dirty edits disable checks and publication actions. The editor explains that saving consent changes does not withdraw a published review and directs publishers to unpublish first. Site/record generation guards discard stale reads and action responses; pending migration disables editing actions. The shared workflow component now supports testimonial-specific confirmation copy. All 865 CMS tests passed. Desktop 1280 and mobile 390 Chromium checks passed for validation, submit, approve, cancel/confirm publication, exact revision requests, dirty guards, reload and withdrawal with no console/page errors. Browser plugin not available; approved local Playwright fallback used with simulated API responses. Screenshots inspected; temporary fixture inherited the public header/footer, so these establish interaction behavior rather than final CMS visual acceptance. Fixture route removed. Production deployment, live-provider browser workflow, reviews-page delivery and broader homepage/PRD acceptance remain pending.

Production build (including TypeScript) passed after the temporary testimonial UI fixture was removed. Build log: `/private/tmp/cms-testimonial-ui-build.log`.

### Site-scoped publication delivery runtime — 2026-10-23

Added local migration 129 with website-scoped delivery claim/reap functions, retaining existing lease fencing, supersession and retry semantics. Connected a protected, disabled-by-default worker endpoint to bounded service-role RPC transport and Next.js root-layout invalidation for shared content changes. Claims are validated before use; foreign-site/duplicate/malformed jobs cannot trigger invalidation or acknowledgement. Authentication, no-body/no-query invocation, safe failure responses, exact lease acknowledgements and failed refresh recovery are tested. All 870 CMS tests, TypeScript and production build passed. A localhost request confirmed the unconfigured endpoint returns 503. Deployment guidance is in `docs/cms/delivery-worker.md`. No remote migration, credentials, scheduler or rollout was configured. Queue success requests framework invalidation; it does not prove a fresh visitor render, external CDN purge or production delivery latency. Multi-instance/provider acceptance, homepage rendering/publishing, migration and broader PRD/client handover remain pending.

### Homepage hero and story public rendering components — 2026-10-23

Added isolated public hero/story components using the homepage projection and existing concept-page visual classes. Hero rendering supports editorial headline frames, responsive posters/video IDs at the source's 767px media breakpoint, desktop rotation, current reduced-motion/data-saving/document-visibility preferences, pause/resume and poster fallback on video error. Media URLs use existing authorized delivery routes. Story rendering preserves editable headings, copy, link, ledger labels and arbitrary statistic suffixes; CountUp retains its existing default plus suffix while accepting CMS suffixes. The editor story component retains its value/heading-level contract separately from the public projection wrapper. All 870 CMS tests passed. Local Chromium at 1280/390 verified responsive media selection, reduced-motion no-video behavior, live preference changes, pause/resume, story link/statistic output and absence of private source evidence. Screenshots inspected with fixture poster/media; exact source-content visual fidelity and rotation timing remain for broader homepage acceptance. Browser plugin not available; approved Playwright fallback used. Temporary route removed. Live homepage remains unchanged: these components are not yet composed into the complete public renderer or enabled for publication. Remaining: remaining-section integration, navigation, publication/recovery gates, production checks and broader PRD acceptance/handover.

Production build including TypeScript passed after fixture removal (`/private/tmp/cms-home-renderer-build.log`).

### Complete ten-section homepage renderer assembly — 2026-10-23

Added `CmsHomepage` to render the resolved public homepage projection in configured order across all ten supported section families. Shared clients provide partner region tabs and guest carousel controls; dependency sections require exactly one resolved section result rather than silently falling back. Split the departure rows renderer from its existing projection wrapper so the public homepage consumes the already resolved departure snapshot. Added public section spacing/width/background/heading styles; screenshot review found and corrected inherited light text on pale backgrounds. All 870 CMS tests passed. Chromium at 1440/390 verified ten sections, one H1, three journey cards, partner tab click/keyboard behavior, guest previous/next, reduced-motion no-video behavior, no horizontal overflow or page errors; reran after the contrast fix. Captured local media plus fixture published records were used, with an empty departure catalogue; this is not a live-provider or populated-departure proof. Screenshots inspected and temporary route removed. Browser plugin unavailable, approved Playwright fallback used. Public route remains unchanged. Navigation, complete source-layout fidelity/control behavior, publish-time checks, recoverable migration and production/PRD acceptance remain pending.

Production build including TypeScript passed after the contrast fix and fixture removal (`/private/tmp/cms-full-homepage-build.log`).

### Published header integration for the CMS homepage — 2026-10-23

The assembled CMS homepage now requires a published header projection and reuses the shared Header's configurable brand, tagline, primary/mobile/utility menus, featured links and planning CTA. A scoped CSS override shows only the embedded CMS header while the legacy concept-page global-header suppression remains intact. Added an optional explicit dialog ID to Header (existing default retained) to avoid duplicate dialog IDs when the global layout header also exists. Chromium desktop 1440/mobile 390 verified one visible header, responsive menu selection, CTA/utility links, exact dialog binding, keyboard focus containment, Escape/close, restored scrolling and focus return with no page errors. Screenshots inspected using fixture header/publication data; Browser plugin unavailable, approved Playwright fallback used. The temporary route was removed. All 870 CMS tests and TypeScript passed; all sixteen homepage inventory source hashes still match. Main public route remains unchanged. Existing menu image-panel fidelity, complete composition controls, publish-time dependencies, migration recovery and production/PRD acceptance remain pending.

Production build passed after fixture removal (`/private/tmp/cms-home-navigation-build.log`).

### Homepage desktop media alignment and mobile order — 2026-10-23

Connected mediaAlign/mobileOrder controls to the public corporate, aviation and guest-review media/copy pairs. Desktop start/end swaps the image side; mobile media-first/text-first swaps vertical order independently. The 760px breakpoint now consistently collapses these pairs, including guest notes. Homepage migration explicitly records start/media-first for guest notes to preserve the captured image placement instead of relying on ignored defaults. Added migration assertions for those controls. All 870 CMS tests and TypeScript passed. Browser checks at 1440, 760 and 390 measured actual media/copy bounding boxes in both control settings for all three families, with no horizontal overflow or page errors. Screenshot inspected with fixture published data/local captured images. Browser plugin unavailable; approved Playwright fallback used; temporary route removed. This does not establish all composition controls: hero/story treatment, animation options and complete source-layout parity still need acceptance before public activation, along with publication/migration/production and broader PRD work.

Production build passed after fixture removal (`/private/tmp/cms-home-layout-build.log`).

### Homepage entrance animation controls — 2026-10-23

Connected section animation values to a scoped IntersectionObserver/Web Animations enhancement. None adds no entrance effect, fade animates opacity, and reveal adds a restrained 24px translation. Hero/story and remaining sections expose their configured mode; fixed legacy hero entrance animations are disabled in the CMS renderer to avoid overriding the setting. HTML remains visible without APIs/JavaScript. Reduced-motion changes disconnect observers and cancel active effects; revision changes and unmount clean up. These settings control entrance effects, separately from hero background playback/headline rotation. All 870 CMS tests and TypeScript passed. Chromium 1280/390 captured actual animation calls/keyframes and checked none/fade/reveal distinctions, reduced-motion startup/live cancellation, revision changes and unmount cleanup with no page errors. Screenshot inspected with fixture media; Browser plugin unavailable, approved Playwright fallback used; temporary route removed. Source-layout parity, hero/story layout controls, publish-time checks, recovery/migration, production and broader PRD acceptance remain pending; live homepage unchanged.

Production build passed after fixture removal (`/private/tmp/cms-home-motion-build.log`).

### Hero/story layout controls and dark-story contrast — 2026-10-23

Connected hero/story reading/content/full widths, compact/standard/generous spacing, center/start alignment and background classes. Hero background applies beneath its media; the overlay remains legible. Story heading styling now follows semantic H1/H2/H3 choice without losing its editorial scale. Dark story backgrounds explicitly handle paragraph, CTA, ledger title, statistic labels and numbers; screenshot inspection caught inherited dark ledger text and prompted a fix plus explicit browser assertions. Chromium 1440/390 verified measured widths/padding, alignment, semantic heading, dark text colors and no horizontal overflow/page errors; reran after the contrast correction and inspected the screenshot. Fixture media/data were used; Browser plugin unavailable, approved Playwright fallback used; temporary route removed. All 870 CMS tests and TypeScript passed. Exact source-layout fidelity and complete framing/editor-preview parity still require acceptance; public homepage remains unchanged pending publication/dependency/recovery gates, migration, production and broader PRD completion.

Production build passed after contrast fixes and fixture removal (`/private/tmp/cms-hero-story-layout-build.log`).

### Homepage publication-time direct dependency guard — 2026-10-23

Added local migration 130 with a homepage publication trigger that checks English root identity, locks direct selected/dynamic-link records in identity order and their referenced media, then rechecks current public availability. Selected journeys require hero media; guest notes use consent-filtered public reads; expedition overrides use the public expedition reader. Hidden/expired sections are excluded; future configured sections are checked. Unknown dynamic paths require a current same-site public page. This is defense in depth and does not enable the homepage validation policy. All 871 CMS tests passed. A temporary-table trigger harness proves direct journey publication succeeds when eligible, then fails after image-rights revocation or target withdrawal; link-only withdrawal fails separately, hidden selections do not block, and foreign website/revision identity fails. This isolates the guard, not complete homepage publishing or concurrent production transaction behavior. Anchor schedule/mailto checks remain in the trusted validator; transitive dependencies, full public authorization and release integration remain pending. No remote migration or rollout occurred. Final visual/preview fidelity, recoverable migration, production checks and broader PRD/client handover remain outstanding.

### Public homepage database boundary and opt-in reader — 2026-10-23

Added local migration 131 with a policy-gated published homepage RPC. Per-section presentation-field allowlists strip unknown fields and internal statistic source evidence before leaving the database; current visibility/locale/schedules filter hidden/future sections. The application public contract rejects source evidence, normalizes evidence-free statistics only for composition shape parsing, then assembles existing published dependencies and requires configured published header delivery. Added a disabled-by-default `CMS_HOMEPAGE_DELIVERY_ENABLED` flag; public route remains unchanged. All 874 CMS tests and TypeScript passed. Isolated read-boundary SQL fixtures verify no receipt/policy means no output, published revision identity, visibility, private-field stripping, cross-site rejection and withdrawal. Parser/transport tests verify privacy, opt-in behavior, anonymous credentials and no draft fallback. These fixtures do not prove full homepage publication or real-provider aggregate delivery. Published reader receipts are version-bound but do not expire already-published pages; the older hero-video receipt-expiry predicate must be reconciled before activation. Full publication validator/authorization consistency, transitive dependencies, source/preview fidelity, recovery/migration and production/PRD acceptance remain pending. No remote migration or rollout occurred.

### Consistent published-page/video receipt lifetime — 2026-10-23

Local migration 132 removes receipt-expiry checks from continued delivery of an already-published homepage video, matching the public homepage reader. The publication operation still requires a current receipt; previously published immutable content remains available after that receipt's pre-publication time window closes. Current validator-policy/version, valid receipt state, selected published revision, visible hero binding and current processed-media rights remain required. Expanded SQL coverage proves expired receipt preserves both anonymous processed-video storage access and page/video reads, while media-rights expiry, revocation, policy changes, invalidated receipts and unpublishing deny access. Original video storage remains private. The full 874-test CMS suite passed; a subsequent homepage parity assertion passed with all 181 database tests. Existing expired-receipt publication tests still pass. No remote migration or rollout occurred. Full homepage validator/publishing, dependency consistency, source/preview fidelity, migration/recovery, production and broader PRD/client handover remain pending.

### Published homepage aggregate loading and final identity check — 2026-10-23

The opt-in public reader now rereads the homepage and header after dependency resolution and rejects concurrent replacement, visibility/payload changes or withdrawal rather than returning mixed presentation state. Added a successful aggregate transport test for all ten sections, three selected journeys, six public guest cards, empty published departure directory and configured header/menu, using anonymous scoped RPCs. Tests cover homepage replacement/withdrawal, menu revision replacement, header withdrawal and missing header rollout without fallback. No internal statistic source or private guest evidence appears in the returned result. All 876 CMS tests and TypeScript passed. These are simulated provider-response tests, not live Supabase or populated-departure acceptance. The final identity check is not a transaction-wide snapshot of every mutable dependency; transitive/public dependency consistency still requires release integration. Full homepage publication validator/workflow, source/preview fidelity, recoverable migration, production and broader PRD/client handover remain pending; public route and rollout flags are unchanged.

### Homepage trusted header validation — 2026-10-23

Added local migration 133 to supply current same-site published header evidence with homepage validation input. Both direct and queued trusted workers now run that evidence through the same header projection used by public delivery. Missing settings/selected menus, wrong website/menu identity, unsupported language selection and malformed evidence produce a safe actionable header finding; header-shaped data inside the draft cannot satisfy the check. Database coverage verifies published settings are used despite newer drafts and withdrawing the selected menu makes validation evidence unavailable. The transient homepage fixture is rolled back after this check. All 878 CMS tests and TypeScript passed. This adds validation-time evidence, not a transaction-wide release lock or full homepage publication authorization: the homepage draft gate remains. No remote migration or rollout occurred. Publish-time header/dependency consistency, root route integration, source/preview fidelity, recoverable migration, production setup and broader PRD/client handover remain pending.

### Homepage header checks at release — 2026-10-23

Added local migration 134 with a homepage release trigger that locks the published same-site settings record, its media and selected menu/featured dependency graph using the existing bounded settings traversal. It rechecks selected menu availability, header links and the public header reader before allowing a publication-pointer change. Unpublishing remains available. Trusted homepage validation now rejects unavailable menu/featured references rather than accepting the public renderer's deliberate omission of unavailable links. Normal public header rendering keeps that existing omission behavior. All 880 CMS tests and TypeScript passed. A database trigger harness verifies eligible release, menu/settings/linked-journey withdrawal, media-rights revocation, recovery and cross-site rejection; it runs in a rolled-back transaction. This is isolated release-guard evidence, not a full homepage publish workflow or multi-connection concurrency test. The homepage publication policy remains disabled, and no remote migration or rollout occurred. Full homepage validation/workflow activation, remaining dependency consistency, root-route integration, source/preview fidelity, recoverable migration, production setup and broader PRD acceptance remain pending.

### Homepage trusted publication and editor workflow — 2026-10-23

Enabled `homepage-1` validation for supported English root compositions and added local migration 135 for its deployment-owned receipt policy. A valid result now requires composition/projection, scheduled heading/link/statistic checks, verified image/video evidence, selected published records and eligible published header evidence. Other incomplete page types keep their draft gate. The homepage editor now exposes validation, submission, approval, confirmation-bound publishing and withdrawal; revision history marks the published revision. Visitor delivery still requires separate integration/rollout; no remote migrations or production flags were changed.

All 882 CMS tests, TypeScript and production build passed (`/private/tmp/cms-homepage-workflow-all-tests.log`, `/private/tmp/cms-homepage-workflow-build.log`). A ten-section unit fixture passes only with complete media/reference/header/link/statistic evidence. A real PGlite workflow using hero/story sections proves save, separate reviewer approval, trusted receipt, publication, newer draft preservation, republishing, restore as a new reviewed/validated draft, public statistic-evidence removal and withdrawal. It also rejects publishing before approval/checks and after a selected menu is withdrawn. No homepage trigger bypass is used in that workflow; published settings/menu fixtures are prepared through existing draft APIs and direct publication-pointer setup. This is not a full ten-section live-provider deployment proof.

Chromium at 1280/390 exercised homepage selection, content checks, submit/approve, cancel/confirm publication, exact revision submission, unsaved-change guards, reload and withdrawal with no console/page errors. Browser plugin not available; approved local Playwright fallback used with simulated editor responses. Screenshot inspected (`/private/tmp/cms-homepage-workflow-390.png`); temporary QA route removed before build. Actual provider/auth, root route integration, full source/editor-preview fidelity, recoverable migration, production infrastructure and remaining PRD/client acceptance are still pending.

### Opt-in homepage route and matching SEO — 2026-10-23

Connected the root route to the published CMS homepage behind the existing disabled-by-default delivery flag. React request caching shares the same resolved homepage/settings snapshot between body and metadata. The header reader exposes a snapshot for this purpose while existing header consumers retain their previous projection API. Homepage SEO uses page overrides and published global defaults, including canonical, robots and sharing image/alt, without an independent settings read. Final identity checks now also detect changed SEO defaults during dependency loading. Enabled delivery does not fall back to legacy content when CMS content is unavailable. The legacy branch is unchanged when delivery is off.

All 883 CMS tests and the production build passed. Updated the root source proof after reviewing its unchanged legacy branch, then recaptured the actual legacy homepage at desktop/mobile sizes: only capturedAt and sourceProof differ from the prior capture; every semantic/media/navigation capture field is identical. All sixteen traced hashes match. This new capture digest requires fresh migration review mappings; older reviewed capture mappings are intentionally stale.

An isolated production server on 127.0.0.1:3012 used simulated anonymous provider responses and local captured media. Chromium 1440/390 verified root response, published revision, one H1, title/description/social title/canonical, menu opening/Escape, reduced-motion no-video, no horizontal overflow and no console/page errors. Screenshot inspected (`/private/tmp/cms-homepage-route-390.png`). Withdrawing the simulated homepage produced the expected 500 unavailable response without legacy homepage markup. Browser plugin not available; approved Playwright fallback used. The isolated server was stopped; .env.local and the usual preview server were unchanged. Actual provider/deployment, graceful withdrawal UX, full source/editor-preview fidelity, complete mutable-dependency consistency, recoverable migration, remaining PRD modules and client acceptance are pending.

### Atomic homepage migration draft storage and recovery — 2026-10-23

Added local migration 136 with actor/site-scoped homepage migration receipts, atomic draft application and status lookup. Application requires current create/edit authority, checks the target revision, locks mapped content revisions and upload/media rows, verifies image and silent-video provenance/rights against the reviewed evidence, and rejects payload references outside the mappings. It writes a draft and audit event without changing publication. Exact retries return the original receipt after current access checks, even after subsequent draft edits or media withdrawal; they do not reapply or overwrite newer content. Failed attempts roll back the draft and receipt together. Added safe, actionable gateway messages for homepage publication and migration failures.

All 885 CMS tests and TypeScript passed. Database coverage uses synthetic ready image/video rows plus a mapped journey and proves exact replay, actor isolation, conflicting request-key rejection, later-draft preservation, unchanged published pointer, failed-receipt rollback, video-rights revocation, changed record revisions, stale media evidence, unmapped references and foreign-site/unauthorized rejection. This is database-function evidence, not uploaded production assets, concurrent multi-connection testing or the complete reviewed HTTP/UI import flow. The review API and screen still do not offer application; wiring the reviewed manifest, lost-response recovery and client confirmation remains next. No remote migration or production import occurred. Broader visual/source fidelity, dependency consistency, remaining PRD modules, production setup and client acceptance remain pending.

### Reviewed homepage migration HTTP apply and recovery — 2026-10-23

Extended the caller-authenticated homepage migration endpoint with strict review/apply/status commands. Version 2 review responses bind the current capture, target, mappings, mapped record revisions and media evidence. Apply reconstructs the payload on the server, rejects mismatched or incomplete review evidence, rereads dependencies before a first write and passes the exact manifest to the atomic database function. Recovery checks the actor-scoped receipt before current draft comparisons, reuses the original manifest and verifies the immutable result; status without a receipt explicitly remains unconfirmed. Shared client parsing checks complete identities and consistent readiness. Removed the obsolete review finding saying draft application is unavailable.

All 888 CMS tests and TypeScript passed. Unit tests cover changed records/media, contradictory evidence, tampered hashes, lost responses, exact replay and unconfirmed status. A full HTTP-handler-to-PGlite test prepares all 100 mapped images, two silent videos and captured content records with synthetic ready provenance, reviews the ten-section composition, saves a draft through actual RPCs, simulates a lost result, recovers status, edits the draft later and replays the original request without overwriting that edit or changing publication. These synthetic fixtures do not prove actual upload/scanning/provider deployment or client visual acceptance. The screen still needs apply confirmation, persisted pending-request recovery and integration with workspace busy/dirty state. No remote migration or production import occurred. Full PRD and client handover remain active.

### Homepage migration confirmation and browser recovery — 2026-10-23

Connected the migration screen to reviewed draft application and status recovery. Clients can inspect the proposed layout and SEO, explicitly acknowledge draft replacement, apply, or discard the review. Account/site-scoped recovery stores mappings, revision/media evidence and receipt identities before sending an apply request; it excludes page payload and private consent copy. An unresolved request survives reload, exposes status and exact retry, and is retained on unconfirmed/mismatched outcomes. Storage failures prevent unrecoverable writes. Successful verified receipts clear recovery state and refresh/select the saved homepage. Workspace busy/dirty integration blocks competing edits while review or recovery is active. Review cancellation/target changes invalidate stale reads without cancelling an already-sent mutation.

All 890 CMS tests, TypeScript and production build passed (`/private/tmp/cms-homepage-migration-ui-all-tests.log`, `/private/tmp/cms-homepage-migration-ui-build.log`). Unit tests cover account/site identity, bounded and consistent recovery data, no page copy, exact receipt matching and unconfirmed results. Chromium 1280/390 exercised confirmation/discard, workspace locking, simulated lost response, persisted recovery across reload, unconfirmed status, identical retry, recovery removal and refreshed draft selection. A storage-denial scenario verified zero apply requests. Browser plugin not available; approved Playwright fallback used. The fixture initially missed the editor's reference-resolution endpoint; it was added to the simulated provider and both viewports rerun cleanly. The expected simulated 503 was the only excluded console error. Screenshot inspected (`/private/tmp/cms-homepage-migration-390.png`); temporary route removed before build. No live provider, real asset migration or client visual acceptance is claimed. Production setup, source/editor-preview fidelity, remaining dependency consistency and broader PRD/client handover remain pending.

### Document metadata and expiry-policy foundation — 2026-10-23

Compared remaining PRD requirements with the implementation plan and began the missing document/download module. Added a strict document draft contract for type, language/regions, version label, effective/expiry/review dates, download label, access intent, PDF asset identity/filename and product/category references. Ownership and approval are intentionally record/workflow metadata, not editable payload authority. Date-only policy logic distinguishes warning, publication blocking and delivery withdrawal, with inclusive UTC days and independent overdue-review warnings. Document saves now validate title/language/path identity and schema before persistence. Advisory validation reports actionable document findings while publication remains disabled pending verified PDF processing and access-controlled delivery.

All 895 CMS tests and TypeScript passed (`/private/tmp/cms-document-contract-tests.log`). New tests cover impossible dates, interval ordering, UTC midnight boundaries, all three expiry policies, review warnings, malformed/unsafe filenames, duplicate references/regions, forbidden workflow fields and rejected saves before RPC writes. `document-management.md` records semantics and remaining acceptance work. This is a metadata/date-policy foundation; no document editor, PDF upload worker, actual download authorization, product/category reference validation or production readiness is claimed. Those and the broader PRD/client handover remain active.

## Document metadata workspace — 2026-10-23

Added Documents to the client CMS navigation with metadata editing, date-policy notices, loaded-record search, pagination, unsaved-change confirmation and recent revision restore. Invalid legacy payloads remain preserved and cannot be overwritten through this editor. Existing file and relationship identities are retained.

Validation: document contract tests 5/5; desktop 1280px and mobile 390px Playwright flows passed using simulated API responses (create, invalid dates, save, edit, discard cancellation, restore). No browser errors or horizontal overflow; mobile screenshot inspected. PDF upload/processing, gated delivery, publication, relationship/owner editing, real-provider checks and client handover remain pending. No production data or flags changed.

Final verification for this milestone: TypeScript and the production build passed after removing the temporary QA route.

## Private document upload foundation — 2026-10-23

Added PDF reservation/status/list/cancel API and SQL, plus a bounded streaming transfer endpoint and separate private storage policies. Request retries preserve identity; unrelated image/video uploads cannot be transferred through the PDF endpoint. Transfers report awaiting verification and retain no temporary files after completion/failure. Uploads remain disabled by default. PDF inspection, trusted reception, durable processing/recovery, file selection, downloads and publication remain pending. No remote migration, production deployment or real-provider claim.

Validation: all 905 CMS tests passed, including 186 database tests and nine PDF reservation/transfer API tests. Database checks cover caller/site scope, retry identity, expiry/cancel recovery, isolation from image/video workers, private storage reads/writes and restrictive policies with an unrelated broad policy present. TypeScript and production build passed. Storage HTTP tests use a simulated provider; managed-provider and actual PDF-processing checks remain pending.

## Document reception and checksum recovery — 2026-10-23

Added service-only reception discovery and lookup, a bounded streaming checksum adapter and sequential batch reception. Confirmation uses stored reservation identity, current expiry and the existing locked upload transaction. A lost response is recoverable without repeating the write; received files remain unverified and cannot be delivered. Local PGlite plus simulated HTTP storage tests prove the transition and recovery. 191 focused tests (187 database and four reception tests) and TypeScript passed. PDF inspection/processing, worker deployment, download authorization, file selection and publishing remain pending. No remote writes or production configuration changes.

Full regression verification after reception changes: all 910 CMS tests passed.

## PDF structural inspection — 2026-10-23

Implemented real pypdf structure inspection and private derivative serialization behind a timed Node worker wrapper. Inspects hidden as well as reachable objects; rejects active/unsupported content, bounds input/output/page/object/decoded-stream resources, checks configured parser version, requires clean scanner results for source and derivative, and cleans temporary files. Original uploads remain unchanged. Python parser tests and the real-parser Node integration verify rejection cases, text preservation, scanner gating and cleanup. Scanner responses are simulated; production sandbox/scanner/runtime validation, visual fidelity against client files, durable worker completion and delivery remain pending. Document uploads stay disabled.

Verification: four Python parser test groups and all 913 CMS tests passed with the real-parser integration enabled (zero skipped tests). TypeScript passed.

## Durable document processing and recovery — 2026-10-23

Connected actual PDF inspection to private immutable storage and an atomic processing lifecycle. Local migration 140 adds separate document file records, service-only lease/finish/discovery functions, stale-worker rejection and bounded retries. Ready processing status does not approve rights or expose a download. Completion acknowledgement loss recovers without reprocessing or contradictory failure. Image/video media readers remain isolated.

Validation: all 924 CMS tests passed with the real PDF runtime enabled, including actual parser-to-PGlite completion and lost-response recovery. TypeScript passed. Added and passed a repeated-derivative checksum assertion after the full suite. Provider storage and malware scanner responses are simulated. Remaining: production worker/scanner/storage verification and scheduling, client file selection and rights controls, preview/download authorization, publication, representative-PDF visual checks and broader PRD/UAT handover. No remote migration or rollout.

## Document file catalogue and rights API — 2026-10-23

Added local migration 141 and the private document-files endpoint: processed-file lookup/list/search/pagination, permission-limited license evidence, file eligibility, revision-checked rights changes and audit history. Rights approval does not publish documents or expose storage. Tests cover caller/site isolation, restricted evidence, invalid approvals, stale revisions, revocation, audit count, private-field response rejection and unknown mutation acknowledgements. Client file picker/rights forms, private preview, downloads, publication and production rollout remain pending.

Verification: all 928 CMS tests passed with the real PDF runtime enabled (zero skips), TypeScript passed, and the production build passed. No remote migration, data write or production configuration change.

## Client PDF picker and usage-rights controls — 2026-10-23

Connected the document editor to the processed-file catalogue. Clients can search and select eligible files, while authorized administrators can save revision-checked rights/evidence/UTC-expiry changes. Selection rechecks current eligibility; unsaved rights edits protect navigation and block document save/restore. Extracted the shared file schema into a browser-safe module. Fixed catalogue loading under repeated React development effects and reset discarded state when creating another new draft.

Validation: 1280px/390px Playwright flows passed using simulated API responses (approval, required evidence, UTC expiry, revoked eligibility, selection, dirty discard and restricted controls). No browser errors/overflow; mobile screenshot inspected. Eight document/API tests passed. Production uploads, client PDF fidelity, private preview, public/gated downloads, publishing and full PRD/UAT remain pending.

Final milestone verification: TypeScript and production build passed after temporary QA-route removal. Existing local preview remains on port 3001; no remote data or deployment changed.

## Revision-bound private PDF preview backend — 2026-10-23

Added local migration 142 and a caller-token-only preview endpoint. Reads require an authorized saved document revision bound to the exact processed PDF, current processing evidence and nonrevoked/nonexpired rights. Pending-rights files remain reviewable by authorized CMS users; originals/public visitors remain denied. Responses verify byte size/checksum and recheck authorization after reading. Historical revision review is supported without claiming the historical revision is current or published.

Focused tests cover revision/record/site/asset mismatches, record-specific permissions, private storage visibility, original denial, revocation/expiry/archive, corrupted bytes, duplicate query fields, safe response headers and caller credential routing. Client preview controls, browser PDF rendering and production-provider checks remain pending; no remote migration or rollout.

Verification: all 933 CMS tests passed with the real PDF runtime enabled (zero skips); TypeScript and production build passed. The revision-file index excludes malformed/oversized legacy values to preserve migration compatibility. Database tests passed again after that index adjustment (the optional real-parser integration was not enabled in this final SQL-only rerun).

## Client saved-PDF preview control — 2026-10-23

Added an on-demand saved-revision preview panel to Documents, connected to the current session's private preview endpoint. It validates response type/size, creates a temporary object URL, opens the browser PDF viewer and cleans up on close/dirty state/identity change/unmount. Late cancelled results cannot replace the current preview. Unsaved document or file-rights changes require resolution first.

Browser verification at 1280px/390px passed for actual PDF fixture rendering in full Chromium, cleanup, cancellation, revision changes, invalid response handling and reload. The initial headless-shell viewer wait was replaced with the installed full Chromium PDF viewer. Screenshots inspected; no errors or overflow. HTTP responses were simulated. Public/gated downloads, publication, production upload/worker/scanner setup, history-row preview and representative client PDF/UAT remain pending.

Final verification: four preview API tests, TypeScript and production build passed after QA-route removal. No production data, credentials or rollout flags changed.

## Document file usage reporting — 2026-10-23

Added private file-usage lookup and client display for current drafts, published versions and earlier revisions. Reporting follows both document file bindings and correctly pinned composition download references, including hidden sections, while filtering by website and record access. Replacing a document's current file does not hide older pinned dependencies. Pagination and empty/refresh states are included. This covers the implemented binding shapes, not future unimplemented modules.

Desktop/mobile Playwright checks passed using simulated API responses; mobile screenshot inspected with no errors or overflow. SQL/API tests cover historical and pinned usage, wrong-pin rejection, permissions, pagination and private-response validation. Public/gated delivery, publication, archive/impact enforcement, production setup and full PRD/client handover remain pending.

Final verification: all 935 CMS tests passed with real PDF integration enabled (zero skips), TypeScript passed and the production build passed. No remote migration, data change or rollout.

## Document archive safeguards — 2026-10-23

Added local migration 144 and archive/restore commands. File deletion permission and expected revision are required. Current/published references, pinned downloads and active previews prevent archive regardless of caller visibility. Saved history stays intact; new draft, restore and preview references to archived files are rejected. Publication-pointer changes also acquire the file guard. File locks coordinate admission and archive checks; real PostgreSQL concurrent-session verification remains pending.

The client archive buttons are not connected yet. Public/gated downloads, publication, production setup and full PRD/UAT remain pending. No remote migration or data changes.

Verification: all 937 CMS tests and TypeScript passed. Expanded synthetic published-pointer dependency/admission checks then passed with all 193 database tests, including real PDF integration (zero skips). Synthetic pointer fixtures isolate archive behavior; they do not enable document publication.

## Client PDF archive and restore controls — 2026-10-23

Connected the file picker to revision-checked archive/restore. Capability metadata controls visibility; a missing capability defaults to denied. Confirmed operations reload and verify the server state, dependency failures preserve active state, selected draft files cannot be archived through the control, and restore still requires valid usage rights for selection. Added general detail refresh for recovery.

Desktop/mobile browser checks passed with simulated responses: cancel, dependency error, archive, restore, pending rights and permission removal after refresh. Mobile screenshot inspected without errors/overflow. Public/gated downloads, document publishing, real-provider deployment, concurrency tests and full PRD/UAT remain pending. No remote migration or data changes.

Final verification: all 937 CMS tests passed with real PDF integration enabled (zero skips). A callback return-type mismatch found by TypeScript was corrected; TypeScript and the production build then passed. Browser behavior was unchanged by the type-only correction.

## Trusted document validation evidence — 2026-10-23

Added migration 146 and worker input support for saved PDF processing, rights, expiry, archive and typed product evidence. Document validation now reports these issues using service-provided evidence bound to the selected file and product references. Private storage keys/license evidence are excluded; malformed legacy payloads can still produce content findings.

The document publication gate stays closed. Validator-policy activation and persisted document receipts, client validation controls, publication-time rechecks, public/authenticated downloads, production setup and the remaining PRD/UAT scope are still pending. No remote migration or data changes. Targeted validation/database checks passed (200 tests); TypeScript passed.

Final verification: all 939 CMS tests passed with real PDF integration enabled (zero skips), and the production build passed. This milestone changes backend validation infrastructure; it adds no new client-facing control.

## Persisted document draft validation — 2026-10-23

Added migration 147 to enable queued, saved document draft findings. A database constraint prevents the diagnostic validator from recording success, so enabling the queue does not enable publication. The SQL integration test verifies the actual queue consumer, editor readback, outsider denial, completed job state, rejected forged success and publication rejection after editorial approval. All 195 database tests passed with real PDF integration enabled.

Client validation controls, publication-capable validation and delivery, production deployment, remaining PRD features and UAT remain pending. No remote migration or client data changed.

Final regression verification: all 940 CMS tests passed with real PDF integration enabled and zero skips. This change contains SQL, tests and documentation only; the previously verified application build is unchanged.

## Client document validation controls — 2026-10-23

Connected saved documents to the existing Content checks panel: inspect advisory/saved trusted findings, request a worker check when permitted, and block checks while metadata or rights edits are unsaved. Read-only capabilities default safely and results are scoped to the saved revision. No publication control is enabled.

Desktop/mobile Playwright checks passed at 1280px/390px with simulated API responses. Request acknowledgement, findings, dirty guards and read-only access were exercised; the final mobile screenshot was inspected with no displayed errors or overflow. Temporary QA route removed. Real-provider validation-worker deployment, document publishing/downloads, remaining PRD scope and UAT remain pending.

Final verification: TypeScript and the production build passed after removing the QA route. The last full backend regression run remains 940 passing tests; this UI integration did not change backend code.

## Visitor document download eligibility — 2026-10-23

Added migration 148 to resolve stable document references to eligible published PDFs. It checks publication evidence, access level, current processing/rights/archive state and UTC date policies. Authenticated documents require an existing signed-in user; private storage remains closed to direct visitor reads. Draft replacement does not change the published download.

The publication-capable policy is not activated. Tests isolate eligibility using synthetic release evidence; the HTTP download route, transfer-time recheck, actual publication flow, production deployment and remaining PRD/UAT work are pending. All 196 database tests passed before expanding receipt/storage regression coverage. No remote migration or client data changes.

Final regression verification: all 941 CMS tests passed with real PDF integration enabled and zero skips, including receipt withdrawal and direct visitor storage denial. This milestone changes SQL/tests/documentation only.

## Verified document download endpoint — 2026-10-23

Added the server-mediated PDF download route, scoped to the configured website and stable document ID. It authorizes using visitor credentials, verifies bounded PDF bytes/checksum and rechecks access before returning an attachment. Private storage credentials are confined to the server read. Downloads are noncached and remain disabled by default.

Four endpoint/adapter tests and TypeScript passed. Publication-capable validation/guards, authenticated visitor controls, consent-based measurement, real-provider deployment, remaining PRD features and client UAT are pending. No live flags, credentials or remote data changed.

Final verification: all 945 CMS tests passed with real PDF integration enabled and zero skips. The production build passed and includes `/api/documents/download`.

## Document publication dependency guard — 2026-10-23

Added migration 149 to recheck PDF processing/rights/archive, dates and typed product associations at publication time under transaction locks. Corrected the generic image checker so the separately verified document PDF is not treated as an image; other nested assets retain image checks. Added an actionable gateway error for changed document eligibility.

All 946 CMS tests passed with real PDF integration enabled and zero skips. The new integration test uses synthetic validator evidence with the real approve/publish procedure; it does not claim a completed document validator/publication flow. Publication-capable validation/policy activation, client review/release controls, production concurrency tests, deployment and remaining PRD/UAT scope are pending. No live data, flags or credentials changed.

## Document publication backend lifecycle — 2026-10-23

Implemented publication-capable `document-1` validation and local migration 150. Eligible content can pass trusted validation; missing evidence, file/date/relationship failures still block. Old diagnostic receipts cannot authorize publication.

The new integration test runs actual trusted validation, independent review, publication, SQL-authorized HTTP download, authenticated replacement, restore/reapproval and withdrawal. Self-approval and publishing without a receipt are rejected. File bytes/storage and processing receipts are fixtures; provider deployment is not claimed. All 947 CMS tests passed with real PDF integration enabled and zero skips.

Client review/publish controls, visitor login/download integration, analytics consent, production deployment/concurrency testing and the remaining PRD/UAT work are pending. No production data or flags changed.

Final verification: TypeScript and the production build passed. No client UI changed in this milestone.

## Client document review and release controls — 2026-10-23

Connected submit, approve, request changes, publish and withdrawal in the document editor. Permissions and unsaved-change guards control availability; release confirmations identify the saved revision and reset on state changes. Mutations reload/verify the saved state before showing success. Server validation and independent-review requirements remain authoritative.

Desktop/mobile workflow checks passed with simulated API responses, covering review transitions, cancellation, dirty edits, a failed publish, successful publish/withdrawal and removed permissions. Mobile screenshot inspected with no overflow or runtime errors. A TypeScript callback return mismatch was corrected and the interaction checks repeated. Temporary QA route removed. Visitor login/download controls, production setup, consent-based measurement and the remaining PRD/UAT scope remain pending.

Final verification: TypeScript and production build passed after QA cleanup. Backend code was unchanged; its last full run remains 947 passing tests.

## Visitor document access page — 2026-10-23

Added a stable visitor download page and a link from published CMS documents. Public PDFs download directly; restricted resources can use an existing visitor account with a separate in-memory session. File response checks, safe filenames, cancellation, temporary URL cleanup, sign-out and clear unavailable/error states are included. The page remains behind the existing disabled-by-default delivery flag.

Desktop/mobile browser checks passed with simulated auth/download responses: real download events, filename, access denial, sign-in failure/success, bearer forwarding, invalid MIME, sign-out and no persisted/CMS session. Mobile screenshot inspected. Page-composition download sections, visitor account provisioning/recovery, consent-based measurement, managed-provider verification and remaining PRD/UAT work remain pending. No live flags or data changed.

Final verification: TypeScript and the production build passed after removing the temporary QA route. The backend was unchanged; its last full run remains 947 passing tests.

## Client PDF uploads — 2026-10-23

Added PDF upload controls to the CMS upload area: file validation, private transfer, processing status, same-reservation recovery after lost acknowledgement and reservation cancellation. Server rollout capability controls new uploads; existing status/cancellation remains usable when uploads are disabled. Updated file-picker guidance to explain upload → processing → rights review → selection.

Desktop/mobile Playwright checks passed with simulated API responses, including invalid files, lost acknowledgement recovery, retry identity, ready state and cancellation under disabled uploads. Mobile screenshot inspected without overflow/runtime errors. Managed-provider workers/transfer, page-composition download sections, visitor account operations, analytics consent and remaining PRD/UAT work remain pending. No remote data or flags changed.

Final verification: TypeScript and production build passed after QA-route cleanup. Backend code was unchanged; its last full run remains 947 passing tests.

## Document rollback fidelity correction — 2026-10-23

Fixed a discovered mismatch where restoring document content retained the newer list title. Migration 151 now restores valid historical titles with the new draft, preserves immutable history and existing specialist/expedition behavior, and leaves malformed legacy payloads intact for migration. Added database coverage for matching title/content, new revision identity, stale restore rejection and malformed-title preservation.

This correction does not enable production rollout or complete the broader PRD. Live workers/storage, page download sections, account operations, measurement and remaining client acceptance work are still pending.

Final regression verification: all 948 CMS tests passed with real PDF integration enabled and zero skips. This change contains SQL, tests and documentation only.

## Version-specific document download behavior — 2026-10-23

Added revision-aware visitor links and API checks so a page's reviewed document version cannot silently become a different PDF. Replaced versions report an explicit message before storage is read; stable links retain current-publication behavior. Invalid/duplicate revision inputs are rejected.

Desktop/mobile browser checks passed for forwarding the revision, replacement/no-download behavior and an eligible download; mobile screenshot inspected. Actual download-section authoring/reference validation/rendering is still pending, alongside production setup and remaining PRD/UAT scope. No live flags or data changed.

Final verification: all 949 CMS tests passed with real PDF integration enabled and zero skips; TypeScript and production build passed. An additional empty-revision URL-helper case then passed with all five download endpoint/helper tests.

## Download section editor and draft preview — 2026-10-23

Added a Downloads section to the page composer with published-document selection, explicit revision updates, editable labels, ordering/removal and pinned links in draft preview. Selection reloads current publication state and does not silently replace a withdrawn pin.

Integration exposed a dependency traversal bug: usage/archive helpers inspected top-level sections instead of the composer's nested sections. Migration 152 now supports both envelopes; the archive lifecycle test exercises the actual nested structure while legacy usage coverage remains.

Desktop/mobile browser checks passed using simulated record responses; mobile screenshot inspected without runtime errors/overflow. Live page rendering and publication dependency checks for download sections, production setup and remaining PRD/UAT scope are still pending. No live flags or data changed.

Final verification: all 949 CMS tests passed with real PDF integration enabled and zero skips. The first TypeScript check encountered a generated reference to the removed QA route; the production build regenerated route types and passed, followed by a successful clean TypeScript check.

## Download-section publication dependency checks — 2026-10-23

Added migration 153 to check exact document pins, site/language and current PDF eligibility during page publication, including hidden sections. Internal eligibility is separate from visitor authentication and is not browser-accessible; restricted PDFs remain gated. Added a clear editor error for invalidated download references.

Expanded the real document lifecycle test with isolated page-reference cases for changed rights, replacement pins, valid gated references and anonymous denial. Page receipts are synthetic because live section projection/validation is still unfinished. All 949 CMS tests and TypeScript passed, with real PDF integration enabled and zero skips. No client UI or live configuration changed. Trusted-worker section findings, live page rendering, production verification and remaining PRD/UAT scope are pending.

## Trusted download-link validation findings — 2026-10-23

Connected service-only download reference evidence to the validation worker and field-specific page findings. Missing/mismatched evidence fails; each unavailable selected version receives its own finding, including repeated and hidden links. Editor access cannot call the evidence RPC directly, and private file metadata is not returned.

All 950 CMS tests and TypeScript passed with real PDF integration enabled and zero skips. Live page projection/rendering, managed-provider verification and remaining PRD/UAT scope remain pending. No client UI or deployment flags changed.

Final verification: production build passed. Expanded SQL-to-worker-input assertions then passed with all 199 database tests, verifying that actual trusted input produces unavailable-link findings after eligibility changes.

## About-page download-section rendering — 2026-10-23

Connected the shared download-section renderer to About's live projection/component. Existing section layout, schedule and heading rules apply, and links retain the reviewed document revision. The database lifecycle now verifies a real About draft through trusted validation, independent approval, publication, anonymous reading and projection.

Desktop/mobile rendering checks passed for heading structure, pinned links, keyboard focus and no overflow/runtime errors. A fixture background value was corrected before the passing run; mobile screenshot inspected and temporary route removed. Other page-template integrations, production rollout and remaining PRD/UAT scope remain pending. No live flags or data changed.

Final verification: all 951 CMS tests passed with real PDF integration enabled and zero skips; TypeScript and the production build passed.

## Legal-page document downloads — 2026-10-23

Connected Downloads sections to Privacy, Terms and Cookies projection/rendering while retaining legal content, headings, schedules and audience restrictions. Expanded the real lifecycle test through trusted validation, independent approval, publication and public projection for all three paths.

Desktop/mobile checks of the shared legal renderer passed for headings, version-specific links, keyboard focus and no runtime errors/overflow; mobile screenshot inspected and temporary QA route removed. Other template integrations, production deployment and remaining PRD/UAT scope remain pending. No live content or flags changed.

Final verification: all 952 CMS tests passed with real PDF integration enabled and zero skips. TypeScript and the production build passed.

## Expedition and specialist directory downloads — 2026-10-23

Both directory page projections and renderers now support Downloads sections, retaining mandatory directory and heading constraints. Shared download headings and labels reject whitespace-only text. Real database lifecycle coverage exercises both routes through trusted validation, independent approval, publication and anonymous projection with reviewed document revisions.

All 953 CMS tests passed with real PDF integration enabled and zero skips. Production build and TypeScript passed. Playwright (Browser plugin unavailable) verified the actual renderers with local fixtures at 1280px and 390px: page identity/content, single download heading, pinned URL, keyboard focus and no runtime errors or horizontal overflow. The initial heading visibility timeout did not reproduce in diagnostic and subsequent complete runs; both mobile screenshots were inspected. Temporary QA route removed. Browser checks do not represent a managed-provider deployment or live content migration.

Remaining: other page-template integration, production services/deployment, complete inventory/PRD coverage and client UAT/handover. No live flags or data changed.

## Homepage download rendering — 2026-10-23

Homepage projection and rendering now support Downloads alongside its ten existing section families. Reviewed document revisions survive projection; required hero H1, scheduling, region restrictions and nonblank labels remain enforced. The migration fixture remains ten sections: this adds an optional family without changing migrated content.

All 954 CMS tests passed with real PDF integration and zero skips; production build passed. Playwright fixture checks at 1280px/390px verified heading hierarchy, pinned URLs, keyboard focus and no runtime errors/overflow. Initial visibility timeout did not recur. Screenshot inspection caught missing page-level homepage CSS in the temporary fixture; after including the actual route styles, both sizes passed again and the mobile download-section screenshot was inspected. Temporary route removed. These are local renderer checks, not proof of managed deployment or a new full homepage/database release lifecycle.

Remaining scope includes other template integrations, production setup and provider validation, complete PRD inventory coverage, client acceptance and handover. No live data or flags changed.

## Homepage document publication and public SQL delivery — 2026-10-23

Added migration 155 to include document-link presentation fields in the public homepage allowlist. A real database lifecycle caught this missing connection after component-only QA. Coverage now verifies trusted validation, independent approval, publication refusal after PDF rights revocation, successful publication with restored rights, anonymous public reading and exact download data/version projection. Homepage controls are normalized as in editor-produced compositions; header/media are fixture setup. No remote migration, content or live flag changes.

All 199 database tests passed with PDF integration enabled and zero skips. Managed-provider rollout, remaining template connections and broader PRD/client acceptance scope remain pending.

Final regression verification: all 954 CMS tests passed with real PDF integration enabled and zero skips. This milestone changes SQL and integration coverage only; the previous renderer build remains applicable.

## Template-aware section choices — 2026-10-23

The page editor now derives its add-section choices from the connected About, homepage, expedition and specialist renderer families; Legal offers text and downloads. The composer also rejects unsupported insertion requests when an allowed list is supplied. Existing unsupported sections remain editable and show guidance to hide/remove before publication. Unknown page routes retain the full draft palette and existing publication-not-connected messaging; this change does not redefine them as complete. Updated About/Legal guidance includes downloads.

All 955 CMS tests passed with PDF integration enabled and zero skips. Playwright at 1280px/390px exercised the actual composer with a local fixture: Legal/Homepage/About choices, download insertion/editing, and preserved unsupported content across template changes. Initial route-load timeout and an incorrectly labeled fixture select were resolved before the passing run; mobile screenshot inspected and temporary route removed. Browser plugin unavailable, so regular Playwright was used. No live content, permissions or flags changed. Remaining: other templates, managed deployment, full inventory/PRD coverage and client UAT/handover.

Final verification: production build passed after temporary fixture removal; TypeScript had passed before removal as well.

## New-page starting templates — 2026-10-23

Added client-selectable draft templates for About, Privacy, Terms, Cookies, Photography Expeditions and Specialists, plus the existing custom blank draft. Connected templates seed one H1 text introduction and their required directory where applicable. They contain no invented policy text, claims, images or selected records. Changing the template selector alone leaves current edits intact; New page retains the existing unsaved-change confirmation. Creation still uses a new record identity and the normal server save/uniqueness checks; existing pages are not overwritten. New-draft status now explains saving before review.

Unit coverage verifies independent draft values, connected validator acceptance of the section structure, no invented body copy and invalid template rejection. All 956 CMS tests passed with PDF integration enabled and zero skips. Actual PagesWorkspace browser fixture checks passed at 1280px/390px for Legal and Specialist creation, expected palette, preserved edits on cancellation and deliberate replacement. The fixture uses an empty simulated listing and does not claim production persistence. Mobile screenshot inspected and temporary fixture removed. Arbitrary new-route publication, hierarchy/duplication, remaining full PRD coverage, provider deployment and client UAT/handover remain pending.

Final verification: production build including TypeScript passed after the new-draft guidance correction and fixture removal.

## Custom page URL ownership foundation — 2026-10-23

Added matching application/PostgreSQL predicates for custom-page namespace eligibility, with migration 156. They reject malformed paths and reserve existing route families, administration/API/auth surfaces, public asset directories and legacy redirects. Source-backed tests detect newly introduced route roots and compare SQL/TypeScript behavior, including reserved descendants and length boundaries. Explicit character restrictions prevent trailing newline ambiguity in regex end anchors.

All 958 CMS tests passed with real PDF integration and zero skips; TypeScript passed. No existing records or live routes changed. This milestone establishes the path contract only: custom-page publication remains disabled pending the general renderer, public projection, trusted release gates and lifecycle verification. `custom-pages.md` records the remaining integration and page-management requirements without narrowing the PRD.

## Custom page projection and gated visitor route — 2026-10-23

Added a custom-page projection using the existing approved editorial sections, canonical metadata, public-only runtime reader and a disabled catch-all visitor route. Reserved paths are rejected before any CMS fetch. Existing About rendering now types only the sections/revision it consumes and remains unchanged visually. `.env.example` documents the disabled flag; no live environment changes.

All 960 CMS tests passed with PDF integration enabled and zero skips. Chromium verified disabled custom delivery returns 404 while the existing About page remains available, with no page errors; screenshot inspected. TypeScript passed. This is not a completed custom-page publication feature: trusted validation/policy, database release/public delivery integration, persisted enabled-route lifecycle and search/navigation/sitemap connections remain pending, alongside the broader PRD.

Final verification: production build passed with the new catch-all route registered.

## Trusted custom-page publication lifecycle — 2026-10-23

Connected eligible custom pages to the composition validator and added migration 157 for release-time route ownership, language and link availability checks. Existing media/download checks remain active. Real local persisted coverage verifies save/review/validate/publish, draft isolation, unchanged live revision while editing, path protection, link changes after validation, restore/revalidate/publish and withdrawal. A queued empty custom page produces actionable custom composition findings. Broader regression found an eager section-list import cycle, corrected with a live export.

All 962 CMS tests passed with real PDF integration and zero skips. Visitor rollout remains disabled; no managed migration/content changed. Client publication controls, enabled persisted-route browser delivery, navigation/sitemap/search and the broader PRD remain pending.

Final verification: production build, including TypeScript, passed after the import-cycle fix.

## Custom-page client workflow — 2026-10-23

Added the Editorial page starting draft and connected eligible saved English custom pages to the existing trusted-check/review/release UI. Approved section choices apply to custom paths, and publication confirmations/messages now identify the custom-page rollout. Unsaved changes continue to disable release actions; template selection does not modify existing content.

Desktop/mobile browser fixture checks passed for palette, cancellation, revision-bound publication, withdrawal and dirty-state protection. Mobile screenshot inspected. The first regression run correctly identified the temporary QA route as unreserved; the route was removed before final regression. Browser API was simulated; persisted SQL release coverage was completed in the preceding milestone. Visitor flag remains off. Remaining: enabled persisted visitor tests, navigation/search/sitemap, production setup and broader PRD/UAT/handover scope.

Final verification: all 962 CMS tests passed with real PDF integration and zero skips. Production build, including TypeScript, passed after fixture removal.

## Custom-page navigation integration — 2026-10-23

Connected custom-page record targets through trusted navigation evidence, release-time locking/checks, validator and public menu projection. Published composition titles and eligible custom paths are used; withdrawal suppresses the menu item and descendants. The existing page record picker remains in place. Database lifecycle coverage verifies an actual validated/reviewed/published menu, anonymous custom URL resolution, and refusal to publish a replacement menu after target withdrawal despite its earlier receipt. Unit coverage verifies reserved path rejection and descendant suppression.

No live flags or managed migrations changed. Enabled persisted visitor browser delivery, sitemap/search, production rollout and wider PRD scope remain pending. Navigation and custom visitor rollout must be coordinated so menu publication is not mistaken for an enabled visitor route.

Final verification: all 963 CMS tests passed with real PDF integration and zero skips. Production build, including TypeScript, passed.

## Custom-page sitemap discovery — 2026-10-23

Added migration 159 for scoped published custom-page summaries and connected a bounded application reader to sitemap generation. Discovery honors custom visitor rollout, published SEO defaults, effective noindex, sitemap exclusions and canonical ownership. SQL returns only summary fields and allowlisted scalar SEO metadata. Database lifecycle checks verify draft exclusion and withdrawal; unit checks verify pagination/ownership/SEO rules and no requests while disabled.

All 966 CMS tests passed with real PDF integration and zero skips; TypeScript passed. A subsequent SQL-only refinement explicitly allowlists summary SEO fields and was rechecked in the database suite. No live data/flags or managed migrations changed. Search, enabled persisted visitor-browser verification, production rollout and wider PRD scope remain pending.

Final verification: all 201 database tests passed after the SEO allowlist refinement, with real PDF integration and zero skips. Production build, including TypeScript, passed.

## Custom-page public search — 2026-10-23

Connected published custom-page summaries to site search and added the Pages filter. The client search content-type setting now accepts page delivery; unsupported products/projects remain gated. Effective noindex excludes pages, while sitemap-only exclusion does not remove internal search results. Disabled custom rollout or an excluded Page category avoids discovery loading.

All 967 CMS tests passed with real PDF integration and zero skips. Desktop/mobile search fixture checks passed for filtering, URL, queries, empty/reset states and configured categories; mobile screenshot inspected and temporary route removed before regression. No live data/flags changed. Enabled persisted visitor testing, production rollout and the remaining complete-PRD/UAT/handover work remain pending.

Final verification: production build, including TypeScript, passed.

## Persisted custom-page runtime verification — 2026-10-23

Extended the real database lifecycle through enabled application runtime/discovery readers with anonymous RPC transport backed by PGlite and actual published SEO settings. Verified draft privacy, current published revision, sitemap/search inclusion and disappearance after withdrawal. Added an opt-in public snapshot export for repeatable visual QA; default tests do not write artifacts.

The actual visitor renderer and metadata function passed desktop/mobile checks using this database-produced public snapshot: H1/copy, canonical, keyboard link and no runtime errors/overflow. Mobile screenshot inspected and temporary route removed. This closes the local persisted-reader/renderer gap; managed-provider browser deployment acceptance, production rollout and broader PRD requirements remain unfinished. No live flags, settings or content changed.

Final regression: all 967 CMS tests passed with real PDF integration and zero skips. This milestone changes test coverage/documentation only; production source was unchanged.

## Page duplication into a reviewed new draft — 2026-10-23

Added duplication for clean editable English page drafts, with new URL, cleared canonical, explicit SEO/social and navigation-placement confirmation, and review invalidation after relevant edits. Copies are independent and save through the normal new-record path; workflow/publication/history/menu state is not copied. Invalid/unknown payload fields are refused instead of discarded. Homepage/non-English duplication remains pending; specialized sections copied to a custom path still require compatible composition before release.

All 968 CMS tests passed with real PDF integration and zero skips. Desktop/mobile workspace fixture checks verified confirmation, invalidation and new-draft save behavior. Real SQL checks verified distinct IDs, unpublished draft status, no public delivery and unchanged source release. Screenshot inspected and temporary fixture removed. No live flags/data changed. Deployment acceptance, hierarchy, structured generic-page imports and the wider PRD/UAT/handover remain pending.

Final verification: production build passed. A subsequent explicit non-English duplication guard passed TypeScript; it prevents silently creating an English copy of another locale and does not enable localization.

## Editorial page Office import contract — 2026-10-23

Defined version 1.0 page tables covering all six approved editorial section families and their blocks, lists, cards, processed images, buttons, pinned downloads and SEO. Added cell-level validation with explicit Unicode character limits, separate editorial warnings, exact whitespace/blank-row preservation, unknown-field rejection and row/text budgets. Added page-specific Word/Excel parser entry points using the existing bounded Office archive/XML implementation.

All 971 CMS tests passed with real PDF integration and zero skips; TypeScript passed. New generated OOXML tests cover horizontal/vertical Word and Excel, metadata/provenance, whitespace, formula rejection, wrong templates, blank-row diagnostics, Unicode limits and guidance/error distinction. This is not an enabled import workflow: semantic composition planning, conflict/evidence review, authenticated draft application, downloadable client templates and real Office/client round trips remain pending. No content saved or published by parsing. Full contract and remaining gates are in `page-imports.md`.

Final verification: production build, including TypeScript, passed.

## Editorial Office import proposal planner — 2026-10-23

Implemented pure proposals for all six approved editorial section families, including child joins/order, rich text/lists, cards/images, buttons, pinned documents and SEO. Requires explicit complete section replacement on updates; metadata-only changes retain sections. Exact current revisions, fixed URL/language, unknown-data preservation, orphan/duplicate/inapplicable row rejection and no partial proposals on error are enforced. Expanded the contract for card eyebrow/role, introduction and columns.

Generated Word/Excel files now produce matching proposed drafts. Structural planning is not publication authorization: trusted evidence, authenticated review/apply, client downloads/UI and real Office round trips remain pending. Schema findings use the section source row plus detailed field path; full child-cell remapping remains unfinished. No content saved or published.

Final verification: all 974 CMS tests passed with real PDF integration and zero skips. Production build, including TypeScript, passed.

### Editorial Office import reference review — 2026-10-23

Added complete proposed-snapshot image/document collection and strict evidence matching, including hidden and retained content. Added migration 160 with permission-scoped image and pinned-document eligibility reads, without private file metadata. Tests cover missing/malformed/mismatched evidence, affected-page diagnostics, denied roles/sites/targets, changed image rights, real published document eligibility and stale document pins. This is a server-side foundation; no client import screen or apply transaction is claimed complete. Managed deployment remains pending.

Validation: all 978 CMS tests passed with zero skips, including the real-PDF fixture runtime; TypeScript checking passed. No UI rendering changed in this milestone, and no production deployment was performed.

### Editorial Office import review/apply API — 2026-10-23

Completed the authenticated page Office upload endpoint and migration 161's atomic draft application with private recovery receipts. The server rebuilds proposals from original bytes and current caller-accessible content, binds the review digest to image/document evidence and rechecks mutable dependencies under transaction locks. Verified stale revision refusal, unchanged route/language, authorization, no automatic publication, all-or-nothing rollback and duplicate-safe retries. A real Word review/apply/replay test uses actual database RPCs; the document lifecycle also verifies a published PDF pin can be imported into an unpublished draft.

Validation: full CMS suite passed 986 tests with zero skips; two additional API cases for changed document eligibility and empty templates then passed in the 9-test API suite. TypeScript and production build passed. The client upload/review screen, downloadable templates, managed deployment and client Office/UAT remain pending. Existing website data and production settings were not changed.

### Client page import panel — 2026-10-23

Connected a page import panel to Pages, with source-bound review, row findings, replacement warnings, draft layout preview and explicit save acknowledgement. Import state protects page editing/migrations and participates in the workspace leave guard. Actor/site-scoped recovery stores identifiers rather than uploaded content; verified receipt recovery refreshes the list after interrupted saves. Client validation rejects mismatched file/source, page identities, unsafe routes and missing document evidence.

Validation: 992 CMS tests passed with zero skips; TypeScript passed. Playwright desktop 1280px and mobile 390px passed review/preview/acknowledgement and simulated interrupted-save reload recovery, with no page errors or horizontal overflow. Browser plugin unavailable; controlled transport used for browser interactions, actual API/database tested separately. Screenshots inspected in /private/tmp/cms-page-import-review-{1280,390}.png; temporary QA route removed. Templates for download, actual Office/client UAT and managed deployment remain pending.

### Downloadable editorial Excel template — 2026-10-23

Created and connected the page Excel template with schema-derived sheets, readable instructions, field choices, frozen headers and length warnings. Added actual exported-file parser/planner coverage and aligned button/card labels and anchors with composition limits. Verified a blank download creates no sample pages, a filled workbook preserves text/newlines, and the local HTTP download exactly matches the file. All sheet layouts and an over-limit warning were rendered and inspected. Native Excel, Word template creation and client UAT remain pending.

### Word page template and Office round-trip fidelity — 2026-10-23

Created and connected the downloadable Word page template, including instructions, limits, all section families and copyable record tables. Verified all 13 rendered pages and exact Word/Excel proposal equivalence. Both filled examples survive bundled LibreOffice open/save and re-import. That check found and fixed shared XML numeric-entity decoding so saved Excel line breaks remain line breaks, with regression coverage for Unicode and literal entity-looking text. The local download matches exported bytes. Microsoft Office testing and client UAT remain pending; no managed deployment or existing-content migration was performed.

Validation: all 996 CMS tests passed with zero skips; TypeScript and production build passed after the shared XML parser fix.

### Page import saved-draft comparison — 2026-10-23

Added server-derived comparisons to page import proposals and review UI: title changes, removed/added/moved sections, changed content/settings fields and explicit previous/proposed SEO values. Stable IDs prevent reorder-only changes from being mistaken for replacements; normalized content avoids object-key ordering noise. Comparison participates in the review digest. Verified desktop/mobile removal and SEO-clearing display, preview/acknowledgement and recovery. Temporary QA route removed. Word-level rich-text differences, native Microsoft Office/client UAT and managed deployment remain pending.

Validation: 998 CMS tests passed with zero skips; TypeScript and production build passed. Playwright checked desktop/mobile with no runtime page errors or horizontal overflow; screenshots were inspected.

### Conservation source inventory and migration contract — 2026-10-23

Audited the hardcoded conservation route beyond generic text: eight impact outcomes, four field projects, three geographic groups, species copy, heading line/emphasis structure, hero credit/alt text, source citation, accessibility labels and metadata. Captured three source-file hashes and five image hashes. Added a strict editorial contract and review-only migration planner that preserves captured content and rejects source drift or invalid media mappings. Updated the editability register and documented responsive/motion differences that need preservation.

This is not a completed editable route: section/editor registration, public/preview rendering, trusted publication/media checks and migration application are pending. Existing public content and flags are unchanged. Targeted tests cover current-source hashes, exact content preservation and malformed/stale mappings.

Validation: 1,001 CMS tests passed with zero skips; TypeScript passed. No public renderer or live content was changed in this milestone.


### Conservation draft composition and editor — 2026-10-23

Registered five conservation section kinds and connected a route-specific palette plus empty conservation starter. The source-preserving migration proposal now includes a validated composition and source SEO text. Draft controls cover hero/credit, heading lines/emphasis, position paragraphs, source citation, outcome prominence/accessibility labels, projects/images, regions and species. Ordered child lists support add/remove/reorder; read-only state disables editing. Incomplete media and source fields cannot pass structural save validation. Publication remains blocked pending delivery and trusted checks.

Validation: all 1,004 CMS tests passed with real PDF integration and zero skips; TypeScript passed. Playwright at 1280px and 390px verified edits, row order, add/remove and disabled controls without runtime page errors or horizontal overflow. Fixed stable accessible field names discovered during interaction testing. Screenshots inspected at /private/tmp/cms-conservation-editor-{1280,390}.png; temporary fixture route removed. Browser plugin unavailable, so repository Playwright was used. The fixture used review-only images and did not exercise managed media or database persistence. Public/preview rendering, release validation, trusted media/SEO migration, managed deployment and client UAT remain pending.

Final verification: production build passed after the conservation editor changes.


### Conservation delivery projection — 2026-10-23

Added the shared conservation projection, fixed-route published-content reader and SEO metadata mapping. Preserves exact headings, source links, metrics, image references and ordered groups without sharing mutable input data. Rejects malformed envelopes, unsupported scheduled section kinds and region targeting. Checks H1 continuity at current and future visibility boundaries. Reader distinguishes missing content from malformed responses and provider failure.

Validation: all 1,007 CMS tests passed with real PDF integration and zero skips; TypeScript passed. This contract is not yet wired into preview, public rendering or trusted release authorization. Existing public content and provider configuration remain unchanged. Renderer, responsive/motion parity, publication checks and migration remain pending.


### Conservation draft layout preview — 2026-10-23

Connected all five conservation section types to unsaved composition preview through a shared semantic content component. Includes explicit editorial heading lines/emphasis, source link behavior, primary/secondary accessible outcome groups, project images/captions/credits, ordered regions and species copy. Uses the existing authenticated private-image loader and section visibility/presentation controls. Desktop projects alternate columns; mobile follows the selected media/text order. Long text wraps within responsive layouts. This is draft content/layout review, not final public theme or motion parity.

Validation: Playwright desktop 1280px and mobile 390px checked exact group counts, source URL/security attributes, hero credit, hide/show and reorder updates with no page errors or horizontal overflow. Screenshots inspected at /private/tmp/cms-conservation-preview-{1280,390}.png. Browser plugin unavailable; repository Playwright used. Review-only image IDs intentionally exercised unavailable-image feedback, not live provider delivery. Temporary QA route removed. All 1,007 CMS tests passed with zero skips; TypeScript passed. Public renderer/theme/motion, trusted publishing checks, source migration, provider deployment and client UAT remain pending.

Final verification: production build passed with the conservation draft preview connected.


### Conservation migration SEO preservation — 2026-10-23

Found and corrected dropped migration metadata: the proposal now preserves the exact rendered title, canonical URL and social sharing image, alongside descriptions and social text. The social image resolves against captured local media and shares the hero's proposed asset mapping; unknown/external sources require explicit review. Strict SEO parsing and metadata regression checks cover unmapped review placeholders, mapped assets, exact title/canonical preservation despite changed site defaults, and descriptive alternative text. Mappings still do not prove provider eligibility and migration remains review-only.

Validation: all 1,008 CMS tests passed with real PDF integration and zero skips; TypeScript passed. No rendered UI, live content or provider state changed. Public theme/motion rendering, trusted release checks, applied migration and client acceptance remain pending.


### Conservation website renderer foundation — 2026-10-23

Added CmsConservationPage with website typography, hero overlay, separated mobile hero image and visible credit, outcome groups, alternating desktop project layouts and configurable mobile order. Reuses the semantic content component from draft preview. Migration presentation defaults now retain dark source surfaces and image-first mobile projects. The existing public route is unchanged. Detailed remaining design differences are recorded in conservation-page.md; this is not a claim of full source layout/motion parity.

Validation: isolated Playwright checks at 1280px and 390px passed semantic group counts, original image loading, mobile hero separation/visible credit and no horizontal overflow or runtime page errors. Inspected hero and project screenshots at /private/tmp/cms-conservation-renderer-{1280,390}.png and /private/tmp/cms-conservation-renderer-project-{1280,390}.png. Browser plugin absent; repository Playwright used. Original local image bytes were intercepted in the fixture; managed public-media delivery was not tested. Temporary fixture removed. All 1,008 CMS tests passed with real PDF integration and zero skips; TypeScript passed. Public routing, motion, full presentation parity, trusted release checks, applied migration and client acceptance remain pending.

Final verification: production build passed after the renderer foundation and migration presentation changes.


### Conservation scoped motion controls — 2026-10-23

Connected none/fade/reveal controls to the isolated website renderer. Scope is limited to its own article. Includes independent content entrances and responsive project-image scale expansion, keyboard-focus completion, lazy-image/font refresh and cleanup on revision/unmount. Server content stays visible without JavaScript or successful animation loading. Dynamic reduced-motion preference changes revert effects and disable scrub.

Validation: repository Playwright (Browser plugin absent) at 1280px and 390px exercised enabled reveal/fade, unchanged none sections, focused source-link visibility, dynamic reduced-motion cleanup and revision-to-none cleanup. No runtime page errors or overflow. Reduced-motion screenshots inspected at /private/tmp/cms-conservation-motion-reduced-{1280,390}.png. Temporary fixture removed. All 1,008 CMS tests passed with real PDF integration and zero skips; TypeScript passed. Exact original choreography/hero entrance, presentation parity, public route integration, trusted release checks, applied migration and client UAT remain pending. No production flags or content changed.

Final verification: production build passed with scoped conservation motion.


### Conservation draft validation diagnostics — 2026-10-23

Connected route-specific draft findings to stored-content validation without enabling publication. Reports wrong type/route/locale, unsupported root fields, future unsupported sections, region targeting and scheduled H1 gaps, plus a warning to review source-backed claims. Regression coverage proves complete-snapshot media validation covers hidden projects, future hero images and a distinct SEO social image; duplicate eligibility evidence is rejected. Publication-not-ready remains mandatory.

Validation: all 1,011 CMS tests passed with real PDF integration and zero skips; TypeScript passed. No visual renderer, live content or provider configuration changed. Trusted release receipts/SQL integration, public routing, final layout comparison, applied migration and client acceptance remain pending.


### Conservation published delivery runtime — 2026-10-23

Added an explicitly gated runtime for published conservation content and same-site published SEO settings. Fixed route/language, exact enablement, configuration/time checks before network calls, no-store requests and strict revision projection are covered. Missing pages return null; malformed data, wrong-site/missing settings and provider failures throw without draft/legacy substitution. The public route does not call this runtime yet and no environment flag was changed.

Validation: all 1,014 CMS tests passed with real PDF integration and zero skips; TypeScript passed. Runtime transport tests use controlled responses, not a deployed provider. Trusted SQL/release integration, live route wiring, layout parity, migration and client acceptance remain pending.


### Conservation database release boundary audit — 2026-10-23

Added a real database integration test for conservation draft saving, trusted validation input/receipt, independent review, rejected publication and anonymous delivery. Confirmed five unique media dependencies and separate social-image field findings. Editors cannot fabricate receipts; reviewed invalid content is rejected; even an intentionally erroneous privileged pass receipt cannot bypass the reserved-route SQL guard. Published revision remains null. Recorded the coordinated release-policy changes needed next.

Validation: all 204 database integration tests passed with zero skips. This turn changed tests and documentation only; the wider application suite/build were not repeated. Conservation publication is still intentionally unavailable. Managed deployment, full release lifecycle, live route wiring, final presentation parity, migration and client acceptance remain pending.


### Conservation trusted release lifecycle — 2026-10-23

Added migration 162, coordinating a dedicated conservation release trigger with the generic custom-route exemption. The validator now allows structurally valid conservation content with complete media evidence. Database policy restricts route/type/locale, payload roots, configured kinds and region targeting while retaining current approval, exact-revision receipts and locked image eligibility checks. Existing composition-5 policy remains: prior conservation workers could not produce valid receipts. No managed migration or environment change was performed.

PGlite coverage now verifies actual approved publication, draft/live separation, changed media rights after validation, anonymous suppression after rights withdrawal, restored drafts with new validation/review, unpublication, route mutation rejection and unsupported-section rejection despite an erroneous privileged pass receipt. All 1,016 CMS tests passed with real PDF integration and zero skips; TypeScript passed. Public route/discovery wiring, final presentation comparison, applied migration, provider deployment and client UAT remain pending.

Final verification: production build passed after conservation release integration.


### Conservation gated public route and sitemap — 2026-10-23

Wired metadata and rendering to the published runtime behind CMS_CONSERVATION_PAGE_ENABLED, default false. Preserved the original component byte-for-byte as LegacyConservationPage; recaptured source inventory and verified content, metadata and image hashes unchanged. Dependency proof now includes wrapper and legacy source. Missing published content becomes not-found while provider failures propagate. Active environment flags remain unchanged.

Sitemap now follows the same rollout flag, uses only canonical/indexable published content when enabled and removes withdrawn/no-index/excluded records. Runtime and sitemap were exercised through real PGlite anonymous public RPCs, including withdrawal. All 1,017 CMS tests passed with real PDF integration and zero skips. The enabled HTTP/browser branch, managed deployment, final presentation parity, content migration and client acceptance remain pending.

Final verification: production build, including TypeScript, passed after gated route/sitemap integration.


### Conservation enabled production HTTP verification — 2026-10-23

Tested the real enabled route on an isolated production server with a trusted local HTTPS provider fixture. Fixed static pre-rendering discovered when building with rollout disabled: conservation now explicitly renders dynamically. Confirmed CMS page identity, exact metadata and image display at desktop/mobile sizes; withdrawal removes page content and emits noindex; provider errors never substitute legacy content. Original local image bytes were intercepted only for browser media. Ephemeral servers stopped and saved environment/active preview settings unchanged.

Validation: enabled route Playwright checks passed at 1280px and 390px without page errors or overflow in the published state. Screenshots inspected at /private/tmp/cms-conservation-http/enabled-{1280,390}.png. Production build passed and labels conservation dynamic; all 1,017 CMS tests passed with real PDF integration and zero skips. Recaptured source inventory preserves exact business content, metadata and image hashes. Managed-provider testing, remaining visual parity, migration application and client acceptance remain pending.


### Conservation authenticated migration backend — 2026-10-23

Implemented review/apply/status API and migration 163 for five source-image mappings. Server rebuilds the source proposal and binds content, target, revision and media evidence into review identity. Database apply locks target/uploads/media, validates provenance and current eligibility, saves only a draft and records actor/site-scoped immutable recovery receipts. Stale/tampered requests and unavailable media fail atomically; retries preserve later edits and require current authority.

Validation: API tests plus PGlite source/rights/tenant checks, stale media/revision rejection, transaction rollback, revoked permissions, receipt replay and simulated HTTP response loss passed. Full CMS suite: 1,025 tests passed with real PDF integration and zero skips. TypeScript and production build passed. Client migration screen, actual source uploads, final design review, managed deployment/migration and client acceptance remain pending. No managed database or existing production content changed.


### Conservation browser migration verification and recovery — 2026-10-23

Added client review verification and bounded actor/site-scoped recovery contracts for five image mappings. Binds the local source proposal, target revision, content/SEO and media evidence to server digests. Tests reject altered sharing images/canonical metadata, tampered/reordered evidence, wrong account/site and mismatched receipts. Recovery retains no page content or credentials; unconfirmed stays pending.

Validation: all 1,028 CMS tests passed with real PDF integration and zero skips; TypeScript passed. No UI changes in this milestone. Pages still needs the conservation panel, shared pending-state guards and supported publication/workflow wiring; this gap is explicitly tracked. Real source uploads, final presentation review, managed deployment/migration and client UAT remain pending.


### Conservation migration panel and Pages workflow — 2026-10-23

Connected five-image mapping, review/current-proposed previews, explicit draft acknowledgement, apply/status/retry recovery and list refresh in Pages. Conservation is now a supported publication workflow with accurate rollout labels. Its pending/review state participates in shared editing/navigation/import/other-migration guards. Fixed a client-directive ordering error found during browser testing.

Validation: Playwright at 1280px and 390px passed image selection, verified review preview, acknowledgement gating, editing lock, simulated lost response and reload/status recovery. Recovery storage was removed only after a matching receipt; no runtime page errors or horizontal overflow on the final run. Screenshots inspected at /private/tmp/cms-conservation-panel-{1280,390}.png. Browser plugin unavailable; repository Playwright used. Controlled UI transport and unavailable-image fixtures; actual transaction behavior is covered separately in PGlite. Temporary QA route removed. All 1,028 CMS tests passed with real PDF integration and zero skips. Actual source uploads, final visual parity, managed deployment/migration and client acceptance remain pending.

Final verification: production build, including TypeScript, passed with the migration panel and conservation workflow connected.


### Conservation original image processing — 2026-10-23

Verified all five original photographs through the production upload worker and real Sharp decoding. Checked source and derivative fingerprints, dimensions, registered byte counts/inspection version, metadata stripping, full WebP decoding and unchanged original files. Proposal mapping preserves hero/social-image reuse and distinct project images. Updated the editability register and coverage summary to reflect completed local renderer/release/migration work without claiming managed readiness.

Validation: all 1,029 CMS tests passed with real PDF integration and zero skips; the source-media test passed again after adding disk reread and registration assertions. No application code changed in this milestone. Scanner and storage adapters were controlled test doubles; actual managed uploads, rights/claim review, final visual parity, deployment and client acceptance remain pending. No live content or environment flags changed.

### Contact and shared corporate enquiry inventory — 2026-10-23

Captured the actual contact page and corporate enquiry form at desktop/mobile widths, including rendered copy, heading markup, media source, field constraints/defaults/options and consent. Added a repeatable read-only capture script with nine source dependency hashes and an image fingerprint; enquiry requests are blocked. Added contact-page.md with business-field ownership, submission mapping and concrete preservation gaps: CMS placeholder/default-choice support, two-part success presentation, distinct contact/corporate requirements and legacy lead payload mapping. Updated the editability register without marking contact delivery complete.

Validation: local Playwright at 1280px/390px verified both variants and changed select values. No page exceptions, console errors or horizontal overflow. Mobile screenshots inspected; script syntax and both JSON inventories parse successfully. Browser plugin unavailable; repository Playwright used. No application/runtime code changed, enquiries sent, CMS drafts created or settings deployed. Contact editor/schema, mapped form proposals, preview/release/delivery, migration and managed acceptance remain pending.

### Contact editorial model and source-preserving proposal — 2026-10-23

Added a strict contact content contract for introduction/panel copy, explicit heading lines/emphasis, image framing/mobile visibility, direct email and local referral/privacy links. Extended the read-only browser inventory with structured content rather than parsing rendered HTML during migration. The pure planner requires all source/image hashes, rejects stale media mappings, preserves exact copy and distinct contact/corporate form requirements, and always returns review-only. It provides no draft write or publication authorization.

Validation: five new source/preservation/tampering/content-safety tests passed; full CMS suite 1,034 passed with real PDF integration and zero skips. TypeScript passed. Browser recapture used the existing local preview; no enquiries or CMS writes occurred. Contact editor/composition registration, full SEO capture, form schema preservation/mapping, preview, delivery, release, managed migration and acceptance remain pending. Active visitor pages and flags are unchanged.


### Contact draft editor and content preview — 2026-10-23

Registered contact introduction/enquiry-copy sections, added the route-specific palette and empty Contact starter, and connected controls for copy, heading runs, media accessibility/caption/credit/framing, mobile visibility, email and local referral/privacy links. The source proposal now yields validated draft composition. Preview shows edited content and explicitly identifies missing visitor-form integration; final website layout is not claimed. Public contact delivery remains unchanged and publication validation remains unsupported.

Validation: seven contact tests passed; full CMS suite 1,036 passed with real PDF integration and zero skips. Playwright at 1280px/390px checked edits reflected in preview, email destination, adding sections, read-only controls and no page exceptions/overflow. Temporary fixture used unavailable media and the shared site header, so screenshots are not final visual acceptance. Fixture removed. Real form binding/submission, full SEO, public layout/release, managed migration and client acceptance remain pending.

Final verification: production build, including TypeScript, passed after contact editor and preview integration.

### Contact SEO source capture and separate sharing-image mapping — 2026-10-23

Captured canonical/robots/Open Graph/Twitter tags and metadata-provider source dependencies. Identified inherited homepage canonical/OG URL, a separate sharing image and differing network descriptions. Review proposal now includes validated page SEO and distinct hash-bound social-image mapping, retaining raw source metadata and explicit review findings. It does not silently correct canonical, flatten network differences as approved, or authorize publication. Prior business copy/form/image inventory is unchanged.

Validation: eight contact tests passed, covering source fingerprints, exact copy, stale/swapped media, distinct image IDs and SEO findings. Full CMS suite: 1,037 passed with real PDF integration and zero skips. TypeScript passed. Read-only local browser recapture made no enquiries or CMS writes. Pending: form contract/mapping, final public rendering, exact metadata reconciliation, release/migration backend, managed deployment and client acceptance.


### Editable form placeholders — 2026-10-23

Added optional bounded single-line placeholders for text/email/phone/message fields, editor controls, shared preview/public rendering and revision-based public projection. Existing definitions are unchanged when the property is absent. Choice/consent/file fields reject unsupported placeholders. Empty fields remain unanswered and required validation still applies. No visitor payload, default answers or consent semantics changed.

Validation: 1,040 CMS tests passed with real PDF integration and zero skips; TypeScript passed. Local Playwright at 1280px/390px verified editing/reflection in preview and public body, entering actual answers, clearing values and read-only state; no page exceptions or overflow. Public body screenshot inspected. Synthetic fixture removed; no real enquiry/challenge/provider submission was exercised. Contact form default choices, success presentation, source-to-lead mapping and live rollout remain pending.

Final verification: production build, including TypeScript, passed after editable form placeholders.

### Default single-choice form selections — 2026-10-23

Added optional defaultOptionId for single-choice dropdown/product-interest/enquiry-type fields, bound to existing stable option IDs. Editor exposes No default and available choices. Preview/public form bodies apply visible defaults on initialization and newly revealed conditional branches; clearing remains cleared, hidden answers are discarded, and preview reset reapplies configured defaults. Consent/multiselect/other fields reject defaults. Intake never fills omitted answers, so defaults cannot bypass required validation.

Validation: all 1,043 CMS tests passed with real PDF integration and zero skips. Tests cover stable IDs, dangling defaults, forbidden consent defaults, public projection, condition chains/pruning and omitted required answers. Playwright at 1280px/390px verified editor defaults reflected in preview/public body, changes/clearing, reset and read-only controls without page exceptions or overflow. Synthetic fixture and screenshot only; no actual enquiry or challenge/provider call. Fixture removed. Contact/corporate form proposals, success presentation and mapped lead intake remain pending.

Final verification: production build, including TypeScript, passed after default-choice integration.

### Contact/corporate source form proposals — 2026-10-23

Added a pure source-proof-bound builder for separate contact and corporate FormDefinitions. Preserves field order, source labels/help/placeholders, required flags, dropdown labels/defaults and exact enquiry consent; stable option IDs include explicit legacy-value mappings. Source-derived consent version and success heading/body are retained. Contact requires a message; corporate allows an empty brief. Proposals remain review-only and list validation-limit, success-layout, label, notification and intake-mapping differences. No form, draft, lead or notification was saved.

Validation: three new proposal tests passed; full CMS suite 1,046 passed with real PDF integration and zero skips. TypeScript passed. Tests compare every captured field, validate required/optional behavior and exact consent, reject stale proof, verify source success strings and ensure output isolation. Pending: reconcile limits and success presentation, connect trusted form revisions and source-to-lead intake, configure notifications, implement recoverable migration application and validate managed end-to-end behavior.

### Separate form success heading and body — 2026-10-23

Added optional successHeading to form configuration, editor and draft success preview. Intake returns it only from the server-read revision after a confirmed persistence receipt, including replay. Public receipt validation/rendering displays heading and body separately; absent heading retains legacy behavior. Contact/corporate proposals now populate the original heading/body separately. Producer/client must roll out together before publishing new heading-bearing forms; no deployment or actual form publication occurred.

Validation: full CMS suite 1,048 tests passed with real PDF integration and zero skips; TypeScript passed. New tests cover optional heading bounds, old definitions, confirmed/replayed receipts, injected heading rejection and uncertain-save failures. Playwright at 1280px/390px verified edited heading/body/reference and legacy fallback after clearing, with no page exceptions/overflow. Receipt transport was mocked; no enquiry saved or notification sent. Screenshot inspected and temporary fixture removed. Remaining: validation-limit reconciliation, corporate note integration, source-to-lead mapping, trusted form/page binding, notification configuration and managed acceptance.

Final verification: production build, including TypeScript, passed after separate success heading/body integration.

### Historical option labels in lead administration — 2026-10-23

Found that lead answers displayed dropdown IDs. Added migration 164 to return choice label maps from the exact submitted form revision under existing site/lead-view authorization. Inbox now renders readable single/multiple choice labels and preserves unknown IDs and raw stored answers. Later form edits cannot relabel historical enquiries. An older database without option maps retains raw-ID fallback. No managed migration was applied.

Validation: all 1,050 CMS tests passed with real PDF integration and zero skips. PGlite covers immutable revision labels, later draft changes, cross-site/unauthorized access and revocation. Formatter tests cover missing labels, booleans and inherited-property fallback. Desktop/mobile synthetic inbox checks passed selection/reload, readable labels and disabled editing for read-only leads; screenshot inspected and temporary fixture removed. Production build, including TypeScript, passed. Contact/corporate intake bindings, validation reconciliation, notifications, managed migration and real client acceptance remain pending.

### Configurable email/phone limits — 2026-10-23

Added optional email/phone character limits and phone digit maximum across strict form schema, editor, shared renderer and server/preview validation. Existing absent-property behavior remains unchanged. Contact/corporate proposals now use email 254, phone 60 characters and 15 digits from the captured legacy service. Syntax acceptance, whitespace normalization and combined-notes mapping remain explicit differences, not claimed compatibility.

Validation: full CMS suite 1,051 passed with real PDF integration and zero skips; TypeScript passed. Boundary tests cover exact/excess length/digits, formatted phone length, invalid configuration and legacy defaults. Desktop/mobile Playwright verified edit controls, input limits, 16-digit rejection/15-digit acceptance and read-only state without page exceptions/overflow. Preview screenshot inspected, temporary fixture removed, no actual enquiry submitted. Form/page revision binding, remaining intake mapping, notifications, managed migration and client acceptance remain pending.

Final verification: production build, including TypeScript, passed after configurable email/phone limits.

### Contact draft form selection and authorized preview — 2026-10-23

Added an optional strict form record reference to contact enquiry content, a one-form permission-aware record picker and the existing authorized linked-form preview. Clients can select/remove a saved form and test its fields locally. Preview clearly separates the linked form's latest draft revision from the page revision; unavailable access removes fields, and shared page previews without a loader gain no extra draft access. Public contact delivery and release remain unconnected; a selected draft is not publication authorization.

Validation: full CMS suite 1,052 passed with real PDF integration and zero skips; TypeScript passed. Schema tests reject invalid/extra reference claims and retain unsupported publication. Desktop/mobile Playwright checked selection, preserved defaults/placeholders, local validation, denied-access refresh and removal without page exceptions/overflow. Preview screenshot inspected; isolated fixture removed. No enquiries submitted or real form records modified. Pending: published form revision resolution, trusted release, final website layout, intake mapping/review, notifications, migration and managed acceptance.

Final verification: production build, including TypeScript, passed after contact draft form selection/preview.

### Contact structural projection and schedule diagnostics — 2026-10-23

Implemented strict contact revision projection with one introduction/enquiry panel and one introduction H1 across all future visibility boundaries. Explicit form references are required; current and scheduled form dependencies are identified for later trusted resolution. Unsupported configured sections/regions and malformed contexts fail. Published-reader helper fixes site/route/locale and distinguishes null withdrawal from provider errors. Contact advisory findings are connected without adding contact to supported publication routes.

Validation: all 1,056 CMS tests passed with real PDF integration and zero skips. Tests cover copied content/SEO, scheduled form replacement, gaps/duplicate headings, missing forms, hidden sections, invalid context, fixed read arguments and failure behavior. No public route, managed data or flags changed. Pending: same-site published-form revision resolution, trusted release/media checks, final renderer/runtime, migration and managed acceptance.

Final verification: TypeScript and production build passed after contact projection/advisory validation integration.

### Contact published form resolution and route loader — 2026-10-23

Added same-site published-form resolution for current and scheduled contact panels, validating identities/locale/full definitions and existing form-delivery restrictions. Returns minimal form revision bindings only. Added the gated server route loader using published page/form/SEO RPCs, requiring valid enquiry configuration before IO and preserving no-store reads/no fallback. Missing pages stop before dependency reads. Added disabled example flag; public route and active configuration remain unchanged.

Targeted tests passed for missing/wrong-site/wrong-locale/invalid forms, scheduled dependency failure, attachments/unverified notifications, invalid dependency sets, required configuration, exact RPC arguments, withdrawal and transport failure. These use controlled adapters and do not prove managed-provider state. Pending: dependency locks/release policy, pinned-form renderer, public route wiring, migration, notification setup and end-to-end acceptance.

Final verification: all 1,063 CMS tests passed with real PDF integration and zero skips. TypeScript and production build passed.

### CMS contact renderer and pinned form loading — 2026-10-23

Added the contact renderer using projected copy/media and the existing responsive layout, with scoped CMS field styling. PublicEnquiryForm now optionally checks a page-resolved revision/locale and rejects changed forms; existing unpinned consumers keep their behavior. The contact renderer validates form identity/locale and passes the resolved expectation. Public route and active flags remain unchanged.

Validation: full CMS suite 1,064 passed with real PDF integration and zero skips; production build including TypeScript passed. Controlled desktop/mobile browser checks verified H1, source image visibility, defaults/editing, no overflow/page exceptions and stale-revision refusal. One initial form-loading timeout was followed by a successful diagnostic rerun without an implementation change; cause unconfirmed. Screenshots inspected and temporary fixture removed. Original local media/form/challenge fixtures only; no enquiry submitted. Remaining: final presentation parity, additional control states, release/dependency locks, route wiring, managed migration and live acceptance.

### Trusted contact form evidence — 2026-10-23

Added migration 165's service-only form status snapshot to trusted validation input for contact pages. Evidence identifies same-site published revision/locale and current supported-delivery availability for all configured panels. Worker and contact diagnostics reject absent, duplicate, extra, unavailable or wrong-language evidence. Contact publication stays unsupported pending a locked database release policy; no managed migrations or active flags changed.

Validation: all 1,067 CMS tests passed with real PDF integration and zero skips; TypeScript passed. Unit checks cover complete snapshots and scheduled/hidden panels. PGlite verifies role restrictions, unpublished/published/withdrawn forms, cross-site isolation, input integration and trusted-worker non-readiness. Published pointer was a root fixture for evidence only. Remaining: release-time form locks/rechecks, route activation, reviewed migration, provider setup and client acceptance.

Final verification: production build, including TypeScript, passed after trusted contact form evidence integration.

### Contact release dependency guard

Implemented migration 166 and enabled trusted contact publication checks. Local database lifecycle evidence covers independently approved form/page publication, form withdrawal after validation blocking release, successful retry once the form is republished, media-rights rechecks, failed replacement preserving the previous pointer, route protection, unsupported-section defense and withdrawal. The guard locks configured form dependencies and reads their published eligibility directly, avoiding reliance on the old parent route inside a BEFORE trigger.

Pending: managed migration/deployment; gated public contact route and sitemap; source-bound contact/form migration and client review of legacy metadata/field mapping; visual acceptance and real challenge/intake/notification verification. No public route or active environment flag was changed.

Verification for this milestone: all 1,068 CMS tests passed with zero skips, TypeScript passed, and the production build passed. These checks establish local behavior, not managed-provider deployment or client handover readiness.

### Contact public route and sitemap integration

Connected the gated contact route to published page/form/SEO resolution, request-bound form revision rendering, metadata and sitemap eligibility. Preserved the original component byte-for-byte in LegacyContactPage.tsx and relocated its inventory dependency path without changing captured hashes. Flag-off preview still serves the original contact form.

Verified 1,069 CMS tests (zero skips), TypeScript and production build. A temporary production HTTP server with synthetic RPC responses confirmed published rendering/metadata, exactly one eligible sitemap entry, withdrawn page 404/sitemap removal, and rejection of an unavailable form without legacy fallback. No managed data or active flags changed. Migration application, content/visual review and real enquiry delivery/UAT remain pending.

### Recoverable contact page migration backend

Added migration 167 and authenticated contact migration review/apply/status API. Exact source image mappings and current upload/rights evidence are reviewed, then rechecked under locks before saving a page draft. Actor-scoped immutable receipts recover completed requests without overwriting later edits. Review includes separate contact/corporate form proposals; page application does not save or bind those forms and never publishes.

Verified local database/API behavior for authorization, stale drafts, evidence changes, rollback, conflicting request reuse, revoked access and lost-response recovery after a newer draft edit. All 1,075 CMS tests passed with zero skips; TypeScript passed. Pending migration UI, reviewed form creation/linking, managed deployment and real delivery/UAT.
Production build also passed for the contact migration backend milestone.

### Contact migration screen

Added Pages workspace contact migration review/apply/recovery controls, verified browser-side proposal/form hashes and account-scoped pending request storage. Competing editors/imports are locked during review/recovery; workspace navigation receives the pending-work state. Contact now exposes its supported validation and editorial workflow controls.

Passed desktop/mobile synthetic browser flows for image mapping, review acknowledgement, lost-response reload recovery, matching receipt cleanup and editing locks. Temporary fixture removed. All 1,078 CMS tests passed (zero skips); TypeScript passed. Form creation/linking and managed/provider/client acceptance remain pending; no managed content was changed.
Production build passed for the contact migration screen milestone.

### Atomic contact/corporate form migration backend

Added migration 168 and authenticated form review/apply/status API. Both source-derived forms save as drafts in one transaction, with explicit revision-bound replacement targets and immutable actor/site receipts. Tests prove rollback when the second target is stale, lost-response recovery without overwriting later edits, request conflict detection, private status and revoked-access refusal. Forms are not published or linked automatically.

All 1,082 CMS tests passed with zero skips; TypeScript passed. Next: editor controls for reviewed form creation and page linking, then managed/provider verification and client UAT. No managed data or active rollout setting changed.
Production build passed for the atomic form migration backend milestone.

### Reviewed form import interface

Connected atomic contact/corporate form migration to Forms, including new/replacement targets from the loaded English form list, both-form review, readable field limits and local-only form previews. Added browser proposal/digest checks and bounded account/site recovery storage. Review/pending work locks competing edits and protects navigation. Successful import opens the contact draft; publish and page linking remain deliberate separate steps through existing controls.

Desktop/mobile synthetic flows passed for review, field validation, acknowledgement and interrupted-save reload recovery. No enquiry submitted; temporary fixture removed. Managed migration, real provider verification and client acceptance remain pending.
Verification: all 1,084 CMS tests passed with zero skips, TypeScript passed, and production build passed for the form import interface milestone.

### Contact layout control fidelity

Connected contact section backgrounds, spacing, widths, alignment, heading styles, mobile photo ordering and scoped reduced-motion-aware entrance effects to the published renderer. Source migration explicitly preserves the light enquiry panel. Dark themes retain readable form inputs and focus reveals animated content immediately.

Browser checks passed across desktop/mobile and reduced/no-preference motion for styles, photo visibility/order/focal point, readable inputs, focus behavior and overflow/errors. Isolated fixture removed; no enquiry sent. All 1,084 CMS tests and TypeScript passed. Client design acceptance, managed/provider verification and rollout remain pending.
Production build passed for the contact layout controls milestone.

### Concept route inventory

Captured `/concept` independently of homepage rollout: 121 local source dependencies, 104 local media assets, ten rendered sections and ten interaction states (three partner regions, six guest notes, expanded menu). Preserved six visibility declarations and five conditional JSX branches, including dormant content. Found inherited homepage canonical requiring review. Fresh desktop/mobile reduced-motion loads had one H1 and no document overflow or page exceptions; screenshots inspected.

Added read-only repeatable capture, source/asset integrity tests and the implementation mapping in docs/cms/concept-page.md; updated the route editability register to inventoried, not implemented. Two focused tests passed. Concept authoring, release and migration remain pending. No live content changed.

### Independent Concept draft foundation

Added Concept page template/palette, ordinary-page structural projection and advisory validation without enabling publication. Supports the ten reused editorial landing section families and downloads, scheduled hero/H1 rules and removal of private statistic evidence from projected output. Concept is kept separate from the homepage record. Source inventory refreshed to 123 dependencies after validator integration; original page/media unchanged.

Desktop/mobile isolated composer checks passed for section creation and palette restrictions; fixture removed. Five focused tests cover structure/schedules/privacy and confirm structural success does not grant release. Source-bound migration, standalone menu, referenced-content delivery and publication remain pending.
Regression checks initially identified a circular runtime import from the reused homepage palette and outdated assertions for Concept's formerly generic advisory checks. The Concept whitelist is now explicit and only its shared section type is imported, preventing accidental rollout through future homepage additions. Final verification: all 1,091 CMS tests passed with zero skips, TypeScript passed and production build passed.

### Concept published-reference resolution

Added a Concept-specific wrapper over a shared landing dependency resolver, retaining an independent ordinary-page projection and `/concept` identity. It resolves currently visible published journey/departure/guest references in order, validates website envelopes, refuses incomplete results and batches guest lookups. Hidden/future sections skip reads until their visibility boundary. This does not enable Concept release or replace future-reference publication checks.

Five focused Concept tests and existing homepage resolver tests passed; source inventory refreshed after the shared resolver extraction. TypeScript passed. Menu ownership, source migration, public projection/endpoint and release/provider/client verification remain pending.
Final verification: all 1,096 CMS tests passed with zero skips, TypeScript passed, and production build passed for the Concept reference resolver milestone.

### Concept menu ownership foundation

Added a page-owned Concept menu contract and source-bound review proposal, preserving six primary links/images, six secondary links, planning CTA and accessible control/group labels. Extended read-only inventory to include the decorative menu image stack; one additional asset was found (105 total). Proposal mappings require original hashes and distinct processed identities; apply/publication remain unavailable until media/link verification and editor/delivery integration.

Focused schema/proposal and inventory tests passed; TypeScript passed. Shared navigation and all live content remain unchanged. Concept menu editing, renderer, release checks and managed/client acceptance are still pending.
Final verification for the Concept menu contract/proposal: all 1,099 CMS tests passed with zero skips, TypeScript passed, and production build passed.

### Concept page-owned menu editor

Integrated Concept menu authoring into Pages with accessible/visible labels, planning link, ordered primary/secondary destinations and primary images. Invalid fields block saving; malformed existing data stays preserved for repair. The menu is part of the Concept page payload and projection, not shared site navigation. Missing-menu feedback is added without enabling release.

Desktop/mobile editor checks passed for reordering with stable image identity, copy/link changes, unsafe-link feedback, removal and read-only controls. Temporary fixture removed. Public menu rendering/preview, dependency release checks, source application and managed/client acceptance remain pending.
Final verification: all 1,101 CMS tests passed with zero skips, TypeScript and production build passed. The database test confirmed Concept menu revision save/restore leaves homepage current/published revision pointers unchanged.

### Concept interactive menu component

Added a responsive page-owned navigation renderer with native modal semantics, keyboard image selection, explicit Tab/Shift+Tab cycling, Escape/link dismissal, focus restoration and body-scroll cleanup. Switching revisions closes and resets the menu. Reduced motion suppresses the entrance animation; new-tab links retain protective relationship attributes.

Desktop/mobile synthetic browser checks passed at 1280px/390px with both motion preferences, including replacing a revision while open. Initial keyboard testing found focus escaping the controls; explicit cycling fixed it. Screenshots inspected; temporary fixture removed. All 1,101 CMS tests passed with zero skips, TypeScript passed and production build passed. Preview/public route integration, trusted media/link delivery, brand ownership, source migration and managed/client acceptance remain pending. No live rollout or managed data changed.

### Concept unsaved menu preview

Connected page-owned menu values to the Pages draft-layout preview. The shared renderer accepts an image callback; draft previews use authenticated private blobs and never request public media. Incomplete menus show repair feedback. Link selection displays the destination without leaving unsaved edits, and closing the preview cleans up the modal and scroll lock. Scoped styles fix CMS image/button overrides found during screenshot review.

Desktop/mobile synthetic browser checks passed for private images, destination feedback without navigation, incomplete menu, failed image and unmount cleanup; screenshots inspected and fixture removed. All 1,101 CMS tests passed with zero skips, TypeScript and production build passed. Secure shared-preview menus, public Concept delivery/release, source migration and real provider/client acceptance remain pending. No live content or rollout setting changed.

### Concept saved private preview

Connected the pinned Concept revision's menu to the secure preview viewer. It shares the validated private-image renderer, preserves the existing recipient/permission/expiry checks and does not render Concept menus for unrelated pages. When access refresh fails, removal of the preview also closes the modal and restores body scrolling.

Controlled authenticated-response browser checks passed at 1280px/390px for scoped site/asset/token requests, link selection, revoked-access refresh cleanup and other-page isolation. Screenshots inspected; temporary fixture removed. All 1,101 CMS tests passed with zero skips, TypeScript and production build passed. This verifies local viewer behavior; managed authorization/media service acceptance, public Concept release, source migration and client UAT remain pending. No live rollout or managed data changed.

### Concept menu validation feedback

Added field-level checks for planning, primary and secondary destinations to stored Concept validation. Unsafe/unknown routes and unsupported anchors are rejected under the existing navigation policy. Dynamic path evidence is supported by the helper but not yet connected to trusted Concept readers. Regression tests verify that existing full-payload image checks reject absent, unavailable or duplicate evidence, and that valid media cannot bypass the disabled publication gate.

All 1,104 CMS tests passed with zero skips, TypeScript and production build passed. Read-only inventory refreshed to 125 source dependencies, ten sections/states and 105 media assets. Fixed route ownership and external URL syntax are not proof of runtime reachability; authoritative release checks, public delivery, source migration and managed/client acceptance remain pending. No live data or rollout change.

### Concept composition migration capture

Expanded the independent source capture with original paragraph structure, captions/statistics, collection labels/actions, responsive image positions, all five hero headlines and both video declarations. Desktop/mobile snapshots retain section order. Captured media join the hash inventory and sources are rechecked after capture to reject concurrent changes.

All 1,105 CMS tests passed with zero skips, TypeScript and production build passed. This completes richer migration evidence, not page import: source-bound composition proposal, verified media/record mappings, review/apply, public release and client acceptance remain pending. No content record or existing website content was changed.

### Complete visible Concept composition proposal

Added capture-bound migration contracts/review and a pure proposal builder for all ten currently visible sections, the page-owned menu and inherited SEO. Explicit original-hash media mappings and 16 source-record mappings are required; incomplete mappings return no preview payload. Stale captures/proofs, unknown bindings and duplicate target identities are rejected. Added separately captured guest quotations for testimonial evidence. Proposed sections use Concept IDs and project as an ordinary `/concept` page.

Tests cover source copy, hero/video selection, partner/guest ordering, incomplete mappings, stale/duplicate evidence, independent projection and isolated proposal copies. All 1,108 CMS tests passed with zero skips, TypeScript and production build passed. Provider-verified mapping, authenticated review/apply, dormant surfaces/guest films, source visual acceptance and public release remain pending. No records were saved and no live content changed.

### Authenticated Concept migration comparison

Added the read-only Concept migration endpoint and source-record comparator. Target permissions/revision are checked before site-scoped dependency reads. Comparison covers source-visible copy, imagery, guest verification/consent and captured departure dates. Image/video evidence uses existing provenance/rights readers; returned findings omit private payloads. Review digests bind target, proposal, record revisions and media evidence. Apply remains unavailable until atomic rechecks and recovery are implemented.

All 1,121 CMS tests passed with zero skips and production build passed. The initial standalone type check encountered stale generated route types while the new route was being built; rerunning after the completed build passed. Managed-provider acceptance, transactional draft apply, migration UI, public delivery and client UAT remain pending. No managed data was changed.

### Concept draft migration transaction

Added migration 169 with current-permission checks, target/dependency locks, source/processed-media evidence rechecks, exact payload-reference matching and immutable private receipts. Completed retries recover the original result without replacing later drafts. New failed attempts roll back their receipt and preserve current/published pointers; homepage records remain untouched.

The local database test covers replay, stale dependencies, revoked media/access, evidence drift, unmapped menu images, private receipts and target isolation. All 1,122 CMS tests passed with zero skips; TypeScript passed. HTTP apply/status, client recovery UI, new-record end-to-end verification and managed deployment remain pending. This migration has not been applied to a managed database.

### Concept API save/recovery integration

Connected review readiness, apply and private status to the Concept transaction. Added strict client review/mapping/recovery/receipt contracts, including the page-owned menu schema. New applies rebuild and recheck current evidence; completed retries recover immutable receipts under current authority. Unknown outcomes remain unconfirmed until checked.

The full local API/database test created a new Concept page using all mappings, simulated response loss after saving, made a later client edit and recovered/replayed the original result without overwriting it. Homepage pointers stayed unchanged and Concept stayed unpublished. All 1,131 CMS tests passed with zero skips; TypeScript and production build passed. Client migration UI, managed deployment/provider verification, source visual acceptance and public release remain pending.

### Concept migration screen

Connected prepared mappings, comparison, menu/layout/SEO review, acknowledged draft apply and persisted recovery to Pages. Other page editors/imports are locked during review/pending recovery; mismatched selected page paths cannot start a Concept review. Saved results refresh/open the resulting draft.

Desktop/mobile synthetic browser checks passed for confirmation/discard, workspace locks, reload recovery, unconfirmed status, exact retries and receipt cleanup. Storage failure prevented an apply request. Screenshots inspected; fixture removed. All 1,131 CMS tests passed with zero skips, TypeScript and production build passed. Managed provider deployment, prepared real mappings, client source/visual acceptance and Concept public release remain pending.

### Concept public reader contract

Added strict Concept public-envelope parsing and a disabled-by-default loader for published dependencies and SEO defaults. It rejects private statistic/menu fields and wrong site/type/path/language, uses anonymous public reads and rechecks page/SEO snapshots after loading. Missing published content has no editor/bundled fallback.

Controlled-RPC tests cover ten-section assembly, private-evidence exclusion, invalid config and concurrent withdrawal/replacement. All 1,137 CMS tests passed with zero skips, TypeScript and production build passed. The loader is not connected to the live route: public database projection, Concept guest/video eligibility, release guards and renderer integration remain pending. No rollout flag or live content changed.

### Concept public database projection

Added migration 170 with anonymous published-only Concept projection, current-policy validation and media eligibility checks, visible-section filtering and explicit menu/SEO/section field allowlists. Private statistics and nested editorial additions are excluded. The reserved-route publication guard remains unchanged, so this does not enable Concept release.

The isolated local read-boundary test verified privacy, unpublished/invalid/wrong-site/language denial, hidden/future filtering, revoked menu media and withdrawal. It deliberately bypassed release triggers for the projection fixture and does not prove release acceptance. All 1,138 CMS tests passed with zero skips. Managed deployment, Concept guest eligibility, dependency release checks and live renderer remain pending.

### Concept published-reference validation

Confirmed the existing public guest reader is independent of homepage state. Added migration 171 for Concept-specific current-draft reference evidence and connected it to trusted validation. Missing/duplicate/unavailable/wrong-type references now produce Concept findings, including future scheduled sections; publication remains disabled.

Local database/validator tests cover scope/privacy, guest publication/withdrawal, trusted input and scheduled/hidden behavior. All 1,140 CMS tests passed with zero skips, TypeScript and production build passed. Release-time dependency locks, public video/media delivery, menu destination checks, live rendering and managed/client acceptance remain pending. No managed data or live rollout changed.

### Concept release-time dependency guard

Added migration 172 for ordered dependency/media locks and direct publication-time eligibility rechecks, including future sections and menu links. Unknown destinations, unavailable/wrong-type referenced content, malformed reference collections and published-route movement are rejected. Existing reserved-route protection remains, so Concept publication is still disabled.

The isolated local trigger test passed for future guest eligibility/withdrawal, hidden sections, menu links and route identity; the actual Concept record remained unpublished. All 1,141 CMS tests passed with zero skips. Full publication lifecycle, concurrent provider validation, parent media/video delivery and live renderer remain pending. No managed migration or rollout was performed.

### Concept published-video eligibility

Extended the public hero-video predicate to published Concept heroes with a valid public page projection, current-policy validation and current media eligibility. Existing processed-video metadata/storage rules reuse it; originals remain private and homepage behavior is retained.

The isolated local storage/read-boundary test passed for processed-only access, revoked/expired rights, receipt expiry, policy changes, invalidation and withdrawal. All 1,142 CMS tests passed with zero skips. Generic page video release checks, full Concept publication, managed HTTP/storage playback and live rendering remain pending. No rollout or managed migration was performed.

### Concept draft video validation

Added migration 174 and aligned stored-content checks to recognize verified hero video references on English ordinary `/concept` pages. Other page paths/languages retain rejection. Private media status continues to require current processing/rights evidence and caller/site/revision scope; absent or duplicate client evidence fails validation.

All 1,144 CMS tests passed with zero skips; TypeScript and production build passed. Refreshed the Concept source inventory after the validator change. Tests cover route/language isolation, unauthorized/wrong-site/missing-revision reads, revoked/expired rights and incomplete processing; audio-bearing metadata remains database-rejected. Concept release remains disabled. Publication/withdrawal media integration, full lifecycle, live rendering, managed deployment and client acceptance remain pending.

### Concept publication video checks and automatic media withdrawal

Added migration 175 with route-aware media eligibility used by the publication video trigger and unavailable-media withdrawal worker. English Concept pages can satisfy inspected-video checks without allowing videos on other ordinary page routes. Ordered upload/media locks and current rights checks remain. Eligible Concept publications are retained; revoked media causes one withdrawal, delivery job and audit event.

All 1,145 CMS tests passed with zero skips. Local isolated fixtures cover exact identity, legacy caller behavior, release-time revocation, retention and idempotent withdrawal. This SQL-only change has not been deployed to a managed database. Full Concept publishing still needs its remaining release checks and route integration; public image delivery, renderer integration, provider concurrency verification and client acceptance remain pending. Existing publication gates remain enabled.

### Concept public images and legacy reader privacy

Added migration 176. Public image eligibility now follows the filtered Concept projection, allowing visible menu/poster media with video while excluding hidden/future/private/draft-only references. The generic page reader delegates Concept to the same projection, closing the alternate image-only path that could return private nested editorial content.

All 1,146 CMS tests passed with zero skips; after adding the image-only legacy-reader regression assertion, all 223 database tests passed again. Tests cover actual anonymous metadata/storage-policy reads, original denial, scope, validation invalidation, revoked menu rights and withdrawal. This SQL-only migration remains local. Full Concept publication, live renderer integration, managed HTTP/storage validation and client acceptance remain pending; no live rollout changed.

### Concept editorial links, schedules and statistic evidence

Connected Concept editorial validation for current/future visibility boundaries, schedule-safe section anchors and private support for displayed statistics. Menu and section dynamic links use exact same-site published paths from new migration 177, carried through both trusted workers. Unknown/query/fragment variants are not inferred from a published base path; withdrawn destinations stop qualifying.

All 1,151 CMS tests passed with zero skips; TypeScript and production build passed. Refreshed the inventory to 126 source dependencies after adding the editorial validator. Tests cover statistic evidence/privacy, future anchor expiry, hidden claims, both worker paths and actual database publication/withdrawal evidence. Full Concept publication, live renderer and managed/client acceptance remain pending. No managed migration or rollout occurred.

### Concept renderer assembly and browser interactions

Added `CmsConceptPage` and shared `CmsLandingSections`; Homepage retains its own header and Concept uses its revision-owned menu. Public resolved content flows into the same ten section renderers without draft reads or bundled fallback. Missing Concept navigation fails explicitly. The live Concept route is unchanged.

Controlled local Playwright checks passed at 1440/390 pixels for ten sections, one H1, three journeys, menu/Escape, partner tabs/keyboard, guest navigation, reduced-motion video suppression and no overflow/runtime errors. Inspected mobile screenshot; removed temporary fixture. All 1,151 CMS tests passed with zero skips, TypeScript and production build passed. Refreshed source inventory. Full release lifecycle/route integration, real media playback, shared brand/footer ownership, source visual acceptance and managed/client acceptance remain pending.

### Concept opt-in route, SEO and sitemap

Connected the Concept route to the published-only loader and renderer behind the existing delivery flag, preserving legacy rendering/metadata in a separate component. Metadata and rendering share request-local loaded content. Missing publication returns not-found/noindex, and unavailable dependencies fail instead of restoring bundled content. Sitemap inclusion follows published SEO and removes the legacy duplicate while enabled.

All 1,153 CMS tests passed with zero skips and production build passed. Controlled production HTTP verified renderer/revision, canonical metadata, exactly one sitemap entry, withdrawal 404/removal and dependency failure. Legacy inventory still captures ten sections/two viewport checks, now with 168 source dependencies. No rollout flag was changed outside the isolated stopped test process. Full Concept publication/restore lifecycle, shared brand/footer ownership, managed media/SEO delivery and client acceptance remain pending, alongside the rest of the PRD scope.

### Concept local publishing and restore lifecycle

Added migration 178 with the dedicated Concept envelope/palette/region release guard and reserved-route exemption. Connected trusted validation now determines readiness without an unconditional Concept publication refusal. Existing reference/link, image/video and document dependency checks remain active. This enables the local workflow in code; it does not deploy migrations or enable public delivery.

A real local lifecycle test passed with separate editorial actors and no disabled triggers: validation, review, publication, edit, restoration into a new draft, revalidation/reapproval, republication and withdrawal. Video rights revoked after approval prevented release and preserved the previous pointer. Private statistic evidence stayed private; route movement and unsupported sections were rejected. The fixture uses an allowed hero/story/menu composition; full ten-section migration acceptance remains pending.

All 1,154 CMS tests passed with zero skips and production build passed. Refreshed source inventory. Next remaining work includes full mapped dependency lifecycle, managed rollout/concurrency, real storage/video playback, brand/footer ownership and client acceptance, plus the remaining broader PRD features and handover.

### Complete Concept section/dependency publication acceptance

Added a full ten-section local lifecycle test with trusted publication of three journeys, seven expeditions, six guest notes, an enquiry form and two guest-linked destinations. The actual anonymous database-backed public loader resolves the complete page. Withdrawing a guest rejects delivery and revalidation; publication-time checks reject a synthetic passing receipt and preserve the previous page pointer.

The expanded test found and fixed a dynamic-link integration gap: migration 179 checks destination/expedition/journal links through their specific public readers rather than the generic page reader. Exact path/site/language constraints and destination withdrawal are covered. All 1,155 CMS tests passed with zero skips. No managed data, flags or deployments changed. Real-content/migration approval, provider concurrency/storage/video checks, brand/footer ownership, client acceptance and the remaining PRD scope are still pending.

### Bespoke Safaris source inventory and field ownership map

Moved to the next whole-site editability gap. Added a reproducible read-only inventory for `/guided-bespoke-safaris`: 114 source dependencies, eight sections, eight media hashes, metadata, rich heading structure, image framing and all four FAQ answers. Open/close interactions passed at 1280/390 pixels with one expanded answer, one H1 and no document overflow. Disabled specialists CTA and planning query parameter are retained. Updated the editability register and documented per-section fields, missing presentation capabilities and acceptance sequence.

All 1,157 CMS tests passed with zero skips, including source/media hash consistency and complete FAQ capture checks. No website/CMS content or rollout changed. Bespoke Safaris editor controls, source-faithful migration, publication/route integration, detailed motion/mobile-card accessibility and client/provider acceptance remain pending.

### Bespoke Safaris section data contracts

Added strict contracts for all eight source sections, reusing shared heading/image/framing primitives while retaining the scroll cue, accessible encounter image, horizontal/stacked mobile cards, quotation, disabled specialists CTA and initial FAQ selection. Text is preserved verbatim; duplicate IDs, invalid selection/framing, unsafe links and overlong button labels are rejected. The exact guided planning query is retained.

All 1,161 CMS tests passed with zero skips; TypeScript passed. Registry/editor/preview integration, source-bound migration and route/publication remain pending. These schemas alone do not provide working editor controls or publication authority. No live route, CMS content or deployment changed.

### Bespoke composition registration and structural projection

Registered all eight Bespoke section schemas and added incomplete section/page draft builders. Added strict ordinary-page projection with explicit palette, English-only context, region rejection, one hero H1 and a valid visible scroll target at every future schedule boundary. Content is preserved; the existing publication refusal remains. Draft builders are not yet exposed as editor controls.

All 1,164 CMS tests passed with zero skips; TypeScript and production build passed. Refreshed Concept/Bespoke source inventories after the shared registry change. Editor fields, private visual preview, source migration and public release remain pending. No live route/content or managed rollout changed.

### Bespoke template and editor controls

Exposed the empty Bespoke Safaris template and explicit eight-section palette in Pages. Added structured controls for headings/copy, media/mobile images/framing, cards/paragraphs, scroll cues, quotation, retained optional specialists link and FAQ initial-open identity. Ordered items retain IDs; deleting the selected FAQ clears its selection. Read-only state disables fields and actions.

Desktop/mobile controlled browser checks passed at 1280/390 pixels for all section additions, copy/link editing, FAQ reorder/remove/selection, hidden CTA retention, mobile image add/remove and readonly enforcement. Fixed an ambiguous select label found during QA; temporary fixture removed. All 1,165 CMS tests passed with zero skips; TypeScript and production build passed. Visual page preview, persistence roundtrip, source migration and publishing/delivery remain pending. No managed content or live rollout changed.

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


### Concept editor workflow connected (2026-10-23)

Confirmed the full database lifecycle test and trusted content validation support `/concept`, then added the English Concept page to the editor workflow. Trusted-check requests, submit/approve/request-changes, publication confirmation and withdrawal now use the existing revision-bound commands. Confirmation/success notices name the Concept rollout. Replaced outdated integration and video-delivery warnings with the current draft-versus-publication requirements; no delivery flags or provider content changed.

Browser plugin not available; Playwright exercised a temporary PagesWorkspace fixture with synthetic API state at 1280 and 390 px using the CMS stylesheet. Verified page identity/content, no page errors/framework overlay, trusted request/status, unsaved-change locks, submit/approve, cancel without publishing, exact-revision confirmed publish/withdraw and the correct rollout notice. The initial cold fixture observation timed out; inspected and retried on the same server without restarting. Fixture removed before tests/build. Screenshots: `/private/tmp/cms-concept-workflow-1280.png` and `/private/tmp/cms-concept-workflow-390.png`. These UI checks prove command wiring; real database lifecycle coverage remains in `Concept completes trusted review publication restore and withdrawal without bypassing release guards`.

Managed deployment, provider/media checks, real-content approval, visual/client acceptance and remaining whole-site scope remain pending.

Validation: all 1,191 CMS tests passed with zero skips; production build including TypeScript passed.

### Private Aviation source and responsive inventory (2026-10-23)

Inspected the hardcoded route, motion and responsive styles. Added a repeatable read-only capture binding 116 source dependencies and five original image/video files to five rendered sections at 1280/390 px. Captures aircraft claims and labelled specifications, inline route steps, journey/service steps, heading emphasis, media framing/video configuration, responsive caption visibility and two keyboard-focusable planning links with exact enquiry intent. Loaded lazy images before screenshots. No enquiries, CMS writes or delivery changes.

Added the page field map and implementation/acceptance sequence in `private-aviation-page.md`, and updated the editability register. Recorded inherited homepage canonical/social image for migration review, and distinguished unused CTA CSS from actual page content. Inventory does not independently verify aircraft claims, partnership, rights or video audio processing.

All 1,193 CMS tests passed with zero skips, including new source/media hash and responsive content-fidelity checks. No production source changed, so no additional build was needed after the prior passing build. Next: five-section contracts/editor/private preview, source-bound migration, public renderer/validation/release guards and provider/client acceptance. Full CMS goal remains active.

### Private Aviation content contracts (2026-10-23)

Implemented strict field contracts for aviationHero, aviationIntroduction, aviationFleet, aviationJourney and aviationServices. Preserve authored copy and specification units without coercion, unique ordered item IDs, required source disclaimer, explicit planning intent, accessible images, editorial heading runs, desktop/mobile media and hero poster/video fallback. Hero aspect choices retain the source panorama and mobile landscape dimensions; hiding a mobile caption does not delete its content. Arbitrary video URLs/playback keys are rejected. These schemas are not yet registered for authoring and do not authorize publication.

Captured-copy roundtrip and adverse-input tests passed; all 1,196 CMS tests passed with zero skips and standalone TypeScript passed. The live route, records and flags were unchanged. Next: composition registration/draft factories and five-section editor/private preview, followed by source-bound migration and public release lifecycle. Managed rollout and whole-site acceptance remain pending.

### Private Aviation composition and structural preview data (2026-10-23)

Registered the five Aviation schemas (52 composition types), added blank independent section/page factories, and a strict English ordinary-page structural projection. Scheduled visibility is checked at all future boundaries for one hero H1; unsupported visible sections, regions and private extra payload fields are rejected. Hidden duplicated and future sections remain excluded from the current projection. Incomplete forms remain invalid for save; no aircraft claims/assets are invented. Authoring UI/template, media/link verification and publication remain pending; publication_not_ready is retained.

Refreshed read-only Concept/Bespoke/Aviation inventories after the shared source dependency changed. All 1,199 CMS tests passed with zero skips; production build including TypeScript passed. No current website content, managed data or rollout flags changed. Next: connect Aviation editors and private preview, then migration and release lifecycle; full goal remains active.

### Private Aviation authoring forms (2026-10-23)

Connected a dedicated empty Aviation template and exact-route palette to PageComposer. Added five field editors for headings/copy, labelled planning links, captions, image/video/poster selection, independent mobile assets and framing, ordered route/journey/service items, aircraft and nested labelled specifications, source/operating note. Stable IDs survive reorder; new items have UUIDs and bounded collections. Draft publication remains unavailable; private visual preview and migration are pending.

Browser plugin not available; local Playwright with synthetic PageComposer state passed at 1280/390 px: all five insertions, copy editing, mobile caption retention, optional mobile video/poster add/remove, aircraft/specification reorder/removal, route steps/services and readonly nested controls. Initial cold navigation timed out; inspection/rerun retained the existing server. Fixed the background selector's ambiguous accessible name and repeated both viewport checks. No page errors or framework error overlays. Screenshots `/private/tmp/cms-aviation-editor-1280.png` and `/private/tmp/cms-aviation-editor-390.png`. Temporary fixture removed before full tests/build; no saved client records changed.

All 1,200 CMS tests passed with zero skips. Next: private media/content preview, source-bound reviewed migration, public renderer and release lifecycle; provider rollout and full client acceptance remain pending.

Aviation editor validation: desktop/mobile synthetic interaction checks, all 1,200 CMS tests (zero skips), and production build including TypeScript passed.

### Private Aviation content preview (2026-10-23)

Connected all five Aviation sections to CompositionPreview with typed headings/copy, aircraft/specification lists, ordered steps, planning links, private images and hero video/poster controls. Responsive caption visibility retains stored text; desktop/mobile framing and media supported. Video is manually played through the existing private loader, with poster fallback on missing/denied video access. Shared preview notes explicitly exclude final theme and motion.

Synthetic browser checks passed at 1280/390: five sections, original specifications, exact planning intent, hidden-caption retention, private video denial/retry/poster fallback and denied-image content retention; no page errors/framework overlays. First fixture PNG was correctly rejected; valid synthetic WebP used for the passing runs. Fixture removed before full validation. All 1,200 CMS tests and production build including TypeScript passed. No managed data, website content or delivery flags changed.

Next: source-bound reviewed migration and actual persisted preview/media authorization lifecycle, then full website renderer/public release. Successful real video playback, provider/media rights acceptance and client UAT remain pending. Full CMS goal remains active.

### Private Aviation source-bound migration proposal (2026-10-23)

Implemented pure review-only migration of the five captured sections, preserving all captured paragraphs/headings, heading emphasis/lines, aircraft labels/specifications/disclaimer, ordered steps, media roles/focal points, exact planning intent and responsive captions. Exact source/media hash proof is required; stale/unknown/duplicate mappings, private mapping fields and conflicting processed-asset reuse are rejected. Unmapped assets remain explicit review placeholders; complete caller mappings never confer apply authority.

SEO correction is explicit in comparison: inherited homepage canonical -> page-specific canonical; inherited global social image requires settings review rather than an invented page binding. Refreshed read-only source capture for heading runs. All 1,203 CMS tests passed with zero skips and standalone TypeScript passed. No live content/records changed. Next: trusted media verification and atomic revision-bound application/recovery, followed by reviewer UI and public renderer/release lifecycle. Full goal remains active.

### Private Aviation mixed-media review (2026-10-23)

Added migration 186 and strict application-side evidence verification for exactly four images and one silent video. Authenticated RPC reuses current original-file/processing/rights/tenant checks and returns kind-bound ordered evidence without private storage/rights notes. Verified wrong source/type, malformed/duplicate bindings, revoked and expired rights, outsider/cross-site requests and membership revocation in transaction-rolled-back database fixtures. Existing database constraint prevents setting audio on processed hero video; test corrected to assert rejection of that mutation.

All 1,206 CMS tests passed with zero skips and TypeScript passed. This is read-only review evidence; application still needs atomic lock/recheck, immutable receipt and retry recovery. No managed migrations, production media or live content changed. Next: implement safe draft application and its recovery lifecycle, then migration UI/public release. Full goal remains active.

### Private Aviation atomic draft migration (2026-10-23)

Added migration 187: source/review/manifest-bound actor/site receipts, exact-route/locale expected-revision application, ordered upload/media locks, live provenance/processing/rights rechecks, role-specific image/video reference matching, atomic save/audit and immutable completed retry recovery. Current authority is required on retries and receipt reads. Saves drafts only.

Transaction-rolled-back local tests proved media rollback/no receipt, evidence-change denial, missing/wrong-role references, create/retry, preservation of later client edits, stale revision and reused-key rejection, current-revision replacement, receipt isolation and revoked access. All 1,207 CMS tests passed with zero skips. No managed schema/content change. Next: caller-scoped API review/apply/status and recovery UI, then final renderer/release; provider concurrency and full client UAT remain pending. Full goal active.

### Private Aviation migration API (2026-10-23)

Connected caller-scoped review/apply/status API with strict input/origin checks, source-bound image/video roles, exact target revision, evidence/review digest, private responses, explicit SEO changes and immutable receipt recovery. Added unit checks for unauthorized/stale/tampered/incomplete evidence and inconsistent results. Extended the local real-database transaction test to exercise the API with a deliberately lost completed response, status recovery, a subsequent client edit and safe replay preserving that later edit.

All 1,212 CMS tests passed with zero skips; standalone TypeScript passed. Browser migration/recovery UI, provider acceptance, final website renderer and publishing remain pending. No production content or managed migrations changed. Full goal active.

Aviation migration API production build including TypeScript passed.

### Private Aviation migration panel and browser recovery (2026-10-23)

Added browser verification of source/review digests, exact proposal/SEO differences and mixed-media evidence. Recovery stores bounded actor/site/request IDs and evidence, never page copy/tokens, and accepts only matching receipts. Connected the migration panel to PagesWorkspace with four image pickers, one verified-video picker, new/existing destination, current/proposed preview, explicit SEO differences, acknowledgement, apply/discard and persistent status/retry. Parent editing and competing migrations lock while pending; success selects the returned record.

Browser plugin unavailable; synthetic local Playwright passed at 1280/390 px: all five mappings, five-section preview, SEO correction display, acknowledgement gate, simulated lost completed response, reload, status recovery, saved record callback and pending cleanup. Initial cold navigation timed out; inspected/reran using the same server. No page errors. Screenshots `/private/tmp/cms-aviation-import-1280.png` and `/private/tmp/cms-aviation-import-390.png`. Fixture removed before full tests/build. No real client content changed.

All 1,215 CMS tests passed with zero skips. Final website renderer/publication, provider validation and client acceptance remain pending. Full goal remains active.

Migration panel validation: desktop/mobile synthetic recovery checks, all 1,215 CMS tests with zero skips, and production build including TypeScript passed.

### Saved Aviation previews and video wiring (2026-10-23)

Fixed missing private video-loader wiring in ordinary PagesWorkspace and the shared SecurePreviewViewer. Reused authenticated/no-store/cancellable media reads, preserving existing catalog permissions. Extended persisted Aviation lifecycle coverage for pinned previews after later edits, authorized private video lookup, outsider denial and preview revocation. Synthetic desktop/mobile browser checks verified request auth/site, denied-video retry, five sections and revocation removal. Fixed low-contrast media error text discovered in dark-section screenshot and repeated checks with a computed-color assertion.

All 1,215 CMS tests passed; first production build passed. Temporary browser fixture removed before final build. No real sign-in, provider changes or client data changes. Successful real-media playback, final renderer/publication and whole-site/client acceptance remain pending. Full goal active.

Final production build including TypeScript passed after the media-placeholder contrast fix.

### Private Aviation website renderer foundation (2026-10-23)

Implemented all five source-class website sections from typed projected content, with media authorization delegated to callbacks. Preserves editorial typography, planning intent, aircraft details/source note, numbered sequences, image framing, mobile captions and hero ratios. Existing live route unchanged.

Source-versus-renderer browser comparison passed at 1280/390 px: every paragraph/heading/font size/link/specification/caption, image alt/focal point and image/video geometry, one H1, keyboard focus and no overflow. Temporary fixture mapped existing original assets and was removed after QA. Corrected its initial relative import depth before passing checks. Remaining: edited presentation controls, scoped motion/public hero media, route delivery/SEO/sitemap, publication validation and provider/client acceptance. Full goal active.

Renderer validation: all 1,215 CMS tests passed with zero skips; production build including TypeScript passed.

### Aviation presentation controls and accessible motion (2026-10-23)

Completed website presentation controls for backgrounds, widths, spacing, alignment, headings and desktop/mobile image order. Original and edited layouts passed local desktop/mobile browser comparison; 1,215 CMS tests and production build passed. Added scoped none/fade/reveal motion with revision cleanup, runtime reduced-motion handling, keyboard-focus reveal and visible no-JavaScript/unsupported-browser fallbacks. Removed a redundant main landmark found during browser checks. Motion harness passed at 1280/390; temporary fixture removed. Full goal remains active: Aviation public video/route/publication, remaining website coverage, managed-provider rollout and client handover are still pending.

Final motion validation: all 1,215 CMS tests passed with zero skips; production build including TypeScript passed.

### Aviation public hero player foundation (2026-10-23)

Added a responsive public hero player using guarded CMS endpoints, retained poster fallback, pause/resume, responsive alternative text/credits, reduced-motion and data-saving suppression, document visibility handling, rejected-play/error fallback and stale-operation cleanup. Synthetic browser controls passed at 1280/390. Corrected temporary harness placement below the sticky header, then removed the fixture. Real provider playback, full-page integration, Aviation publication validation/route delivery, remaining site coverage and client handover remain pending. Full goal remains active.

Hero player validation: all 1,215 CMS tests passed with zero skips; production build including TypeScript passed.

### Aviation editorial publication checks (2026-10-23)

Connected strict Aviation identity/composition checks and future-schedule-aware action validation to stored-content validation. Added trusted path evidence to both validation worker flows; exact planning intent and dynamic destination/anchor checks now produce actionable findings. Four targeted tests passed. Database evidence production, release-time invariants and public route delivery remain pending; existing media/publication gates remain enforced. Full CMS goal remains active.

Editorial validation milestone verified: after refreshing shared-source inventories, all 1,219 CMS tests passed with zero skips and the final production build including TypeScript passed.

### Aviation database link evidence and release guard (2026-10-23)

Added migrations 188–189: current published destinations enter trusted validation input; release-time action checks lock and recheck referenced records/media, include future scheduled sections, reject withdrawn targets and protect published route identity. Two local database scenarios verify evidence and the isolated release trigger in rolled-back transactions. All 1,221 CMS tests passed with zero skips. No managed migrations applied; full Aviation publication/public media delivery and broader site/provider/client completion remain pending. Goal remains active.

### Aviation public projection and media boundary (2026-10-23)

Added migrations 190–191 for explicit nested public field selection, current policy/media/link eligibility and unified generic-page/image/video authorization. Tested preservation of source data, recursive private-field exclusion, inactive-section exclusion, draft video privacy and independently published shared images. Fixed an incomplete SQL conditional found by the migration test run. All 1,223 CMS tests passed with zero skips. No managed deployment or live route switch. Full Aviation release lifecycle and wider client handover remain pending; goal active.

### Aviation integrated release lifecycle (2026-10-23)

Migrations 192–193 connect English Aviation verified-video eligibility and the dedicated reserved-route release guard. Stored-content validation now permits complete Aviation revisions through existing media, approval and trusted-receipt checks. The rolled-back local lifecycle covers actual trusted validation, separate roles, publish/read, draft isolation, revoked-media rejection, restore/reapprove/republish, route and unsupported-section rejection, and image/video withdrawal. Refreshed three source-bound inventories after shared validation changes and corrected the obsolete unconditional-publication-gate assertion. All 1,224 CMS tests passed with zero skips; production build including TypeScript passed. Live route unchanged, managed deployment and client acceptance pending. Goal active.
