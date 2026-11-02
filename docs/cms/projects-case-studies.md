# Projects and case studies

## Current local authoring workflow

The CMS sidebar now includes **Projects and case studies**. Editors can create a project or case-study draft with title/slug, summary, client/organization, industry, location and completion date; structured overview, challenge, approach and outcome text; listing/gallery images; related projects, products, destinations and documents; and the existing SEO/social fields. Media and relationships use existing library/record pickers instead of manual database identifiers.

The workspace lists accessible project records with pagination, a loaded-record title search and a loaded-record review-status filter. These are not yet full server-side project discovery or industry/location filters. Existing URLs and languages are locked until a dedicated migration/translation workflow is connected. Unsupported pre-existing payloads are preserved and refused by the editor rather than silently rewritten.

The dedicated save endpoint validates the project contract and derives the project type, title and `/projects/<slug>` path. Existing-record saves verify type, URL, language and expected revision, then use the existing scoped database save operation. A stale save leaves the unsaved draft intact; the editor can explicitly reload the current revision. Local undo/redo covers project content. Revision history can restore an earlier payload as a new draft without publishing it.

Creation saves a complete request locally under actor/website scope before sending. Web Locks serialize tabs; failed storage blocks creation. The existing server-side `create_draft_once` receipt prevents duplicate records. Lost responses and failed reloads retain the exact request for recovery. Cancellation uses the server-side tombstone workflow: if creation already committed, the record is recovered instead of deleted. Browser storage contains draft content and should be treated as part of the signed-in editor’s local workspace. Unsubmitted ordinary edits do not yet have autosave/checkpoint recovery.

Preview renders saved or unsaved copy literally, with private processed image blobs and non-navigating links. It covers the current editorial content, not a complete future website route. Relationship selections are stored; public relationship cards, responsive page-shell fidelity and public layout variants remain unfinished.

## Internal claim evidence drafts

Projects now store up to 30 individually identified claims, each with a statement (2,000 characters), up to 30 unique supporting document references, an intended approval contact (200 characters) and an ISO review date. Existing payloads without claims open with an empty list. Incomplete claims can be saved with advisory findings; invalid dates, duplicate identities/references and unknown approval fields are rejected. The document picker uses existing scoped reference discovery. Claims are included in revision saves and creation recovery, but excluded from the page preview.

The contact is a planning note, not a verified member assignment or authorization. Approval state is stored separately in server receipts, never in editable claim fields. Publication still needs to integrate those receipts and recheck evidence availability, file rights and review expiry.

## Saved-revision claim owner assignment

After saving, editors can load claim approval owners and assign each claim to an eligible CMS member. The separate intended-contact note is never treated as authorization. Candidates must have active, unexpired membership and both view and approve permission for this project; record-specific grants are honored. Sites requiring a separate approver exclude the saved revision's author. Read-only users can inspect assignment status but do not receive the member email catalogue.

Migration 296 stores assignments outside editable content, bound to website, project, revision and claim. Writes require current project view/edit permissions, lock the project revision, enforce optimistic assignment generations and record an audit event. An immediate exact retry does not create another generation. Changed or restored project content has a new revision and no inherited assignments. Revocation or expiry marks an existing assignment ineligible. The browser discards an uncertain response and asks for a fresh assignment read before retrying.

This is verified reviewer assignment, not a claim approval receipt. Sign-off now checks the assigned member's current approval permission/MFA, exact evidence revisions, file rights and review dates as described below. The project publication gate remains unfinished. No assignment enables project publishing or sends a message to the reviewer.

## Claim evidence sign-off

Migration 297 provides private, audited claim approval receipts. The assigned eligible reviewer can load the saved claim, open the exact private document PDFs through the existing authenticated preview service, attest to reviewing the evidence and approve. Approval requires current project view/approve permission and the site's privileged MFA policy. Supporting documents need current view access for both the requesting user and assigned reviewer; anonymous/public publication of the evidence is not required.

