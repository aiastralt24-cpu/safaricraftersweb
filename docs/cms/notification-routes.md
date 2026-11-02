# Notification recipient administration

Current activation status (migration 405): trusted `form-2` validation accepts complete deployment-bound evidence from completed enquiry notifications or accepted setup verification messages. Publication/read/intake rechecks and contact, career and MICE integration are implemented locally. The verification runtime remains separately disabled by default. Administrator verification confirmation/recovery controls are locally connected. Uncertain-probe reconciliation is also connected locally with durable confirmation/recovery. Hosted delivery and client acceptance remain pending. Earlier rollout notes below are historical.

Status: authenticated storage/API and client recipient controls are implemented locally. Revision-history viewing is also connected; notification activation and hosted acceptance remain pending. Notification-bearing forms and the delivery worker remain disabled for rollout.

Migration 386 adds route labels, approval/editor identities, private revision history and actor-scoped request receipts. `/api/cms/notification-routes` accepts authenticated POST commands:

- `list`: website and optional route-ID cursor; returns up to 50 routes and edit/approval capabilities.
- `save`: website, client-generated route ID, expected revision (null for creation), request ID and label/from/to payload. Saves are disabled and unapproved.
- `approve`: exact saved revision and request ID, with empty payload. Records approver/time and enables a new route revision.
- `disable`: exact saved revision and request ID, with empty payload. Creates a disabled, unapproved revision.

Whole-site `configure` on `lead` permits editing/disabling; whole-site `approve` on `lead` permits approval. Either permission permits listing. General content permissions and record-specific lead permissions do not grant route administration. The database rechecks permission after its website lock. Approval is an explicit administrative decision; it does not prove provider sender/domain verification, which remains a staging gate.

Every change creates a revision. Sender/recipient changes clear approval. Existing prepared dispatches then fail their current-route-revision check; they cannot silently adopt new recipients. Accepted dispatch receipts remain recoverable. Historical snapshots and request receipts are private tables with no direct client grants. Request replay returns the original receipt without reverting newer edits; reuse for different commands is rejected. A revoked administrator cannot replay their old requests.

The API binds website, route, request, action, exact recipient payload and approval state in returned receipts. Commands reject unknown fields, malformed/duplicate addresses and cross-origin requests. Server RPC authentication remains authoritative. No recipient route was configured outside local test transactions and no email was sent.

Pending: sender/provider verification, uncertain-dispatch reconciliation, form route selection/publication and hosted acceptance.

Verification: three API/contract tests, the focused real-database lifecycle, all 2,208 CMS tests, production build, TypeScript and offline migration planning pass. Evidence covers permission separation, immutable receipts, stale revisions, edits clearing approval, duplicate-address refusal, private history and revoked membership. Logs: `/private/tmp/cms-notification-routes-{tests,db,full,build,types,migrations}.log`. No client UI or hosted acceptance is claimed.


## Client controls and request resolution

The Enquiries workspace now contains Notification recipients: paginated loading, creation/editing, approval and disable confirmations. Fields and actions respect returned edit/approval capabilities. Any edit becomes an unapproved disabled route. Pending commands are saved before sending, scoped to account/site and coordinated through Web Locks; reload and another tab recover the same identity. The panel discloses temporary browser storage and participates in unsaved-change warnings.

Migration 387 adds atomic request resolution. “Resolve without retrying” returns an existing saved receipt or records a cancellation fence under the same website lock used by saves. Delayed retries then cannot apply the cancelled command. Resolution intent is itself persisted so a lost cancellation response recovers through the same operation. No local clear button discards an unresolved command without server resolution. Permission checks still apply; revoked users cannot resolve or replay requests.

Client verification: all 2,208 CMS tests, production build and TypeScript pass. Focused API resolution checks and the final migration-387 database check pass, as does offline migration planning. Synthetic browser tests at 1280px and 390px cover editing, lost-response reload recovery with the exact same command, two-tab locking/storage updates, approval, disabling, resolution without retry and permission controls. No horizontal overflow or page errors were observed; the mobile screenshot was visually inspected. Logs: `/private/tmp/cms-recipient-ui-{tests,db,full,build,types,migrations,browser}.log`; screenshots: `/private/tmp/cms-recipient-ui-{1280,390}.png`. Hosted access and real recipient/provider acceptance remain unverified.


## Revision history viewing

