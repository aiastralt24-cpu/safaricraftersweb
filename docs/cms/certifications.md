# Certification records

## Local foundation — 30 October 2026

`lib/cms/certifications.ts` defines a strict versioned authoring contract: issuer, certificate number, claim statement, scope, issue/start/expiry dates, review date, evidence document references, location/page relationships, SEO and internal notes. Incomplete drafts remain editable. No approval flag or owner attestation is accepted in author-supplied content; approval must reuse the scoped, revision-bound claim review mechanism when persistence is connected.

Date policy: calendar dates use UTC. A dated certificate remains temporally current through its expiry date; review is due at the start of its review date. Explicit no-expiry certificates still need review dates. Suspended and revoked states are separate from ordinary expiry. Temporal state is editorial information, never permission to publish. Document availability, evidence revisions, approval ownership and current publication require independent server checks.

Creation commands require a recovery request identity; updates require an existing revision. Migration 424 now adds the certification record type and route identity, scoped lifecycle/text search, cancellation and title-preserving restoration. The authenticated `/api/cms/certifications` endpoint connects strict saves and verified search receipts. Existing shared draft persistence supplies revision conflicts, ownership, audit history and exact creation replay. The Certifications workspace now connects authoring, evidence selection, private preview and recoverable saves.

Verification: four certification behavior tests and two existing claim-review regression tests pass, with TypeScript checking. Tests cover incomplete drafts, exact date boundaries, invalid dates, contradictory validity, repeated evidence, forged approval fields and creation/update identity. No hosted or browser acceptance is claimed.

## Storage/API verification — 30 October 2026

The full CMS suite passed 2,370 tests with one new assertion expecting the wrong publication guard. The certification guard correctly blocks publication before the generic approval guard; the corrected database test passes separately. Eight targeted certification contract/API tests, production build, TypeScript and offline migration planning pass. Database checks cover same-site search/lifecycle filtering, literal search text, outsider isolation, duplicate creation recovery, stale saves, title/payload restoration, cancelled requests, invalid routes and publication rejection even with a synthetically approved revision. No hosted migration was applied.

## Client editor verification — 30 October 2026

The CMS navigation now exposes Certifications with title/issuer/claim/scope fields, character limits, native calendar inputs, evidence document selectors, location/page relationships and SEO controls. Client workflows reuse ownership, revision history, undo/redo, explicit browser checkpoints and conflict comparison. Creation persists its exact request before sending; retry uses that same request. Interrupted updates reconcile with the current server revision. Internal notes remain excluded from preview.

Twelve targeted certification tests, production build and final TypeScript checks pass. Browser plugin not available; regular Playwright with mocked authenticated requests verified editing, lost-create-response recovery with identical retries, undo/redo, evidence selection, preview privacy and read-only controls at 1280px and 390px. The first mobile pass timed out entering the workspace; an isolated rerun passed without code changes. Screenshots were inspected and no horizontal overflow or page errors were found. These are local fixture checks, not hosted acceptance. The temporary dev server was stopped.

## Evidence approval backend — 30 October 2026

Migration 425 adds private, RLS-protected assignment and approval records. Each certification has one claim identified by its record ID. Assignments bind to the exact saved revision and an incrementing version; editor assignment cannot grant approval privileges. Eligible reviewers must retain scoped view/approve access, active membership and required separation from the author.

The approval snapshot pins claim wording, issuer, certificate number, scope, validity dates and sorted evidence identities (document revision, processed PDF asset and file revision). Current private PDF rights, archive state and document dates are checked again. A certificate must be active, already valid, unexpired and not due for review. Expiry includes its final UTC day; no-expiry certificates still require a future review. The assigned reviewer must be able to view every evidence document. Permission-scoped HTTP endpoints require an explicit attestation and exact snapshot for approval; exact immediate retries return the existing approval. Reassignment, revised evidence or changed file rights invalidate earlier approval. A service-only current-approval check is available for the future validator/release gate.

Verification: all 2,379 CMS tests pass without skips, plus the final two database boundary tests and four claim API tests. Production build, TypeScript and offline migration planning pass. Tests exercise reviewer separation, stale assignment generations, exact retries, evidence revision changes, revoked rights/access, MFA, review deadlines, inclusive expiry and no-expiry validity. No hosted migration was applied.

These backend checks do not grant publication or expose evidence publicly. Client approval controls are connected locally; trusted content validation is now connected; publication integration remains unfinished.

## Client evidence sign-off — 30 October 2026

