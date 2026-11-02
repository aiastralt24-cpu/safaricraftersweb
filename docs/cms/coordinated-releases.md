# Coordinated publication releases

Status: migration 197 provides locally tested atomic database publication and immutable retry receipts. It is not deployed. The authenticated client API is implemented; the initial client review console is connected, while group scheduling and coordinated cache delivery remain pending. R19 remains incomplete.

`cms.publish_release(site, request, items)` accepts a caller-generated UUID request identity and one to fifty ordered `{record, revision}` entries. It requires current publication permission for every record. Record locks use deterministic UUID order; execution uses the explicitly reviewed dependency order, with referenced records before consumers. All existing publication functions, approval/validation checks and database triggers remain active. Cyclic or otherwise unsupported dependencies fail closed rather than disabling guards.

One transaction commits the published pointers, delivery jobs, per-record audit events, release audit event and receipt. Any rejected member rolls all changes back. The receipt stores release/request identity, original actor/time, pinned items and delivery job IDs. Exact retries recover the receipt without reapplying publication, including after a later withdrawal. Changing the request contents or actor cannot reuse its identity. Replays still require current publication permissions. The returned receipt is historical evidence, not a claim that every member is still live or every cache is updated.

Local PGlite checks prove rollback after a member fails validation, successful retry, no duplicate delivery on receipt replay, rejected forged/duplicate/inaccessible members, denied editor/service-role execution, changed-request rejection and no resurrection after withdrawal. The database suite passes 250 tests, with one existing environment-dependent skip. Real multi-connection concurrency remains unverified.

Remaining requirements:

- Automatic dependency analysis and affected-location review beyond the initial manually ordered release manifest.
- Real multi-tab and provider acceptance of persistent recovery, including a safe operator workflow for a permanently rejected or revoked-access request.
- Scheduled release groups that pin the whole manifest and revalidate every member before execution.
- Shared delivery status and coordinated cache refresh. Database atomicity alone does not guarantee visitors see a consistent cached release; the PRD's cross-record public visibility and 60-second delivery target remain unproven.
- Hosted concurrency, failure/retry, dependency-cycle and client acceptance checks.

## Authenticated API

`POST /api/cms/releases` accepts only `{site, request, items: [{record, revision}]}`. It forwards the caller token to the fixed `publish_release` procedure, never a service credential. Inputs enforce one to fifty unique records, UUID normalization and no additional fields. Cross-origin writes, query parameters and unsupported methods are rejected. The response validates release/request identity, exact ordered revisions, distinct delivery IDs and absence of extra fields before confirming success. It always marks `deliveryStatus: "unverified"`, because an immutable receipt does not establish cache state.

After a timeout or unconfirmed receipt, retain the same request UUID and ordered manifest for retry. Do not regenerate a request identity automatically: the earlier transaction may have committed. Focused tests cover strict requests, caller authority, response mismatch, safe error handling and exact retry identity. Database tests independently cover actual replay and transaction rollback.

## Persistent client recovery foundation

`publication-release-recovery.ts` stores a bounded, strict, versioned record containing only actor ID, site/request identity, ordered record/revision IDs and creation time. Storage is account/site scoped. Pending records do not expire automatically. Corrupt or mismatched entries fail closed and are preserved; a different unresolved manifest cannot replace them. Storage readback must succeed before the release is sent. Only an exact API receipt may remove the pending entry.

`submitRecoverableRelease` requires a Web Locks-compatible coordinator, serializes by account/site, persists before sending and retains recovery on response loss. The eventual UI must provide `navigator.locks` plus same-origin `localStorage`; there is no unsafe in-tab fallback. No tokens or draft content are stored. Browser storage removal by a user, another origin/device and hostile same-origin scripts are outside this local coordination guarantee. Server receipts remain authoritative.

Nine focused recovery/API tests and TypeScript pass, covering reload, unchanged retries, storage failure, account mismatch, malformed state, unconfirmed responses and lock-before-send ordering. This foundation is now connected to the Releases screen; real simultaneous multi-tab interaction and provider acceptance remain pending.

## Client release review

The CMS Releases tab lists authorized records with pagination and allows up to fifty approved records to be selected. The client pins the selected revision, supports manual order changes/removal and checks current record identity, approval, publish permission and unexpired trusted validation before presenting acknowledgement and publication. The transaction still rechecks all requirements. Pending requests take precedence over new selections after reload and use the same manifest/request identity for recovery. Cache delivery remains explicitly unverified.

This is an initial review workflow: automatic graph ordering, complete shared-impact analysis, scheduled groups, hosted cancellation-race verification and cache consistency are unfinished. Local recovery cannot safely discard an unresolved request solely because a retry fails; migration 198 now provides server-confirmed cancellation for callers who retain publication permission. Revoked-access cases still require administrator resolution.

