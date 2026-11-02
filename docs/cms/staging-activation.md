# Staging activation and first workflow

This runbook completes batch A in current-audit-and-plan.md. It does not authorize a production cutover. The CMS is independent of Sanity; its current adapters use Supabase-managed PostgreSQL/Auth/Storage.

## Current setup result

23 October 2026: the local environment has none of the nine required base staging settings. No linked Vercel project file was found. No provider has been selected or provisioned in this batch. This is not evidence that the client has no existing remote project.

Run `npm run cms:check-staging` from the repository root. For machine-readable output run `npm run cms:check-staging -- --json`. It follows Next environment loading precedence, prints setting names/status only, exits 1 for missing/invalid configuration and 0 for valid configuration shapes. A zero exit does not authenticate credentials or prove deployment readiness.

29 October 2026 latest recheck: all nine base staging settings are still missing (`/private/tmp/cms-staging-recheck-20261029.log`). Local migration planning now covers 360 migrations; no provider migration or deployment has been performed.

## Required setup packet

Confirm the client-owned Supabase project and staging host/domain, authorized operator, test-account owners, storage/processing services and any service budget. Supply secrets through the host's secret store or ignored local environment file, never through chat or committed files. Keep this environment separate from production and legacy enquiry storage.

Settings checked:

| Setting | Purpose |
|---|---|
| CMS_SUPABASE_URL | Dedicated project HTTPS origin |
| CMS_SUPABASE_ANON_KEY | Public browser publishable/anon key |
| CMS_SUPABASE_SERVICE_ROLE_KEY | Server-only service credential |
| CMS_WEBSITE_ID | Existing CMS website UUID |
| CMS_PUBLIC_SITE_ORIGIN | Staging website HTTPS origin |
| CMS_VALIDATION_WORKER_ENABLED | Enable validation worker on prepared staging |
| CMS_VALIDATION_WORKER_SECRET | Random scheduler bearer secret |
| CMS_DELIVERY_WORKER_ENABLED | Enable delivery worker on prepared staging |
| CMS_DELIVERY_WORKER_SECRET | Random scheduler bearer secret |

Media processing and forms have additional provider-specific settings. Passing this base check does not enable them. Keep visitor rollout switches off until the relevant route has approved content and its acceptance checks pass.

## Deployment sequence

1. Confirm the target project identity and staging isolation. Inspect its existing schema and migration history before making changes; snapshot existing data where applicable.
2. Review the numbered SQL files in `database/cms` against the deployed migration ledger. Apply only unapplied migrations in numeric order using a privileged operator connection. Record file hashes and outcomes. These files are not assumed idempotent: never blindly rerun the whole directory on an existing database. Local PGlite tests do not establish provider compatibility.
3. Verify managed auth prerequisites and required roles. Expose the `cms` API schema through the provider configuration and verify grants/RLS with separate anonymous, editor, reviewer and publisher sessions. Schema exposure alone is not authorization.
4. Create the staging website, scoped roles/permissions and memberships through a reviewed bootstrap operation. Use real Auth user IDs; do not bypass foreign keys or separate approval rules. Record the resulting website UUID in the environment.
5. Configure private storage, scanning and media processors. Verify an allowed upload, rejected upload, approved private preview and unauthorized retrieval. Do not use public buckets as a shortcut.
6. Deploy with server secrets and public browser configuration correctly separated. Run the configuration preflight in the target environment. Open `/cms` and confirm actual sign-in and website selection.
7. Configure a host-supported authenticated scheduler for the validation and delivery endpoints: `/api/cms/workers/validation` and `/api/cms/workers/delivery`. Requests must carry `Authorization: Bearer <matching worker secret>` with no body or query string. Use a cadence within hosting limits and required delivery latency; never put the secret in a URL. Verify both successful execution and rejected unauthorized calls. These workers process up to ten jobs per invocation; inspect backlog and retries rather than assuming one invocation drains everything.
8. Run the workflow below before enabling the corresponding visitor route. Record deployment version, account roles, record/revision IDs and observed results without credentials.

## First acceptance workflow

Use an already integrated journey/editorial flow and separate editor and reviewer/publisher accounts.

- Sign in and load only the authorized website. Confirm an unrelated account cannot access its records through UI or API.
- Import a valid structured template; review and save a draft. Confirm a retry does not create duplicate content and invalid input produces actionable errors.
- Edit and save; verify the existing public revision stays unchanged. Verify concurrent stale saves cannot silently overwrite newer changes.
- Open private preview with appropriate media; check unauthorized/expired preview access is denied.
- Submit, review and approve the intended revision. Edit after approval and verify the old approval cannot publish the new revision.
- Approve again and publish. Observe validation and delivery jobs; check the visitor route, media and applicable sitemap/search surfaces.
- Restore an earlier version into a new draft, approve and publish it. Verify the visitor receives the restored revision after delivery.
- Unpublish and verify withdrawal from applicable public routes, media access and discovery surfaces.
- Revoke the test membership and verify access stops. Review worker failures/retry visibility.

Save actual evidence in the readiness audit and update scorecard gates only when demonstrated. Scheduled publication has local implementation and still requires its separate hosted acceptance checks; running the delivery queue is not a substitute for verifying scheduling.

