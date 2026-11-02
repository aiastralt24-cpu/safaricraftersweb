# Careers CMS

Status (30 October 2026): draft authoring, trusted validation, guarded publication, English visitor pages/discovery, job-bound forms with in-tab recovery, and applicant detail/search are locally implemented. Migration 383 permits supported CMS-form publication after rechecking the locked form. Notification-enabled forms are now integrated locally through migration 401, with deployment-bound readiness, guarded job publication/public reads and durable outage recovery. Scheduled publication/withdrawal is now connected to the shared revision-pinned scheduler and locally verified. Career Office imports are now connected through generated templates, guarded draft apply/recovery and the client review screen. CV uploads, translation and hosted/native Office/client acceptance remain pending. The sections below retain chronological implementation evidence; earlier fences and pending lists are superseded by this status and the latest integration section.

## Implemented

- Versioned job details: title/slug, summary, organization, department, reference code, employment type, rich content, image and SEO.
- On-site/hybrid location references and explicit geographic eligibility for remote/hybrid roles.
- Open/paused/closed status, explanatory status note, posting date and optional opening/closing instants with explicit time-zone offsets. Opening is inclusive; closing is exclusive.
- Optional compensation with currency, period and bounded ordered salary range.
- Application destinations: none, strict HTTPS external link or a referenced CMS form. Internal notes remain separate from public content.
- Editorial findings distinguish incomplete drafts from publishable content. The application-state helper is presentation logic; it does not authorize submissions or establish current referenced-form eligibility.
- Authenticated `/api/cms/careers` draft saves and library queries, current-revision guards, recoverable creation/cancellation and strict response verification.
- Migration 373 adds scoped search, career route identity and revision-title restoration while preserving other record families. A database fence prevents career publication until validation and public delivery are integrated.

- Dedicated Careers workspace: employment/status/ownership search, job details, rich content, application selection, related-content pickers, private preview, SEO, undo/redo, ownership/history and browser/creation/update recovery. Preview disables applications and excludes internal notes.
- Migration 374 allows scoped business-location selection through the shared reference picker, preserving RLS and record-type checks.

## Next acceptance gates

1. Client acceptance of job authoring, recovery, publication and scheduling with real accounts and content.
2. CV upload/intake integration, including private storage and processing verification.
3. Hosted and client acceptance of the connected Word/Excel import review/apply/recovery workflow.
4. Career translation workflows and their public-delivery acceptance.
5. Hosted migrations, worker/scheduler operation, auth/storage verification and native Office acceptance.

## Verification

Focused contract/API tests and the local database lifecycle test pass. They cover deadline boundaries, safe links, malformed/duplicate data, stale writes, actor/site scoping, literal search, creation retry/cancellation, revision restoration and the publication fence. No migration has been applied to a hosted provider.

Integration checks: all 2,156 CMS tests pass, along with the production build, TypeScript and offline migration plan. Logs are `/private/tmp/cms-career-foundation-{full,build,types,migrations}.log`.

Client authoring milestone: all 2,161 CMS tests, production build, TypeScript and offline migration planning pass. Synthetic browser checks at 1280px and 390px verify editing, private preview, lost-create response recovery with an identical request, undo/redo, saved updates, location selection and read-only controls. Both preview screenshots were inspected; no horizontal overflow was detected. The database selection test verifies website/access/type isolation. Browser checkpoint/conflict helpers pass focused tests; full browser acceptance of every history/conflict path remains pending. Logs: `/private/tmp/cms-career-editor-{tests,full,db,build,types,browser,migrations}.log`.

## Trusted saved-revision checks

Migration 375 adds service-only career evidence, shared-worker dispatch and validator version `career-1`. The evidence is bound to the current website, record and revision. Checks cover job editorial rules, route/language identity, exact selected media and related records, internal links, and the current published application-form definition. The editor requests checks and rejects mismatched or expired receipts; unsaved edits disable checking. A passing check does not bypass the career publication fence.

External application URLs are checked for HTTPS syntax and unsafe URL components, not network reachability or destination ownership. CMS forms must have a valid published definition in the same website/language. Job-specific file submission and notification delivery are not yet connected; forms using either are blocked until that work is complete. This is a pending integration requirement, not a scope removal. File-upload handling remains necessary for client workflows that collect CVs.

Related-record evidence presently establishes exact type, publication pointer and language. Public-reader eligibility, dependency expiry/withdrawal and release-time rechecks must be connected before enabling career publication. Only English delivery is currently supported by these checks.

Validation milestone evidence: all 2,165 CMS tests, production build, TypeScript and offline migration plan pass. Database tests exercise service-only evidence, revision/site mismatch, revoked media, published-form withdrawal and unsupported/malformed form definitions. Synthetic desktop/mobile checks verify request/result controls, stale and expired responses, unsaved-edit locks and read-only users; screenshots at 1280px and 390px were inspected. Browser receipts are simulated; real worker/database behavior is covered separately. Logs: `/private/tmp/cms-career-validation-{full,db,build,types,browser,migrations}.log`. No hosted migration or worker configuration was changed.

## Published-data reader foundation

Migrations 376–377 add anonymous published-only detail/list readers and reserve the `/careers` namespace. The projection allows public job fields and resolved location/page/document cards; internal notes and raw relationship collections are excluded. Application forms expose only form/revision identities, not their private definitions. Reads recheck current media rights, references, internal links and application-form eligibility. Related locations/pages use their public readers; documents must allow public downloads. A new private draft does not replace the published revision.

The TypeScript boundary rejects unknown/private fields, unsafe card URLs, mismatched identities, incomplete jobs and inconsistent application-form bindings. The anonymous runtime is no-store, requires both CMS_PUBLIC_DELIVERY_ENABLED and CMS_CAREER_DELIVERY_ENABLED, and validates bounded ordered pagination. The careers flag defaults off. SEO metadata helpers are present.

This is the data layer, not completed visitor pages. Public rendering/routes, career media delivery admission, search/sitemap, live publication safeguards and form submission tied to the current job/deadline remain pending. The database publication fence is still active. Reader fixtures bypass it only inside rolled-back local tests; no actual jobs were published.

Reader milestone verification: all 2,172 CMS tests pass after deliberately recapturing the five legacy inventories affected by the shared namespace dependency. Production build, TypeScript and offline migration planning also pass. Four database scenarios cover anonymous draft isolation, allowlisted fields, published/draft separation, revocation/withdrawal, private form-definition exclusion and namespace/alias protection. Projection/runtime tests cover incomplete or unsafe responses, anonymous credentials, rollout and ordered pagination. Logs: `/private/tmp/cms-career-readers-{tests,db,full,build,types,migrations}.log`; inventory logs `/private/tmp/cms-career-inventory-{0,1,2,3,4}.log`. No hosted migration or publication occurred.

## Publication and media admission

Migrations 378–379 add career public-media admission and replace the original blanket publication fence with approved/current-revision checks, fresh trusted validation, selected-record/media locks and live evidence checks. Resolved relationships must still be deliverable. Public image delivery admits only assets from currently eligible public career projections. New private drafts preserve the previous published revision.

The editor now connects submit/approve/request-changes, explicit publish/withdraw confirmation and an uncertain-response lock requiring reload. Publishing via CMS forms remains explicitly blocked with `career_application_delivery_not_ready` until submission endpoints bind the form to the current published job, status and deadline. External application links and closed jobs with no application destination can use the guarded publication path. This does not enable hosted delivery or complete visitor rendering.

Publication milestone evidence: 2,174 CMS tests, production build, TypeScript and offline migration planning pass. Database tests exercise expiry, revoked media, unauthorized publication, approved/current revision checks, public media, workplace withdrawal, preserved published drafts and the form-intake fence. Synthetic desktop/mobile tests cover submit/approve, publish confirmation/cancellation, lost publication-response lock/reload and withdrawal; they do not prove hosted delivery. Logs: `/private/tmp/cms-career-publication-{db,dependencies,full,build,types,browser,migrations}.log`.

## Visitor pages

English `/careers` and `/careers/[slug]` now render through the strict anonymous readers with both rollout switches required. The directory shows employment and application status; detail pages show job content, organization/department, dates, remote eligibility, compensation, images, related public records and SEO metadata. Private fields never enter the renderer.

External application links appear only during the displayed open window. A client timer updates the detail-page state when opening/closing instants pass and when focus returns. These are presentation controls, not authority over an external site's submission endpoint. CMS-form intake is still pending and remains fenced at publication. Existing tabs do not continuously poll administrative job changes; new requests use current no-store evidence.

Verification: all 2,175 CMS tests, production build and TypeScript pass. Synthetic browser checks at 1280px and 390px cover directory/detail rendering, image loading, canonical/noindex metadata, escaped text, related links, text-only records, paused/closed/scheduled/expired states, a live closing deadline, withdrawal, revoked media and invalid/outage responses. Desktop/mobile screenshots were inspected. Logs: `/private/tmp/cms-career-pages-{tests,full,build,types,browser}.log`; screenshots `/private/tmp/cms-careers-public-{1280,390}.png`. Delivery remains off by default; no hosted state changed.

Next: search/sitemap discovery, job-bound CMS-form submissions with files/notifications, structured imports, scheduling/translation and hosted/client acceptance.

## Search and sitemap discovery

Published careers now join site search under Careers, including job-summary text, employment labels and displayed application status. The client can include/exclude Careers in global search settings. Search excludes noindex and non-self-canonical jobs; the sitemap additionally respects sitemap exclusions and global indexing restrictions. Sitemap modification dates come from published revisions, not draft edits or request time. Delivery disabled means no career discovery reads.

Synthetic desktop/mobile browser checks verify category selection, summary search, navigation to job pages, settings exclusion, noindex/canonical policy, sitemap exclusion and withdrawal. Five source-bound legacy inventories were deliberately refreshed after the shared settings/discovery change. No hosted settings were changed.

Discovery milestone: all 2,178 CMS tests, production build and TypeScript pass. Browser checks and inspected desktop/mobile screenshots confirm discovery navigation and layout. Logs: `/private/tmp/cms-career-discovery-{tests,full,build,types,browser}.log`; legacy capture logs `/private/tmp/cms-career-discovery-inventory-{0,1,2,3,4}.log`. Remaining careers work includes job-bound CMS-form intake, imports, scheduling, translation and hosted/client acceptance.