Browser evidence for the initial release console: local production build at localhost:3002/cms, mocked authentication/API, desktop 1280×900 and mobile 390×844. Verified two-record selection and reordering, refusal of invalid trusted validation, readiness acknowledgement, a simulated lost confirmation, page reload, exact manifest/request replay and local recovery cleanup. Browser runtime reported no page errors. A duplicate component in the heading was caught and fixed before the passing rerun. Real multi-tab contention, server-backed acceptance and coordinated cache behavior remain unverified. Full local suite passes 1,299 tests; TypeScript and production build pass.

## Safe cancellation of unresolved requests

Migration 198 adds immutable cancellation markers and `cancel_release`, sharing the publication lock order and receipt identity checks. A committed transaction returns its original receipt without withdrawal. Otherwise cancellation persists a marker that makes later publication under the same request ID fail. This closes the unsafe gap between local discard and an in-flight server request. Exact cancelled retries return the same outcome. The API `/api/cms/releases/cancel` validates either outcome; the recovery UI clears local state only after a matched response, under its existing browser lock.

Local SQL checks cover cancellation after failed validation, refusal to publish after later repair, repeated cancellation, changed request rejection, committed-result recovery and denied unauthorized cancellation. Mocked browser tests cover both outcomes at 1280px and 390px, exact manifest forwarding, recovery cleanup and no runtime errors. Real simultaneous database connections remain unverified; local tests exercise sequential orderings. Migration 198 is not deployed.

## Explicit-reference ordering assistance

The release readiness check now scans authorized stored drafts for explicit `recordId` references and offers a stable dependency-first order. Duplicate references collapse into one edge; self-links do not create artificial order constraints. References outside the selected group are counted and called out; cycles and their dependent consumers return no partial recommended order. Applying the order resets acknowledgement and preserves pinned revision IDs. Publication authorization remains entirely in existing validation and database guards.

This advisory scan is deliberately scoped: URL links, dynamic collections, asset requirements and reverse shared impact are not inferred. It scans even inactive explicit references conservatively; clients can retain a manual order for relationships already satisfied by published content. It does not certify a complete dependency graph or solve release validation against unpublished future dependencies. Malformed references, unavailable payloads and excessively complex input fail analysis.

### Selected internal page links

Ordering assistance now also matches nested `href` links against exact selected page paths in the same locale. Query strings and fragments are removed for matching. External/absolute origins, protocol-relative links, encoded paths, dot segments and trailing-slash aliases are not guessed. Duplicate selected path/locale identities fail analysis. Unmatched internal links are counted separately without asserting that their destinations exist or are published. Explicit record IDs continue to contribute dependencies. Dynamic collections, redirects, absolute same-site links, future-unpublished dependency validation and reverse impact remain incomplete. Six dependency tests and TypeScript pass.

## Release delivery status backend

Migration 199 and authenticated `GET /api/cms/releases?site=…&request=…` expose an allowlisted status snapshot. The caller must retain view permission for every member; inaccessible and unknown releases are both unavailable. No actor identities, worker leases, service credentials or raw worker errors are returned.

Each member is pending, running, retry_pending, failed, delivered or superseded. The status checks its current published pointer as well as its exact receipt delivery job. Completed invalidation of an old revision is superseded after a later release or withdrawal. Expired worker leases report retry/terminal failure rather than misleading progress. All members must be delivered for the summary to say delivered; a failed member requires attention. This is worker acknowledgement evidence, not a synthetic external cache probe or an atomic cache barrier.

Local SQL tests cover view permissions, anonymous denial, retries, terminal failure, successful delivery, later withdrawal and cancelled releases. API tests cover target identity, bounded/strict response shape, duplicate members and private-field rejection. The client delivery panel is now connected; server-backed release history is now connected; provider-backed cross-device acceptance remains pending. Real provider/cache acceptance remains pending.

## Client delivery display

The Releases screen provides a request-scoped delivery check, prefilled after confirmation or cancellation and while a request remains unresolved. Successful lookups store only the request UUID under an account/site-specific local bookmark; bookmark failure does not block publication or status display. The panel recomputes the summary from strict member data, checks response site/request identity, clears old results on every refresh, and suppresses stale async responses after unmount. A failed refresh cannot leave an earlier success visible. It presents counts, worker-exhaustion guidance, supersession explanation and expandable record details. Acknowledgement is explicitly described as worker evidence, not external verification of every cache.

