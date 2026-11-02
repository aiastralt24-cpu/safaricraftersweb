# Documents and downloads — implementation contract

Status: draft metadata, date-policy validation and the client metadata editor implemented locally. This document does not certify upload, download, publication or production readiness.

A document has a stable CMS record ID. Its saved CMS revisions retain metadata/file replacements; the original filename is not its identity. The payload holds title, description, type, language, regions, a human-readable version label, effective/expiry/review dates, expiry policy, download label, public/authenticated access intent, PDF asset identity and download filename, and product/category references. Owner and approval remain on the CMS record and workflow; payload fields cannot assign either. Product/category references require their own authorization and existence checks before document publication is enabled.

The initial file contract is PDF. A UUID asset reference or `.pdf` filename does not establish file content, successful processing, rights, publication or access. Upload processing must verify those separately; no document file is made available by this model.

## Date rules

Calendar dates are inclusive UTC days. A document expiring on 23 October remains within its date window until 00:00 UTC on 24 October. Effective dates in the future prevent date eligibility. An overdue review creates a warning independently of expiry.

| Expired document policy | New publication date eligibility | Continued delivery date eligibility |
|---|---|---|
| warn | Allowed with warning | Allowed |
| blockPublication | Blocked | Allowed |
| removeAvailability | Blocked | Blocked |

These flags only evaluate dates. Real publication requires valid content, fresh trusted validation, approval, current file evidence, correct relationships and permission. Real delivery requires a published revision, appropriate date policy, file checks and server-side access authorization.

## Remaining acceptance work

- Complete the document library with processed-file selection and ownership controls. The metadata editor already supports create/update, loaded-list search, date warnings, unsaved-change confirmation and recent revision restore; current/published revisions are labelled.
- Private PDF reservation, bounded transfer, scanning, processing, immutable derivatives and recoverable worker jobs.
- Revision-bound PDF preview and stable download routes; prevent direct storage bypass for gated/withdrawn files.
- Typed product/category references, usage impact and pinned document revision checks in download sections.
- Trusted publication validation, publish-time rechecks, future/expired delivery behavior and withdrawal.
- Original-file replacement preserves history; a restored revision still needs review and current eligibility.
- Client-visible expiry/review reporting and permitted download measurement.
- Real-provider verification, representative files, access tests, migration and client acceptance.

Local tests cover strict metadata, filename/path rejection, immutable asset identity across filename changes, calendar validity, UTC boundary behavior, distinct expiry policies, review warnings, API identity checks and the explicit publication gate. They do not prove any remaining acceptance item.

## Metadata editor verification — 2026-10-23

The Documents navigation entry opens the metadata workspace. Playwright checks at 1280px and 390px used simulated content API responses to exercise create, invalid date rejection, save, multiline regions, cancelling discard, a second edit and restore as a new draft. Both had no browser errors or horizontal overflow. The mobile screenshot was inspected. The temporary QA route was removed. Five document schema/API contract tests pass. These checks do not establish managed-database persistence, PDF processing or production readiness.

## Private PDF reservation and transfer — 2026-10-23

Local migrations 137–138 add caller/site-scoped PDF reservations and separate private `cms-document-originals` / `cms-document-media` buckets. Reservation retries retain the original ID and reject changed metadata; cancelled/expired attempts remain recoverable. The shared ten-active-upload quota includes images, videos and PDFs. Only the uploader with current document-create permission can insert into the exact unexpired reservation path. Restrictive policies prevent browser reads, updates, deletes and writes to processed storage even when unrelated permissive storage policies exist. Existing image/video workers and buckets do not accept PDF reservations.

`POST /api/cms/document-uploads` supports reserve, list, status and cancel. `POST /api/cms/document-uploads/transfer` accepts bounded bytes for the caller-authorized reservation, spools to a private temporary file, streams to immutable private storage and removes the temporary file. A successful transfer reports only `awaiting_verification`; it does not claim that the content is a valid or safe PDF. Authentication, same-origin writes, exact MIME/size/site/upload identity, interruption, storage errors and unknown acknowledgements are checked.

`CMS_DOCUMENT_UPLOADS_ENABLED` defaults to false and is false in `.env.example`. Keep it disabled until trusted reception, malware inspection, PDF parsing/processing, durable worker recovery and real-provider verification are implemented. Status/list/cancellation remain available when new reservations are disabled. No remote migration was applied, no local secret configuration changed, and no upload controls were enabled in the client editor.

## Trusted reception — 2026-10-23

Migration 139 provides service-role-only discovery of live PDF reservations whose original object exists, and a site/upload-bound reservation descriptor. `createDocumentReceptionAdapter` streams the private original with an exact byte limit, derives SHA-256 from the stored bytes and calls the existing locked confirmation transaction. It never accepts checksum, size or path authority from a storage event. `receiveDocuments` processes a bounded, unique batch sequentially and reports unknown acknowledgements for later recovery. A confirmed upload leaves reception discovery and enters `uploaded`; it does not create a media object or inspection result.

