# Upload processing

Migration 010 connects the reservation lifecycle to the media catalog through service-only functions:

1. `confirm_upload` binds the reserved size to the hash of bytes verified in private storage. It rejects expired/cancelled reservations and mismatched sizes; identical confirmations can be retried.
2. `claim_upload` acquires a five-minute lease with a new token. Active leases cannot be claimed twice. Expired leases and transient failures can be retried, up to three attempts.
3. `finish_upload` checks the lease and original hash, validates the inspection version and derivative metadata, then atomically inserts the ready media object and marks the upload ready. The storage key and asset ID are generated from the reservation, not supplied by a browser. Usage rights start pending.
4. `fail_upload` records only allowlisted error codes and transitions to failed/retryable or rejected. Expired/replaced tokens cannot acknowledge either success or failure.

`processUpload` is the corresponding server orchestration. Its required adapters claim the job, read bounded private bytes, scan them, write an immutable derivative with checksum verification, and acknowledge the database result. It verifies source length/hash before inspection and never registers media before storage acknowledgement. A lost final acknowledgement returns `unacknowledged`; recovery reads durable state instead of contradicting a possibly committed result.

Original bytes remain in the private reservation object. The media catalog entry describes the WebP derivative. Storage must reject attempts to overwrite an existing key with different bytes, while accepting identical retries. This is an adapter requirement, not yet a verified external-provider guarantee.

## Deployment and remaining work

No provider adapters, scheduler, signing/transfer endpoint or real malware scanner are deployed. `confirm_upload` must only be called after a trusted storage read verifies the object, never in response to an unverified browser completion flag. Worker dispatch must revisit expired leases, including final-attempt claims which transition to rejected. It also needs backoff and orphan-object cleanup. Separate rights review, upload/processing UI, metadata and version management remain pending.

Verification: 35 local PostgreSQL tests include a real generated PNG through the image inspector and database registration with in-memory verified storage and a clean scanner test double. Five upload API/worker tests cover source mutation, storage failure, ambiguous acknowledgement, scanner outage, identity mismatch and unavailable claims. TypeScript passes. Real provider storage, malware detection, managed credentials and multi-process recovery remain unverified.