Delivery-panel browser verification: local production build, mocked authentication/status API, desktop 1280×900 and mobile 390×844. Exercised in-progress, failed, superseded and acknowledged states; ignored a contradictory upstream summary; cleared acknowledged status after a failed refresh; rejected another site's response; restored the scoped lookup after hydration. No runtime page errors. Thirteen focused delivery/release/recovery tests and production build pass. Initial browser locator/hydration timing errors were corrected without weakening state assertions. Real worker delivery and provider access remain unverified.

## Server-backed history

Migration 200 lists committed/cancelled releases newest-first with a stable timestamp/UUID cursor and a bounded page size. The caller must be able to view every member; inaccessible releases and cursor boundaries are not disclosed. The authenticated history API projects only release/request IDs, creation time, status and record count. The delivery panel loads history, supports older pages and selects the corresponding request for status lookup. This avoids relying on local bookmarks for discovery.

Local SQL tests cover pagination, website separation, denied access/cursors and allowed metadata. API tests reject anonymous requests, extra/duplicate filters, malformed counts, duplicate records and unexpected private fields. Browser checks used mocked APIs on the production build to select a history entry and inspect delivery states, errors and refresh recovery at desktop/mobile sizes. Hosted cross-device access and large-history performance remain unverified.

## Recovering exhausted delivery jobs

Migration 201 and `POST /api/cms/releases/retry` permit a caller with publication permission on every release member to requeue exhausted failed delivery jobs. The function locks publication pointers before inspecting jobs, does not steal active leases or disturb existing automatic retries, and skips completed or superseded revisions. It resets only eligible job retry state and records the prior attempt count in an actor-attributed audit event. No content is republished and no publication pointers change. Repeated requests after requeue have no further effect.

The client offers confirmed retry from the needs-attention state, clears the previous status and reports whether any jobs were queued. The worker still must run successfully; a queued retry is not delivery success. A crashed final active lease must first be reaped by the existing delivery worker before manual retry is eligible. Local SQL/API and mocked desktop/mobile browser checks cover exhausted jobs, missing permission, active/automatic/completed exclusion, supersession, exact request forwarding and status returning to in-progress. Provider recovery remains unverified.

## Scheduled release groups (backend foundation)

Migration 202 adds a separate durable group schedule with the exact ordered manifest, request identity, original actor and due instant. Creation requires current approval and publication permission for every member. Exact creation retries recover the same schedule; changed actor, manifest or instant cannot reuse its request. Cancellation invalidates a claimed lease. The trusted worker claims one group with a five-minute lease, bounded recovery and eight-attempt exhaustion.

Execution temporarily uses the stored actor, rechecks through `publish_release`, restores request identity, and atomically records the schedule outcome. Every existing publication guard remains active. A changed member rolls back the entire release, including its delivery jobs. Cancelled or stale worker tokens cannot execute. The existing immutable release receipt prevents duplicate publication.

`runScheduledRelease` revalidates each pinned stored revision, with at most five validations in flight. It stops after the first failed validation batch, distinguishes invalid content from temporarily unavailable validation, and never executes after either failure. Lost acknowledgement remains unconfirmed. This orchestration is connected to an opt-in worker route below, but is not deployed or connected to client scheduling controls yet. Group listing and scheduling API are implemented below; client controls, provider deployment, races and acceptance remain pending.

Local tests cover complete group execution, no early claim, duplicate execution refusal, rollback after an edit, cancellation fencing, denied creation/claim access, expired token replacement and validation-before-execution. These are sequential local database checks; they do not prove real concurrent connections or hosted timer behavior. Future-unpublished dependencies still face the existing validation restriction; group scheduling does not bypass it.

## Group scheduling API and discovery

Migration 203 lists schedules newest-first with a stable timestamp/UUID cursor. Every member must remain visible to the caller; inaccessible cursor boundaries are rejected. Results expose only schedule/request identity, pinned members, time, status, attempts and a bounded error code. Actor identities, worker leases and stored receipts stay private.

Authenticated `GET /api/cms/releases/schedules` accepts a site and optional cursor. `POST` accepts either the strict release manifest plus `action: "schedule"` and an explicit-offset `runAt`, or `action: "cancel"`, site and schedule identity. Calls retain caller authority. Creation normalizes the instant to UTC and validates confirmation without claiming execution. Past instants may reach SQL for exact request recovery; SQL rejects past times for new requests. Cancellation requires a confirmed database response. Reads reject foreign-site, duplicate-member and unexpected private data.

Local SQL/API checks cover caller permissions, pagination, hidden members, immutable retry identity, forged actors, ambiguous timestamps and unavailable confirmations. All 1,328 CMS tests and TypeScript pass. The offline migration inventory includes 001–203; no migration has been applied remotely. The client group-scheduling controls and hosted worker activation remain pending.

## Group worker activation

