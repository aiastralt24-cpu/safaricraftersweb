# Structured document upload API

`POST /api/cms/import` accepts the raw `.xlsx` or `.docx` file bytes, not multipart or JSON. It requires the same managed-auth bearer token as the editor API. The server checks website membership before parsing and enforces the 5 MB limit while reading the request stream.

Required headers: `X-CMS-Site` (website UUID), `X-CMS-Format` (`xlsx` or `docx`) and `X-CMS-Action` (`review` or `apply`). A browser UI must send same-origin requests. Format selection does not bypass archive/XML validation.

## Review

Send `X-CMS-Action: review`. The response contains source provenance, per-field findings, proposed before/after changes and `reviewDigest`. It deliberately omits the save manifest: the browser does not supply authoritative draft payloads.

For updates, the server loads each referenced record using the user's JWT and RLS-preserving read function. Records must be journey records with the expected route shape. Current payload, locale, path and revision come from these reads, not uploaded inventory. Missing/inaccessible records fail contract validation. Existing records are read in bounded groups, with an aggregate content limit of 5 MB. Blank fields and omitted collections preserve authorized current data.

New-record source IDs and route uniqueness are additionally checked by PostgreSQL when applying. A review can therefore still fail during apply if a source ID or route is already occupied or another editor saves concurrently.

## Apply and retry

Send the same bytes with `X-CMS-Action: apply`, `X-CMS-Review` set to the returned digest and a fresh UUID `Idempotency-Key`. The digest binds the website, original file hash and rebuilt manifest. The server reloads current records and recomputes the result; changed content requires a fresh review. Revision checks inside the transaction also catch races after that read.

`apply_reviewed_import` stores draft revisions and a private receipt atomically. Retry the identical request with the same key after an ambiguous network outcome. A matching completed receipt returns the original result without rebuilding against revisions created by the first request. Reusing a key for different bytes or a different review returns a conflict. Receipts remain scoped to the original actor and active website membership. Empty/no-change imports create no revisions or receipt and return `unchanged: true`.

Imports never approve or publish. The independent publication workflow still requires the current approved revision and trusted validation. Direct database draft-writing functions retain their own permission/revision checks; the digest is an application review safeguard, not an authorization credential.

## Current verification and limitations

Handler tests exercise a real OOXML Word archive through parsing, review and mocked user-scoped transport, including changed-content conflicts and safe retries. PostgreSQL tests separately verify receipt privacy, digest conflicts and transactional draft persistence. Excel parsing has archive fixtures but the complete Excel HTTP path and actual Office application round trips still need acceptance testing. The client upload/review screen, downloadable templates and deployed JWT/PostgREST integration remain pending.

Apply staging migrations 001–006 in order. This work did not modify an external database.