The server compares the reviewed evidence with a fresh snapshot of the saved project claim, assignment generation, document revisions and PDF file revisions. Every supporting PDF must have verified processing, current approved rights and no archive flag. Claim review dates and any document effective, expiry or review dates must be current (inclusive UTC dates); expired evidence is blocked even if its document's general publication policy only warns. Missing or malformed evidence fails closed. A fresh document revision or file change invalidates the earlier receipt, as do changed assignment generations, revoked membership/permissions or overdue dates. Immediate exact approval retries reuse the receipt rather than duplicating the audit event.

The interface reports approval as of the last check, not a continuously monitored state. A lost response clears the local review and requires a fresh read to discover whether approval committed. Remove/reassign the claim owner to invalidate a receipt; a dedicated withdrawal reason control remains to be added. Revision restores create new drafts and do not inherit approval. No emails or other reviewer notifications are sent.

These receipts are not yet connected to a project publication validator or anonymous page delivery. Publishing must recheck current evidence and all other project requirements before that capability is enabled.

## Trusted project content checks

Migration 298 registers `project-1` and adds service-only, exact-revision evidence to the existing validation worker. Editors can request a check for the saved revision and refresh its receipt in the project workspace. The existing server validation worker must be configured and running; queuing a job is not a completed check. Read-only users can inspect receipts but cannot request through this interface.

Checks require a matching project URL/slug, currently supported language (English), nonblank summary, substantive rich text, a listing image, valid schema/SEO and exact evidence sets. All selected images, including gallery/social images, require processed WebP files with current approved rights. Related records must be same-site, published, of the expected type and language, and not the project itself. Internal links must resolve to known public routes or the project's own path; fragment links remain unsupported. External links receive schema/scheme validation, not remote availability checks.

Each claim must have a current exact-revision approval: evidence changes, review expiry, assignment changes or lost reviewer permissions make the trusted claim check fail. The worker receives booleans and identifiers, not private document text or approval notes. Missing, duplicate, extra or cross-scope evidence fails validation. Trusted receipts expire through the existing 15-minute policy and describe evidence at check time.

A separate database trigger blocks all project publication while the public delivery contract is unfinished, including ordinary publish operations and direct privileged updates. A passing `project-1` receipt therefore does not enable a live page. The next publication migration must replace this temporary gate with current dependency checks and complete public-reader contracts; it must not simply remove the guard.

## Public project delivery preparation

Migrations 299–300 add dedicated anonymous detail/list readers and reserve `/projects` from custom-page and other-record collisions. `/projects` and `/projects/[slug]` render only when both `CMS_PUBLIC_DELIVERY_ENABLED` and `CMS_PROJECT_DELIVERY_ENABLED` are true; the new switch defaults to false. The browser never receives internal claim statements, evidence IDs, approval contacts, ownership records or raw relationship IDs. SQL constructs an explicit field allowlist, and the TypeScript boundary rejects unexpected fields rather than silently stripping them.

The detail page renders title, listing image, summary, client/location/date, structured overview/challenge/approach/outcomes and gallery. It includes SEO metadata and CreativeWork structured data without inventing client endorsements or measured results. The list paginates published readers with strict ordering/duplicate checks and displays eligible project cards. Private media remains behind the existing authorized image endpoint.

Published readers require the released revision's trusted validator version and recheck current media rights, claim approvals, links and related-record eligibility on every read. Private document relationships cannot become public by association. A newer unpublished project draft does not replace or hide the released revision; internal evidence helpers now support immutable historical revisions while mutation/review APIs continue to require the current draft. Withdrawal or revoked image rights removes detail, list and project image access.

This is not release completion: normal project publishing is still blocked by migration 298. Reader database tests simulate a released record inside a rolled-back fixture with that one trigger temporarily disabled; they do not prove normal publish admission. Full public preview parity and dependency-safe publication admission remain to connect. Related project/destination/public-document cards are implemented; product cards await product delivery. Sitemap/search integration is now connected behind the same rollout switch. No rollout flag was enabled outside the local fixture and no hosted migration ran.

## Project discovery

Site search now supports a dedicated Projects category and respects the published search content-type selection. It uses only the dedicated public project listing, indexes the published title/industry/summary and performs no project request when rollout is disabled. An enabled but unavailable provider fails explicitly rather than reporting an empty successful catalogue.