## Offline migration planning

`npm run cms:plan-migrations -- --ledger /absolute/path/applied-migrations.json` reads source SQL bytes and an explicitly supplied deployment ledger, then prints an ordered JSON plan. It does not connect to a provider, execute SQL or change the ledger. Each ledger entry has exactly `file` and `sha256` (lowercase SHA-256 of the original applied file bytes). Obtain this ledger from recorded deployment evidence; do not fill it from today's source hashes and assume that proves prior deployment.

The check rejects duplicate names/numbers, malformed entries, missing source sequence numbers, unknown applied migrations, changed hashes and applied migrations following an unapplied predecessor. On any error, no pending SQL list is returned. An empty array is suitable only for an independently confirmed new empty target. The latest local empty-ledger check identifies 351 pending migrations, 001–351; this is an offline inventory, not a claim about an actual provider's state.

Seven planner/preflight tests pass, including changed SQL, missing predecessors and malformed ledgers. The base staging preflight was rerun after journey editing work: all nine required settings are still missing. Provider project/host identity has been requested; no migrations were applied.

Optional scheduled-publishing activation additionally requires migration 196, `CMS_SCHEDULE_WORKER_ENABLED` and a distinct `CMS_SCHEDULE_WORKER_SECRET`. The database-wide protected endpoint is `/api/cms/workers/schedules`; follow publication-scheduling.md for timer setup, scope, blocked-job monitoring and execution acceptance. These optional settings are not part of the nine-setting first-workflow preflight.

Group scheduling separately requires the disabled-by-default `CMS_RELEASE_SCHEDULE_WORKER_ENABLED` and `CMS_RELEASE_SCHEDULE_WORKER_SECRET`, migrations through 203, and a host supporting the 300-second `/api/cms/workers/release-schedules` route. See coordinated-releases.md before configuring a timer; these settings are outside the base nine-setting preflight.


## Page URL redirect activation gate

Keep `CMS_PAGE_REDIRECTS_ENABLED=false` until migrations through 229 are applied and reviewed on the intended staging database. Enabling it also requires `CMS_CUSTOM_PAGES_ENABLED=true`, `CMS_PUBLIC_DELIVERY_ENABLED=true` and valid site/provider settings. The base nine-setting preflight does not validate this optional rollout.

Verify a real approved custom-page URL transition with separate authorized users, including stale/revoked/low-assurance rejection. Observe exactly one application receipt, alias (when requested), audit entry and delivery job. Run the delivery worker and verify both old and new HTTP routes, canonical metadata, sitemap/search visibility, query preservation, withdrawal and provider-outage handling. Repeat under concurrent edits/competing destination claims and confirm safe retries without partial changes. Check deployment cache behavior separately from database success. Local fixture HTTP checks pass but do not satisfy these hosted gates.

Localized redirect activation additionally requires migration 280 and `CMS_LOCALIZED_PAGES_ENABLED=true` with the existing redirect/public/custom-page switches. Verify an approved exact-language import at `/languages/<locale>/<old-path>`, query preservation, GET/HEAD, paused/withdrawn targets and no cross-language fallback on the target host. Local fixture HTTP evidence is recorded in page-url-changes.md.

Notification delivery has a separate, disabled-by-default endpoint: `POST /api/cms/workers/notifications`. It requires migrations through 385, the existing independent-CMS database service credentials, `CMS_NOTIFICATION_WORKER_ENABLED=true`, a distinct 32–256 character `CMS_NOTIFICATION_WORKER_SECRET`, `CMS_NOTIFICATION_RESEND_API_KEY`, and an HTTPS root `CMS_NOTIFICATION_CMS_ORIGIN`. Use the dedicated bearer secret with an empty POST body and no query parameters. The host must support the route's 180-second duration; worker claims last 120 seconds and delivery has a 90-second budget with five-second RPC deadlines. No timer is configured by the implementation.

Keep the flag false until route administration, sender/provider verification, reconciliation and staged acceptance are complete. Notification-bearing form publication is still blocked. Endpoint responses contain counts only and return a failure status for failed, retry-pending or unacknowledged jobs. Monitor those states; do not treat an HTTP failure as permission to reset idempotency keys or first-attempt timestamps. Actual provider acceptance, lost acknowledgements, approved-recipient revocation, multi-route partial failure and expired uncertain sends require staged checks. These settings are outside the base preflight and have not been supplied or activated by local implementation.

### Notification reconciliation gate

Keep `CMS_NOTIFICATION_RECONCILIATION_ENABLED=false` until migration 390 and provider receipt matching are verified in staging. This endpoint uses the existing Resend key for GET retrieval and the service database key only for recording verified evidence. It sends no email. Test revoked approval, active worker conflict, wrong provider reference and lost-response replay before client use. Client confirmation/recovery controls remain pending.

### Notification worker health (migration 393)

The disabled notification worker now also requires `CMS_NOTIFICATION_DEPLOYMENT_ID`, a UUID unique to the deployed worker/configuration. Rotate it when replacing that configuration. Apply migration 393 before enabling the updated runtime. It records only deployment ID, HTTPS CMS origin, worker contract version `notification-1`, last-run health and a database timestamp. The health table and read/write RPCs are service-only.