## Job-bound intake transaction foundation

Migration 380 and the existing enquiry orchestration now accept an identity-only career selection. Public input cannot supply job titles or attribution. Mixed expedition/career contexts are rejected. Existing byte/origin limits, challenge, rate limiting, answer validation and consent handling remain in the shared transport.

The service-only transaction locks the website and selected job/form, verifies current published identities through the public career reader, requires the exact job source path and checks open status plus opening/closing instants using the server clock after lock acquisition. Stored attribution includes the published job/form identities, title, organization/reference and server acceptance time. Repeated requests return the original immutable receipt even after withdrawal; changing answers or job selection cannot reuse it. This transaction does not enable CV uploads or notification delivery.

The form-publication fence remains in place. Next integration must connect job-aware form loading, client recovery and applicant/lead display, verify behavior when clients omit/change job context, and address files/notification/privacy handling before removing the relevant fences. The generic enquiry path does not create career attribution; it must not be treated as a job application merely because it uses the same form. Hosted PostgreSQL concurrency and end-to-end challenge acceptance are not established by local tests.

Intake-foundation evidence: all 2,181 CMS tests, production build, TypeScript and offline migration planning pass. New tests cover identity-only routing, context conflicts, service-only database access, wrong revision/form/site, server window rejection, original attribution, retry after withdrawal and changed-answer rejection. Logs: `/private/tmp/cms-career-intake-{tests,db,full,build,types,migrations}.log`. No application UI or hosted acceptance is claimed in this batch.

## Job-aware public form loading

Migration 381 adds a service-only reader bound to the website, published job revision, selected form revision and server-side application window. The new GET route `/api/cms/careers/[id]/application` requires exact `revision`, `form` and `formRevision` query parameters. Duplicate/unknown query fields and malformed identities are rejected. Both career delivery and configured enquiry/challenge settings must be enabled.

The HTTP handler validates the public job projection, checks identities/window again, and returns only public form fields, challenge configuration and identity-only job selection. Private form success/routing configuration stays on the server. Responses are private/no-store; unavailable or changed jobs/forms fail closed. Current publication remains fenced for forms until the client/recovery and applicant handling are integrated. This reader does not replace the transaction's final acceptance-time checks.

Form-loading verification: all 2,184 CMS tests, production build, TypeScript and offline migration planning pass. HTTP tests cover identity binding, public projection, stale/closed/future/withdrawn cases, malformed requests and private errors. The database lifecycle test now exercises the service reader and passes its actual response through the public HTTP projection. Logs: `/private/tmp/cms-career-form-{tests,db,full,build,types,migrations}.log`. No hosted migration or applicant UI verification is claimed.

## Applicant form and in-tab recovery

The shared public enquiry form now supports a strict career context. Job pages use the job-aware form endpoint, verify returned job/form identities and pin the source path. Requests contain identity-only career selection; title and attribution remain server-owned. Generic and expedition forms retain their existing behavior.

The job page keeps an activated form mounted across the closing deadline. A closed window prevents starting a new submission, while an uncertain submission retains its original request key and answers for retry. Verification tokens are refreshed independently. No applicant answers are persisted to browser storage; recovery is in the current tab, with the existing navigation warning. Reloading/closing the tab does not provide durable recovery. The service transaction remains authoritative and may reject a new request after closure.

Synthetic desktop/mobile browser tests verify job-aware fetch parameters, pinned submission context, lost-response retry after closing, disabled fresh submission after closing and stale-form rejection. Challenge and submission responses are synthetic; this does not establish hosted challenge delivery. The publication fence remains until applicant administration and final intake-policy integration are complete. CV uploads and notification delivery are still pending.

Applicant-form verification: all 2,185 CMS tests, production build and TypeScript pass. Five legacy source inventories were refreshed for the shared form dependency change. Browser checks at 1280px and 390px pass; the mobile recovery receipt was visually inspected. Logs: `/private/tmp/cms-career-form-client-{tests,full,build,types,browser}.log`. No hosted changes or acceptance are claimed.

## Applicant review in the enquiry workspace

The authenticated enquiry detail now displays immutable job title, hiring organization, reference code, server acceptance time, source path and saved revision references. It validates the stored selection against the snapshot, source path and lead form/revision before displaying the context. Conflicting expedition context or malformed evidence produces a warning. Generic leads are never classified as applications from a shared form or careers source path alone. Current job content is not fetched, preserving historical evidence after changes or withdrawal. Existing lead permissions, owner/status/follow-up controls, notes and retained merged originals remain in place.

Verification: all 2,188 CMS tests, production build and TypeScript pass. The database intake lifecycle passes its actual saved attribution through the new display parser. Local synthetic browser checks at 1280px and 390px cover saved references, invalid revision warnings, generic leads, read-only controls, no horizontal overflow and no page errors; the mobile screenshot was visually inspected. Evidence: `/private/tmp/cms-career-applicant-{tests,full,build,types,browser}.log` and `/private/tmp/cms-career-applicant-{1280,390}.png`.

Remaining: job-specific inbox classification/filtering, final intake-policy and publication integration, CV uploads, notifications, imports, scheduling, translation and hosted/client acceptance. This batch does not remove the CMS-form publication fence or claim a complete recruiting system.

## Job application inbox

Migration 382 adds an authenticated, RLS-scoped application list. The Enquiries workspace can switch to Job applications and search immutable job title, reference, organization or record ID together with the existing lead status filter. Search is literal and case-insensitive, runs before the 50-row pagination limit and does not require the current job to remain published. Generic leads and merged sources are excluded from the active inbox; originals remain available through retained submissions. The HTTP projection verifies site/filter/cursor, ordering and historical context before exposing job labels; answers are not included in list responses. Existing detail and management controls are reused.

Verification: all 2,191 CMS tests, production build, TypeScript and offline migration planning pass. The real local database test covers 61 applications across two pages, reference/record search, status filters, literal wildcard handling, cross-site isolation, unauthorized and revoked membership. Synthetic desktop/mobile browser checks cover type/search/status controls, empty results, opening details and read-only context; mobile layout was inspected. Logs: `/private/tmp/cms-applicant-inbox-{tests,full,build,types,migrations,browser}.log`. Screenshots: `/private/tmp/cms-applicant-inbox-{1280,390}.png`. No hosted migration was applied.

Next dependencies are final intake-policy/publication integration, CV uploads, notifications, career imports/scheduling/translation and hosted/client acceptance. Export retains its existing whole-enquiry scope; job-filtered export is not implemented by this list feature.

## Supported-form publication integration

Migration 383 replaces the temporary blanket CMS-form publication fence. Release now locks the selected form alongside other referenced records and rechecks its current publication, language and supported delivery configuration. Approval/current revision, fresh trusted validation, media rights and related public delivery checks remain intact. Forms requiring file uploads or notification routes remain blocked until those capabilities are implemented; this is an outstanding requirement, not a scope removal.

Both public intake orchestration and its service adapter reject careers source paths without job selection, and reject selection whose slug does not match the source path. These requests stop before persistence. A generic submission with no career context remains a generic enquiry and cannot acquire application attribution merely by using the same form. Source paths are caller input, not identity or authorization; the atomic transaction still verifies actual published job/form revisions and server-time windows.

Evidence: 2,193 CMS tests, final production build, TypeScript and offline migration planning pass. The local database workflow exercises trusted validation, approval, changed/withdrawn form rejection, supported-form publication, anonymous job reading, service form loading, public intake orchestration with synthetic challenge/rate success, actual atomic persistence and receipt recovery after job withdrawal. The focused database check was extended and rerun to verify that changed file/notification forms still block publication. Logs: `/private/tmp/cms-career-release-{tests,db,full,build,types,migrations}.log`.

This is local integration evidence. No hosted migration, real challenge provider, real notification, concurrent managed-PostgreSQL test or client acceptance occurred. Career delivery still defaults off. Remaining work includes CV uploads and notifications, Office imports, scheduling, translation, applicant-specific export and hosted/client acceptance.

## Notification job context

Migration 384 adds immutable career attribution to the service-only, lease-bound notification input. It reads the accepted lead and submitted form revision, without fetching the current job. Generic enquiries return null career attribution. The worker binds the saved job selection, source path and form revision before passing a verified career snapshot to its delivery adapter. Invalid or conflicting context fails with a safe error code; raw attribution is not forwarded. Existing job idempotency keys, lease acknowledgement and retry behavior remain intact.

This is notification-context preparation only. Repository inspection found an abstract delivery adapter but no concrete notification transport. Website-scoped approved route resolution, a configured provider/worker entrypoint, email content and hosted delivery/retry acceptance remain required. Career forms with notification routes remain blocked; no external message was sent.

Notification-context evidence: all 2,194 CMS tests, production build, TypeScript and offline migration planning pass. Database checks verify service-only access, exact lease tokens, the saved form revision and unchanged attribution after withdrawal. Worker tests verify historical projection, invalid-context refusal, privacy and existing retries. Logs: `/private/tmp/cms-career-notification-{tests,full,build,types,migrations}.log`. No hosted migration or provider delivery is claimed.

## Notification email and transport primitives

A concrete Resend transport and server-configured email preparation function now exist. The site-scoped route contract requires enabled configuration, a route revision, fixed sender and unique recipients. Email preparation excludes submitted answers and applicant email addresses, includes the saved job summary for applications and directs recipients to the authenticated CMS. It does not derive recipients or reply-to addresses from applicant input.

The transport performs one bounded HTTPS request to the fixed provider endpoint, refuses redirects, uses the supplied stable idempotency key and requires a small valid provider acceptance receipt. Provider errors are replaced with a safe message. It refuses attempts whose persisted first-attempt time is in the future or would exceed the provider's 24-hour idempotency window, including request timeout margin. The caller must persist and freeze the exact message/key/time before sending, retain per-route acceptance receipts and reconcile ambiguous expired attempts. These primitives are not wired to a worker endpoint yet; calling code must not reconstruct messages or reset attempt times on retries.

Six focused email/worker tests and TypeScript pass (`/private/tmp/cms-notification-transport-{tests,types}.log`). Tests use injected HTTP responses; no external email, provider credentials or hosted changes were used. No full suite/build was rerun for these new isolated modules; the previous full-suite evidence remains 2,194 tests. Required next: durable route/dispatch storage, current route approval/revocation checks, worker integration, configuration UI and real provider acceptance. Career notification forms remain blocked.