The sitemap includes eligible project detail URLs and the `/projects` index only when at least one project qualifies. Effective website/page noindex and canonical URLs pointing elsewhere exclude project details from both search and sitemap. A sitemap-only exclusion preserves internal search visibility. Project index metadata also honors the site's noindex restriction. Withdrawn or rights-ineligible projects disappear through the same published reader as the detail route; no separate discovery cache can continue serving the old record.

Product-related cards and normal publish admission remain pending. Project discovery does not enable the rollout switches, publish records, or make internal evidence searchable.

## Related public content

Migration 302 adds projected related-content cards for projects, destinations and public documents. Titles come from published revisions; private draft titles, raw relationship arrays and internal evidence metadata remain excluded. Document links include both record and published revision so a later document change cannot silently substitute a different PDF through that link. The existing document download service must also be configured before rollout; card rendering does not verify a hosted file transfer.

Project-to-project references are checked as a deduplicated graph (maximum 200 reachable project records). Cycles terminate without recursive-reader calls. Every reachable project's published base content, media/claims, language and direct destination/document relationships must remain eligible. A withdrawn or rights-ineligible downstream project makes affected readers/listings/images unavailable. Oversized or malformed graphs fail closed rather than returning partial cards. Destination cards use the existing destination public-reader contract, and document cards require explicitly public access even for signed-in readers.

Product references remain preserved in draft content, but public product delivery has not been implemented. Trusted project checks report this as a blocking finding, and anonymous readers refuse those projects instead of discarding selected relationships. This is retained product scope, not a PRD exclusion.

The public DTO validates card types and exact local routes, rejects duplicate/self links and unexpected private fields. Release verification must enable and test the relevant destination/document delivery paths as well as project delivery. Publication admission is now connected by migration 303; deployment and client verification remain pending.

## Publication and remaining module scope

This is a locally integrated milestone, **not a completed PRD module**. Project review/publish/withdraw controls and anonymous list/detail routes are connected behind the configured rollout. Incomplete drafts can be saved, while invalid shapes/URLs/media descriptions cannot pass the dedicated save contract. Advisory findings are not a trusted publication receipt.

Next requirements remain:

- Verify publication admission, concurrent dependency changes and public-reader contracts on real staging. Trusted project validation and live dependency admission checks are implemented locally.
- Add explicit claim-approval withdrawal with reasons. Current claim sign-off/evidence checks now gate trusted project publication and delivery.
- Hosted search performance and client acceptance. Whole-library text/status/ownership/publication filtering and record-owner assignment are now locally implemented.
- Complete product-related cards with the product module, and verify related delivery/discovery on real staging. Public list/detail rendering, SEO metadata, rights/withdrawal readers and disabled-by-default rollout are locally verified.
- Client acceptance of the locally tested review/publish/withdraw/restore workflow and individual schedules; coordinated releases, translations and larger draft recovery parity.
- Hosted verification and independent client acceptance.

## Local evidence

`tests/cms-projects.test.mjs` checks the schema, incomplete-draft findings, preserved structured copy, derived identities, durable create dispatch and refused cross-type/stale/URL/language edits. The integrated database test invokes the actual project handler against the existing SQL functions to verify one record on retry, expected-revision editing, restoration and inaccessible records.

`scripts/check-cms-project-authoring.mjs` passes at 1280 and 390 pixels: structured copy, safe preview/private image, document selection, lost create response and refresh recovery, one creation identity, undo/redo, saved edits, stale-conflict preservation, revision restoration and read-only access. The browser uses synthetic provider responses, not a hosted CMS account. Latest full CMS suite: **1,749 passing, zero skipped**; production build and TypeScript pass. No client case study, public content or remote provider data was created.

Claim evidence follow-up: schema compatibility and rejection tests pass; desktop/mobile browser checks verify document evidence, approval-contact persistence after lost-response creation recovery, and exclusion from public-style preview. Full suite, production build and TypeScript pass. Logs: `/private/tmp/cms-project-claims-{full,build,types,browser}.log`. This remains local synthetic verification, with no hosted or client acceptance claim.