After an authorized batch, the worker records healthy only if no outcomes failed, await retry or lack acknowledgement. Empty clean batches also report healthy: they demonstrate runner/database operation, not provider delivery. Exceptions attempt an unhealthy report; a failed health write returns HTTP 503. Disabled/unauthorized requests do not write health. Responses verify deployment/origin/status/version and a timestamp within 30 seconds before reporting success.

Health lookup requires the exact deployment and CMS origin. Evidence is fresh for five minutes, with five seconds of future clock tolerance. Schedule authorized runs more frequently than that before relying on freshness; no schedule has been installed. A failure supersedes prior health. If the database is unreachable, the previous observation expires. Neither fresh health nor a historical provider receipt is sufficient by itself to enable notification forms.

Pending release integration must pin the accepted deployment for the website, combine current worker health with staged provider/recipient acceptance and current route approval, and recheck dependencies when publishing. Hosted deployment, scheduler operation and provider delivery remain unverified.

Worker-health verification: all 2,225 CMS tests, TypeScript, production build and offline migration planning through 393 pass. Database tests cover service-only access, exact deployment/origin lookup, failure replacement and expiry. Runtime checks cover empty clean runs, errors, authorization, failed writes and mismatched/stale receipts. Logs: `/private/tmp/cms-worker-health-{tests,db,types,full,build,migrations}.log`. No hosted migration, scheduler activation or email occurred.

### Deployment-specific provider acceptance (migration 394)

The production worker now acknowledges provider results through `accept_notification_dispatch_for_deployment`. This retains the existing lease/dispatch/provider conflict checks and atomically records the deployment UUID, CMS origin, provider reference and observation time. Duplicate acknowledgements retain one deployment receipt. The private receipt table has no browser grants. Reading an already accepted dispatch skips sending and does not create evidence for another deployment.

A deployment receives credit only when the frozen message contains the exact generated closing CMS-link and sign-in instructions for its configured origin. An old-origin or legacy message still receives its durable acceptance acknowledgement, but no credit for the replacement origin. This prevents losing delivery receipts merely because a deployment moved. Reconciliation records provider acceptance but does not manufacture evidence that a particular worker called the provider.

Service-only `get_notification_route_delivery_evidence` combines three independent facts: current route approval; fresh healthy worker evidence for the exact deployment/origin; and a completed job with an accepted provider reference credited to that deployment/origin and the current route revision, sender and recipients. It returns booleans and identifiers, excluding addresses and email content. Historical acceptance alone does not prove inbox delivery or enable publication.

Remaining release work: bind each website to its approved deployment/configuration, check this evidence atomically at publication, connect trusted validation/dependent readers, and verify the deployment and provider in staging. No notification publication gate has been removed. The staging website/Supabase target has been requested from the user; independent implementation continues while that information is pending.

Deployment-receipt verification: 2,225 CMS tests, production build, TypeScript and offline migration planning pass. After tightening matching to the exact generated message suffix, the actual-database lifecycle test, TypeScript and migration plan were rerun successfully. Tests cover denied browser writes, lost leases, receipt replay, old-origin acknowledgement without deployment credit, failed-job exclusion, wrong deployment/site and failed worker health. Logs: `/private/tmp/cms-deployment-receipts-{tests,db,types,full,build,migrations}.log`. No hosted migration or email occurred.

### Website deployment binding (migration 395)

`bind_notification_deployment(site, expectedRevision, requestId, deploymentId, cmsOrigin)` is a service-only deployment operation. A non-null binding requires fresh healthy evidence for that deployment/origin. The website lock and expected revision prevent conflicting changes. Persist and reuse the same request UUID if its response is lost: replay returns the original receipt without restoring that historical configuration over a later change. Reusing the UUID with different arguments is rejected. Passing null deployment and origin clears a binding with the same version protection, even when the worker is unhealthy. This operation does not send email or enable publication.

Private configuration and request receipts retain the website, revision, deployment and origin. Browser roles cannot change them. There is no automatic binding based on whichever worker most recently ran. Deployment administrators must select the intended environment; the staging target is still pending user input.

Trusted form evidence now includes the current binding revision, deployment/origin, fresh worker health and per-route acceptance evidence for that deployment and exact recipient revision. Validation reports an unbound website, unhealthy worker, mismatched evidence or unproven deployment. All-positive evidence still leaves the existing notification publication gate in place until the final database publication guards and dependent public readers are connected. Inbox-only forms are unchanged.

Binding verification: all 2,227 CMS tests, TypeScript, production build and offline migration planning through 395 pass. Database coverage includes browser denial, healthy-binding prerequisite, revision conflicts, exact replay, changed-key rejection, clearing during failure and replay after clearing without reactivation. Worker diagnostics cover missing binding, stale/unhealthy evidence, route-revision mismatches and preservation of the publication gate. Logs: `/private/tmp/cms-notification-binding-{db,tests,types,full,build,migrations}.log`. No hosted configuration, migration or email occurred.

### Publication-time notification checks (migration 396)

The authenticated `cms.publish` path now rechecks delivery dependencies for forms before invoking the existing approval/validation/publication workflow. Scheduled publication already calls this same path. The previous implementation and assertion helper are private; browser roles cannot bypass the wrapper. Inbox-only forms retain their existing publication behavior.

