# Journey media verification

Migration 008 adds `cms.media_objects`, a private catalog of immutable image object identities. An ID refers to one stored version; replacing bytes requires a new ID. The catalog stores website, storage key, hash, MIME type, size, dimensions, inspection status, rights evidence/expiry, and archive state. Supported catalog image types are JPEG, PNG, WebP and AVIF, with a 25 MB metadata limit. These constraints do not inspect uploaded bytes.

Only the service role can register objects. Its updates are limited to inspection, rights and archive fields; it cannot change identity, hash, dimensions, MIME type or storage key and has no delete grant. New objects default to quarantine and pending rights. An approved rights status requires evidence. Application editors cannot directly approve scans or access storage keys/evidence.

`get_record_media_status(site,record,revision)` requires current view permission on that record (or a trusted service call). It returns only referenced IDs and availability booleans, scoped to the website. Missing objects, quarantined/rejected objects, archived objects, unapproved rights and expired rights are unavailable. The advisory API and trusted validator consume this evidence. Migration 008 advances the deployment policy to `journey-2`, requiring fresh receipts.

A publication trigger rechecks every journey media reference under row locks immediately before the published pointer changes. A previously successful receipt cannot bypass a later rights revocation or expiry. Failure rolls back the publication transaction. Storage URLs and usage-rights evidence are never returned by the status RPC.

## Remaining media delivery work

This is a database validation boundary, not a working upload library. Upload reservations, private object storage, byte-level MIME/size/dimension checks, malware inspection, derivative generation, immutable provider storage enforcement, metadata/rights editing UI, activity auditing, media selection/search, logical asset version history and dependency/usage screens remain to be built. Video/document support is also pending.

Catalog status does not prove the object currently exists in an external bucket. A trusted upload/inspection adapter must verify it before marking ready. Revoking rights after publication does not automatically withdraw a live page or cached image; delivery revocation and dependency-triggered withdrawal are required before production use. Rights validity for future schedules also needs scheduled checks.

Verification: 30 local PostgreSQL tests cover the catalog restrictions and final publication recheck, including rights changed after a receipt and rights expiry. Eight validator/worker tests and nine editor API tests cover matching image evidence and user-scoped lookup. Real file processing, storage integration and multi-connection concurrency remain unverified.