Provider contract checked against https://resend.com/docs/api-reference/emails/send-email and https://resend.com/docs/dashboard/emails/idempotency-keys on 30 October 2026. A stable key alone does not guarantee deduplication after its retention window.

## Durable notification dispatch storage

Migration 385 adds private website-scoped email routes and per-job/per-route dispatch records. Routes currently require trusted provisioning; the client administration API/UI is not implemented. Service-only readers require a current worker lease and a route selected by the submitted form revision. Preparation locks the job and checks the approved enabled route, exact sender/recipients and bounded message fields before storing a frozen message, server first-attempt time and stable dispatch key. Changed messages cannot replace a prepared dispatch.

Pending dispatch reads recheck the current route configuration and approval. Revoked or changed routes return `route_unavailable`; unresolved attempts beyond 24 hours return `reconciliation_required`, with no sendable message. Confirmed receipts can be recorded idempotently and conflicting provider IDs are rejected. Accepted receipts remain recoverable after route revocation, lease renewal and manual job retry generations; they do not become a new send. Expired uncertain attempts still need an explicit reconciliation workflow. A revocation concurrent with a request already sent to the provider cannot retract that request.

Remaining delivery integration: bind these durable functions to the transport and worker, record per-route acceptance before completing the job, implement audited route management and expose actionable reconciliation. Notification-bearing forms remain fenced, and no hosted migration or email has been performed.

Dispatch-storage evidence: all 2,197 CMS tests and offline migration planning pass. The database test covers actual prepared-message replay, tampering, recipient substitution, service/lease boundaries, selected-route projection, route revocation, uncertain-window expiry, receipt conflicts and recovery across retry generations. Logs: `/private/tmp/cms-notification-dispatch-{db,full,migrations}.log`. This batch changes SQL/tests/docs; no frontend build was needed.

## Durable notification worker integration

The worker now passes its exact claimed job/lease to a database adapter. The adapter validates claims and submitted input before connecting per-route dispatch storage to the email transport. Delivery reads a durable dispatch first: accepted routes are skipped, ready routes reuse their stored message/key/time, and unavailable/reconciliation states stop delivery. Only absent dispatches resolve the configured route and prepare a new frozen email. Provider acceptance is persisted and the exact returned receipt is verified before proceeding to another route or completing the job.

Lost receipt writes leave an uncertain dispatch that retries with the same provider key and payload. Already accepted routes are not resent after another route fails. Dispatch identities, state, message preparation and receipt identities are checked. A shared delivery deadline stops new requests after budget exhaustion; the acceptance write is still attempted after a completed send so that the result can be recovered. Runtime RPC timeouts and a configured worker endpoint remain required.

Remaining: authenticated worker endpoint/configuration, route administration, reconciliation workflow, enabling validated notification-bearing forms and hosted provider acceptance. No email was sent by these tests.

Worker-integration evidence: ten focused notification tests, all 2,201 CMS tests and TypeScript pass. The database lifecycle also runs the actual worker/database adapter against a persisted accepted receipt after route revocation and lease renewal, confirms no provider send and completes the leased job. HTTP provider behavior remains mocked. Logs: `/private/tmp/cms-notification-integration-{tests,full,types}.log`. No frontend changes or hosted configuration were made.

## Protected notification worker runtime

`POST /api/cms/workers/notifications` now connects the validated database adapter and concrete Resend transport. It is disabled by default, requires a dedicated bearer secret and separate provider key, accepts only empty POST requests without query parameters, and returns counts rather than lead identities or answers. The database transport permits only the notification RPC set, fixes the HTTPS destination, refuses redirects, bounds JSON responses and applies five-second request timeouts. The route allows 180 seconds for runtime overhead; each claimed job retains the existing 120-second lease and 90-second delivery budget.

`.env.example` documents the opt-in variables; see staging-activation.md. No scheduler, credentials, approved recipient routes or hosted configuration were installed. Client route administration, actionable reconciliation and notification-bearing form validation/publication remain pending. This endpoint must stay disabled until those gates and provider acceptance are verified.

Runtime evidence: 15 focused notification tests, all 2,204 CMS tests, production build and TypeScript pass. Injected HTTP tests exercise configuration/auth refusal, database-to-provider dispatch, persisted replay with one send, bounded failures and private summaries. Local production HTTP checks confirm disabled POST returns private 503 and GET returns 405. Logs: `/private/tmp/cms-notification-runtime-{tests,full,build,types,http}.log`. All provider responses were mocked; no external email or hosted migration occurred.

Recipient administration now has permission-scoped save/approve/disable APIs, private revision history and recovery receipts (386). Client controls remain pending. See [notification recipient administration](notification-routes.md) for current behavior, evidence and remaining acceptance gates.

Latest notification integration: eligible application forms can queue notifications without changing the immutable job attribution. Recipient revocation hides the public job and rejects new applications, while committed applications retain exact retry recovery. See [staging activation](staging-activation.md) for dependency checks and the 2,227-test verification evidence. Live delivery remains disabled/unverified.


## Scheduled publication and withdrawal

The Careers workspace now reuses `PublicationSchedulePanel` with account/site/record/revision keys. It pins publication to the approved current revision and withdrawal to the currently published revision, supports explicit UTC offsets and schedule cancellation, and disables changes during unsaved/conflicted/uncertain editor states or without publish permission. No separate career scheduling database or new migration was added.

The actual database/worker integration runs trusted career validation before scheduled publication, publishes and withdraws a job through existing guards, blocks a changed draft and revoked publisher access, and prevents an old withdrawal schedule from removing a newer live revision. The client check uses synthetic API responses; database execution is tested separately. Hosted scheduler operation remains pending.

Verification: 17 focused scheduler tests, one new career database integration test, production build and TypeScript pass. Playwright (Browser plugin unavailable) checked `http://localhost:3002/cms` at 1280×900 and 390×900 for explicit-offset conversion, separate revision targets, cancellation, unsaved-edit locks and read-only controls. Page identity/nonblank content, no framework overlay/application runtime errors, screenshot inspection and no horizontal overflow pass. An initial test assertion ran before the read-only reload completed; waiting for the rendered transition resolves it. No actual schedule or provider was configured.

Logs: `/private/tmp/cms-career-schedule-{tests,db,build,types,browser}.log`. Screenshots: `/private/tmp/cms-career-schedules-{1280,390}.png`. Browser script: `/private/tmp/check-career-schedules.mjs`. The preview was stopped after testing. Shared scheduler code and database definitions were unchanged, so the prior full-suite baseline was not repeated.


## Structured import contract and planner

Career template version 1.0 now defines Pages, Content, Blocks, Tables, ListItems, Media, RemoteRegions, Application, Compensation and Relationships tables. The pure planner produces complete proposed career drafts without writing, approving or publishing. Current-revision reads must come from the authenticated server before update planning.

Hard character limits match the career fields; summary/SEO guidance produces warnings instead of truncation. The contract bounds a batch to 25 jobs, 500 total rows and 2 million text characters. Row-level errors preserve Office row numbers, reject unknown columns and prevent silently discarded content. Rich paragraphs/list items retain supported formatting; list/table parentage, ordering and extra cells are checked.

Application routing is one explicit none/external/form row. Unused fields for a different mode are errors, external links require HTTPS and form references remain UUIDs for later server evidence checks. Compensation is one row with currency, bounded non-negative decimal minimum/maximum and unit. Remote regions retain order and case-insensitive duplicate protection. Deadlines require explicit offsets and closing after opening.

Updates require an exact revision and preserve omitted scalar values/collections. Replacing or clearing body, remote regions, application routing, compensation, media or relationships requires explicit `replaceCollections` intent. URLs/languages cannot change through update imports. Any error makes the entire proposed batch ineligible; no partial change list is returned. Draft-schema validity does not grant publication readiness.

Verification: six focused planner/contract tests and TypeScript pass. Coverage includes complete field mapping, preservation/clearing, stale updates, invalid application/compensation/deadlines, limits/row positions, rich text/lists/tables, mixed-batch rejection and no mutation of caller data. Logs: `/private/tmp/cms-career-import-plan-{tests,types}.log`. Downloadable Word/Excel generation/parsing, scoped link evidence, reviewed atomic apply/recovery and client controls remain to be connected. No Office file or database record was created by this batch.


## Career Office parsing

Explicit `CMSCareer` Word metadata and career/version 1.0 Excel metadata now route through the existing bounded OOXML decoder into the career planner. Horizontal and vertical Word forms and Excel retain exact paragraph whitespace, list structure, application routing, decimal salary inputs, remote eligibility, time-zone offsets and source hashes/table provenance. Unsupported versions, wrong families, unexpected sections, formulas, external references and tracked edits are rejected. Invalid application URLs remain visible as data and cause the entire plan to fail; parsing never follows links or writes drafts.

Verification: all 91 affected Office parser/planner tests and TypeScript pass. Logs: `/private/tmp/cms-career-office-regression.log` and `/private/tmp/cms-career-office-types.log`. These checks use synthetic Office archives; downloadable career files and native Word/Excel acceptance have not yet been completed. Next: generate and verify blank/filled templates, then connect authenticated evidence, atomic draft apply/recovery and client review controls.


## Scoped import evidence and comparisons

Migration 408 adds authenticated draft-import evidence for career create/update targets. It checks create permission or exact website/type/view/edit access for updates, bounds and deduplicates requests, returns processed-image availability, and exposes current revisions only for visible typed location/document/page/form references. This is draft availability, not evidence that a form or page is publishable. No draft, review or publication state changes during this query.

The TypeScript verifier requires an exact ordered response with no missing, duplicated, foreign or contradictory references. Preserved nested images and application-form references are included. Findings identify every affected job; application problems point to application.formId. Complete before/after comparison exposes compensation removal, application routing changes, remote-region clearing and internal notes while ignoring object-key order.

Focused verification: 14 career import tests, the real local database permission/isolation test, TypeScript and offline migration planning pass. Logs: `/private/tmp/cms-career-import-evidence-{tests,db,types,migrations}.log`. The initial database fixture incorrectly gave a form a public path; the fixture now follows the existing pathless-form constraint. Downloadable templates, atomic apply/recovery, authenticated HTTP orchestration and review UI remain pending. Migration 408 has not been applied to a hosted provider.