The assertion validates the route-ID list, locks the deployment binding, worker-health row and selected recipient routes, and checks current approval plus deployment-specific provider acceptance. Worker freshness uses wall-clock time after locking, so a long transaction cannot make an old heartbeat appear fresh. Route edits and deployment changes serialize against publication. Recipient revisions without a qualifying completed-job receipt are rejected even if a previous validation receipt passed. The database distinguishes missing binding, stale worker health, revoked approval and unproven delivery; existing editor error handling keeps raw database errors private.

The trusted form validator still blocks notification rollout. Publication tests use an explicitly synthetic trusted receipt to exercise the database guard independently; they do not prove that live forms are ready. Remaining work includes validating the full notification-enabled path, dependent public readers/intake behavior, deployment scheduling and hosted end-to-end acceptance. Root-only fixture updates are not a supported publication API.

Publication-guard verification: all 2,227 CMS tests pass after removing an optional shared error-wording change that invalidated legacy source snapshots. TypeScript and production build pass. Final lock ordering and post-wait health-expiry changes pass focused actual-database publication/receipt tests and offline migration planning through 396. Tests cover valid evidence, unbound website, revoked approval, stale health, changed route revision, malformed route lists, private-helper bypass denial and inbox-only publication. Logs: `/private/tmp/cms-notification-publish-{db,types,full,build,migrations}.log`. No hosted migration, live publication or email occurred.

### Current public-form eligibility (migration 397)

The server-only published-form reader now rechecks notification eligibility against the published definition, independently of newer drafts. Inbox-only forms retain their normal behavior. Forms with notification routes return unavailable if their binding is missing, worker health is stale/failed, current recipients are unapproved, or the selected deployment lacks accepted delivery evidence for the current route revision. Invalid, duplicate and oversized route lists fail closed. The reader performs no writes or sends.

Read-time freshness uses statement time. The existing published-form response shape is unchanged, and the HTTP projection remains responsible for excluding private routing details. The previous reader and internal predicate are private. This is defense in depth for public source reads, not notification rollout: trusted validation and page-family compatibility fences remain in place until activation is fully integrated. Atomic new-submission intake checks, retry preservation through outages, and dependent page-family compatibility remain next.

Public-reader verification: all 2,227 CMS tests and offline migration planning through 397 pass. Actual database tests cover eligible reads, private-source denial, revoked routes, stale worker health, changed recipient revisions, inbox-only publication and withdrawal. One MICE compatibility expectation now correctly treats a delivery-ineligible form as absent, while its draft-versus-published check remains intact. No TypeScript or UI source changed, so the existing build evidence was not repeated. Logs: `/private/tmp/cms-public-notification-form-{db,full,migrations}.log`. No hosted migration, publication or email occurred.

### Submission-time readiness and outage recovery (migration 398)

New enquiry writes now check notification dependencies in the same transaction as saving the enquiry and queueing its notification job. The wrapper retains the existing website serialization, verifies the exact current published form, and invokes the locked delivery assertion. A readiness change after the HTTP form read therefore cannot bypass the database check. Generic and career intake continue through the same protected persistence function.

An existing request key bypasses the new readiness assertion only to reach the original exact-replay checks: form, revision, answers, consents and attribution must still match. This recovers an already committed enquiry during worker failure, recipient revocation or withdrawal without duplicate leads/jobs. The intake definition reader likewise allows the exact saved request to retrieve its original definition, while returning unavailable for a new request with invalid delivery readiness.

Both operations remain service-only. Their previous implementations are private, including from the service role, so adapters cannot call an unchecked fallback. HTTP origin/rate/challenge/answer checks remain unchanged. The storage rollback fixture now includes explicit synthetic readiness evidence instead of bypassing delivery prerequisites; it removes that evidence after its assertions. No production configuration or email is involved.

The HTTP integration fixture also supplies explicit synthetic delivery readiness, then removes it. A new HTTP request is rejected as unavailable after removal, while the committed request returns its original reference. The fixture still checks normalized answers, challenge rejection, and exactly one lead/notification job for the submitted request. Both fixture setups clean up their synthetic proof records.

Intake verification: all 2,227 CMS tests and offline migration planning through 398 pass. Focused actual-database and HTTP checks cover readiness revocation, new-request rejection, exact receipt recovery, changed-answer rejection, private fallback denial and atomic rollback when notification queue creation fails. No TypeScript/UI source changed; build checks were not repeated for this SQL-only batch. Logs: `/private/tmp/cms-notification-intake-{db,db-final,full,migrations}.log`. No hosted migration or email occurred.

### Trusted notification-enabled form validation (migration 399)

Current status supersedes earlier notes that the trusted validator always blocks notification-bearing forms. `form-2` can now certify the exact saved form revision when all structural checks pass and its private evidence proves current route approval, historical acceptance, an explicit website deployment binding, fresh healthy worker evidence, and provider acceptance by that deployment for each selected route revision. Missing or mismatched evidence remains blocking. File-upload fields remain unsupported.

The ordinary advisory validator retains its notification fence: browser-supplied content cannot certify delivery. Only the trusted worker replaces that one advisory finding after its revision-bound evidence checks succeed. Migration 399 changes the required form validator policy to `form-2`; existing `form-1` receipts no longer authorize publication and must be refreshed. Inbox-only forms also receive the new version without requiring notification evidence. Publication and intake still recheck live dependencies under their database locks.

