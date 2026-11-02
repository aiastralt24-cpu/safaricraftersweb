# Composition draft persistence

The authenticated content endpoint now accepts a `compose` action for existing page/homepage drafts, with site, record, revision and one approved command (insert, replace, move, duplicate, remove).

It reads the authorized stored revision, checks the requested identity and revision, applies the validated composition command, preserves all other payload fields and forwards the result to `save_draft` using the same user token and expected revision. The database performs write permissions and optimistic concurrency checks again. Browser-supplied replacement payloads and extra command fields are rejected. Duplication retains the existing hidden-copy behavior and stable identity rules.

Nineteen editor API and composition tests passed, including payload preservation, unsupported type/malformed composition rejection, stale read rejection and propagation of a concurrent-save conflict. TypeScript passed. RPC transports in API tests are mocked; this is not managed-provider integration evidence.

The visual composer, initial page creation UI, public renderers and trusted publication validation for composed pages remain outstanding. This endpoint does not make composed pages publishable; unsupported types still fail publication validation.