Integration regression: all 2,259 CMS tests pass (`/private/tmp/cms-career-import-evidence-full.log`). No UI or route integration changed in this batch; a production build was not repeated.


## Atomic Office draft apply and recovery

Migrations 409–410 add actor/site/request-bound batch receipts and cancellation fences. A batch either saves all draft changes or none. Retry identities bind source bytes, review digest and manifest; a committed receipt recovers without repeating writes even after later edits. Cancellation serializes against apply, blocks delayed requests, and recovers a completed receipt instead of claiming a committed save was cancelled. Receipts remain actor-private and require active website membership.

Apply derives image and typed-reference dependencies from proposed payloads, including application.formId, locks records deterministically, and rechecks exact current evidence. Stale revisions, changed references, revoked image rights, hidden records and URL/language changes fail. Successful import creates drafts only; trusted publication validation remains mandatory.

The authenticated `/api/cms/import/career` endpoint now handles review, apply, status and cancel. It parses original uploaded bytes, reads existing records with the caller's token, preserves full before snapshots, and binds all proposals/evidence/comparisons into the review digest. It never accepts a client-provided draft manifest. Changed form revisions require re-review. Unknown recovery outcomes retain the request ID; completed receipts are checked before attempting another save.

Focused tests cover atomic rollback, stale updates, source-key uniqueness, actor isolation, rights/reference revocation, cancellation and the real HTTP-to-database lost-response path. Downloadable templates, durable client review controls and hosted acceptance remain pending. No hosted migrations or provider settings were changed.

Verification: all 2,271 CMS tests, production build, TypeScript and offline migration planning pass. Logs: `/private/tmp/cms-career-import-api-{full,build,types,migrations}.log`; focused database evidence: `/private/tmp/cms-career-import-apply-db.log` and `/private/tmp/cms-career-import-api-db.log`. These are local checks; hosted provider and client acceptance are unverified.


## Client import verification foundation

The career client now validates file hash/size/format, draft identity and route, saved-revision comparison coverage, dependency-check readiness, receipt targets and cancellation digests. Recovery metadata contains identifiers/digests only and is bounded to the current account and website. Duplicate update targets, foreign-family source keys, oversized trackers and mismatched receipts fail without treating an uncertain save as complete. Multiple new drafts retain separate source keys and may have null record IDs until saved.

The career comparison component labels all job fields, including application destination, deadlines, compensation, remote-work eligibility and private hiring notes. It is not mounted yet; downloadable templates and the complete import panel remain pending. No browser acceptance is claimed for this foundation.

Verification: all 27 focused career import tests pass. Logs: `/private/tmp/cms-career-import-client-tests.log` and `/private/tmp/cms-career-import-client-types.log`. The prior full-suite/build baseline remains applicable to unchanged shared server/database paths.


## Downloadable Word template

The generated `public/cms/templates/career-v1.docx` now includes the explicit career identity, field-limit guide, creation/update/replacement instructions and blank vertical record forms for all ten supported tables. Application mode, salary decimal/currency/unit rules, remote regions and explicit-offset deadlines have career-specific guidance. The example is a synthetic parser fixture, not client content.

All 28 career import tests pass, including parsing the actual blank file and filled fixture. The blank file yields no draft plan; the filled example retains application, compensation, regions, dates, paragraph whitespace and list contents. The blank template was rendered and all 12 page images inspected without clipping or broken tables. Logs: `/private/tmp/cms-career-word-tests.log`, `/private/tmp/career-word-render.log`; QA directory: `/private/tmp/career-word-qa`. Native Word acceptance remains unverified. Excel template generation, import-screen wiring/browser acceptance and hosted checks remain pending.


## Downloadable Excel template

The generated `public/cms/templates/career-v1.xlsx` provides Instructions plus all ten career data sheets, amber input ranges, frozen identifying headers, categorical dropdowns and character-limit warning rules. The Content sheet includes field-specific limits. Salary and date values use the import contract's explicit text format; position accepts whole numbers. The guide explains creation/update identity, replacement intent, job fields, application modes, deadlines, salary syntax and draft-only saves.

All 29 career import tests pass. Blank Word/Excel files produce no drafts, and the actual filled files produce identical proposed career changes. Exact salary decimals, posting date, time-zone offsets and paragraph/list contents survive. Every sheet was visually reviewed, the over-limit title warning rendered red, and the exported XML retains panes/warning rules on every data sheet plus dropdowns. The final portable builder invocation and file roundtrip also pass. Logs: `/private/tmp/cms-career-excel-tests.log`, `/private/tmp/cms-career-excel-roundtrip.log`, `/private/tmp/career-xlsx-build.log`; renders: `/private/tmp/career-xlsx-qa`.

Artifact-tool coerced ISO example strings into date cells despite text formatting. The builder now writes explicit tokens for those synthetic fixture values and a bounded ZIP/XML helper restores their exact text after export, requiring each token to occur exactly once. The downloadable blank workbook is unchanged by that fixture-only workaround. Parser guards were not relaxed. Native Excel/Word acceptance, import-screen wiring/browser checks and hosted acceptance remain pending.


## Client Office import screen

The Careers workspace now connects downloadable Word/Excel templates, file review, full saved/proposed comparisons, a private content preview and explicit draft-save acknowledgement. Account/site-scoped recovery identifiers are persisted before apply; the uploaded file is not stored by this panel. Lost responses retain the request for status recovery or exact retry. Cancellation verifies the bound receipt before clearing recovery. Successful save/recovery refreshes the editor and library before removing the tracker.

The panel uses Web Locks and storage events to coordinate tabs. Pending imports block manual editing/navigation, while unsaved manual edits, unresolved creation, conflicts and uncertain workflow results block importing. The Careers header now identifies the correct workspace. The obsolete CMS-form publishing warning was replaced with the current CV-upload limitation.

Local browser checks use real generated Office files and the actual HTTP review handler with synthetic scoped RPC responses. Database atomicity and server recovery are tested separately in the previous milestone. Hosted accounts/providers and native Office acceptance remain pending.


Client import verification: 29 focused tests, production build and TypeScript pass. Playwright checked `http://localhost:3002/cms` at 1280×900 and 390×900 (Browser plugin unavailable). Generated XLSX review → field comparison → private preview → explicit save → lost response → reload → verified receipt recovery passes with exactly one simulated apply. Generated DOCX review/discard, unresolved cancellation, recovery cleanup and dirty-editor locks also pass. Page identity/nonblank content, framework overlay, relevant console/runtime errors, screenshot inspection and horizontal overflow checks pass. The deliberate network abort is expected test evidence, not an application failure. The Careers heading defect found during visual review was fixed and rechecked. Server was stopped after testing.

Logs: `/private/tmp/cms-career-import-ui-{tests,build,types,browser}.log`; script `/private/tmp/check-career-import-ui.mjs`; screenshots `/private/tmp/cms-career-import-{review,recovered}-{1280,390}.png`. Previous server/database full-suite evidence remains 2,271 passing; this client-only batch did not repeat it. Two-tab browser contention, all stale/invalid review combinations and actual hosted accounts remain additional acceptance coverage; helper tests cover identity mismatch rejection.


## Private attachment processing foundation

Session authorization now generates independent 256-bit bearer secrets, retains only their SHA-256 hashes for storage and checks them with a timing-safe comparison. Trusted session records bind website, form, revision and submission request; cancelled, consumed, future-created and expired sessions fail authorization. Lifetimes cannot exceed 30 minutes. Authorized results omit the credential hash. Reservation policy resolves the exact file field from a trusted form definition and rejects unknown fields, unsafe filenames, extension/MIME mismatch, invalid digests and field-size violations. These helpers do not persist sessions or reserve uploads: future database mutations must repeat authorization transactionally.

Verification: all eight attachment session/worker tests pass, including expiry boundaries, every scope component, malformed credentials, forged policy and the existing real PDF/image checks. TypeScript passes. Logs: `/private/tmp/cms-enquiry-session-tests.log` and `/private/tmp/cms-enquiry-session-types.log`. Storage/API/browser/submission integration remains pending.

The enquiry-file worker supports the existing form file types (PDF, JPEG, PNG) in a private enquiry namespace. Claimed jobs pin website, form, revision, submission request, field, upload ID, lease, byte count/hash and field byte limit. Scope, object-key, MIME and size mismatches fail before private reads. PDF processing reuses the structural sanitizer and original/derivative malware checks; images reuse signature/decode/scanning and metadata-stripping re-encoding. Oversized derivatives are rejected. Immutable verified writes precede scoped completion, and uncertain completion acknowledgements never record a competing failure. No public media/catalog registration occurs.

Five focused tests pass, including real PDF processing and image decoding, identity mismatches, changed bytes, malware rejection, scanner/storage retry and lost acknowledgements. TypeScript passes. Logs: `/private/tmp/cms-enquiry-file-{tests,types}.log`. This is an unconnected worker boundary: durable upload sessions/leases, private storage adapter, browser upload, request-bound submission consumption, recruiter download authorization and retention still need implementation. Existing file-form publication fences remain in place. No actual user attachment or provider was touched.


## Durable private upload sessions

Migration 411 stores upload-session credential hashes in a table unavailable to anonymous users, CMS users and direct service-role table access. Service-only procedures create, recover and cancel sessions; responses omit the hash. Creation binds exact website/form/revision/submission/session identity, requires a currently published file form and existing notification readiness, and rejects already-received submissions. It uses the same website lock order as intake, followed by the session row lock. Exact replay neither changes credentials nor extends expiry. Cancellation is repeatable but cannot cancel consumed or received submissions.

Status recovery intentionally returns expired/terminal state to the original credential. It is not upload permission: reservation/transfer/consumption mutations still need transactional active-state, expiry and current-form checks. The database fixture directly models a published file form to test this boundary; ordinary publication remains fenced. There is no public endpoint or hosted migration yet. Abuse/challenge checks are required before exposing session creation.

The focused database test covers anonymous/authenticated denial, service table denial, unpublished forms, all identity/credential mismatches, fixed-expiry retries, cancellation replay, consumed sessions and existing submissions. Evidence: `/private/tmp/cms-enquiry-session-db.log`. File reservations/leases, private storage, API/browser controls, submission consumption, recruiter downloads and retention remain pending.