The actual database test now runs trusted validation, stores its real `form-2` receipt, publishes the approved form, reads it publicly, submits an enquiry and recovers its receipt through recipient revocation. Earlier synthetic readiness fixtures remain clearly identified: no real provider/deployment has been verified. Contact/MICE/career-specific compatibility gates still need their controlled integration with the eligible published-form source; this batch does not claim those page families can yet use notification forms. Hosted migration, a real staged delivery probe and client acceptance remain pending.

Form activation verification: all 2,227 CMS tests, TypeScript, production build and offline migration planning through 399 pass. Focused checks exercise trusted positive activation, rejection of old validator versions, missing binding/health/recipient receipts, route-revision mismatches and unsupported file fields; the advisory validator remains conservative. Logs: `/private/tmp/cms-form-activation-{tests,db,types,full,build,migrations}.log`. No live provider request, email or hosted migration occurred.

### Contact-page notification compatibility (migration 400)

Contact form evidence now delegates notification eligibility to the guarded published-form source instead of rejecting every nonempty route list. The contact publication trigger retains form identity/language/structure/file checks and performs the locked notification assertion for every required form. The public page reader hides `/contact` when any visible or scheduled form dependency is unavailable, rather than exposing a page whose form cannot be loaded. Other page paths retain their existing readers.

The contact server resolver accepts notification routes only from its authoritative published-form callback; it still rejects missing/foreign/invalid forms and attachments, and returns record/revision/locale bindings only. The ordinary draft/advisory validator remains conservative. No notification route IDs, recipient addresses or frozen email content are exposed in client bindings.

The actual contact release test now uses explicit synthetic delivery evidence and real trusted validation/approval/publication. Recipient revocation hides the page; restoration makes it available again. Worker failure after page validation blocks the next release, retains the existing published pointer and makes the public page unavailable until health is restored. Existing media, route identity, unsupported-section and withdrawal checks remain. MICE/career compatibility and hosted delivery/client acceptance remain pending.

Contact compatibility verification: all 2,227 CMS tests, TypeScript, production build and offline migration planning through 400 pass. Four resolver tests preserve identity/privacy and attachment checks; actual database release tests cover eligible notification forms, revoked recipient/worker dependencies, recovery, media changes and withdrawal. The existing CMS contact route returns unavailable without falling back to legacy submission when CMS delivery is selected. Logs: `/private/tmp/cms-contact-notifications-{tests,db,types,full,build,migrations}.log`. No hosted migration or email occurred.

### Career application notification compatibility (migration 401)

Career draft/public evidence now obtains notification eligibility from the guarded published-form source. Trusted career validation no longer rejects every notification route, but still requires exact form identity, language, structural validity and matching available reference evidence. File uploads remain blocked. The career publication trigger also locks and rechecks the selected form's notification dependencies before releasing the job.

Public job reads and application-form reads become unavailable when required recipient approval or deployment readiness fails. Durable applications still recover their original receipts through that outage or job withdrawal; new applications fail closed. The integration test uses synthetic readiness evidence and real trusted form validation, approval and publication before exercising the career release/intake path. It checks one queued notification for the accepted application, outage rejection, exact retry recovery and restored public availability. MICE compatibility and hosted delivery/client acceptance remain pending.

Career compatibility verification: all 2,227 CMS tests, TypeScript, production build and offline migration planning through 401 pass. The final integration fixture was strengthened to publish the form through real trusted validation/approval instead of a root pointer update; its focused database test also passes. Logs: `/private/tmp/cms-career-notifications-{tests,db,types,full,build,migrations}.log`. No hosted migration, provider request or email occurred.


### Corporate/MICE notification compatibility (migration 402)

The delivery-aware private compatibility helper combines current form notification availability with the existing corporate form structure and required mapping checks. Migration review, publication evidence, release assertions and public MICE reads use it. Release also locks and rechecks notification dependencies through the shared delivery assertion. The legacy advisory helper remains conservative.

The server form resolver accepts notification-bearing forms only through its authoritative published-form callback; other compatibility findings still block resolution. Its output contains form bindings, not recipient routing. The integration fixture supplies explicitly synthetic delivery readiness and a published form pointer, then exercises the real MICE migration and page validation/approval/publication path. Revoking the recipient route hides the public page; rolling back that revocation restores it. This is local compatibility evidence, not provider delivery proof.

Verification: all 2,227 CMS tests, TypeScript, production build and offline migration planning through 402 pass. Focused resolver and database checks pass. Logs: `/private/tmp/cms-mice-notifications-{tests,db,types,full,build,migrations}.log`. No hosted migration, provider request or email occurred.

Contact, career and MICE notification forms are now locally integrated. Remaining activation work includes a supported initial delivery-proof workflow, actual deployment/recipient verification, scheduler operation and client acceptance. The target staging website and Supabase project are still needed before hosted checks can proceed.


### Initial verification message protocol (local foundation)

Normal form publication requires delivery proof, while normal notification jobs require a submitted published form. Initial setup therefore needs a dedicated verification workflow; inserting fake enquiries or marking a route delivered is not an activation procedure.

