# Independent enquiry storage

## Current workflow — 29 October 2026

The local CMS now includes an enquiry inbox, manual lifecycle/ownership editing, [duplicate review and controlled merging](lead-duplicates.md), [automatic assignment](lead-routing.md), [personal in-app reminders](lead-reminders.md) [exhausted notification recovery](lead-notification-recovery.md) and [permission-controlled enquiry exports](lead-export.md). These are locally verified; provider configuration, hosted workers, real ingress/MFA/concurrency checks and client acceptance remain pending. A queued notification or retry is not proof of external delivery.

The sections below retain earlier implementation evidence; their historical “remaining” lists do not supersede the current feature guides or [current audit](current-audit-and-plan.md).

## Storage and implementation history

Local migration 024 adds lead records, immutable receipt events and notification jobs, separately from CMS content revisions and legacy enquiry storage. Each lead records its website, form/revision, normalized answers, exact consent evidence, attribution and retry key, with lifecycle columns reserved for the forthcoming lead workspace.

`accept_enquiry` is callable only by the trusted intake service role. Browser/anonymous/editor roles cannot call it or write lead tables. It requires a currently published form revision for new enquiries. An identical retry returns the existing receipt, including after form withdrawal; reuse of the same key with different form/revision/answers/consents/attribution fails. A website-row lock serializes intake per website and a unique request-key constraint reinforces deduplication. This is intentionally simple; throughput and real concurrent clients require staging verification.

Lead insertion, received event and pending notification job occur in one transaction. A queue insertion failure rolls back the whole new enquiry. Later notification-delivery failure must update the job rather than delete a saved lead; worker lease/retry procedures remain to be implemented. Notification payloads are not copied into the queue.

RLS reads require a current membership and an explicit permission with `content_type='lead'`, optionally bound to one lead. Generic wildcard content permissions do not expose enquiries. Membership revocation takes effect on the next read. Authenticated roles have no direct insert/update/delete grants on these tables.

The function validates envelopes and publication identity, not each dynamic form answer. A trusted service must validate the stored form definition, answers, consent versions, attribution allowlist, spam/rate checks and upload ownership before calling it. There is no public route or trusted intake orchestration yet. Form publication remains disabled pending complete validators. This migration is local only; no real enquiries or external notifications were created.

Validation: 50 PGlite DB tests passed. Intake coverage includes unpublished-form rejection, service-only invocation, duplicate retries, conflicting retries, one event/job per lead, explicit lead permission vs content wildcard, outsider/anonymous denial, membership revocation, direct-write denial, post-withdrawal retry and injected queue failure rolling back lead insertion. Tests simulate published form identity with a root fixture pointer; they do not prove a working publication policy, provider auth, real parallel transactions, rate limiting or notification delivery.

## Lead management operations

Local migration 025 adds newest-first, cursor-paginated inbox reads (50 rows, optional status filter), authorized detail reads, lifecycle updates and append-only notes. Detail includes consent/answers/attribution, latest 100 activity entries and notification state. The inbox summary does not include enquiry answers. Activity pagination beyond the latest 100 is still pending.

Mutations require both explicit lead view and edit permission, lock the row and compare its expected integer version. Each update/note advances the version and records an activity event. Stale retries fail rather than duplicating notes. Assignment requires a current member with explicit view permission for the lead; an assigned status requires an owner. Status/priority, follow-up time, outcome and external CRM reference are editable. These are fixed initial stages, not yet configurable transition policies, reminders or CRM synchronization.

`/api/cms/leads` maps strict authenticated same-origin JSON commands to those procedures with private/no-store responses. Unknown fields cannot alter original answers, consent, timestamps or permission state. No public intake route is created by this API. Existing generic database conflict messages are used for stale versions; lead-specific error wording remains to be refined.

Validation: 51 database tests, two lead API tests and TypeScript passed. Tests cover explicit permissions, current membership, owner eligibility, stale writes, note duplicate rejection and before/after audit evidence. Visual inbox, assignee picker, exports, merges, advanced filtering, notification retries and deployed concurrency/UAT remain pending. Migrations 024–025 have not been applied remotely.

## Enquiry workspace