The broader regression run exposed a pre-existing history-test timing assumption: equal timestamps are ordered by revision UUID, not insertion order. The recipient-history test now forces tied timestamps, checks exact descending revision ordering, verifies snapshots by revision, and retains pagination/no-duplicate checks. The history API behavior is unchanged.

Final verification for migration 411: all 2,286 CMS tests pass with no skips, and offline migration planning passes. Logs: `/private/tmp/cms-enquiry-session-full.log` and `/private/tmp/cms-enquiry-session-migrations.log`. No hosted database was changed; production TypeScript/UI code was unchanged in this SQL batch.


## Private attachment reservations and leases

Migration 412 adds service-only reservations and processing state. Each reservation pins the session, file field, filename, MIME, original hash/bytes and the published form's maximum size. Exact retries preserve identity; changed specifications conflict. Session mutation locks use the intake lock order and recheck active state, expiry, current published revision, notification eligibility and absence of an accepted submission. Limits are 50 reservations and 100 MB cumulative original bytes per session, including retries represented by distinct upload IDs; exact reservation replay does not consume additional quota.

Transfer confirmation checks the reserved original hash/size. Processing claims issue unique five-minute leases capped by session expiry, with at most three attempts. Completion checks original identity, sanitized derivative metadata/type/size and the active lease; exact completion replay is recoverable. Failures use a bounded code/retry policy. Cancelled/expired sessions, withdrawn forms and superseded leases cannot complete. The private worker's existing image/PDF inspection remains required: confirming transfer is not proof of inspection, and a ready file is not yet permission to submit or download it.

The actual image worker is exercised against PGlite reservation/confirm/claim/finish procedures with in-memory private storage and a synthetic clean scanner. Coverage includes denied public/CMS access, wrong credentials, form policy, changed retry specifications, original mismatch, lease replacement, completion replay, three-attempt rejection and cancellation during processing. Additional checks cover expiry, unpublished forms and cumulative session size. This is local database integration; no provider transfer, public endpoint, hosted activation or recruiter access is claimed.

Verification: all 2,287 CMS tests pass with no skips; offline migration planning also passes. Logs: `/private/tmp/cms-enquiry-reservations-full.log` and `/private/tmp/cms-enquiry-reservations-migrations.log`. The full goal remains open. Next dependency is immutable private storage and a server adapter, followed by upload controls, transactional submission consumption, recruiter authorization and retention.


## Private storage boundary

Migration 413 provisions `cms-enquiry-files` as a private 25 MB bucket accepting PDF, JPEG, PNG and processed WebP. Restrictive policies deny anonymous/authenticated select, insert, update and delete even when another application has a broad permissive policy. Authorized transfers and recruiter downloads will use server-mediated checks; no signed/public URL or public media registration is introduced. Existing bucket configuration must match exactly or migration fails.

The server-only enquiry storage adapter binds one configured website, validates the request/upload path, uses the private bucket for originals and derivatives, and calls the reservation worker's exact claim/finish/failure procedures. Downloads reject truncated/oversized bodies and misleading content lengths. Derivative writes disable upsert and verify returned bytes by checksum for both new writes and duplicate retries. PDF/WebP extension and MIME must agree. Completion responses must match the upload ID. Provider credentials are never included in returned worker receipts.

Twelve focused attachment tests and TypeScript pass. Mock-provider tests cover RPC identity/headers, website isolation, malformed keys, bounded reads, immutable duplicate retries, differing stored objects, MIME/hash mismatch and provider failures. The PGlite bucket test checks all four public operations against an unrelated broad policy; actual hosted Storage behavior remains unverified. Original transfer, upload endpoints/UI, submission consumption, recruiter downloads and retention remain pending.

Final storage milestone verification: all 2,292 CMS tests pass with no skips, TypeScript passes and offline migration planning passes. Logs: `/private/tmp/cms-enquiry-storage-{tests,types,full,migrations}.log`. No hosted bucket, database or actual applicant file was changed.


## Original attachment transfer

Migration 414 supplies service-only transfer authorization bound to the exact website, form, revision, submission request, session, credential hash and upload ID. The server transfer orchestrator hashes the bearer secret, validates returned identity/private keys, checks MIME and original bytes/hash, writes immutably through the private storage adapter, then confirms receipt through the existing transactional session check. It rejects mismatched/terminal confirmations. A copied byte buffer prevents mutation during storage. Successful transfer reports awaiting verification until the processing result is ready.

Original storage writes disable upsert and read back both new and duplicate objects for checksum verification. Confirmation occurs only after verified storage. A storage/confirmation failure remains an error, allowing the same reservation to recover; it does not fabricate completion. The adapter and RPC wiring are server-only; callers must perform rate/challenge/origin controls and bound request bodies before buffering. No public HTTP route or browser upload is enabled by this batch.

Fifteen focused attachment tests and TypeScript pass. The real PGlite reservation/authorization/confirmation path is now exercised through the transfer orchestrator and actual storage adapter using a mock provider. It deliberately loses the first confirmation response after commit, retries against the existing immutable object, and verifies one stored object, matching receipt and no cross-scope authorization. Other tests cover byte, MIME, key, credential and confirmation mismatches. Hosted storage, HTTP/browser controls, intake consumption, recruiter authorization and retention remain pending.

Final original-transfer verification: all 2,295 CMS tests pass with no skips, TypeScript passes and offline migration planning passes. Logs: `/private/tmp/cms-enquiry-transfer-{tests,types,full,migrations}.log`. No actual applicant data, hosted bucket or database was changed.


## Bounded HTTP transfer handler

The attachment HTTP handler requires POST, the configured HTTPS website origin, an exact bearer session secret and UUID form/revision/submission/session/upload headers. Website identity comes from server configuration. The injected runtime must verify trusted ingress identity and supply a rate limiter; denied/malformed rate responses prevent reading or storage. The handler authorizes the reservation before buffering, enforces MIME/exact declared size, bounds actual bytes by the reservation, and rejects truncation/checksum mismatch. A maximum two-minute read deadline and abort handling cancel stalled/interrupted bodies. It reauthorizes after reading before the existing immutable write/confirmation path. Responses are private/no-store and contain no storage keys, credentials or provider diagnostics.

All 21 attachment tests and TypeScript pass. Six HTTP tests cover success, disabled/method/origin/credential/identity boundaries, rate/provider failures, file mismatch/size failures, timeout/abort, cancellation after reading and lost confirmation. A focused real-database integration also runs the HTTP handler with the actual transfer/storage adapters after lost-confirmation recovery and confirms a private receipt with only one stored object. Provider storage and ingress/rate decisions remain synthetic in that integration. Logs: `/private/tmp/cms-enquiry-transfer-http-{tests,types,db}.log`. The prior full-suite baseline is 2,295 passing; this isolated HTTP batch used affected tests and the database integration rather than repeating the unchanged entire suite.

The handler is not mounted as a public route. Trusted runtime/session creation and challenge configuration, browser controls, atomic intake consumption, recruiter downloads, retention and hosted acceptance remain required.


## Trusted transfer runtime

`enquiryFileTransferHttpConfig` composes the HTTP handler with verified signed ingress, the existing website/identity HMAC rate key, the shared enquiry rate window and the real service RPC/private storage adapters. Unsigned forwarding headers are not accepted. Configuration requires both `CMS_ENQUIRY_ENABLED=true` and `CMS_ENQUIRY_FILES_ENABLED=true`, a valid website/HTTPS origin, valid database configuration and sufficiently long ingress/identity secrets. The new example flag defaults to false. No route is mounted yet.

The transfer-only storage adapter receives an unavailable scanner, never a fabricated clean result; transfer does not run inspection. Session creation must independently verify a challenge before issuing credentials. Processing still requires the actual configured scanner/PDF runtime.

All 32 affected attachment, enquiry runtime and database-adapter tests pass, and TypeScript passes. Runtime tests cover disabled/incomplete configuration, signed-ingress success, unsigned-ingress rejection before provider calls, exact HMAC rate identity, immutable private storage/confirmation and rate rejection before session queries. Logs: `/private/tmp/cms-enquiry-file-runtime-{tests,types}.log`. Provider calls are mocked; hosted ingress/provider acceptance is not claimed. The previous full-suite baseline remains 2,295 passing; this isolated runtime batch used affected coverage.


## Challenge-gated session creation and recovery

The server session-creation orchestrator rate-limits before lookup or mutation, hashes the supplied 256-bit secret and checks a strict scope-bound receipt. A new session requires successful challenge verification before the database create procedure. Exact possession-based recovery checks for an existing receipt before reusing a challenge; this handles a challenge consumed by a successful creation whose response was lost. No plaintext secret is sent to the database or returned in the receipt. Client code must generate the secret cryptographically and retain it before sending; that browser wiring remains pending.

Expired/cancelled/consumed receipts can be recovered without recreation or expiry extension. Recovery does not authorize file operations: those independently require active unexpired sessions. Malformed responses, foreign identities, unexpected credential hashes in responses and oversized lifetimes fail closed.

All 34 affected tests, TypeScript and the focused real-database integration pass. The database integration intentionally loses the creation acknowledgement after commit, then recovers with the original secret and confirms exactly one create and one challenge verification before continuing the reservation/transfer/processing flow. Unit coverage includes rate/challenge failures, invalid credentials/receipts, terminal recovery and exact hash-only RPC arguments. Logs: `/private/tmp/cms-enquiry-session-create-{tests,types,db}.log`. Challenge verification is injected/synthetic here; actual Turnstile/session HTTP/runtime/widget integration is next. No route or hosted provider was enabled.


## Session HTTP and challenge runtime

The private session handler accepts strict UUID identity fields and an optional challenge in bounded JSON; the bearer session secret stays in the Authorization header. Site identity comes from trusted configuration. It requires POST, the configured HTTPS origin, signed ingress before reading, valid JSON/MIME/length, an 8 KB body bound and a maximum 15-second deadline with abort cancellation. The runtime shares transfer flags, ingress verification and rate identity, but validates Turnstile against the distinct `cms_enquiry_upload` action and configured hostname. An ordinary `cms_enquiry` challenge cannot create an upload session.

Successful creation returns 201; exact recovery returns 200; rate/challenge/validation failures retain their explicit status and private no-store headers. Uncertain provider or database outcomes return a generic retry message without exposing secrets or diagnostic details. The same identifiers/secret are retained for retry. No route is mounted yet; challenge-widget/browser integration must use the matching action.