`lib/cms/notification-probe.ts` now defines the initial protocol and orchestration contract. Each probe binds a unique ID, website, approved recipient revision, deployment UUID and exact HTTPS CMS origin. Its generated email explicitly identifies a setup check and explains that provider acceptance does not prove inbox delivery. No applicant data or editable test-recipient override is accepted.

The orchestrator reads durable state first, requires preparation before provider access, reuses the frozen message/key/time, skips accepted messages, rejects unavailable or expired attempts, and verifies the exact acceptance receipt. It can use the existing Resend transport. The adapter is responsible for current authorization, route/binding checks, concurrency and durable storage; the TypeScript identity contract alone is not authorization. There is no enabled endpoint or adapter yet. Probe receipts do not currently contribute to form readiness.

Next implementation: authenticated explicit request/confirmation with an immutable actor-bound receipt; private probe storage and lease/recovery operations; current route/deployment checks; server runtime adapter; scoped delivery evidence integration; administrator recovery/status UI. After these pass locally, verify an authorized real message on the chosen staging deployment and record actual recipient receipt separately from provider acceptance.

Verification: four focused tests and TypeScript pass (`/private/tmp/cms-notification-probe-{tests,types}.log`). Tests cover lost acceptance writes, duplicate avoidance after acceptance, storage failure, identity/route/deployment tampering, payload changes, expiry and deadline handling. No database, runtime route or provider configuration changed in this batch.


### Authorized verification requests (migration 403)

`request_notification_probe` accepts an explicit `request` or `cancel` command from a signed-in administrator with whole-site lead approval permission. The command pins the route revision, website deployment-binding revision and request UUID. New requests require approved current recipients, a matching deployment binding and fresh healthy worker evidence. The private row freezes the approved sender/recipients and exact deployment/origin without creating a customer enquiry. Its client receipt contains identifiers and state, not email addresses.

Requests are scoped to website, actor and request UUID. Exact retries return the saved receipt after current permission checks; a different command cannot reuse that identity. Cancellation marks a pending request cancelled, or creates a cancellation fence before a delayed request arrives. Replay of a cancelled request stays cancelled. This migration has no worker claim or send operation: the forthcoming delivery adapter must recheck current authorization/configuration and implement lease-aware cancellation before dispatch. Pending requests do not count as delivery proof.

Focused database checks pass for permissions, private-table access, scope/revision mismatch, immutable recipient snapshots, exact recovery, revoked routes, stale worker health, cancellation and permission revocation. Offline migration planning includes 403. No hosted migration or email has run.

Regression verification for migration 403: all 2,232 CMS tests pass; offline migration planning succeeds. Logs: `/private/tmp/cms-probe-requests-{db,full,migrations}.log`. No application runtime source changed in this batch, so the previously passing TypeScript/build checks were not repeated.


### Durable verification dispatch (migration 404)

Service-only probe claim/read/prepare/accept operations now persist a 120-second lease, frozen setup message, first-attempt time and provider receipt on the private verification request. Claims require the exact saved deployment/origin and reject an active lease. Preparation generates the fixed setup message from the approved saved recipient snapshot; the TypeScript orchestrator checks that template before any provider call. Recovery after an expired lease preserves the message, key and timestamp. Accepted probes return their saved receipt without another send, including after recipient revocation. Conflicting provider references are rejected.

Readiness rechecks the initiating administrator's current whole-site lead approval permission, membership expiry/revocation, exact binding and route revisions, sender/recipients and fresh healthy worker evidence using wall-clock time. Unavailable dispatches hide the message. Attempts near or beyond the provider idempotency window require reconciliation. A cancellation before preparation, including after a claim, prevents preparation. Once preparation has committed, cancellation reports `notification_probe_delivery_started`; it cannot promise that an uncertain in-flight message was cancelled.

Focused real-database checks exercise the TypeScript delivery orchestrator against these operations with a synthetic provider, including a lost acknowledgement, stable retry, accepted-message skipping, lease replacement, conflicting receipts, cancellation timing, expired attempts and revoked authorization. No provider call occurs in these tests. Worker HTTP/runtime integration, administrator controls, reconciliation and readiness proof integration remain pending. A saved probe acceptance is not yet used to unlock form publication.

Verification for migration 404: all 2,233 CMS tests and offline migration planning pass. Logs: `/private/tmp/cms-probe-dispatch-{db,full,migrations}.log`. This batch changes SQL and database tests; no hosted migration, live email or application runtime activation occurred.


### Verification runtime (disabled by default)

`POST /api/cms/workers/notification-probes` connects the durable probe operations to the existing single-attempt Resend transport. It requires `CMS_NOTIFICATION_PROBES_ENABLED=true` **and** the notification worker configuration/enablement above, including its bearer secret, deployment UUID and HTTPS CMS origin. Migration 404 must be applied first. The JSON body contains only `probeId`, `websiteId`, `routeId` and `routeRevision` UUIDs from an authorized saved request. Deployment/origin come from server configuration; recipients and message content come from private storage. No scheduler is installed.

