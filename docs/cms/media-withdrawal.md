# Withdrawal of journeys with unavailable images

Migration 014 closes the database-delivery gap after publication. `get_public_page` now returns no journey when a referenced media object is absent, rejected/quarantined, archived, unapproved, revoked or expired. It also fails closed for malformed media references. The check runs on each public CMS read and does not depend on a new editor publication or a previously successful validation receipt.

`withdraw_unavailable_media(site,limit)` is service-only, takes batches of 1–100 records and claims published journeys with record locks and `SKIP LOCKED`. It rechecks availability, clears only the published pointer, queues an unpublish delivery job and records `publication.withdrawn_media`. Drafts, approval state and revision history remain available. Repeated sweeps do not create duplicate withdrawals. Correcting image rights after withdrawal does not silently republish the page; the normal publication workflow must run again.

The scope is journey media references, matching the currently enabled publication validator. Other content families, nested page-composer references and shared dependencies need corresponding availability/withdrawal integration before their publication is enabled.

## Required deployment integration

Run the sweep after rights/inspection/archive changes and periodically for time-based expiry. Connect the existing delivery worker to the actual page/listing/search/CDN invalidation adapter. Neither scheduling nor production cache invalidation is configured yet. Previously cached responses or image URLs cannot be withdrawn by a database read guard alone. A rights correction racing a sweep can conservatively leave the page withdrawn; editors must review and republish explicitly.

The current public Safari Crafters site still uses the Git content snapshot, so this migration does not alter that existing site. It is prepared for the independent CMS delivery cutover.

Verification: 40 PostgreSQL tests include initial visibility, immediate read suppression for all four lifecycle changes, service-only sweep access, idempotent withdrawal, draft preservation, single invalidation job, no automatic republication, batch limits and website isolation. Live caches, scheduled execution and real multi-connection races remain unverified.