Local verification covers a real PGlite reservation/storage-policy/confirmation flow with simulated storage HTTP bytes, including a response lost after database confirmation. Recovery returns `not_reserved` and does not repeat confirmation. Additional tests cover foreign descriptors, truncated/oversized reads, invalid batches, provider failures and private service credential routing. This is not a real-provider test or a PDF-validity test. Worker scheduling and the PDF inspection/processing stage remain pending.

## PDF structure inspection — 2026-10-23

`lib/cms/document-inspection.ts` runs `scripts/cms/pdf/pdf_structure.py` in an isolated-mode Python subprocess with fixed arguments, a minimal environment, bounded output and a 45-second deadline. The subprocess sets CPU/file-size limits and, on Linux, a 1 GiB address-space limit. Deployment must additionally isolate this worker from application secrets and network access; these process limits alone are not a sandbox.

The worker checks PDF header/type/size, requires a clean malware verdict before parsing, uses strict pypdf parsing, inspects the reachable graph and cross-reference objects (including unreachable actions), then rewrites and reparses a private derivative. Current limits: 25 MB input/output, 300 pages, 50,000 cross-reference entries, 100,000 traversed nodes, depth 100, 25 MB per decoded stream and 100 MB total decoded streams. Page boxes must be finite, positive and at most 14,400 points; custom user-unit scaling is rejected. Encryption, forms, signatures, attachments, external streams, scripts, launch/remote actions and unsupported interactive media are rejected. HTTP(S), mail and telephone URI links and internal destinations can remain. Source metadata and text are retained; this is not a metadata-redaction tool. Both source and derivative must pass malware scanning. No successful inspection alone authorizes publication or download.

Runtime configuration uses absolute `CMS_PDF_PYTHON_PATH` and `CMS_PDF_SCRIPT_PATH`, an exact `CMS_PDF_PARSER_VERSION`, and optional absolute `CMS_PDF_TEMP_ROOT`. Local integration used bundled pypdf 6.10.0. This records test evidence, not a production dependency recommendation: select a maintained version, review its advisories, pin it and rerun the inspection/representative-document suite before deployment. Version mismatch rejects the result.

Tests include real PDF parsing/rewrite/text extraction, active and unreachable content rejection, malformed/encrypted files, unsafe links, source/derivative scanner gates, parser-version mismatch and temporary-file cleanup. Scanner verdicts are simulated. Production scanner verification, rendering/fidelity with representative client PDFs, signed-document support decisions, durable processing/completion, and deployment remain pending. The original private file is never replaced by this parser.