All 42 affected attachment/enquiry tests and TypeScript pass. Integrated mocked-runtime tests cover signed ingress, exact challenge action, challenge/rate rejection before creation, private creation/recovery, lost creation response with no duplicate mutation, body shape/size/MIME errors, stalled/aborted bodies and disabled configuration. Real database session/transfer recovery remains covered by the existing PGlite integration. Hosted Turnstile/ingress/storage acceptance is unverified.

Integrated verification: all 2,314 CMS tests pass with no skips, production build passes and post-build TypeScript passes. Logs: `/private/tmp/cms-enquiry-session-http-{tests,full,build,types}.log`. Next work is session reservation/status/cancellation HTTP support and browser integration, followed by transactional enquiry consumption, recruiter downloads and retention. Public routes remain unmounted and no hosted configuration was changed.


## Reservation, status and cancellation controls

Migration 415 adds service-only status recovery bound to the exact website/form/revision/submission/session/credential hash. It reads terminal or expired sessions without authorizing new operations. Status contains the session and at most the session's 50 reserved files. The server control layer validates every file's identity/private-key mapping, rejects duplicates or oversized responses, and returns only upload ID, field, filename, MIME, original size and processing state. Storage paths, hashes and credentials are omitted from client results.

Reservation checks the complete session scope before the transaction and verifies the resulting file against every requested field. Database reservation rules remain authoritative for expiry, form policy, quota and replay. Cancellation requires an exact cancelled receipt; active or foreign receipts cannot clear client state. All operations share rate limits.

The HTTP/runtime handlers reuse the bounded JSON parser and trusted signed-ingress configuration. They require POST, configured origin, exact bearer credentials and strict operation-specific request shapes; clients cannot select a website in their body. The runtime stays behind the existing disabled attachment flag, and no public route is mounted yet. Browser integration and complete intake/download/retention lifecycle remain pending.

All 41 attachment tests and TypeScript pass. Coverage includes private result sanitization, reservation mismatch, duplicate/cross-scope status, cancellation receipts, rate/credential/schema failures, HTTP origin/body boundaries and unsigned-ingress rejection. The real database integration exercises credential-scoped ready-file status and verifies authenticated users cannot call the status procedure.

Final control milestone verification: all 2,321 CMS tests pass with no skips, TypeScript passes and offline migration planning passes. Logs: `/private/tmp/cms-enquiry-controls-{tests,types,full,migrations}.log`. Hosted storage/database and client acceptance remain unverified; no public upload route was enabled.


## Browser recovery and response verification

The browser-safe upload client module uses Web Crypto to generate a session UUID and 256-bit secret. Recovery is scoped to website/form/revision/submission and intended only for sessionStorage. Trackers are strict, bounded to 50 files/100 MB cumulative metadata and 50 KB serialized text. They contain the credential, file names/field identities/MIME/sizes/checksums but never file bytes. Persistence confirms readback, refuses to replace another unresolved session/secret, and refuses to drop or rewrite previously tracked files. Storage failure prevents callers from safely starting requests.

File descriptors hash actual bytes and validate size, supported MIME and filename extension. Reusing an upload ID requires exact metadata/checksum equality, including after file reselection. Session/status/cancellation responses must match the expected scope; status rejects unknown/duplicate or changed files, while a missing reservation remains unresolved. Storage keys and unexpected server fields are rejected. Cancellation clears only the matching stored credential after an exact cancelled receipt; it cannot erase another session's recovery state. These are client checks, not server submission authorization.

Six focused client tests and TypeScript pass: credential independence, scoped persistence and quota failures, exact file hashing/reselection, foreign/terminal receipt checks, duplicate/status mismatch, cumulative quota, unresolved overwrite protection and cancellation clearing. Logs: `/private/tmp/cms-enquiry-file-client-{tests,types}.log`. No rendered browser controls or browser acceptance is claimed for this helper batch. Existing server/database full-suite baseline remains 2,321 passing.


## Visible attachment controls

`EnquiryUploadPanel` provides per-field file selection/limits, secure session persistence before requests, challenge-backed session creation/recovery, exact reservation checks, byte transfer, status recovery and confirmed session cancellation. Reselecting the same field/name/MIME/size/checksum reuses the upload ID. File contents stay in memory; recovery metadata and the credential stay in sessionStorage. Network failures retain recovery and explicitly instruct status checks or exact retry. Selecting another file invalidates the parent status callback. Buttons are guarded during work; callbacks after a stale scope/unmount are ignored. Submission authorization is still a server responsibility.

The shared challenge component now supports the explicit `cms_enquiry_upload` action while retaining `cms_enquiry` as its default. The panel uses scoped styling, labelled file inputs, 44-pixel button targets, error/status announcements and wrapping filenames. It is a reusable component and is not mounted in the public enquiry form yet.

Browser plugin not available; Playwright tested a temporary Next.js fixture at `http://localhost:3003/cms-upload-proof` at 1280×900 and 390×900. Synthetic file/API/challenge responses cover lost transfer acknowledgement, reload with status recovery, reselect/retry with one reservation and one stored object, and cancellation clearing sessionStorage. Both viewports show no horizontal overflow or page runtime errors; screenshots were inspected. Initial navigation timed out during development compilation, then completed on the same live server. The fixture also exposed the need for an explicit lost-network-response recovery message, which was fixed. Browser automation was corrected to wait for hydration and scope assertions to the panel instead of the layout's empty alert region.

Seven client tests and production build pass. The temporary fixture was removed and the server stopped after verification. Script: `/private/tmp/check-enquiry-upload-panel.mjs`; screenshots: `/private/tmp/enquiry-upload-ready-{1280,390}.png`; logs: `/private/tmp/cms-enquiry-upload-panel-{tests,build,types}.log`. Actual Turnstile, scanner/processing runtime, public routes/form submission linking, recruiter authorization, retention and hosted/client acceptance remain pending. This fixture does not prove real provider delivery or a completed application submission.

Post-build TypeScript verification also passes. Existing server/database full-suite baseline remains 2,321 passing; this UI batch used focused tests, build and rendered workflow checks.


## Processing discovery and dispatch

Migration 416 discovers a bounded website-specific batch of uploaded/retry files and expired processing leases belonging to active unexpired sessions and still-published eligible forms, excluding accepted submissions. Reserved, ready, rejected and actively leased files are excluded. Expired third-attempt leases remain discoverable so the claim procedure can mark them rejected; they cannot remain indefinitely in processing. Discovery itself grants no lease. Claims recheck authoritative session/form state under locks.

`dispatchEnquiryFiles` validates the complete discovered scope, rejects foreign/duplicate/oversized batches before claims, and processes sequentially through the existing PDF/image worker. Uncertain claims are counted without inventing failure acknowledgements. Output contains aggregate counts only, not applicant identifiers or filenames. The storage adapter exposes the site-bound discovery RPC.

The processing HTTP handler requires explicit server configuration, a strong worker secret, matching authorization and an empty POST without query parameters. It runs a fixed batch of five. No environment factory, scheduler or public route is enabled yet. Existing inspectors accepted injected malware scanners but there was no configured real scanner transport in the repository; that deployment dependency remains to be implemented/verified. No synthetic clean result is used as a production fallback.

All 51 attachment tests and TypeScript pass. Dispatcher tests cover batch rejection, actual image processing with a synthetic scanner, sequential execution, uncertain claims and private worker authentication. Database coverage checks discovery scope, public permission denial, active/expired leases, ready/cancelled exclusion and exhausted-lease rejection. Logs: `/private/tmp/cms-enquiry-dispatch-{tests,types,full,migrations}.log`.

Final dispatch verification: all 2,331 CMS tests pass with no skips, TypeScript passes and offline migration planning passes. No hosted database, worker scheduler or scanner provider was changed.


## Local malware scanner and deployment configuration

`createClamAvScanner` invokes an explicitly configured absolute `clamscan` executable without a shell, sends owned bytes through stdin, and uses a private temporary directory. The child receives a minimal environment rather than application credentials. Input is limited to 25 MB; scan expansion, nested files and recursion are bounded. Stale signature databases (over one day), encrypted input and exceeded scan limits are configured to fail closed. A 25-second external deadline, abort handling and a 64 KB combined output cap kill uncertain runs. Diagnostics and applicant bytes are not returned or logged. Temporary scan directories are removed after completion.