Configuration and bearer authorization are checked before reading the bounded 4 KB body or making upstream calls. Claims and dispatches must match the requested identity. The runtime freezes before sending, uses the existing provider tag/key and verifies persisted acceptance. Its response is only `{accepted:true}`; provider and database failures are sanitized and instruct recovery of the same request. This indicates provider acceptance, not inbox delivery. The 120-second database lease and 90-second delivery budget remain in effect; an active lease prevents immediate concurrent recovery.

Administrator request/confirmation/recovery controls and readiness-evidence integration are still pending. This endpoint alone does not unlock form publication, create requests, or authorize sending to arbitrary recipients. No flag was enabled or real email sent during implementation.

Runtime verification: 12 focused tests, all 2,236 CMS tests, production build and TypeScript pass. The first parallel TypeScript check encountered temporarily inconsistent generated Next route types while the new route was being built; the post-build check passes. Logs: `/private/tmp/cms-probe-runtime-{tests,full,build,types}.log`. Tests use synthetic database/provider responses; hosted delivery remains unverified.


### Initial delivery proof integration (migration 405)

Accepted setup verification dispatches now contribute to the same trusted form diagnostics and deployment-specific evidence used by publication, public reads and intake. Proof requires a frozen message with a provider receipt, matching current sender/recipients and route revision, the current website binding revision, and the exact deployment UUID/CMS origin. Pending/prepared requests grant no evidence. The helper is private; existing service-only evidence readers retain their grants. Existing completed lead-notification proof remains supported.

Current route approval and fresh worker health remain separate mandatory gates. An accepted historical message does not establish current health or inbox receipt. Changing a binding revision, route revision or recipients invalidates setup proof; an accepted receipt remains recoverable even when it no longer qualifies for publication.

The actual database integration now demonstrates: unproven form fails trusted validation → authorized request → frozen verification send with synthetic provider acceptance → trusted validation succeeds → review/approval → publication → public lookup. The fixture asserts no customer-notification dispatch was fabricated for that route. It then checks public withdrawal for changed binding/route/recipient details or failed worker health and restoration after rollback. Administrator confirmation/recovery controls, expired-uncertain-send reconciliation and hosted provider/client acceptance are still required.

Verification for migration 405: all 2,236 CMS tests, production build, TypeScript and offline migration planning pass. Logs: `/private/tmp/cms-probe-evidence-{db,full,build,types,migrations}.log`. Provider acceptance in the integration test is synthetic; no real email or hosted migration occurred.


### Administrator verification API (migration 406)

`POST /api/cms/notification-probes` uses the normal authenticated CMS bearer session. `context` returns the current route/binding revisions, deployment/origin and readiness flags for a selected route. `request` and `cancel` forward exact identifiers to the actor-scoped request transaction. `status` returns only the requesting administrator's saved receipt and delivery state (`ready`, `in_progress`, `accepted`, `unavailable`, `reconciliation_required` or `cancelled`), timestamps and provider reference. Neither read exposes recipient addresses or message content.

Whole-site lead approval permission is required on each database read and mutation; another approver cannot retrieve the creator's request by its UUID. API commands reject extra destination/deployment fields, cross-origin calls and invalid identities. Returned context, receipts and state combinations are verified before forwarding to the browser. The API does not execute a provider send: explicit confirmation/execution and durable browser recovery UI remain to be connected. Worker/provider credentials are never returned to the client.

Verification for migration 406/admin API: all 2,238 CMS tests, production build, TypeScript and offline migration planning pass. A final additional guard rejecting a cancelled status with a recorded send attempt passes focused tests and TypeScript. Logs: `/private/tmp/cms-probe-admin-{tests,db,full,build,types,migrations}.log`. No hosted migration or live email occurred.


### Explicit administrator execution

The administrator API now supports `execute` with the saved request's site, route, route revision, binding revision and request UUID plus `confirmed: true`. It first reads creator-scoped status through the user's authenticated database session and verifies every supplied identity. Missing, cancelled, unavailable, active-leased or reconciliation-required requests cannot start a send. Accepted requests return their existing status without invoking the runtime, even when delivery is currently disabled.

For a ready request, the server calls the separately gated probe runtime using only the saved probe identity. It then rereads status with the user's session and requires accepted status plus unchanged actor/probe/deployment/origin. Provider or acknowledgement failures return a recoverable error for the same request; no replacement request is created. This endpoint has the same 180-second host requirement as the worker route. Browser confirmation and durable recovery UI are still pending; no live verification has been executed.

Execution verification: four focused administrator API tests, all 2,240 CMS tests, production build and TypeScript pass. Logs: `/private/tmp/cms-probe-execution-{tests,full,build,types}.log`. No database migration was added in this batch, and no live email was sent.


### Client verification controls

In Enquiries → Notification recipients, approvers can select a loaded approved route, check readiness, review the sender/recipients and explicitly confirm a setup email. The panel pins the reviewed route and binding revisions. Recipient changes require a reload; missing approval/deployment/health blocks confirmation. It participates in the existing unsaved-change warning.

Before creating a request, the panel stores only identifiers and send/cancel intent in account/site-scoped local storage and uses Web Locks for two-tab coordination. Lost replies retain the same request; reloading and “Recover and send verification” reuses it. “Refresh verification status” reads without sending. “Cancel unsent verification” persists cancellation intent before calling the database fence. Receipt scope and actor must match before recovery is cleared. Accepted status explains that provider acceptance is separate from inbox confirmation. Expired uncertain sends remain pending for reconciliation rather than being silently discarded.