`/api/cms/workers/release-schedules` accepts an empty GET or POST with a bearer secret. It is disabled by default. Activation requires migrations through 203, the existing server-only database URL/service key, `CMS_RELEASE_SCHEDULE_WORKER_ENABLED=true`, and a distinct random `CMS_RELEASE_SCHEDULE_WORKER_SECRET` (32–256 URL-safe characters). Never expose these credentials to browser code.

The route claims one due group across configured websites per invocation. It reuses the bounded HTTPS transport with a separate allowlist of group-worker and validation procedures, ten-second network timeouts, no redirects and bounded response bodies. It starts no further database operations after 240 seconds, leaving headroom within the 300-second route limit and five-minute lease. A host must actually support this runtime duration before activation; setting `maxDuration` alone does not prove provider support.

Configure a protected external timer only after staging acceptance, initially once per minute. Overlapping calls are fenced by database claims. Capacity is one group per invocation; monitor due backlog and adjust invocation frequency to the site's measured workload. Terminal blocked jobs require editorial/operator action; retry-pending and unacknowledged responses return 503. Interrupted executions recover through lease expiry and the immutable release receipt. Worker publication acknowledgement still does not prove completed cache delivery.

All 1,333 local CMS tests, TypeScript and the production build pass. Runtime tests cover opt-in configuration, the separate secret, denied caller-selected input, validation-before-execution, safe failure responses, procedure isolation and deadline exhaustion. Provider timer behavior, actual maximum runtime, concurrent claims and public delivery remain unverified. No deployment or timer was created.

## Client group schedule management

The Releases screen now lists scheduled groups, their UTC execution times, record/revision details and pending, running, published, blocked or cancelled states. It supports older-page loading and confirmed cancellation for pending/running groups; database checks still require publication permission for every member. Published entries show the request identity for delivery lookup. Failures clear stale results and foreign-site responses are rejected using the shared strict list contract.

Production-build browser checks with mocked auth/API passed at 1280×900 and 390×844: status transitions, exact cancellation target, removal of cancellation controls after confirmation, failed-refresh clearing, and foreign-site rejection. No browser runtime errors occurred. Targeted API tests, TypeScript and production build pass. Group schedule creation/recovery controls remain unfinished; hosted schedules and real access checks still require staging acceptance.

## Schedule creation recovery contract

`scheduled-release-recovery.ts` persists the account/site-scoped request, ordered pinned revisions and normalized UTC instant before transport, under a Web Lock. No tokens or content are stored. New requests require a future instant; an existing unresolved request remains recoverable after its execution time. Changing the identity, manifest or instant is refused until resolution. Only a strict matching confirmation can clear recovery, after verifying stored state has not changed. Corruption, lost responses and storage failures preserve pending state.

Four focused tests and TypeScript pass: reload/exact retry after due time, unavailable lock/storage, changed manifests, untrusted receipts, corruption and external storage mutation. This is the recovery foundation; the creation form and real simultaneous-tab acceptance are still pending.

## Client group schedule creation and recovery

The Releases screen now schedules its selected, reviewed and acknowledged revision order with an explicit date/time and UTC offset. The form shows the normalized execution instant before confirmation. It uses the persistent recovery contract and browser Web Locks, displays unresolved identity/time/revisions after reload, and retries the original request without requiring the old time to remain future. Confirmed creation clears the selection and directs the client to refresh schedule status. It does not claim the group has executed.

Production-build browser verification with mocked auth/API covers readiness gating, dependency-first order, UTC normalization, a lost response, reload, identical recovery payload and local storage cleanup at desktop/mobile sizes. Screenshots were inspected and no runtime errors occurred. All 1,337 local CMS tests, TypeScript and production build pass. Real concurrent tabs, provider execution, revoked-access recovery and client acceptance remain unverified. An unresolved creation that cannot be recovered must retain its local record for operator investigation; no unsafe discard is provided.

## Two-tab schedule recovery evidence

Two actual Chromium tabs sharing one browser context exercised native Web Locks and localStorage on the production build. Both prepared different execution times before either submitted. The first request was held in flight; the second appeared in `navigator.locks.query()` as pending while the first held the account/site lock. Only one API request was sent. After the first response was deliberately lost, the second tab refused its replacement request, loaded the original recovery record and recovered using the original request, ordered revisions and execution instant. A stale retry from the first tab also retained that exact identity. Recovery storage cleared and no page errors occurred.

This closes the local browser lock-contention check for schedule creation. Authentication and server responses were mocked, so database idempotency, hosted multi-connection races, cross-device behavior and timer/cache acceptance remain separate unverified requirements. The test script is `/private/tmp/cms-group-tabs-ui.mjs`; the assertions observed actual held/pending locks rather than relying on a fixed delay.