Exit 0 maps to clean, exit 1 to rejected/infected, and other exits, signals, spawn errors, timeout or output overflow to unavailable. Options and exit codes were checked against the [official ClamAV clamscan manual](https://github.com/Cisco-Talos/clamav/blob/main/docs/man/clamscan.1.in). An installed version must support these options; unsupported options fail rather than silently relax inspection.

`enquiryFileProcessingConfig` requires explicit attachment and worker enable flags, website identity, a worker secret, scanner executable/signature database paths and the existing PDF runtime configuration. New example environment values default to disabled/empty. It constructs the real scanner and private storage adapter for the processing handler. No route, scheduler or deployment is enabled here.

All 55 affected scanner/attachment tests and TypeScript pass. Controlled executable fixtures verify stdin/options, clean/infected/error exits, timeout, cancellation, excessive output, missing binary and directory cleanup. Runtime tests verify required flags/paths/secrets. Logs: `/private/tmp/cms-clamav-{tests,affected,types}.log`. `clamscan` is not installed on this machine: these tests prove the subprocess contract, not actual malware detection or signature freshness. Before activation the target worker must provide maintained signatures, a compatible ClamAV executable and a successful real-engine clean-file/EICAR acceptance test, plus PDF runtime verification. The previous full CMS suite remains 2,331 passing.


## Field-bound submission evidence

Migration 417 provides preliminary service-only file evidence after checking the active session, expiry, current form, exact form/revision/submission identity and credential hash. Selections are bounded, strict field/upload pairs; duplicate fields/uploads are rejected. Only checked files belonging to that session and exact field return evidence. Missing, foreign or unchecked files provide no evidence and therefore remain form-validation failures. Storage paths and derivative metadata are not returned.

The server evidence reader derives selections from the stored form definition and submitted answers, rejects duplicate upload use, hashes credentials and validates the returned subset against exact requested field/upload pairs. Malformed/foreign/duplicate responses fail closed. Server intake now calls `validateEnquirySubmission` with `BoundEnquiryFile` evidence requiring `fieldId`. It filters evidence against exact submitted file fields and rejects duplicate upload use; a valid upload from one field cannot satisfy another. The existing shared client form helper is unchanged. Its source hash is pinned in retained migration inventories, so moving ownership verification into the server intake boundary preserves those captures without rewriting evidence. Tests explicitly reject swapped fields, duplicate file use and missing ownership.

This evidence read does not save an enquiry, consume a session or authorize recruiter downloads. The final transaction still needs to recheck eligibility and link/consume attachments atomically with lead creation, including exact retry recovery. The ordinary intake adapter remains fenced and public file forms remain disabled until that integration is complete.

Evidence milestone verification: the full regression run passes 2,338 tests with no skips. Final duplicate-field ownership refinements additionally pass all 22 focused evidence/intake/form tests; post-run TypeScript and offline migration planning pass. The real database integration checks ready-file evidence, missing files, wrong request identity and wrong credentials. Logs: `/private/tmp/cms-enquiry-evidence-{full,targeted,types,migrations}.log`. No inventories were rewritten and no hosted database changed.

## Atomic attachment acceptance (30 October 2026)

Migration 418 adds private submission receipts and lead attachment snapshots. A service-only transaction verifies the exact session credential and ready field-bound files, delegates to existing intake, links immutable delivery metadata and consumes the session together. The legacy intake procedure rejects nonempty file answers outside this transaction. Direct table access and private bypass procedures remain unavailable to application roles.

Exact retries return the original lead after session expiry or form withdrawal. Changed answers/context or credentials cannot reuse that receipt. The database regression scenario uses an image processed by the actual local worker with a controlled scanner response; it verifies rollback after downstream context failure, private access, bypass rejection, snapshots, session consumption and single-lead replay. This is local database evidence, not actual scanner/provider acceptance or public application integration.

Validation: 2,339 CMS tests pass, no skips (`/private/tmp/cms-attachment-acceptance-full.log`); offline migration planning includes 418. No hosted migration was applied.

Next dependency: wire attachment proof and accepted-session evidence recovery into the intake adapter and public form. Career/expedition file-form eligibility remains fenced until that complete path is verified. Private recruiter retrieval, retention/deletion, actual ClamAV/signature deployment, scheduling and hosted/client acceptance remain pending.

## Attachment intake and recovery integration (30 October 2026)

Migration 419 preserves active-session evidence checks for new submissions and permits exact consumed-receipt evidence recovery. Recovery requires the original credential, site/form/revision/request/session identity and complete unchanged field/upload selection. It does not authorize new uploads or downloads after expiry. Private receipt evidence is sufficient to validate the original answers; atomic persistence still compares the complete answers, consent, attribution and career/expedition context.

The intake adapter now receives the request key and stored form definition when checking files. Optional request-scoped proof binds evidence and atomic attachment acceptance to one session. The runtime accepts the existing Bearer credential plus `x-cms-form`, `x-cms-revision`, `x-cms-request` and `x-cms-session` headers only with `CMS_ENQUIRY_FILES_ENABLED=true`; incomplete proof or mismatched body scope fails closed. Raw credentials are hashed before RPC and are not stored in lead attribution. File-free intake retains its existing path.

The database regression runs the real intake adapter and validator against a previously accepted enquiry after session expiry/form withdrawal, with a synthetic challenge verifier. Separate HTTP/runtime tests cover feature flags, proof/header/body mismatch and atomic persistence routing. This does not establish live challenge, storage, scanner or hosted delivery acceptance.

Next: connect the upload panel to the public form, mount the prepared upload handlers and complete guarded career/expedition file-form eligibility. Keep activation disabled until that full path, private recruiter retrieval, retention and deployment health are verified.

Validation for attachment intake/recovery: all 2,340 CMS tests pass without skips (`/private/tmp/cms-attachment-recovery-full.log`), TypeScript and offline migration planning pass. No hosted migration or activation was performed.

## Public form attachment UI integration (30 October 2026)

The enquiry form now composes the upload panel when its server-projected form includes upload scope. It selects the latest uploaded file per visible field, waits for checked status, uses the same request identity for upload and submission, and sends session credentials only in headers. Server validation remains authoritative. Confirmed cancellation prepares a new request key because the cancelled session's key is terminal.

Before submission, a bounded tab-scoped draft retains the exact request key and pending answers/context. Reload restores locked answers and upload credentials; retries use the retained request. Confirmed success clears both draft and upload recovery. Storage failures block new submissions instead of silently losing retry identity. The older in-memory retry path is retained for forms without attachment configuration.

Session, controls and transfer POST routes are mounted under `/api/cms/enquiry/files/`; their existing disabled-by-default runtime configuration, origin, signed-ingress, rate and credential checks remain in force. Public form projection still refuses file forms until deployment processing readiness and the remaining attachment lifecycle controls are verified. The processing scheduler is not mounted or activated here.

Browser plugin not available; regular Playwright checked the composed form on 1280×900 and 390×900 fixtures. Controlled endpoints and synthetic PDF bytes exercised upload, cancellation/new request identity, lost submission response, reload with locked retained answers, exact retry, success and storage cleanup. Both widths passed without page errors or horizontal overflow. This is browser integration evidence with mocked endpoints, not live scanning or hosted application acceptance. The temporary fixture was removed and the server stopped. Evidence: `/private/tmp/check-enquiry-upload-form.mjs`, `/private/tmp/cms-upload-form-browser.log`, `/private/tmp/enquiry-upload-form-ready-390.png`.

The full CMS regression suite passed 2,343 tests before the final cancellation UI refinement; the final browser checks include that refinement. Next: deployment-bound file-form readiness/eligibility, recruiter downloads, retention/deletion, actual scanner/scheduler configuration, and hosted/client acceptance.

Final composed-form validation: production build and TypeScript pass after the cancellation refinement and fixture removal (`/private/tmp/cms-upload-form-build.log`, `/private/tmp/cms-upload-form-types.log`).

## Private recruiter attachment delivery (30 October 2026)

Migration 420 adds permission-scoped attachment metadata and download authorization. Metadata requires lead `view`; file retrieval requires both `view` and `export` for that lead. Broad content permission does not grant applicant access. Authorization checks the accepted immutable file snapshot against the ready upload's inspection result. The metadata list excludes private storage paths.

The new GET handler at `/api/cms/leads/attachment?lead=…&upload=…` requires the user's CMS bearer token. User authorization uses the anonymous API key plus that token; the service credential is confined to reading the authorized private derivative from `cms-enquiry-files`. No public URL or original upload is returned. The handler validates identity/path, MIME, bounded byte count and SHA-256, rechecks current authorization after reading, and returns an attachment with private/no-store and sandbox headers. The attachment feature flag remains required and disabled by default.

Local database checks cover view-only denial, record-scoped export, cross-site/lead/file rejection and revoked export permission. Handler tests cover missing authentication, incorrect identity/path, wrong MIME, truncated/oversized/corrupt bytes, revoked access during the read, private response headers and separation of user/service credentials.

Remaining: connect metadata and download controls in the recruiter UI, retention/deletion and export audit events, public file-form readiness, actual scanner/scheduler deployment, hosted and client acceptance. This endpoint has not been deployed or exercised against hosted storage.

Private-delivery validation: 2,346 CMS tests pass with no skips (`/private/tmp/cms-attachment-download-full.log`), along with TypeScript and offline migration planning. Final focused assertions also verify same-size checksum corruption and oversized bodies (`/private/tmp/cms-attachment-download-unit.log`). No hosted SQL or activation was performed.

## Recruiter attachment controls (30 October 2026)

The enquiry detail view now includes a keyed attachment panel. Staff explicitly load/refresh the submitted file list. Metadata uses the existing authenticated lead command API and a strict bounded response schema; duplicate IDs, extra private paths and malformed records are rejected. View-only staff see the export-permission explanation; eligible staff can request a file through the private download handler.

The CMS workspace obtains the current user session for the binary request and checks account identity before and after the request. The panel bounds and checks MIME/byte count, downloads a local blob with the sanitized delivery extension, revokes the object URL, and ignores or aborts work after the panel's actor/site/lead context unmounts. It never renders a public storage URL. Actual permission checks remain on the server, including after reading the private file.

Browser plugin not available; regular Playwright tested desktop 1280×900 and mobile 390×900 fixtures with controlled metadata/file responses. Both passed view-only messaging, a real browser download with the expected filename, subsequent revoked-access failure with no extra download, no horizontal overflow and no page errors. The fixture was removed and server stopped. Evidence: `/private/tmp/check-recruiter-attachments.mjs`, `/private/tmp/cms-recruiter-panel-browser.log`, `/private/tmp/recruiter-attachments-390.png`. This is fixture browser evidence, not hosted authorization/storage acceptance.

All 42 affected lead tests pass (`/private/tmp/cms-recruiter-panel-regression.log`). Remaining attachment work includes download auditing, retention/deletion, deployment-bound file-form readiness, scanner/scheduler setup, and hosted/client acceptance.

Recruiter UI final validation: production build and TypeScript pass after fixture removal (`/private/tmp/cms-recruiter-panel-build.log`, `/private/tmp/cms-recruiter-panel-types.log`). No hosted deployment or feature activation was performed.

## Attachment download authorization audit (30 October 2026)

Migration 421 adds a user-token-only authorization-and-audit transaction. After checking the storage response and checksum, the download handler calls it with the expected attachment digest. It rechecks current lead view/export permissions and the immutable file identity, then records `lead.attachment_download_authorized` in the CMS audit log and `attachment_download_authorized` in the enquiry history. Actor identity comes from `auth.uid()`; timestamps come from the database. Details contain the lead/upload IDs, delivery MIME, byte count and digest, without applicant text, filename, credentials or private storage paths.

This event means the caller was authorized to receive the verified file. It does not claim browser delivery completion. Audit failure, revoked access, or changed digest prevents the response from releasing file bytes. Corrupt storage bytes are rejected before the audit call. No service credential can invoke this user authorization operation.

Database checks verify actor attribution, one event in each log, checksum mismatch rejection and unchanged event counts after permission revocation. Handler tests verify that refused or failed audits withhold otherwise valid bytes, and that corrupted reads do not create authorization events. The recruiter history already renders the new event through its existing activity display.

Remaining attachment work: retention/deletion, deployment-bound form readiness, actual scanner/scheduler setup, and hosted/client acceptance. No hosted migration or live download was performed.

Audit validation: 2,349 CMS tests pass with no skips (`/private/tmp/cms-download-audit-full.log`), TypeScript and offline migration planning pass. Client retention periods were requested; no retention policy or automatic deletion has been enabled.

## Configurable attachment retention and dry run (30 October 2026)

Migration 422 adds private, versioned per-website attachment retention settings and actor-bound save receipts. Missing configuration means disabled retention with no invented periods. Submitted-file age is measured in days from the original enquiry receipt; abandoned/unselected-file age is measured in hours after the upload session expires. Enabling a saved policy requires both positive periods and a nonblank business approval reference. The UI/worker must not interpret a draft policy as permission to delete.

Only staff with lead configuration permission can read, save or preview the policy. Saves lock the website, reject stale versions, record an audit event and recover the exact original receipt on matching retries. Reusing the request ID with different settings or another actor is rejected. The lead command API strictly validates the policy, receipt identity and version.

The dry run is read-only and tied to the policy version. It separates submitted attachments from abandoned/unselected files, excludes active processing leases, and returns aggregate counts plus estimated original/derivative bytes for at most 500 candidates with a `hasMore` indicator. It returns no applicant text, filenames or storage paths and does not delete database rows or objects. It can preview configured periods while the policy remains disabled. Estimated bytes refer to candidate metadata, not guaranteed physical storage usage.

No policy has been configured for a real website, and there is no active deletion worker. Client-approved periods remain unanswered. Remaining work includes the policy UI, controlled deletion lifecycle/worker, deployment readiness and hosted/client acceptance.

Retention settings validation: 2,352 CMS tests pass with no skips (`/private/tmp/cms-retention-policy-full.log`), TypeScript and offline migration planning pass. The final targeted database run also verifies exact recovery after a later policy change and stale-preview rejection (`/private/tmp/cms-retention-policy-db.log`). All fixture policy changes were rolled back.

## Retention settings screen and save recovery (30 October 2026)

The enquiries workspace now includes an attachment-retention panel. Authorized staff can load current settings, enter client-approved periods/reference, save, and preview the saved policy. An unset policy displays blank periods and disabled status. Enabling requires the existing strict approval validation; the screen explains that cleanup also depends on an enabled worker. No period was chosen for the client.

Before a save request leaves the browser, an actor/site-scoped immutable recovery record is verified in sessionStorage. Uncertain saves lock editing and survive reload for an exact retry. A confirmed save is followed by a current-policy reload before recovery is cleared. Definitively rejected stale saves can reload current settings without replaying the rejected changes. Preview is disabled while settings are unsaved or unresolved, and explicitly reports that no files were deleted. Unsaved/pending retention changes participate in the workspace's dirty-state guard.

Browser plugin not available; regular Playwright checked 1280×900 and 390×900 fixtures. Both passed blank defaults, missing-approval validation before network writes, lost-save response, reload/exact retry, recovery cleanup, stale-save rejection/current-policy reload, read-only candidate preview, no horizontal overflow and no page errors. Fixtures used synthetic periods and mocked endpoints; their policy remained disabled. The temporary page was removed and local server stopped. Evidence: `/private/tmp/check-retention-ui.mjs`, `/private/tmp/cms-retention-ui-browser.log`, `/private/tmp/retention-settings-390.png`.

Remaining: the controlled deletion lifecycle/worker, confirmed client retention periods, deployment-bound attachment readiness, real scanner/scheduler and hosted/client acceptance. No real retention policy or deletion was enabled.

Retention UI validation: all 47 affected lead/retention tests, production build and TypeScript pass after fixture removal (`/private/tmp/cms-retention-ui-regression.log`, `/private/tmp/cms-retention-ui-build.log`, `/private/tmp/cms-retention-ui-types.log`).

## Retention deletion lifecycle and worker core (30 October 2026)

Migration 423 adds service-only cleanup discovery, claim, retry/failure and completion procedures, with a private durable deletion-intent table. A new claim rechecks the enabled approved policy and current file age under the website lock. It excludes live/recent processing and requires an additional hour after session/lease expiry, beyond bounded upload/inspection requests. Claims are leased; stale tokens cannot complete work. Only server-derived original and derivative paths are returned.

Once a deletion intent is committed, download authorization immediately refuses the file. Already-started cleanup remains recoverable even if new policy work is disabled, because partly removed objects must not become downloadable again. A retry reclaims the same intent and policy snapshot. Completion is idempotent, excludes the file from future previews/discovery, records CMS audit history and marks the enquiry attachment deleted. Metadata and exact enquiry retry receipts remain separate from physical file retention.

The worker core removes both expected objects, verifies both are absent, then finalizes the database intent. Partial failures retry; uncertain final acknowledgements never issue a competing failure update. The storage adapter must distinguish definite absence from network errors. A provider adapter, dispatcher/runtime and deployment scheduler still need implementation and acceptance; no real object deletion is possible through this core alone.

The recruiter panel now distinguishes available, deleting and deleted attachments and removes download controls for the latter states. Browser plugin not available; regular Playwright tested those states, download/refusal behavior and desktop/mobile overflow/runtime checks at 1280×900 and 390×900. Controlled endpoint fixtures passed; the temporary page was removed and server stopped (`/private/tmp/check-cleanup-status.mjs`, `/private/tmp/cms-cleanup-lifecycle-browser.log`).

The full regression suite passes 2,356 tests without skips (`/private/tmp/cms-cleanup-lifecycle-full.log`). The final targeted database test additionally connects the actual cleanup procedures to the worker using synthetic in-memory storage and a lost completion response; replay does not duplicate the completion audit (`/private/tmp/cms-cleanup-lifecycle-db.log`). Offline migration planning passes. No hosted migration, real policy activation or real file deletion occurred.

Cleanup lifecycle final validation: production build and TypeScript pass after fixture removal (`/private/tmp/cms-cleanup-lifecycle-build.log`, `/private/tmp/cms-cleanup-lifecycle-types.log`). Client-approved periods remain pending and automatic deletion remains inactive.

## Cleanup storage provider and protected endpoint (30 October 2026)

The cleanup storage adapter now calls the provider's object-removal and metadata APIs using a server-only credential. Only exact original/derivative paths from a validated database claim can be removed; unclaimed paths and mismatched jobs fail before storage access. The adapter uses HTTPS, rejects redirects, bounds JSON responses and request durations, and discards its local claim after completion/failure. It verifies each object's explicit `NoSuchKey` response before the worker can finalize deletion. Generic missing routes/buckets, denied requests, network failures and oversized/malformed responses do not establish absence.

The implementation follows the installed `@supabase/storage-js` removal/info APIs and the official [Supabase storage error-code documentation](https://supabase.com/docs/guides/storage/debugging/error-codes). Legacy providers that do not return explicit `NoSuchKey` remain unconfirmed and require compatibility verification before activation.

`POST /api/cms/enquiry/files/cleanup` is a private, empty-body worker endpoint. It requires all enquiry/file/cleanup flags and a separate strong bearer secret, processes one file pair per call within bounded provider timeouts, and returns aggregate counts only. Configuration defaults to `CMS_ENQUIRY_FILE_CLEANUP_ENABLED=false`; `CMS_ENQUIRY_FILE_CLEANUP_SECRET` is unset. Database policy eligibility remains authoritative. Disabling a retention policy stops new intents while committed deletion intents remain retryable; disabling the runtime stops the worker entirely without making those files downloadable.

The local HTTP-provider fixtures verify exact object paths, storage removal followed by explicit absence, invalid/ambiguous provider responses, final receipt, private endpoint authentication and no work when flags are disabled. No hosted provider was called. A scheduler has not been installed or enabled.

Deployment sequence still required: confirm client retention periods and approval reference; apply/review migrations in the confirmed staging project; verify already-absent removal and explicit absence responses against synthetic private objects; configure the independent worker secret/flags; exercise a one-shot staging cleanup and its audit; then configure the chosen scheduler to send an empty authenticated POST. Confirm runtime duration support (180 seconds) and monitor aggregate retry/unacknowledged counts. Do not put the secret in a URL, browser code or logs. Exact scheduler configuration depends on the deployment provider and remains pending.

Cleanup provider validation: all 66 affected attachment tests pass without skips with the configured PDF runtime (`/private/tmp/cms-cleanup-storage-regression.log`), plus production build and TypeScript (`/private/tmp/cms-cleanup-storage-build.log`, `/private/tmp/cms-cleanup-storage-types.log`). Automatic cleanup remains disabled.

## Processing endpoint and attachment deployment preflight (30 October 2026)

`POST /api/cms/enquiry/files/process` now mounts the protected processing handler. It requires the enquiry, attachment and processing-worker flags plus its own bearer secret, accepts an empty request, and handles one file per invocation. The route allows up to 300 seconds. Worker object reads and verified derivative write/read-back now use 30-second provider deadlines; original applicant transfers retain their separate 120-second bounds. This reduces the risk of consuming a processing lease on a long batch or stalled provider operation. Existing lease checks still determine whether completion is accepted.

`npm run cms:check-attachments` performs a read-only local preflight. It checks configuration shapes, distinct worker/ingress secrets, absolute scanner/PDF paths and local file accessibility. It reports readiness separately from activation flags and never executes the scanner, connects to the provider, changes a policy or deletes anything. Passing this preflight is not runtime or public-release acceptance.

The actual local run reports all 16 required configuration items missing and all four activation flags false (`/private/tmp/cms-attachment-deployment-preflight.log`). The staging Supabase project and hosting platform have been requested from the user; secret values were not requested. Client-approved retention periods also remain unanswered. No deployment identity or credentials have been guessed.

All 72 affected attachment/scanner tests pass without skips, including PDF structural processing using the configured test runtime (`/private/tmp/cms-attachment-processing-deploy-tests.log`). Actual ClamAV signatures/engine acceptance, hosted storage/ingress/challenge flow, scheduling, deployment-bound public file-form readiness and client acceptance remain pending.

Processing endpoint validation: production build and TypeScript pass (`/private/tmp/cms-attachment-processing-deploy-build.log`, `/private/tmp/cms-attachment-processing-deploy-types.log`). No deployment flags were enabled.