Parser API reference: [pypdf PdfReader documentation](https://pypdf.readthedocs.io/en/stable/modules/PdfReader.html). Its strict parsing behavior informs this implementation; strict parsing does not itself establish security or visual fidelity.

## Durable PDF processing — 2026-10-23

Migration 140 adds `cms.document_files`, separate from image/video media. Immutable file identity, both checksums, byte/page counts, parser/inspection versions and private delivery key are recorded atomically with upload completion. Rights start pending. Browser roles have no direct table access; existing image/video public readers cannot serve these files.

`claim_document_upload` fences concurrent workers using a five-minute lease and fresh token. Expired leases can be reclaimed; stale tokens cannot complete. Processing failures share the existing bounded three-attempt mechanism. `list_document_work` discovers only PDF jobs awaiting processing/retry or with expired leases. `processDocumentUpload` verifies the received checksum, runs actual PDF/scanner inspection, stores an immutable derivative with checksum readback and only then records completion. Unknown completion acknowledgements never generate competing failure writes. `dispatchDocuments` handles a bounded batch sequentially. `createDocumentStorageAdapter` uses private document buckets and service-only RPCs, with bounded reads and no overwrite on retry. Reception is a separate preceding step using `receiveDocuments`.

Local tests include the real parser plus PGlite claim/completion, a lost completion acknowledgement, stale lease rejection, invalid completion receipts, retry exhaustion, pending rights and isolation from image/public delivery. Storage HTTP and malware results remain simulated. Repeated inspection of the same fixture produces the same derivative hash; broader representative-file determinism/fidelity still needs validation. No durable-job scheduler or remote worker has been deployed, and uploads remain disabled.

## File catalogue and rights administration — 2026-10-23

Migration 141 adds a revision counter and caller-scoped processed-PDF catalogue. `get_document_file` and `list_document_files` return bounded metadata without storage keys/checksums; filename search and UUID pagination are supported. Rights evidence is visible only to users with document configure permission. Eligibility requires matching completed processing evidence, approved unexpired rights and no archive. It is only file eligibility, not document publication or download authorization.

`set_document_file_rights` locks the file, requires configure permission and the expected revision, validates evidence/expiry for approval, increments revision and records an audit event without license evidence in the audit payload. `POST /api/cms/document-files` validates request and response schemas for list/get/rights, rejects mixed/private provider fields, and requires reload when a mutation response cannot be confirmed. Ordinary editor access cannot approve rights. Client selection and rights forms have not yet been connected.

## Client file picker and rights controls — 2026-10-23

The Documents editor now embeds a processed-PDF catalogue with filename search, pagination, file details and selection. Selection reloads current file eligibility before changing the draft. The download filename remains editable separately from immutable asset identity. Configure-authorized users can edit rights status, evidence and UTC expiry; ordinary editors do not receive these controls. Rights changes are saved immediately against the file revision and affect all references; they do not publish a document. Unsaved rights changes contribute to the parent navigation guard and block document save/restore until resolved. Starting another new document remounts the picker so discarded rights edits do not carry over.

Playwright checks at 1280px and 390px used simulated catalogue responses and exercised approval/evidence validation, UTC expiry serialization, an eligibility change immediately before selection, selection into the draft, cancelled/accepted discard and restricted controls. No browser errors or horizontal overflow; mobile screenshot inspected. A React development-effect loading issue was fixed. Browser plugin unavailable; regular Playwright was used. The temporary QA route was removed. These checks do not verify live provider uploads or remote database persistence.

## Revision-bound private preview backend — 2026-10-23

Migration 142 adds a saved-revision/file binding lookup and restricted storage read policy. A caller must have document view permission for the referenced record; the requested revision must belong to that record and select the exact processed PDF. Historical saved revisions can be reviewed even when the current draft selects another file. Pending rights can be inspected by authorized CMS reviewers, but revoked/expired rights and archived files block preview. Processing receipts and original checksum must still match. Original storage never becomes readable. Public/site visitors have no CMS permission and gain no access.

At the storage layer, an authenticated CMS member may read a processed PDF only when it is referenced by at least one saved document revision they may view. The preview HTTP endpoint further binds the exact requested record/revision. This deliberately supports staff review, not public or gated visitor downloads. No service key is used in the preview route; caller credentials continue through storage RLS.

`GET /api/cms/document-preview` requires site, record, revision and asset UUIDs plus caller authorization. It validates identity and storage location, bounds and hashes the PDF response, then rechecks the revision/access descriptor before releasing bytes. Responses are private/no-store, PDF-only, nosniff and sandboxed, with a fixed safe filename. Corrupt, oversized or mismatched files and revoked access fail without returning PDF content. Client preview controls, browser PDF rendering/fidelity and managed-provider verification remain pending.

## Client saved-revision preview control — 2026-10-23

Saved documents with a selected file now show a PDF preview panel. Loading uses the current session bearer token and the site/record/revision/asset identity. The validated PDF response becomes a temporary browser object URL; opening it uses a new tab with no opener/referrer. There are no credentials in the preview link. The control rejects unexpected MIME or size, reports load errors, supports cancellation/reload/close, ignores late results and revokes its object URL on identity changes, disabled/dirty state or unmount. Session/site changes unmount the surrounding workspace. Already opened or downloaded PDFs are ordinary local browser copies; URL cleanup cannot recall them.

Playwright at 1280px and 390px verified actual PDF rendering using a generated fixture in full Chromium's built-in viewer, temporary-URL revocation, unsaved-change disabling, revision-change cancellation, rejection of a non-PDF response and subsequent reload. The fixture intercepted preview HTTP responses; this was not a managed-provider test. No browser errors or horizontal overflow were observed, and desktop PDF/mobile panel screenshots were inspected. The temporary QA route was removed. Preview currently covers the loaded saved draft; separate history-row preview controls and representative-client-PDF fidelity testing remain pending.

## File usage and pinned download references — 2026-10-23

Migration 143 adds usage lookup across direct document file bindings and composition download items pinned to a document record/revision. A pin must match both the document identity and its saved revision; borrowing a revision from another document is not a match. Hidden download sections still count as saved dependencies. Results distinguish current draft, published version and earlier revision, preserve UUID pagination, and return only records the caller can view. They contain no revision payloads or license evidence. This currently covers these supported binding shapes; other future module/reference shapes must be added when implemented.

The file picker includes Show/Refresh file usage and pagination, with explicit account-visible/unsaved-selection scope. Usage is informational; it is not permission to archive or publish a dependency. Tests cover direct/historical bindings, hidden pinned sections, mismatched pins, site/record permissions and response validation. Published-state projection uses an isolated synthetic pointer fixture; it does not bypass document publication requirements in production. Browser tests at 1280px/390px used simulated usage responses and passed loaded/empty/refresh states without errors or horizontal overflow. Mobile screenshot inspected; temporary QA route removed.

## Archive dependency safeguards — 2026-10-23

Migration 144 adds revision-checked archive/restore with document-delete permission. Archiving checks current drafts, published revisions and active preview sessions across the website, including correctly pinned download sections. This check is not filtered by the caller's visibility: hidden dependencies still block archiving without disclosing their contents. Historical-only references remain preserved, but archived PDFs cannot be previewed or selected into a new saved revision until restored.

Reference admission locks matching document files in UUID order and rejects archived files. Triggers cover new revisions (including restores), preview creation and published-pointer changes; archive holds the file lock while checking usage. These locks are intended to serialize admission and archive operations under the application's normal READ COMMITTED transactions. True multi-connection PostgreSQL concurrency verification remains a deployment test; PGlite lifecycle tests do not prove that behavior under every isolation level.

The private document-files API now accepts archive/restore commands, checks expected revisions and validates returned revisions, including unchanged-state retries. Audit events record state changes. Client archive controls remain pending. SQL tests cover permissions, current/pinned dependencies invisible to the caller, active previews, archive/restore idempotency, stale revisions, draft/restore/preview admission rejection and audit history. No existing file bytes or saved revision history are deleted.

## Client archive/restore controls — 2026-10-23

Migration 145 exposes the caller's archive capability in catalogue metadata. The shared schema defaults a missing capability to false for staged compatibility. The file picker shows archive/restore only to authorized users and disables archiving the file currently selected in the local draft. Changes require a confirmation, use the expected file revision, reload server state and verify the resulting archive state before announcing success. Dependency errors are shown without optimistic state changes. A general Refresh file details control supports recovery even when rights-management permission is absent. Restoring does not approve rights or make an otherwise ineligible file selectable.

Playwright at 1280px/390px exercised confirmation cancellation, dependency rejection, archive, restore with pending rights, and capability removal after refresh. Simulated API responses were used; no remote file was archived. No browser errors or horizontal overflow; mobile screenshot inspected and temporary QA route removed.

## Trusted validation evidence — 2026-10-23

Migration 146 adds a service-only document validation descriptor, included in the existing trusted validation input. It binds the saved document revision to its selected file and reports processing receipt consistency, file revision, rights approval/expiry and archive state. Product references must resolve to same-site product records in the document language. Product publication is not required for this association, avoiding a circular dependency between product and document publishing. The descriptor excludes storage keys and private license evidence.

The validator checks evidence identity and completeness before reporting file/product findings. Missing evidence never implies eligibility. Malformed legacy metadata remains transportable so the content validator can report field errors; product evidence is bounded to 100 entries. Category associations explicitly remain unsupported until the category module exists. Date checks and the unconditional document-publication gate remain in place.

This is validation infrastructure, not enabled document publishing: there is still no deployment-owned document validator policy, so recording a document validation receipt through the worker remains unavailable. Public/authenticated delivery, publication-time rechecks and client validation workflow must be completed before activation. Local SQL tests verify service-only access, site/revision scope, current rights expiry, private-data exclusion, product lookup and malformed legacy payload handling. Validator tests cover missing/mismatched evidence and file/product failure states.

## Persisted draft findings — 2026-10-23

Migration 147 supersedes the missing-policy limitation above. It registers `document-draft-1` for queued draft checks and adds a database constraint prohibiting successful receipts from that diagnostic validator. The queue can therefore finish normally with saved invalid findings, instead of failing on unsupported policy or retrying a receipt that cannot be stored. The existing revision, permission, lease and receipt-expiry rules apply. Publication remains blocked, including after independent editorial approval.

The database integration test runs the real queue consumer against SQL, reads findings as the editor, verifies outsider denial, verifies the job completed in one attempt, attempts publication after approval and rejects a forged successful draft receipt without replacing the stored findings. Client document validation controls and deployment of the worker/migrations are still pending. A future publication-capable validator needs a new version and full delivery/publication checks; the diagnostic version must never be made publishable.

## Client document checks — 2026-10-23

The Documents workspace now uses the shared Content checks panel for saved records, including records needing metadata migration. Clients can inspect advisory findings and saved trusted findings, and users with edit/submit/approve/publish capability can request a queued trusted check. Missing capability fields default to denied. Read-only users can inspect available results but cannot request work. Document or file-rights edits disable checks until saved/discarded. The panel is keyed by site, record and revision so results cannot carry across different saved drafts. The workspace explicitly states that document publication is not yet available.

Playwright at 1280px and 390px exercised request acknowledgement, advisory and trusted findings, unsaved-edit disabling and refreshed read-only permissions. The Browser plugin was unavailable; regular Playwright used simulated API responses through a temporary QA route. Corrected a catalogue fixture response during screenshot review; the final run had no application console errors, displayed errors or horizontal overflow. Mobile screenshot inspected. The temporary QA route was removed. These checks do not demonstrate a deployed worker or managed-provider persistence; those remain deployment requirements.

## Visitor download eligibility — 2026-10-23

Migration 148 adds `get_document_download(site, record)`, an authorization descriptor for a future server-mediated download. Stable record identity resolves only to the current published revision; newer drafts and historical revision IDs do not select visitor content. Eligibility requires a successful `document-1` receipt and matching deployment policy. That publication-capable policy is not yet activated, so the current draft-only system returns no eligible downloads.

For an eligible published revision, the function rechecks completed PDF processing/checksums, approved current rights, archive status, record language, supported access/expiry policies and inclusive UTC effective/expiry dates. `removeAvailability` withdraws expired files; `warn` and `blockPublication` retain previously published downloads and report expiry. The receipt's admission-time expiry does not itself withdraw published content. Revoking the receipt or changing validator policy does. Authenticated access requires the verified caller's identity to exist in `auth.users`; this level means any signed-in user, not a product/customer entitlement. Finer access tiers would need an explicit model.

The descriptor contains the private file locator/checksum for server transfer but no license evidence or signed storage capability. Storage policies are unchanged: visitor direct reads remain denied. The HTTP download route, transfer-time authorization recheck, publication guard and production deployment remain pending. SQL tests use explicitly synthetic release evidence to isolate eligibility; they do not prove a document publishing flow. Coverage includes anonymous/signed-in access, missing users, wrong site, date boundaries and malformed dates, expiry policies, rights/archive/checksum changes, receipt withdrawal, private storage denial, unpublished replacements and unpublishing.

## Server-mediated download endpoint — 2026-10-23

`GET /api/documents/download?record=<uuid>` now connects eligibility to bounded, verified PDF transfer. Website identity comes from server configuration, not URL input. The endpoint accepts exactly one record parameter; filenames, storage locations and revision IDs cannot be selected by the visitor. Anonymous requests use the anonymous authorization context; signed-in callers supply a bearer token, which is passed to the eligibility RPC without privilege elevation. Cookies and URL tokens are not authentication for this endpoint. The eventual authenticated download UI must attach the visitor token.

Only the storage read uses the server service credential, after validating the authorized descriptor and fixed website/file path. The response must be PDF, match the declared size (maximum 25 MB) and SHA-256, and pass a second eligibility check after transfer before any bytes are released. Revocation, unpublishing or replacement during transfer therefore prevents delivery. Responses are attachments with a safely encoded UTF-8 filename, private/no-store, nosniff, same-origin resource policy and sandbox headers. No signed storage URL, credential or private license data reaches the response. No analytics event is emitted; consent-based download measurement remains pending.

`CMS_DOCUMENT_DOWNLOADS_ENABLED` defaults to false in the example configuration. Missing/invalid configuration leaves delivery unavailable. No live flags or credentials were changed. Unit/HTTP tests cover public/authenticated identity propagation, duplicate/untrusted URL input, corrupt and oversized transfers, identity/path mismatches, safe headers, credential separation and changed authorization. Real-provider transfer, authenticated visitor UI and the publication-capable validator/guard remain pending.

## Publication-time dependency recheck — 2026-10-23

Migration 149 adds a document publication-pointer trigger. In addition to the existing publish procedure's approval/current-receipt requirements, publication checks current PDF processing, approved unexpired rights, archive state, locale, access/date policy and same-site typed product references. Unsupported category associations, duplicate/missing products and malformed/future/blocked expiry dates are rejected. File/upload rows and product rows are locked for the publication transaction; multi-session managed PostgreSQL concurrency testing remains required. A warning-only expired document can publish; other expiry policies block new publication.

The existing recursive image-media trigger now excludes only the document's top-level `file` field, which the PDF-specific trigger verifies. It still checks any other nested assets and keeps existing behavior for all other content types. This fixes the generic image checker incorrectly rejecting a verified PDF as an unknown image. The gateway supplies a safe, actionable message for document eligibility changes.

The integration test exercises the real approve/publish procedure with explicitly synthetic `document-1` validation evidence. It changes rights/archive/product locale after validation and proves publication is rejected without changing the pointer; it also covers date/category/product failures and successful eligible/warning-only publication followed by download eligibility. This is not yet a real validator-to-publication flow: publication-capable validation and policy activation remain pending, as do client review/release controls and deployment.

## Publication-capable validation and lifecycle — 2026-10-23

The document validator now emits `document-1` and passes only when schema, identity, dates, selected PDF and trusted product/file evidence have no errors. Missing service evidence still fails, so browser advisory checks cannot grant publication. Unsupported categories remain explicit blockers. Migration 150 activates this validator version; the prior diagnostic receipts do not qualify. The legacy constraint prohibiting successful `document-draft-1` receipts remains intact. Deploy the new worker code and dependency-check migrations through 149 before activating migration 150; keep visitor downloads disabled until deployment acceptance checks pass.

A new local integration test uses the real trusted validation worker and SQL receipt, review, publish, restore and unpublish procedures. It rejects self-approval and publication without validation, then verifies the public download HTTP handler against real SQL authorization. An unpublished replacement leaves the old download intact. Publishing authenticated access rejects anonymous downloads and allows a signed-in caller. Restoring an earlier revision creates a new draft and requires fresh validation/independent approval before publication; unpublishing then denies download. Only processed PDF bytes/storage transfer and their processing receipt are fixtures in this test; actual parser/scanner integration is covered separately. This does not verify a managed production provider.

Client document review/release controls, authenticated visitor download UI, consent-based measurement, production setup/UAT and full PRD completion remain pending. No production data, migrations or rollout flags have changed.

## Client review and publication controls — 2026-10-23

The Documents workspace now includes revision-scoped submit, approve and request-changes controls, plus explicit publish/withdraw confirmations. Capability flags determine available actions, missing flags default to denied, and unsaved metadata/rights edits disable workflow changes. Confirmation state clears when revision, permission, review or dirty state changes. The server still enforces independent approval and current trusted validation; UI approval never bypasses those checks.

Each successful mutation reloads the document and verifies the resulting review/publication state before reporting success. Unexpected or conflicting results require checking the current record. Errors do not optimistically alter publication state. Withdrawal targets the published revision and retains saved drafts/history. The interface explains that visitor downloads depend on enabled delivery.

Desktop/mobile Playwright checks at 1280px/390px exercised submission, requested changes, resubmission, approval, cancelled confirmation, dirty-state cancellation, rejected publication, publish, withdrawal and permission removal. API responses were simulated; the prior database lifecycle test covers real SQL authorization. No browser runtime errors or horizontal overflow were observed, the mobile screenshot was inspected and the temporary QA route was removed. Browser plugin unavailable; regular Playwright used. Authenticated visitor UI, measurement, production deployment and client acceptance remain pending.

## Visitor document page — 2026-10-23

`/documents/<record UUID>` provides a public download button and optional visitor sign-in for restricted documents. Published records in the CMS now link to this page. The page is dynamic, marked noindex, and unavailable when document downloads are disabled. It exposes only the anonymous provider configuration, never the storage service credential. The page does not reveal document metadata before download authorization.

Visitor authentication uses a separate in-memory Supabase session (`safari-document-visitor`), not the persisted CMS session. Users must already have an account; signup, password recovery and visitor account provisioning are not implemented by this page. The download request sends a bearer token when signed in, omits cookies and uses the existing server-authorized endpoint. The client bounds reads to 25 MB, rejects non-PDF/incomplete responses, supports cancellation and ignores results after leaving the page. A temporary object URL starts the browser download and is revoked afterward. Server-provided filenames are decoded and checked before use. No download analytics are emitted without consent support.

Playwright at 1280px/390px exercised actual browser download events and filenames, anonymous rejection for restricted content, failed/successful sign-in, bearer propagation, non-PDF rejection and sign-out. The test verified neither visitor nor CMS tokens were persisted in local storage. Auth/storage responses were simulated; these are not managed-provider login or transfer tests. No runtime errors or horizontal overflow; mobile screenshot inspected and temporary QA route removed. Published page-composition download sections, consent-based measurement, visitor account operations and production acceptance remain pending.

## Client PDF upload controls — 2026-10-23

The CMS upload area now includes PDF documents alongside images and videos. Clients can select a PDF up to 25 MB, reserve/transfer it privately, inspect recent processing statuses and cancel unused reservations. Filename/size validation precedes reservation. Response identity and filename/size checks prevent transferring against a mismatched reservation. Duplicate status identities are rejected. Processing still requires the reception/inspection workers and does not approve rights or publish content.

A lost transfer acknowledgement disables retry until the client checks the reservation status. If still reserved, retry keeps the same reservation and request identity; already progressed uploads do not resend. Immutable storage remains authoritative. Disabling new uploads does not disable status recovery/cancellation. Ready files direct users to rights review and selection in the Documents file picker. Navigation is locked during upload operations; controls do not change rollout flags.

Desktop/mobile Playwright at 1280px/390px covered invalid extension, reservation and transfer, lost acknowledgement, status recovery, retry without another reservation, ready status and cancellation while new uploads are disabled. Responses were simulated; managed-provider transfer/worker operation is still unverified. No runtime errors or overflow; mobile screenshot inspected. Temporary QA route removed. Full client acceptance and production setup remain pending.

## Document rollback title fidelity — 2026-10-23

Migration 151 corrects a restore mismatch: document payloads previously reverted while the record's list title stayed at the newer value. A valid historical document title now becomes the restored draft's list title. Existing expedition/specialist behavior is preserved. Malformed or overlong historical titles retain the usable current list label without rewriting the saved payload; those documents still require metadata migration in the editor.

The SQL test verifies new revision identity, restored title/content, draft/unapproved state, immutable newer history, stale-revision rejection and malformed legacy-title preservation. Existing document lifecycle coverage separately verifies that restoration leaves visitor publication unchanged until new validation, independent approval and publication. No production data was changed.

## Version-specific download links — 2026-10-23

Download URLs now optionally carry a `revision` UUID from a reviewed page-section reference. The visitor page preserves it in the API request. The endpoint compares it to the authorized currently published revision before reading storage; a different published version returns 409 with an explicit replacement message, without serving another PDF. Invalid/duplicate revision parameters are rejected. Unversioned links still resolve to the current publication. Historical files remain in CMS history but are not made visitor-accessible by a pin. `documentDownloadHref` centralizes UUID-validated stable/version-specific URL construction for section integration.

Endpoint tests verify matching pins, replacement rejection before storage and malformed/duplicate inputs. Desktop/mobile browser tests verify revision forwarding, a visible replacement notice with no download, and a successful matching-version download. Responses were simulated; no live document was replaced. Mobile screenshot inspected without runtime errors/overflow; temporary QA route removed. The actual page-section editor, reference validation and rendering integration remain pending.

## Download-section authoring and draft preview — 2026-10-23

The page composer can add a Downloads section with an editable heading and ordered, labeled document links. The picker lists caller-visible documents, distinguishes draft-only records, and reloads the selected record before pinning its published revision. Explicitly updating a selected version preserves its label and position; withdrawal during selection fails without changing the saved pin. Empty sections remain incomplete drafts. The draft layout preview renders version-specific visitor links; availability/sign-in is enforced by the download endpoint.

Migration 152 fixes a dependency traversal gap discovered during integration: current page payloads store download sections under `composition.sections`, while the earlier usage/archive helpers inspected only top-level `sections`. Both envelopes are now supported. Usage reporting and archive/reference admission follow correctly pinned nested references, including hidden sections. Legacy top-level coverage remains, and the archive lifecycle test now uses the actual nested composer envelope.

Desktop/mobile Playwright at 1280px/390px verified adding the section, published-only selection, label editing, pinned preview links, withdrawal during selection, explicit revision update without duplicate items, and removal. API responses were simulated; mobile screenshot inspected with no runtime errors/overflow and temporary QA route removed. This enables authoring and draft preview only: live page projection/rendering and publication-time download dependency validation remain pending, alongside production setup and the broader PRD.

## Publication guard for pinned downloads — 2026-10-23

Migration 153 separates internal published-document eligibility from visitor authorization. The internal descriptor remains inaccessible to browser roles; the public download wrapper retains the existing signed-in-user check for restricted documents. This lets a publication transaction verify a gated resource without granting a visitor access to it.

A new publication-pointer trigger checks every supported download reference, including hidden sections and legacy/current payload envelopes. It requires a same-site document in the page language, the exact currently published revision, successful current-policy publication evidence and presently eligible PDF rights/processing/dates. Referenced document and file/upload rows are locked through publication; managed PostgreSQL concurrent-session verification remains pending. A safe editor error asks the client to refresh the version and review PDF eligibility. Later replacement or withdrawal still causes the version-specific download endpoint to deny an obsolete link rather than substitute content.

The document lifecycle integration test now also isolates page-reference admission with synthetic page validation receipts: revoked PDF rights block a hidden linked section, corrected rights permit publication, a replaced pin blocks publication, and a valid gated reference permits page publication without allowing anonymous downloads. Anonymous direct access to the internal descriptor is denied. Linked document validation/publication remains real in this test; synthetic page receipts do not demonstrate live download-section rendering or complete page validation. Trusted-worker section findings, page projection/rendering and production acceptance remain pending.

## Trusted download-section findings — 2026-10-23

Migration 154 adds service-only reference evidence to trusted page/homepage validation inputs. Each unique record/revision pair reports current published eligibility in the page language, without exposing file locators, checksums or license evidence. The validator binds the returned evidence to the exact selected pair set, rejects missing/mismatched/duplicate evidence and produces field-specific findings for every unavailable occurrence, including repeated references and hidden sections. Malformed composition metadata continues to produce schema findings; bounded evidence extraction does not cast arbitrary stored IDs to UUIDs.

The shared validation panel already displays these worker findings. Browser advisory validation lacks privileged evidence and asks for a trusted check instead of implying eligibility. Unit tests cover evidence identity/completeness and per-occurrence fields; database lifecycle assertions verify denied editor access, current rights changes, replaced pins and valid authenticated documents. Live page projection/rendering remains gated and unfinished. No publication policy version was changed by this milestone.

## About-page download delivery — 2026-10-23

The existing About projection now supports the Downloads section, retaining its schedule, audience, heading and layout rules. A shared `CmsDocumentDownloads` renderer outputs labeled version-specific visitor links; About uses it within its established section layout. Document metadata, file locators and access credentials are not embedded in the page. Download authorization still occurs at the visitor endpoint.

Unit coverage verifies projection and trusted reference requirements. The document lifecycle test now creates an actual supported About composition, obtains a real trusted validation receipt, independently approves/publishes it and reads/projects it through the anonymous public-page RPC. This About branch does not use synthetic page receipts. Older isolated guard tests remain explicitly synthetic for unsupported-page cases.

Desktop/mobile Playwright at 1280px/390px rendered the actual About component using a local fixture and checked H1/H2 structure, the pinned link, keyboard focus and overflow/runtime errors. An unsupported background value in the initial test fixture was corrected before the passing run; mobile screenshot inspected and temporary QA route removed. This completes delivery integration for About only. Other approved page templates, production rollout/provider verification and the broader PRD still require work. Live flags remain unchanged.

## Legal-page download delivery — 2026-10-23

Privacy, Terms and Cookies projections now accept Downloads sections alongside text and use the shared document-link renderer. Their existing schedule, single-H1, no-animation, language/region and text-link rules remain enforced. Download headings and labels must contain visible text. Trusted document-reference evidence is still required before publication; rendering does not bypass file or visitor access checks.

All three legal paths are exercised through real trusted validation, independent review, publication and anonymous public-page projection in the document lifecycle test. Projection tests cover missing evidence and invalid download labels, duplicate H1, animation and region targeting. Desktop/mobile Playwright checks use the actual shared legal renderer with a local Privacy fixture; they verified heading hierarchy, pinned URL, keyboard focus and no runtime errors/overflow. The same renderer serves all three legal paths. Mobile screenshot inspected; temporary QA route removed. Other page-template integrations and production rollout remain pending; live flags are unchanged.

## Directory-page download delivery — 2026-10-23

The expedition and specialist directory page projections accept Downloads sections and render the shared version-specific visitor links inside their existing layouts. Download headings render once; existing directory cardinality, H1, audience and scheduling rules remain. The shared schema now rejects whitespace-only download titles and labels.

Both routes have real trusted-validation, independent-review, publication and anonymous-projection coverage in the document lifecycle test. Unit tests reject missing trusted reference evidence, missing directories, duplicate H1 and blank labels. Desktop/mobile fixture rendering passed at 1280px/390px for both components, including pinned links and keyboard focus; screenshots inspected and temporary route removed. All 953 CMS tests, TypeScript and production build passed. Other templates and managed production delivery remain pending.

## Homepage download delivery — 2026-10-23

Homepage's supported section list and renderer now include Downloads, using the shared revision-specific links. The projection continues to require one hero H1 across schedule boundaries. Tests cover the new optional section, pin retention, scheduled visibility, duplicate H1, region restrictions and blank labels. Existing homepage migration still produces its original ten families; no content migration is performed by this change.

All 954 CMS tests and production build passed. Desktop/mobile browser fixtures verified the actual homepage component with the route's concept styles and simulated media responses. Screenshot inspection corrected a fixture missing those styles before the final passing run. Private file authorization remains at the download endpoint; managed provider/deployment and a dedicated homepage-document publication lifecycle remain pending.

## Homepage public database projection — 2026-10-23

The real homepage/document publication lifecycle exposed an additional delivery requirement after the renderer milestone: the public SQL allowlist also needs the download family. Migration 155 replaces the homepage RPC with the same existing visibility, media, policy and field-filtering behavior plus the narrow download presentation selector (title; item id/label; document recordId; versionId). It exposes no file metadata or credentials. Migration is local and has not been applied to a managed provider.

The document lifecycle now creates a homepage with normalized controls, obtains its real homepage-1 validation receipt, independently approves it, confirms revoked PDF rights block publication despite that receipt, restores fixture rights, publishes, reads anonymously and projects the exact pinned download. Header/navigation/media are explicit fixture setup; their production migration is not implied. The test transaction rolls back all fixture changes. All 199 database tests passed with the real PDF parser enabled and zero skips. This supersedes the previous milestone's pending dedicated homepage-document lifecycle check; managed deployment remains pending.