Saved certification revisions now expose reviewer assignment and evidence sign-off controls. The reviewer sees the certificate issuer/number, scope, validity/review dates and exact document/PDF revisions, and can load a private authenticated PDF preview. Approval requires explicit attestation. Unsaved edits disable assignment and review. Failed or uncertain approval clears stale review state and prompts reloading current evidence; a lost successful response can then recover the existing approval. Unavailable evidence removes the approval action.

Sixteen targeted certification tests, production build and final TypeScript checks pass. Browser plugin not available; regular Playwright checked assignment, exact evidence/PDF identity, attestation gating, lost-response recovery, evidence invalidation and dirty-state locks at 1280px and 390px using mocked authenticated APIs. Final browser runs passed with no page errors or horizontal overflow. The temporary dev server was stopped. Hosted/client acceptance remains separate.

## Trusted saved-revision validation — 30 October 2026

Migration 426 supplies service-only evidence for the current saved certification: current claim approval, exact related location/page status and social-image rights. The shared worker now runs `certification-1`, checks strict draft content, URL/language identity and exact relationship/media evidence, and writes its result through the existing trusted validation mechanism. Unapproved or no-longer-current certificate evidence fails. Related records must be published in the same website/language; selected sharing images need verified processing and current rights.

The editor can request a queued trusted check and refresh its saved-revision result. The panel rejects another revision or validator version, displays findings, and never treats an expired receipt as passing. Passing validation does not publish a certification. The CMS heading now identifies Certifications correctly.

Verification: all 2,383 CMS tests pass without skips, including actual database/worker recording and revoked-evidence rejection. Desktop/mobile Playwright fixtures pass check requests, current/expired results, mismatched-revision rejection and actionable findings. The initial browser run timed out entering during startup; waiting for the initial content list before navigating resolved the check. Production build, final TypeScript and offline migration planning pass. No hosted deployment was performed.

## Published-only reader foundation — 30 October 2026

Migration 427 adds anonymous detail/list readers with an explicit public field allowlist. Certificate evidence IDs, private documents, internal notes, approval-owner information and internal review dates are excluded. Delivery rechecks current claim approval, live PDF rights, related-record publication/language and sharing-image rights. The evidence helpers can verify the immutable published revision while a newer draft exists; assignment/review mutations still require the current saved revision.

The strict TypeScript projection rejects leaked fields, malformed content and route/language mismatches. The anonymous runtime has a separate disabled-by-default `CMS_CERTIFICATION_DELIVERY_ENABLED` switch in addition to the global delivery switch; it uses the anonymous connection only and validates list pagination. These readers do not mount visitor pages or remove the database publication fence.

Verification: all 2,386 CMS tests, TypeScript and offline migration planning pass. Transactional anonymous-reader fixtures verify private-field exclusion, tenant isolation, list filtering, published-revision stability during newer edits and immediate hiding after PDF-rights revocation. Runtime tests verify anonymous credentials, disabled defaults, strict projection and pagination. No public rollout or hosted migration occurred.

## Database publication and media admission — 30 October 2026

Migration 428 reserves `/certifications` and its descendants against other record families and checks for existing records/redirect collisions before installation. The client custom-page validator uses the same reserved namespace. Existing careers ownership remains intact.

Migration 429 replaces the temporary publication fence with guarded release: exact approved current revision, unexpired certification-1 validation, correct English route identity, current reviewer/evidence approval and current reference/media status. Selected records, private PDF files and approval assignments are locked while checking release. Saving a newer draft preserves the immutable published revision. Withdrawal retains drafts/history. Public media admission includes only assets in a currently deliverable allowlisted certification projection; private evidence PDFs are never admitted by this rule.

Verification: the database suite passes certification create/recovery, current evidence approval, actual submit/approve/publish/read/withdraw, rejection after rights revocation despite prior validation, namespace isolation and public-image admission/withdrawal. TypeScript and offline migration planning pass. Full regression exposed stale shared-route dependency hashes in five migration inventories; the exact one-root addition was reviewed, existing captured namespaces verified unchanged, and hashes updated with prior/new checksums retained in `certification-namespace-dependency-review.json`. Review notes are separate to preserve strict inventory schemas. All 159 affected migration tests and the final client namespace test pass after reconciliation. No legacy page content or assets changed.

Editor publication controls and English visitor pages are now connected locally; the public rollout flag remains off.

## Client release workflow and English visitor pages — 30 October 2026