Migration 388 exposes route-specific history only to website-wide lead configurators/approvers. It paginates 30 immutable snapshots by timestamp and revision ID, validates cursor ownership and returns no unrelated website/route records. API checks bind the exact website, route, cursor, snapshot revision and approval actor/state. Timestamp ordering preserves PostgreSQL microseconds. The UI loads history on demand, displays saved sender/recipients, actions, administrator IDs and revision references, and discards displayed data on an invalid response. Changing the current route revision remounts its history panel.

Verification: five focused API/contract tests, the final database test with 35 revisions across two pages, all 2,210 CMS tests, production build, TypeScript and offline migration planning pass. Desktop/mobile synthetic checks at 1280px and 390px verify historical recipient addresses, approval records, wrong-website response rejection and existing authoring/recovery behavior; no horizontal overflow or page errors were observed. The mobile screenshot was visually inspected. Logs: `/private/tmp/cms-recipient-history-{tests,db,full,build,types,migrations,browser}.log`; screenshots: `/private/tmp/cms-recipient-history-{1280,390}.png`. No hosted migrations or emails occurred.

Permission-scoped delivery inspection is now connected in each enquiry notification panel. See [notification reconciliation](notification-reconciliation.md); verified resolution actions remain pending.

## Form draft route selection

Migration 391 adds `list_form_notification_routes`: new forms require form-create permission; existing forms require exact-record form view/edit permission and the matching website/type. Only enabled routes with an approval actor/time appear, in pages of 50 ordered by route ID. Responses contain route ID, revision ID and label only, excluding sender/recipient addresses. Recipient approval does not prove provider configuration or hosted delivery.

Forms now includes a picker for up to 20 approved routes. Selection changes use the existing draft history, save, conflict and browser recovery paths. Unavailable or unloaded saved route IDs remain visible and are never silently removed. An author can explicitly remove them. Invalid or denied option responses clear loaded choices while preserving the draft. Route selection stores IDs as specified by the form contract; the worker still freezes the route revision and message before sending.

Notification publication fences remain active in form validation and dependent public evidence. Selection is draft authoring only. Remaining activation work must bind verified provider/worker readiness and current approved routes to trusted publication checks, then exercise intake → job → provider → durable receipt in staging. No production email is enabled by this picker.

Verification: all 2,220 CMS tests, production build, TypeScript and offline migration planning through 391 pass. Database checks cover form access, website/record mismatch, unavailable-route filtering and address exclusion. Browser checks at 1280px/390px cover selecting routes, undo/redo, saved payload, preservation after route withdrawal, wrong-site/denied response rejection and explicit removal; no page errors or document overflow were observed, and the mobile screenshot was inspected. Logs: `/private/tmp/cms-form-routes-{db,tests,full,types,build,migrations,browser}.log`; screenshots: `/private/tmp/cms-form-routes-{1280,390}.png`. No hosted migration or provider call occurred.

## Revision-bound validation diagnostics

Migration 392 supplies private recipient evidence to the trusted validation worker for the exact current form revision. Each selected route reports only its ID/current revision, approval state and the most recent accepted timestamp from a completed notification job for that exact revision/sender/recipient configuration. Website, form and revision mismatches return no evidence. Email addresses and message content are excluded. Authenticated browsers cannot call this evidence reader directly.

Trusted form validation now reports distinct findings for missing routes, disabled/unapproved routes, and configurations without a completed job and accepted provider receipt. Historical acceptance is a warning, never permission to publish: it proves neither inbox delivery nor current provider/worker availability. Inbox-only validation remains unchanged, and the existing notification activation error remains blocking. Changing a recipient revision or marking its job failed removes qualifying delivery history.

Still required before activation: server-side evidence of deployed worker/provider readiness, live publication-time checks of current recipient approval/configuration, compatible dependent form readers, and staged end-to-end delivery/recovery acceptance. This diagnostic change does not enable forms or send notifications.

Diagnostic verification: all 2,222 CMS tests, production build, TypeScript and offline migration planning through 392 pass. Focused database coverage checks service-only access, exact site/revision binding, private-data exclusion, successful-job status and route-revision changes. Worker tests prove historical acceptance cannot bypass the activation gate and inbox-only forms still pass. Logs: `/private/tmp/cms-form-evidence-{db,tests,full,types,build,migrations}.log`. No hosted migration or real provider request occurred.