Added Enquiries navigation with newest-first inbox, status filter/pagination, detail view, current-version status/priority/outcome/CRM-reference changes, local-time follow-up input, owner search/assignment, notes, consent/source records, latest activity and notification state. Dirty changes and unsaved notes participate in the workspace leave guard. Notes require saving lifecycle changes first. Read-only lead viewers cannot edit controls. Existing follow-up precision is retained when the date field is untouched.

Local migration 026 provides bounded eligible-owner search requiring current explicit lead view/edit permission. It also provides labels from the submitted form revision, exposing only the title and field labels to authorized lead viewers instead of the entire form payload. Assignment remains rechecked by the update procedure. Current owner display falls back to its account ID when it has not been resolved in owner search; display-name enrichment remains pending.

Validation: 52 database tests, two lead API tests and TypeScript passed. Synthetic browser fixture verified detail labels, eligible-owner selection, status/priority save, note creation and refreshed version/activity; mobile 390px and console checks passed. Fixture removed. This is not live provider persistence or UAT evidence. Search/export/merge, owner/overdue queues, full audit pagination, notifications and public intake remain outstanding.

## Notification queue processing

Local migration 027 adds service-only claim, leased input read, finish and reap procedures. Claims use `FOR UPDATE SKIP LOCKED`, bounded batches and 30–300 second leases. Every claim increments attempts and issues a fresh token. Reads and acknowledgements require the current unexpired token. Failed attempts back off exponentially (capped at one hour); eight attempts is terminal. Reaping a crashed eighth attempt records a visible failure event once. Leads and original receipt evidence are never deleted by these operations.

The adapter-driven worker reads pinned form revision routing IDs, rejects missing routes or mismatched website/lead identities, and acknowledges exact leases. Error text is restricted to safe codes, without provider details or enquiry contents. Stable per-job idempotency keys are provided to the delivery adapter. Production adapters must resolve current approved website-scoped recipients on the server, use per-route idempotency, enforce the specified deadline below the lease, and report success only after provider acceptance. Those adapters, route configuration and scheduling are not implemented; the worker is not deployed and no real email was sent.

Delivery remains at-least-once: provider acceptance followed by an acknowledgement outage can cause a retry. Exactly-once email cannot be claimed; a provider that honors stable idempotency keys and per-route delivery receipts is required to mitigate duplicates. Multi-route partial delivery/recovery remains unfinished.

Validation: 53 database tests, three fake-adapter worker tests and TypeScript passed. Coverage includes duplicate claims, expired leases, fresh-token recovery, stale worker rejection, safe errors, backoff, terminal reaping and saved-lead retention. These are local PGlite/sequential tests, not a real multi-worker/provider test. The inbox already exposes job status/attempts/error codes; manual retry and terminal-failure administration remain pending.

## Trusted intake orchestration and rate buckets

Local migration 028 adds service-only published form/revision lookup, with an exception for a matching existing durable retry after withdrawal. It also provides atomic rate buckets capped at 20 attempts per website/server-established identity per ten-minute window. The caller must derive a keyed digest from a trusted ingress identity, never accept the digest or forwarded-IP claims directly from an untrusted request. Only the digest is stored. A bounded service cleanup removes up to 1,000 windows older than one day; scheduling is still required. This is a fixed-window limit and not complete bot/distributed-abuse protection.

`acceptFormEnquiry` orchestrates strict request shape, rate allowance, challenge verification, exact stored website/form/revision identity, field/consent validation, authorized file evidence and durable persistence. It constructs consent evidence from the stored form wording rather than request-supplied consent metadata. Attribution currently accepts only a bounded local source path and is unverified contextual input; campaign tracking is not enabled. Unknown fields/site/configuration/consent objects are rejected. Safe generic errors do not expose provider details. No success response is produced for an invalid or uncertain storage receipt.

The function uses required injected server adapters; it is not wired to a public HTTP route. HTTP byte limits/origin policy, trusted ingress identity, challenge provider, service RPC transport, public form rendering, attachment authorization and deployment remain necessary. The existing legacy `/api/enquiry` implementation is unchanged. Form publication remains disabled. No real enquiries, email, credentials or remote database changes occurred.

Validation: 54 local database tests, three intake orchestration tests and TypeScript passed. Coverage includes 20-attempt bucket limits, isolation by digest, private rate state, cleanup, withdrawn-form durable retry identity, stored consent versions, validation/abuse failures preventing persistence and uncertain receipts never becoming success. These are local sequential/fake-adapter tests; actual trusted ingress, concurrency and provider behavior remain unverified.