Saved-revision ownership evidence: `tests/cms-project-claim-owners.test.mjs` verifies narrow API dispatch, origin/input rejection and response identity. The integrated database scenario verifies independent eligible members, record-scoped grants, revoked/expired membership, stale revision/assignment refusal, exact retry and audited writes. Desktop/mobile checks cover member selection, lost-response reconciliation and assignments clearing on a new draft revision. Full suite: 1,712 passing, zero failures/skips; build, TypeScript and offline migration plan through 296 pass. Logs: `/private/tmp/cms-claim-owners-{db,api,full,build,types,browser,migrations}.log`. No hosted migration was applied.

Claim sign-off evidence: `tests/cms-project-claim-review.test.mjs` checks attestation, bounded request dispatch and response identity. The integrated SQL scenario checks private document evidence, exact receipt retry, rights revocation/expiry, document changes/expiry, reviewer document access, required MFA and assignment changes. Desktop/mobile browser checks open a private PDF preview, require explicit attestation and recover a committed approval after its response is lost. Full suite: 1,715 passing, zero failures/skips; production build, TypeScript and offline migration plan through 297 pass. Logs: `/private/tmp/cms-claim-approval-{db,api,full,build,types,browser,migrations}.log`. Verification is local and synthetic; no hosted migration or real claim approval was performed.

Trusted project validation evidence: `tests/cms-project-validation.test.mjs` verifies content requirements, exact evidence sets, claim approvals, related-record publication, links and trusted worker receipts. Integrated SQL tests verify service-only evidence, cross-site rejection, live claim invalidation, image rights failures and both ordinary and direct publication blocking. Desktop/mobile checks request and refresh trusted results and hide request controls from readers. Full suite: 1,719 passing, zero failures/skips; build, TypeScript and offline migration planning through 298 pass. Logs: `/private/tmp/cms-project-validation-{tests,db,claims,full,build,types,browser,migrations}.log`. The existing URL-impact fixture now uses shared content instead of a forced-published project; its impact assertions are unchanged.

Public reader evidence: `tests/cms-published-project.test.mjs` verifies strict private-field rejection, route identity, metadata, disabled configuration and list pagination. SQL tests verify anonymous reader isolation, historical published revisions, rights revocation, withdrawal and namespace collision prevention; historical claim evidence remains valid across a newer project draft. `scripts/check-cms-project-public.mjs` passes on actual Next routes at 1280 and 390 pixels using a synthetic provider, including image loading, no overflow, metadata/noindex and withdrawal. The disabled route returns 404. Full CMS suite: 1,724 passing, zero failures/skips; build and TypeScript pass. Logs: `/private/tmp/cms-project-public-{tests,db,namespace-db,full,build,types,browser,migrations}.log`.

The namespace reservation changes one shared source dependency. Fresh Kenya, Tanzania, Concept, Guided Safaris and Private Aviation captures exactly match every prior non-provenance field; only the `lib/cms/custom-page-path.ts` hash changed. Source hashes/timestamps were refreshed after comparison and the application rebuilt. Captures: `/private/tmp/project-namespace-*.json`. No existing page content, media or interaction evidence was replaced.

Project discovery evidence: `tests/cms-project-discovery.test.mjs` covers noindex, canonical URLs, independent sitemap exclusion, summary search and disabled-provider behavior. The real-route browser fixture verifies project category/summary search, published content-type settings, sitemap membership, global/page noindex, canonical exclusion and removal after withdrawal/rights revocation. Migration 301 uses the published revision date for discovery; the SQL reader scenario confirms a deliberately newer private-draft timestamp cannot change it. Five legacy page captures match every non-provenance field; only shared search policy/type hashes changed. Logs: `/private/tmp/cms-project-discovery-{tests,db,full,build,types,browser,migrations}.log`; captures: `/private/tmp/project-discovery-*.json`.