The editor now exposes permission-aware submit, approve/request-changes, confirmed publish and confirmed withdrawal actions. Confirmation pins the intended revision. Failed or uncertain responses lock further workflow actions until the saved record is reloaded; a lost successful publish can be recovered without a blind repeat. Unsaved edits disable the workflow. Publication and evidence sign-off remain separate approvals.

`/certifications` and `/certifications/[slug]` now render the anonymous runtime data using existing site typography, breadcrumbs and article layout. Detail pages show the approved claim, scope, issuer/number and validity dates, and exclude private evidence. Metadata respects editorial title, description, canonical, robots and social-image settings. Rollout defaults off. Search/sitemap discovery is now connected locally.

Local Playwright checks pass review, cancelled confirmation, lost-publish-response locking/reload and withdrawal at 1280px/390px. Temporary visitor fixtures verify directory/detail rendering, canonical metadata, escaped text, empty state and no horizontal overflow/page errors; screenshots were inspected. The fixture and dev server were removed/stopped. These fixtures do not prove hosted delivery. All 2,388 CMS tests, production build and final TypeScript checks pass. The final typecheck required removing stale generated dev types for the deleted fixture; no source checks were relaxed.

## Search and sitemap discovery — 30 October 2026

The site search and sitemap now load only eligible anonymous certification listings behind both rollout flags. Search matches titles, summaries and issuers and exposes a Certifications category. Client global settings can explicitly include/exclude that content type; existing saved category selections remain unchanged. Noindex and alternate-canonical entries are excluded, sitemap exclusion is respected independently of search, and global indexing policy is retained. Empty/withdrawn lists emit no certification sitemap entries. Enabled runtime errors are not silently converted into successful empty discovery.

Desktop/mobile fixture checks verify the settings checkbox, category filtering, summary/issuer matching and removal after exclusion. The fixture and dev server were removed/stopped. Shared source changes for the optional category were reconciled in five retained migration inventories, with prior/current dependency hashes recorded separately in `certification-discovery-dependency-review.json`; captured legacy content/assets are unchanged. All 2,391 CMS tests, production build and final TypeScript checks pass.

## Remaining delivery

1. Complete structured Word/Excel imports and downloadable templates.
2. Broaden integrated browser acceptance to ownership assignment, historical restoration and concurrent conflict resolution against hosted persistence.
3. Verify deployed visitor delivery, including evidence/rights changes after publication.
4. Approved anonymous projection, reusable display, namespace protection and applicable search/SEO integration.
5. Scheduling and translation integration using existing shared workflows where applicable.
6. Integrated local workflow verification, hosted verification and client acceptance.

This foundation does not complete the certification module or increase the fixed acceptance score.

## Certification import planning — 30 October 2026

Added strict v1 Word/Excel parsing and draft planning for Pages, Content, Evidence, Relationships and Media. Plain-text scalar fields retain exact claim text, certificate identifiers and ISO date strings. Field limits and editorial warnings are separate. Updates require a caller-scoped current revision and unchanged URL/language; omitted collections remain intact and replacement/clearing requires explicit intent. Plans perform no writes and cannot supply approval or owner attestations. A single error rejects the entire proposed batch (maximum 25 records/500 rows).

Verification: 93 targeted import parser/planner and existing Office parser regression tests pass; TypeScript passes. Actual ZIP-based Word/Excel fixtures produce equivalent drafts and preserve leading-zero identifiers. Tests cover formula/tracked-edit rejection, invalid dates, duplicate evidence, unknown fields, stale revisions and explicit replacement. This is a local planning foundation, not a completed client import flow.

Next: authenticated upload/review/apply with recoverable draft saves, client import panel and downloadable blank/filled templates. Hosted acceptance remains pending. Overall acceptance score remains 51/100; this substep does not close a full scorecard gate.

## Connected Office import workflow — 30 October 2026

The Certifications workspace now exposes file upload, full before/after comparison, private preview, explicit acknowledgment and draft save. The authenticated import API rebuilds proposed content from original Office bytes, reads update snapshots under the user's permissions and binds review digests to dependency revisions. Supporting evidence documents are typed references; their availability for draft editing does not attest their claims or grant publication approval.

Migrations 430–432 add scoped reference/media review, atomic draft batches, actor/site-bound receipts and cancellation fencing. Apply locks target/reference records and media, rechecks revisions and availability, preserves URL/language, and rejects caller-supplied approval fields. Client recovery stores only bounded request identifiers/digests/targets, uses Web Locks, and refreshes the workspace before removing a completed tracker. Manual unsaved edits and unresolved imports prevent conflicting work.

