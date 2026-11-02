# Publication scheduling

Status: contract, durable SQL queue, database adapter and worker orchestration locally tested; **not an enabled client workflow**. The authenticated `/api/cms/schedules` route and shared scheduling panel are connected to all existing record editors. No timer or hosted worker has been deployed. Migration 196 has not been applied to a provider. R19 remains open.

`publication-schedule.ts` pins site, record, revision, operation and an explicit-offset execution instant. Requests reject past instants and local dates without offsets; accepted dates normalize to UTC. The UI must resolve daylight-saving ambiguity and show the chosen local zone and absolute instant before confirmation. The database must independently validate time.

`publication-schedule-worker.ts` reuses trusted stored-content validation immediately before scheduled publication. Receipt failure or content errors prevent execution. Withdrawal skips content validation but still requires the pinned published revision and ordinary authorization guards. Lost acknowledgements are reported as unacknowledged; the worker never overwrites a potentially committed release with a failure.

## Next implementation boundary

Migration 196 implements items 1–5 below, retaining the existing publication functions and triggers. The worker-only execution function temporarily installs the stored scheduling actor for authorization/audit and restores request identity before returning. Database tests verify permissions, cancellation fencing, replay, expired leases, retry exhaustion, edited revisions, revoked membership, expired validation, newer-release withdrawal protection and an integrated real-adapter release. These are local sequential interleavings, not concurrent hosted connections.

Requirements before exposing this functionality:

1. Store the scheduling actor, pinned revision, due instant, operation, status, attempt count and audit trail. Do not accept an actor from the browser.
2. Authorize creation/list/cancellation per site and record. Permit cancellation only while executable; serialize cancellation and execution on the schedule lock.
3. Claim only due jobs using expiring, fenced leases. Recover abandoned leases with bounded retries. Prevent duplicate active operations and duplicate acknowledgements.
4. Atomically verify the lease, due time, cancellation, scheduling actor's current membership/permission and pinned current/approved revision. Invoke all existing publication guards. For withdrawal, require the expected published revision so later releases cannot be withdrawn accidentally.
5. Commit publication/withdrawal, delivery enqueue, schedule completion and actor-attributed audit together. A validation receipt alone must never authorize publishing. Do not bypass database guard triggers or resurrect revoked privileges.
6. Add API and admin controls with explicit zone/instant confirmation, cancellation, status and actionable blocked reasons. Schedule execution is distinct from completed cache delivery.
7. Test concurrent workers, edit/review/revocation races, cancellation races, stale leases, lost responses, retries, withdrawal after a newer release, and real staging worker wakeups before activation.

Coordinated multi-record releases remain separate unfinished work; this contract does not imply atomic release groups.

Verification: contract/orchestration tests, local PGlite database lifecycle and real adapter integration pass; TypeScript and production build pass. Real concurrent worker/cancellation races, hosted database behavior and worker wakeups remain unverified. The journey UI supports explicit-offset confirmation, schedule listing and cancellation. The same panel is now connected to pages/homepage, journal, destinations, expeditions, specialists, testimonials, forms, menus, settings and documents. Each uses the saved record revision and current publish permission; unsaved changes disable scheduling, including pending document-file changes. Unsupported page routes and non-English settings keep scheduling disabled. API checks use caller credentials, strict request fields, bounded responses and tenant/record identity validation; actor identities and lease tokens are never returned. The schedule status records publication separately from eventual cache delivery.

Browser verification: production build on localhost:3002/cms, mocked auth/API, desktop 1280×900 and mobile 390×844. Created a pinned release, confirmed +05:30 conversion, cancelled it, created a withdrawal and verified malformed offsets disable confirmation; no runtime errors or horizontal overflow. Browser plugin unavailable; regular Playwright used. This does not prove provider permissions, real time-based execution or cache delivery.

## Worker deployment (not activated)

`/api/cms/workers/schedules` now connects the durable queue and trusted validator. Enable only after migration 196 and staging acceptance, using `CMS_SCHEDULE_WORKER_ENABLED=true`, a distinct random 32–256 character `CMS_SCHEDULE_WORKER_SECRET`, and the server-only CMS database credentials. Configure a host-supported timer to send GET or POST with `Authorization: Bearer <schedule worker secret>`, no query and no body. Never place the secret in a URL or public environment variable.

This is a database-wide scheduler: it processes due schedules across websites in that CMS database, rechecking each stored actor's site/record permissions. Run it only on the trusted CMS worker deployment. Delivery workers remain responsible for each site's cache invalidation. Each call claims at most ten schedules with 120-second leases; individual RPCs time out after ten seconds and the route allows 60 seconds. A timer is not installed by adding the route. Choose cadence and capacity against the agreed execution latency, queue depth and hosting limits; schedules may run after their due instant, never promise exact-second execution.

Responses contain counts only. `published`/`unpublished` mean the database transition committed and delivery was enqueued, not that every cache is updated. `blocked` requires editorial/operator review; `retryPending` or `unacknowledged` returns HTTP 503 for retry visibility. Authentication failures return 401; disabled/unconfigured runtime returns 503. Monitor blocked counts even on HTTP 200 and inspect the per-record schedule list. Verify unauthorized requests cannot claim work; verify cancelled, edited and revoked-access schedules cannot execute; test provider restarts and concurrent timer calls before enabling.

Local runtime verification covers opt-in/authentication, request restrictions, transport allowlisting, HTTPS origins, bounded/malformed upstream responses, validation-before-publication order, aggregate-only output and safe retry/failure reporting. Hosted timer, concurrency and deployment remain pending.

Cross-editor browser verification: all eleven additional editor views created a schedule with the exact saved record/revision through mocked API/auth on the local production build. Tested desktop 1280×900; homepage panel additionally checked at 390×844. Invalid fixture titles/empty testimonial quote correctly triggered existing migration guards; fixtures were corrected, without changing those guards. Full local suite: 1,287 tests pass; TypeScript and production build pass. Other editor-specific dirty, permission, locale and upload-state combinations still need full hosted client acceptance; no claim of real schedule execution is made from these browser checks.