Related-card verification: the SQL scenarios cover finite cyclic project graphs, transitive rights/withdrawal, published titles despite newer private drafts, destination-reader envelopes, pinned document links and authenticated-only document rejection. Public DTO tests reject external/wrong routes, duplicate/self links and private fields; trusted checks flag product relationships explicitly. The new project screens and project search results use native anchors after browser checks exposed duplicate canonical tags during client-side list/detail navigation; browser acceptance keeps a strict single-canonical assertion in both directions and from search. Relevant logs: `/private/tmp/cms-project-related-{tests,db,docs,full,build,types,browser,migrations}.log`. This remains synthetic local verification; document transfer and destination rollout must be verified on staging.

Related-card milestone verification completed: 1,730 CMS tests pass with zero failures/skips; production build, TypeScript, migration planning through 302 and the real-route desktop/mobile browser checks pass. The browser verifies one canonical after list/detail and search navigation and checks the projected related links. Normal project publication remains blocked, rollout remains disabled, and no hosted data was changed.

The public browser fixture now replaces its state file atomically, preventing partial JSON reads during mode changes. The final repeated browser run passed with clean server diagnostics (`/private/tmp/cms-project-related-server.log`, apart from Node module-format notices).

## Publication admission (migration 303)

The temporary stop is replaced with exact current/approved revision checks, a fresh `project-1` trusted receipt, English route/payload identity, live claim/media/link/reference evidence, and public related-card eligibility. New private drafts preserve the existing published revision. Withdrawal remains available without renewed validation. The existing delivery worker invalidates the root layout, including project pages, listings, search and sitemap; real cache propagation remains unverified.

The workspace exposes permission-based submit, approve, request changes, publish and withdraw actions. Publication and withdrawal require confirmation of the selected revision; unsaved edits disable lifecycle actions. The database remains authoritative. Rollout switches remain disabled by default.

Local SQL scenarios use actual trusted validation, review, publication, anonymous reads and withdrawal. They reject missing approval, expired validation, revoked image rights, claim evidence revoked after validation, and a related PDF changed to authenticated access. They verify idempotent publish jobs and retained draft history. Browser fixtures exercise review transitions, cancellation, publication, withdrawal and restricted controls at desktop/mobile widths. Verification is synthetic; hosted concurrency, deployed routes/cache, client permissions and client acceptance remain pending.

Admission milestone verified: **1,730 CMS tests pass, zero failures/skips**; production build, TypeScript, offline planning through migration 303 and browser checks at 1280/390 pixels pass. Logs: `/private/tmp/cms-project-admission-{full,build,types,browser,migrations,server}.log`. No hosted migration, real publication or external message was performed. Overall score stays 51/100 until broader module and deployment acceptance gates are met.

## Individual project schedules

The project workspace reuses the shared schedule panel for approved-revision publication and currently-published-revision withdrawal, with explicit time-zone offsets, confirmation, status refresh and cancellation. Unsaved edits and pending creation recovery disable the panel; only publishers see creation/cancellation controls. The existing worker requests fresh project validation at execution and retains the original publisher authority. No new database migration or separate scheduling implementation is needed.

The real local database adapter/worker scenario verifies successful publication with a fresh `project-1` receipt, blocked publication after image-rights revocation or publisher-membership revocation, and withdrawal after image-rights loss. Desktop/mobile synthetic browser checks cover date/offset entry, revision targeting, saved status, cancellation and hidden creation controls for readers. Real timer configuration, deployed worker runs, concurrent cancellation and client acceptance remain staging requirements. The shared Coordinated releases workspace already accepts project records. Project-specific database atomicity and scheduled-group checks now pass locally; group UI acceptance and deployed verification remain pending.

Scheduling milestone verified: **1,731 CMS tests pass, zero failures/skips**; production build, TypeScript and browser checks at 1280/390 pixels pass. Evidence: `/private/tmp/cms-project-schedules-{db,full,build,types,browser,server}.log`. No hosted timer was configured and no provider data was changed. The overall score remains 51/100 under the unchanged full-PRD rubric.

## Content ownership (migration 304)