Verification: full CMS suite 2,414 passed, production build passed, offline migration plan passed. Real local database tests cover atomic rollback, stale revisions, revoked reference/media access, tenant/actor isolation, exact retries, cancelled delayed saves and HTTP lost-response recovery. Browser fixtures at 1280px and 390px cover real Office parsing/review/preview, lost save response, reload/receipt recovery, cancellation, dirty locks and no horizontal overflow/runtime errors. The observed Next.js portal was empty, with no error overlay. A generated dev type artifact was malformed after concurrent dev/build output; the stopped server's generated `.next/dev/types` was removed and TypeScript rechecked. No source check was weakened.

Remaining: downloadable certification Word/Excel templates and client instructions, then hosted migration and client acceptance. No hosted SQL was applied or public rollout enabled. Overall score remains 51/100 until a complete acceptance gate is verified.

## Downloadable templates — 30 October 2026

The import panel links blank certification-v1.xlsx and certification-v1.docx files. Both include field instructions, update/replacement semantics, document-reference guidance and draft-only publication boundaries. Excel uses text-formatted cells, dropdowns, frozen headings and field-specific character warnings. Word provides copyable record tables and limits. Corresponding filled fixtures preserve `000123`, ISO dates and multiline claims; both produce identical planned drafts. Blank templates correctly require content rather than creating example records.

Verification: 20 targeted certification import tests and TypeScript pass. All seven blank Word pages and every Excel input sheet were rendered and visually reviewed, including the over-limit warning. Native Microsoft Word/Excel editing trials and hosted/client acceptance remain separate checks. Builders derive field limits from the contract schema; sample-date and leading-zero literals are restored after spreadsheet export to prevent coercion.

Browser verification also passes at 1280px and 390px using the generated filled examples: both download URLs return the actual Office files, review/preview succeeds, lost responses recover without duplicate writes, cancellation and dirty-editor locks remain effective. One initial browser navigation timed out; a diagnostic rerun against the same live server passed both viewports without runtime errors.

## Scheduled publication and withdrawal — 30 October 2026

The certification workspace now reuses the shared schedule panel, keyed to actor/site/record/revision. It pins publication to the approved current revision and withdrawal to the currently published revision, accepts an explicit UTC offset, supports cancellation and disables scheduling during unsaved/conflicted/uncertain editing or without publish permission. No new database migration or parallel scheduler was added.

The real local database test runs the shared worker through claim-owner sign-off and trusted certification validation: scheduled publish and withdrawal succeed, revoked private PDF rights block scheduled publication, and restored evidence allows the approved revision to publish. Existing direct publication/withdrawal and anonymous privacy checks remain exercised. Seventeen scheduler regression tests and TypeScript pass. Desktop/mobile browser fixtures at 1280px/390px verify timezone conversion, exact current/published revision targets, cancellation, unsaved-edit locks and read-only controls; no overflow or runtime error overlay appears. Hosted scheduler execution remains unverified. Evidence: `/private/tmp/cms-certification-schedule-{db,tests,types,browser}.log`.

Next certification gap: source-linked translation drafts and independent review, retaining new claim ownership/evidence approval rather than copying approval authority. Multilingual public delivery and hosted/client acceptance remain separate requirements.

## Translation authoring and review — 30 October 2026

Certification records now use the shared translation creation/recovery, family navigation and saved-source comparison/review panels. Context keys bind actor, website, record and revision. Translation work locks competing edits/imports; unsaved or uncertain records cannot start review or navigation. Created translations are parsed against the strict certification contract and path identity before opening. The editor explains that translation review does not approve the claim.

Actual local database checks verify idempotent source-linked creation, unchanged draft content/route, cleared source canonical, independent review, source-change invalidation and outsider isolation. Creating a translation from the real approved certification evidence fixture creates no claim-owner assignments and no current claim approval for the translated record. Approval authority is never copied. No shared SQL or translation implementation was changed.

Verification: two certification database cases, 17 translation regression tests and TypeScript pass. Desktop/mobile fixtures at 1280/390 verify lost-create-response recovery without duplicate records, saved comparison and explicit review, dirty-state guards and source/translation navigation. Screenshot inspection confirms readable mobile comparison. Logs: `/private/tmp/cms-certification-translation-{db,tests,types,browser}.log`. Hosted translation acceptance and multilingual visitor delivery remain pending; English-only public delivery guards are retained.
