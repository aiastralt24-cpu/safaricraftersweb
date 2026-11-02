# Stored revision checks

`POST /api/cms/content` accepts `{action:"validate",site,record,revision}` with the same user bearer authentication as other editor commands. The handler reads the current record through the user's RLS scope. Hidden records return 404; a changed revision returns 409. Client payloads and client validation results are not accepted.

The response identifies the checked revision and validator version, with `contentChecksPass` and field-level error/warning findings. `publicationAuthorized` is always false: this advisory check does not insert a trusted validation row or replace approval and publication checks.

Journey checks validate the entire saved payload, including all child items. Unlike import updates, omitted required fields fail. Length recommendations remain warnings and never shorten copy. Hard button lengths, plain-text requirements, stable IDs, unique item positions, URL/slug agreement and known fields are checked. Unsupported content types and unknown fields fail closed until their schemas are implemented. Media references require site-scoped catalog verification; an asset identifier alone is insufficient. See `media-verification.md` for the implemented database checks and pending real storage/inspection adapters.

## Trusted validation and publication

Migration `007-validation-gate.sql`, applied after 001–006, introduces a deployment-owned validator policy. Migration 008 advances the enabled journey validator to `journey-2` for media catalog verification. Changing a policy version invalidates earlier receipts for future publication. Existing receipts without an expiry must be regenerated; this migration does not change already-published content.

`runTrustedValidation` requires an explicitly supplied server-only RPC transport. It reads the exact current revision using service-only `get_validation_input`, validates that returned identity, computes findings from stored content, and calls service-only `record_validation`. No payload/result can be supplied in the target argument. The receipt function locks the record, rechecks revision and policy, rejects inconsistent findings, stores a 15-minute receipt, and writes an audit event. A failed acknowledgement propagates as a failure. Authenticated editors cannot execute either trusted RPC or write validation rows. The service role's former direct INSERT/UPDATE grants on validations are removed.

Publication requires the exact approved current revision, a successful unexpired receipt, and the currently required validator version. These checks run inside the publication transaction. Validation expiry or a later policy change does not automatically unpublish existing pages; emergency withdrawal remains the separate unpublish workflow.

Authorized editors can request `{action:"validation_status",site,record,revision}` from `/api/cms/content`. This reads `get_validation` through their current permission context, returns findings/expiry/required version, and rejects stale revision requests. The status is informative, not a publication capability.

Remaining integration: a deployed worker transport and dispatch mechanism, real media/dependency verification, and checks for other content types. No privileged credential was added to editor APIs. The trusted worker must not be exposed as an unauthenticated HTTP endpoint. Full deployment and client publication remain pending.

## Client findings panel

The journey editor now includes a Content checks panel. Its explicit check action loads advisory findings and trusted status in parallel. It shows errors separately from guidance, identifies missing/expired trusted checks, and displays receipt expiry. Dirty drafts hide earlier results and disable checking until saved. The panel is keyed by user, website, record and revision; unmounted requests cannot update the next record's state. Results cannot enable or bypass the database publication gate.

Browser verification used the actual component with explicitly synthetic responses in a temporary local route, removed after testing. Verified content errors/guidance, current and expired receipts, failed requests, changed revisions, and the unsaved-edit state at desktop/mobile sizes (1280×900 and 390×844). No console warnings/errors or mobile horizontal overflow were observed. The authenticated full workspace and live staging responses remain unverified.

Verification: 28 local PostgreSQL integration tests include a real stored-content validator → trusted receipt → publication flow and rejection of an invalid replacement without changing the public pointer. They also cover actor restrictions, malformed findings, stale revisions, expired receipts and policy changes. Seven validator/worker tests and eight editor API tests pass. Managed staging and real multi-connection concurrency remain unverified.