Verification: all 2,240 CMS tests, production build and TypeScript pass. Local production UI at `http://localhost:3002/cms` was checked with Playwright (Browser plugin unavailable) at 1280×900 and 390×900, using synthetic auth/API responses and disabled notification delivery. Checks cover page identity/nonblank content, no framework overlay or application runtime errors, recipient confirmation before any request, unhealthy readiness, lost-response/reload recovery, unchanged request identity, two-tab storage synchronization, cancellation without delivery, mismatched-actor refusal and no horizontal overflow. Screenshot inspection confirms readable mobile confirmation and desktop accepted status. The initial locator mismatch and blank-tab fixture storage error were corrected in the test harness; they were not application failures.

Logs: `/private/tmp/cms-probe-ui-{full,build,types,browser}.log`. Browser script: `/private/tmp/check-probe-ui.mjs`. Screenshots: `/private/tmp/cms-probe-review-{1280,390}.png`, `/private/tmp/cms-probe-accepted-{1280,390}.png`. No real provider call or hosted migration occurred. Remaining: expired-uncertain probe reconciliation, real deployment/recipient acceptance and the broader PRD gaps.


### Uncertain verification reconciliation (migration 407)

A creator-scoped reconciliation intent now binds the saved verification probe, provider message UUID and independent recovery request UUID. Beginning requires current whole-site lead approval permission, the original requester, a prepared message and no active worker lease. The service-only finalizer rechecks access, lease, immutable message and conflicting provider receipts before recording acceptance and one immutable reconciliation receipt. Replay retains that receipt and still checks access; it does not produce another send or reconciliation row. Private tables/helpers have no direct client access.

`POST /api/cms/notification-probe-reconciliation` accepts identifiers only. Its server retrieves the provider message using the existing authenticated read-only verifier, which checks the exact dispatch tag, sender/recipients, subject/body and timestamps. Browser evidence or message content is rejected. The finalizer accepts only bounded fresh evidence matching the saved intent. The endpoint is independently disabled unless `CMS_NOTIFICATION_PROBE_RECONCILIATION_ENABLED=true`; it uses the existing CMS public/service database credentials and notification provider key. No notification worker enablement is required to inspect an uncertain historical result.

A recorded acceptance becomes ordinary probe evidence under migration 405, so changed recipient/binding configuration still cannot inherit an old proof. This establishes provider acceptance only. Client provider-reference confirmation and durable reconciliation recovery controls are the next integration step. The current panel retains uncertain requests until resolution rather than silently creating a replacement.

Focused checks cover an active lease, lease reacquisition before finalization, missing/revoked approval, creator scope, altered message, mismatched provider identity, stale evidence, immutable replay and conflicting receipts. Runtime tests prove the only provider request is GET and saved receipts skip repeat retrieval while still calling the authorization-checking finalizer. All provider responses are synthetic.

Reconciliation backend verification: three focused API/runtime tests, the expanded actual-database lifecycle, all 2,243 CMS tests, production build, TypeScript and offline migration planning pass. Logs: `/private/tmp/cms-probe-reconciliation-{tests,db,full,build,types,migrations}.log`. No hosted migration, real provider request or email occurred.


### Client controls for uncertain verification

The saved-verification panel now includes a provider message UUID field and explicit acceptance-check confirmation. It verifies the saved probe's current status and initiating actor before reviewing a reference. Confirmation persists the reconciliation command alongside the original verification request under the same account/site storage key and Web Lock. Recovery reuses the exact probe/provider/request IDs; it never falls back to the send operation while a reconciliation is saved. Matching reconciliation and final accepted-status receipts are required before clearing recovery.

Refresh status remains read-only. A rejected cancellation after preparation no longer traps recovery: a verified unresolved prepared attempt can transition from cancellation recovery to a confirmed provider check. This transition still cannot send another message. Confirmed reconciliation disables cancellation and replacement-send actions until resolved. Browser identifiers remain private to the account/site; no recipient addresses or email content are persisted.

Client reconciliation verification: 14 focused probe tests, final production build and TypeScript pass. Playwright (Browser plugin unavailable) at `http://localhost:3002/cms`, 1280×900 and 390×900, verifies original send recovery, expired uncertain status, rejected cancellation followed by reconciliation, explicit confirmation, lost response/reload, identical reconciliation IDs, mismatched actor refusal and accepted-status recovery. The provider send counter is unchanged throughout reconciliation. Page identity/nonblank content, no framework overlay/application runtime errors, screenshot inspection and no horizontal overflow pass. Synthetic auth/API responses only; no actual provider call occurred.

Logs: `/private/tmp/cms-probe-reconcile-ui-{tests,build,types,browser}.log`. Script: `/private/tmp/check-probe-reconcile-ui.mjs`. Screenshots: `/private/tmp/cms-probe-reconcile-confirm-{1280,390}.png`, `/private/tmp/cms-probe-reconcile-accepted-{1280,390}.png`. Full database/server behavior was unchanged in this UI batch, so the previously passing 2,243-test suite was not repeated. The local synthetic preview was stopped after verification.