The project editor exposes the existing record owner through a reusable ownership panel. An editor with record view/edit permission can assign an active, unexpired member who has both view and edit access to that record. Read-only viewers see the current owner but do not receive a candidate catalogue. Ineligible owners remain recorded, display an eligibility warning, and have their email withheld. Assignment does not grant access, change content, or approve claims/revisions.

Ownership has its own version counter, independent of content revisions. Stale assignments are refused; an immediate exact retry by the same actor returns the committed state without duplicating its audit entry. Failed or lost responses clear the loaded selector and require a fresh read. Candidate lists are bounded at 200 and fail closed if larger; large-team candidate search remains a future extension. The generic backend/panel can be reused in other module workspaces, but this milestone connects only Projects.

Local SQL coverage checks read/edit boundaries, same-site membership, expiry/revocation, record-scoped eligibility, retry and stale conflict handling, audit count, and unchanged approved content. API checks enforce bounded typed inputs, response identity and private caching. Browser verification covers assignment, lost-response reload recovery and read-only controls. No real member assignment or hosted migration was performed.

Ownership milestone verified: **1,734 CMS tests pass, zero failures/skips**; production build, TypeScript, migration planning through 304 and desktop/mobile browser checks pass. Logs: `/private/tmp/cms-record-ownership-{api,db,full,build,types,browser,migrations,server}.log`. The browser selector uses the accessible combobox name; the initial exact-label selector incorrectly included option text. No product behavior was weakened to pass the check. Overall full-PRD score remains 51/100; hosted/client gates remain open.

## Coordinated project release verification

The existing release implementation handles projects without a separate release path. Real local SQL scenarios now publish an updated related project followed by its consumer, using actual approved revisions and trusted validation. If the consumer image loses rights, the transaction restores the dependency’s previous published revision and leaves no new delivery jobs or release receipt. After repair, one exact release succeeds; replay returns the receipt without republishing a subsequently withdrawn consumer. Anonymous related-card reads show the newly published dependency title.

The scheduled-group worker is tested through its real validation and SQL adapter. Both project revisions are revalidated; an injected rights revocation immediately before execution blocks the group and rolls back every new pointer, delivery job and receipt. A repaired new schedule succeeds. These are deterministic local race-boundary checks, not hosted concurrent-session proof.

**Remaining limitation:** trusted project validation requires public relationships to already be published. These scenarios update an existing public dependency; they do not prove first publication of a group of mutually dependent new records. Publish initial dependencies separately, or implement and validate an explicit group-aware readiness contract before supporting that case. Group UI acceptance, hosted concurrency/cache delivery and client sign-off remain open. No new release implementation or database migration was introduced.

Group verification milestone: **1,736 CMS tests pass, zero failures/skips**. Logs: `/private/tmp/cms-project-groups-{db,full}.log`. This batch changes regression coverage and documentation; application code is unchanged, so the prior verified build remains applicable. No browser or hosted group acceptance is claimed.

## Whole-library project search (migration 305)

The project workspace now uses a dedicated server search instead of filtering only the loaded rows. Text matches the current title, summary, client and industry; filters cover review status, assigned-to-me ownership and published/unpublished state. Text is a literal case-insensitive substring, so `%` and `_` are not wildcard operators. The current draft’s metadata is searchable only by members who can view that record.

Results are projected summaries, ordered by stable UUID with a bounded next cursor; the query applies access checks and filters before pagination. Invalid/inaccessible cursors are rejected, and the API validates ordered, nonduplicated responses. Applying filters starts a new search, while load-more and automatic post-save refresh preserve the applied filters. Browser responses from superseded requests are ignored.

The local database scenario creates 55 records and verifies page boundaries, a summary-only match on the second page, literal punctuation, status/ownership/publication filters, cross-site isolation, record-scoped visibility and anonymous refusal. API tests cover invalid/duplicate inputs and malformed pagination. Desktop/mobile fixtures exercise summary search and empty results while preserving the current editor. Hosted scale/performance and independent client acceptance remain pending.

Library search milestone verified: **1,739 CMS tests pass, zero failures/skips**; production build, TypeScript, offline migration planning through 305 and desktop/mobile project browser checks pass. Logs: `/private/tmp/cms-project-search-{api,db,full,build,types,browser,migrations,server}.log`. No hosted migration or client data was changed. Full-PRD score remains 51/100 pending broader module and hosted/client acceptance gates.