## HTTP request boundary

`handleEnquiryHttp` wraps intake for a configured deployment. It accepts POST JSON only, requires the exact configured HTTPS website Origin, rejects cross-site Fetch Metadata, limits declared and streamed input to 350,000 bytes, rejects invalid UTF-8/JSON, and emits private/no-store/noindex responses without CORS wildcard headers. Rate-limit replies include bounded Retry-After. Errors do not disclose adapter/provider details. Missing site/origin configuration fails closed.

The required request-adapter factory must establish trusted network identity and real rate/challenge/file/persistence adapters. The handler is not registered as a public application route yet; it cannot accept live enquiries by itself. A production route still needs those dependencies, ingress/body-read deadlines, platform body limits, public form publication/rendering, attachment handling and staging verification. Missing Origin is intentionally rejected for browser submissions; any future non-browser integration needs a separately authenticated contract.

Validation: three HTTP tests passed for valid persisted response, denied origins/Fetch Metadata, MIME/body/UTF-8 limits, malformed configuration, retry headers and safe adapter errors. The complete CMS suite was also run as a regression check; see the current progress checkpoint for the final count. No live traffic or third-party service was contacted.

## Database transport and integrated local intake

`createEnquiryRpc` is a Node-only privileged transport restricted to three intake procedures: rate consumption, form input lookup and atomic acceptance. It validates a root HTTPS database URL, forbids redirects, applies a ten-second request timeout, uses the CMS schema explicitly, and returns generic errors without upstream response bodies. Service credentials are passed only to this server transport and are not configured or exposed in editor/client components.

`createEnquiryIntakeAdapter` binds a website and a trusted ingress identity to those procedures, using HMAC-SHA256 with a server secret of at least 32 characters for the rate bucket. Challenge verification is mandatory and externally supplied. It returns no file evidence because public attachment ownership/inspection is not ready; caller-provided catalog/upload IDs are never treated as proof. A production factory still must validate trusted ingress, manage secret storage/rotation, provide the real challenge verifier and wire the route.

Validation: 55 database tests plus two transport/adapter tests and TypeScript passed. The new integrated test runs the actual HTTP handler, intake validator, database adapter and SQL storage against PGlite: one valid request and identical retry produce one lead and one queued notification; invalid answers and challenge rejection produce none. The test uses a fake challenge result and a root-published form fixture. It does not prove production publication, network transport/provider behavior, trusted ingress or live authenticated operation. No external calls, credentials or remote writes were used.

## Configured public route and challenge verifier

`POST /api/cms/enquiry` now composes the HTTP handler, database transport, rate limit and Turnstile verification. It is disabled unless `CMS_ENQUIRY_ENABLED=true` and all required server configuration is valid. `.env.example` lists the website ID, public origin, database service credential, Turnstile secret and separate ingress/identity secrets. No deployment secrets were created or changed.

The verifier calls only Cloudflare's fixed Siteverify endpoint with a ten-second timeout, no redirects, and exact success/hostname/action checks (`cms_enquiry`). Token length is bounded to 2,048 characters. The implementation follows [Cloudflare server-side validation guidance](https://developers.cloudflare.com/turnstile/get-started/server-side-validation/). A matching browser widget and token-refresh/retry behavior are still required; the actual provider was not called in tests.

Ingress identity requires three proxy-generated headers: `x-cms-client-ip`, `x-cms-ingress-timestamp` (Unix seconds), and `x-cms-ingress-signature` (lowercase hex HMAC-SHA256 of timestamp + newline + IP, keyed with the ingress secret). Signatures older/newer than 60 seconds are rejected. The trusted proxy must strip incoming copies, derive the client IP from its trusted network metadata, sign immediately before forwarding and keep the origin/private secret inaccessible. Unsigned forwarded IP headers are never used. IPv6 addresses are normalized before keyed rate hashing. This proxy integration has not been deployed or tested against real ingress.

Six runtime/HTTP tests and TypeScript passed using mocked network responses. They cover hostname/action mismatches, signature tampering/expiry, identity normalization, missing configuration and composed persistence. No real challenge or database call was made. A direct shell request to the previous local dev port failed to connect, so that live route smoke check is not claimed. The existing legacy enquiry endpoint remains unchanged. Public form lookup/rendering, publication, proxy/widget configuration, attachment ownership and staging UAT still block launch.
