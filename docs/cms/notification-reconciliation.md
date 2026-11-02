# Notification delivery review and reconciliation

Status: dispatch inspection, provider evidence verification and permission-bound server recording are implemented locally. Client confirmation/recovery controls are now connected locally; hosted acceptance remains pending. Notification rollout stays disabled.

Migration 389 exposes saved per-recipient dispatch records through the enquiry's notification panel. Access requires both view permission for the exact lead and website-wide lead configure or approve permission. Jobs are bound to website and lead. The API returns up to 20 route records: saved sender/recipients, route revision, preparation/acceptance times, provider receipt ID, stable request key and current dispatch state. Saved email bodies and applicant answers are excluded.

The view distinguishes awaiting provider acceptance, accepted by provider, unavailable recipient configuration and reconciliation-required states. An expired uncertain dispatch remains flagged even if the recipient route is also unavailable. Provider acceptance is explicitly not proof of inbox delivery or that an email was read. Opening or reloading the panel only reads data; it never retries, sends, clears or marks a dispatch accepted.

The response verifier binds website, lead, job, route uniqueness, ordering and consistent acceptance/expiry states. Invalid responses clear prior displayed records. Provider references are behind an expandable section. The next workflow must verify provider evidence before recording acceptance, and must preserve the frozen message and idempotency key; an expired uncertain attempt cannot be blindly resent.

Verification: four focused API/contract tests, actual database permission and expiry tests, all 2,212 CMS tests, production build, TypeScript and offline migration planning pass. Synthetic browser checks at 1280px and 390px verify expiry warnings, acceptance wording, provider references, denied access and wrong-lead response rejection, alongside existing applicant behavior. No page errors or horizontal overflow were observed; the mobile screenshot was inspected. Logs: `/private/tmp/cms-dispatch-review-{tests,db,full,build,types,migrations,browser}.log`; screenshots: `/private/tmp/cms-dispatch-review-{1280,390}.png`. No hosted migration or email occurred.

## Provider evidence verification

The Resend sender now derives a `cms_dispatch` tag from the durable dispatch UUID in its idempotency key. This distinguishes two routes that otherwise produce identical emails. Provider reconciliation must require this tag; an untagged legacy message cannot be automatically matched just by its text or recipients. This sender change has not been deployed, and no prior external sends were performed during implementation.

A server-side retrieval primitive now uses only authenticated GET requests to the fixed Resend message endpoint. It verifies the requested provider ID, exact dispatch tag, sender, ordered recipients, subject and text against the frozen message, rejects unexpected HTML/CC/BCC/reply-to/scheduling, and bounds provider timestamps to the preparation/observation interval with five seconds of clock-skew tolerance. It returns only receipt identifiers, normalized timestamps and a canonical message digest; raw email content and addresses are not returned in its evidence result. Missing, changed, oversized or inaccessible provider data fails closed. Exact matching may reject provider normalization until real staged examples are verified; it must not be weakened to guess a match.

This primitive is not an authorization boundary. Expected message content must come from an authorized saved dispatch, and provider evidence must come from the server's own authenticated GET, never browser-supplied JSON. Permission-bound intents and service-only recording are now connected through the endpoint described below. Client controls are described below. Existing notification publication fences and rollout flags stay in place.

Provider contract checked against https://resend.com/docs/api-reference/emails/retrieve-email on 30 October 2026. Retrieval proves the provider has a message record, not delivery to an inbox or recipient engagement. No real provider request or email occurred in local verification.

Provider-verifier evidence: 17 focused notification tests, TypeScript and production build pass. Tests cover correlated outgoing tags, frozen payload retries, exact retrieval destination, message/time mismatches, hidden errors and bounded responses. Logs: `/private/tmp/cms-provider-evidence-{tests,types,build}.log`. The full suite was not rerun for this bounded server-transport change; the previous full-suite evidence remains 2,212 tests.

## Permission-bound recording

Migration 390 adds private actor-bound reconciliation requests and receipts. Starting a request requires active membership, view permission for the exact enquiry and website-wide lead approval permission. Configure permission alone does not allow reconciliation. The request fixes the dispatch and provider reference; a reused request ID cannot select another message.

The disabled-by-default POST `/api/cms/notification-reconciliation` accepts only website, lead, job, dispatch, provider-message and request IDs. A user-token RPC establishes the actor and frozen message. The server retrieves and verifies provider evidence before its dedicated service-only finalizer records acceptance. Browser-supplied actors, message content and evidence are rejected. The response contains only the resolution receipt.

Finalization rechecks the original actor's current permissions, rejects an active worker lease, requires the exact saved message and fresh scoped evidence, and rejects a conflicting provider receipt. Repeating the same completed request rechecks access and returns the immutable receipt without another provider lookup or audit event. Acceptance is recorded without sending email, requeueing the job or declaring all routes complete. A response lost after commit can be recovered with the same request ID.

`CMS_NOTIFICATION_RECONCILIATION_ENABLED=false` is independent of the worker switch. The endpoint additionally needs the existing Supabase URL/public/service credentials and Resend API key. Keep it disabled until migration 390 and real staged provider matching pass. Client controls preserve request identity through uncertain outcomes and require explicit confirmation.

Recording verification: all 2,216 CMS tests, production build, TypeScript and offline migration planning through 390 pass. Database tests cover permission separation, identity reuse, active leases, revoked actors, message/time mismatch, immutable replay and one audit entry without job requeue. API tests exercise user-token begin → provider GET → service finalization and reject browser evidence/cross-origin requests. Logs: `/private/tmp/cms-reconciliation-{db,api,full,build,types,migrations}.log`. No hosted migration, real provider request or email occurred.

## Client confirmation and recovery

Each notification job now exposes a provider-verification panel. Administrators load dispatch records, select an unconfirmed dispatch, enter the provider message UUID and review a confirmation before submitting. The server remains the approval-permission boundary. An accepted record cannot be selected for a new verification.

The panel persists only actor-scoped request identifiers before submitting, checks browser storage, coordinates tabs using Web Locks and observes storage changes. Pending requests lock new submissions. Recovery works even before dispatch rows are reloaded and uses the same request ID. Only a receipt matching every identity and the current actor clears recovery. No provider credentials, frozen message or applicant answers enter browser recovery storage.

Administrators may explicitly remove the browser recovery reference after a warning: this does not undo acceptance, stop an in-flight verification or cancel delivery. Reloading delivery records is required to determine the current state. This escape is useful for an incorrect provider UUID; the server still verifies evidence and rejects conflicting receipts.

Client verification: five focused API/contract tests, TypeScript and production build pass. Synthetic browser checks at 1280px and 390px cover explicit confirmation, a lost response, reload recovery using the exact original request, storage removal only after receipt, and existing wrong-lead/denied-access/applicant regression paths. No page errors or document horizontal overflow were observed; the mobile screenshot was inspected. Logs: `/private/tmp/cms-reconciliation-ui-{tests,types,build,browser}.log`; screenshots: `/private/tmp/cms-reconciliation-ui-{1280,390}.png`. The preceding full suite remains 2,216 passing tests; it was not repeated for this bounded client change. No hosted provider call or email occurred.