## Saved-project recovery and conflict comparison

Saved projects now reuse opt-in private browser checkpoints, including optional automatic copies after valid edits. Recovery re-reads the authenticated record, checks edit access and exact account/site/record/language/URL identity, and validates the baseline, recovered and server payloads. A matching base restores locally; a newer revision opens a three-way field comparison. No recovery action writes to the server.

A 409 save conflict also re-reads the latest record and opens the same comparison while preserving local edits. Independent changes can be combined; conflicting fields require explicit selection. Claims, relationships, rich text and other grouped fields remain whole, and optional image removal is preserved. Applying choices changes only the local draft and its expected base; an explicit save creates a new revision and normal review requirements apply. Lost-save-response recovery and broader editor parity remain separate acceptance work. First-unsaved-draft checkpoints are now connected as described below.

Recovery copies contain private content on the browser profile and remain after sign-out until explicitly removed. The shared panel communicates this and requires opt-in; opening a project does not automatically persist its content.

Recovery milestone verified: **1,741 CMS tests pass, zero failures/skips**; production build, TypeScript and desktop/mobile browser checks pass. Browser cases include restoring an unchanged base, comparing an older browser copy against a newer saved revision, explicit conflict choices and independent remote-field preservation; local restoration/reconciliation does not increase the server-write count. Evidence: `/private/tmp/cms-project-recovery-{tests,full,build,types,browser,server}.log`. No hosted or client recovery acceptance is claimed.

## Recovery before first save

New projects now reuse the opt-in new-draft recovery panel. Private local copies preserve structured fields, relationships, claims and language before any server record exists. Restoring validates the copy’s account/site/project scope and project schema, rechecks current website access, and opens an unsaved draft. Explicit save still enforces creation permission. Starting or restoring another draft is fenced while a recoverable creation request is pending, including a request detected from another tab. Starting a fresh draft resets the checkpoint identity.

Copies remain until removed and can outlive a successful server save, so the shared panel tells clients to reopen the saved record instead of restoring a duplicate. No automatic server save or publication occurs during recovery.

First-draft recovery milestone verified: **1,742 CMS tests pass, zero failures/skips**; production build, TypeScript and desktop/mobile project workflow checks pass. Copying and restoring a complete new project leaves the server-write count at zero; the later first save still exercises the existing lost-response creation recovery. Logs: `/private/tmp/cms-project-new-recovery-{tests,full,build,types,browser,server}.log`. Hosted/client recovery acceptance remains pending.

Project Word/Excel templates, parsing, authenticated review, before/after comparison, atomic apply, recovery and cancellation are connected locally; see [project imports](project-imports.md) for supported content and outstanding native Office, hosted and client acceptance.

## Translation authoring

Saved projects expose the existing translation creation, family navigation and independent review panels. New language drafts keep the source path within their locale, retain valid structured project content and clear an explicit source canonical. Recoverable creation, cancellation and opening reuse the shared actor/site/source-scoped receipt workflow. The project loader rechecks type, schema and path before opening a translated record.

Translation work participates in workspace busy/dirty protection, preventing competing imports, edits or navigation while a translation is being opened. Shared review status tracks the source revision and translation revision independently; later changes require review again. Claim approval receipts remain bound to their own project record/revision and are not copied as part of a translation payload.

This is translation draft authoring, not localized visitor delivery. Existing project publication admission still requires `en`; translated projects require future localized route/discovery/SEO acceptance before publication can be enabled.

Translation milestone: **1,768 CMS tests pass, zero failures/skips**; production build and post-build TypeScript pass. Project-specific SQL checks cover canonical clearing, valid retained payload/path, idempotent creation, independent review, source-change detection, family identity and unauthorized access. Desktop/mobile browser workflows create a French draft, recover a lost response, open it and navigate back to the English source while preserving existing project editing checks. Logs `/private/tmp/cms-project-translation-{sql,full,build,types-final,browser}.log`. Hosted/client acceptance remains open.
