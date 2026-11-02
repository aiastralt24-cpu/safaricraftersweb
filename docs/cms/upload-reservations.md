# Upload reservations

Migration 009 and `POST /api/cms/uploads` establish the authorized reservation stage. No file bytes are accepted by this endpoint yet.

Authenticated commands:

- `reserve`: `site`, `requestKey` (UUID), `filename`, `mime`, `bytes`.
- `status`: `site`, `upload` (UUID).
- `cancel`: `site`, `upload` (UUID).

All commands require the current user's bearer token. Writes reject other origins. Database functions require `create` permission on `document` for the website; status and cancellation additionally require upload ownership. Browser-supplied storage keys, inspection results and readiness flags are rejected. No direct table access is granted to editors.

Reservations validate plain filenames, image extensions/types and declared size up to 25 MB. These metadata checks are not byte inspection. The database generates a private storage key from website/upload IDs and never returns it through editor functions. The same request key and metadata return the original reservation; a changed request with the same key fails. Expired or cancelled retries retain their original status and do not start a new upload.

Reservations expire after 30 minutes. At most ten outstanding uploads are allowed per user/website. A transaction advisory lock serializes retry/quota decisions. Expired reservations stop consuming capacity; uploaded/processing records continue to count until resolved. Cancellation is idempotent and allowed only before processing begins. Reservation and cancellation events are audited.

## Pending integration

Migration 010 now adds trusted processing transitions, leases, bounded retries and transactional catalog registration; see `upload-processing.md`. Storage signing or authenticated byte transfer must still verify the owner, current permission, expiry, expected size and generated key. Real provider adapters, dispatch, cleanup, rate/volume quotas and upload UI remain pending. A reservation is not a storage authorization or a usable media asset.

Verification: 33 local PostgreSQL tests include idempotency, private reads, invalid metadata, expiry, quota and cancellation; two upload API tests verify command allowlists, user token forwarding, same-origin checks and hidden-record handling. Real storage, managed authentication and concurrent multi-connection behavior remain unverified.
