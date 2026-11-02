# Private upload transfer

`POST /api/cms/uploads/transfer` accepts raw image bytes with the user's bearer token, `X-CMS-Site`, `X-CMS-Upload` and the reserved image `Content-Type`. It authorizes the reservation before reading the body, validates the destination identity, bounds the stream to the exact reserved size, and transfers to Supabase Storage using that same user token. The application never substitutes a service credential.

The storage request targets `cms-originals/<site>/<upload>/original`, forbids redirects and sets `x-upsert:false`. Existing objects return a conflict rather than being overwritten. Ambiguous network results instruct the caller to check status. A successful response is HTTP 202 with `awaiting_verification`; it does not call the trusted receipt/inspection functions or mark the upload ready.

Migration 011 requires the managed Supabase storage schema. It creates the dedicated private bucket with a 25 MB limit and approved MIME types, refusing to reuse a bucket with different settings. RLS allows insertion only for the current owner's unexpired reservation and current document-create permission. Restrictive policies prevent reads, overwrites and deletion of originals through ordinary editor/anonymous access, even if unrelated permissive policies exist. Trusted service workers retain their managed bypass access. Storage object names are routing identifiers, not bearer capabilities.

Reference: Supabase documents [storage RLS](https://supabase.com/docs/guides/storage/security/access-control) and [standard uploads](https://supabase.com/docs/guides/storage/uploads/standard-uploads). The raw-body transport was checked against the installed storage SDK. Standard upload is implemented here; resumable transfer for larger files remains pending.

## Verification and remaining integration

36 local PostgreSQL integration tests include a minimal storage-schema model and broad unrelated permissive policies to verify reservation ownership and insert/read/update/delete restrictions. Eight upload API/worker/transfer tests verify user credentials, exact body size, destination binding, conflict handling and deferred verification. TypeScript passes. These tests do not verify the live managed storage service or its byte enforcement.

No remote migration or bucket creation was performed. Staging must apply 001–011 with the correct managed roles. Worker discovery of stored reservations, trusted source verification/confirmation, real scanner, production worker transport, upload UI and cleanup remain pending. A stored-but-unconfirmed object remains a reserved database row until the worker verifies it; the client must not reinterpret that row as ready. Deployment also needs request-memory/concurrency limits and resumable uploads appropriate to the hosting platform.
