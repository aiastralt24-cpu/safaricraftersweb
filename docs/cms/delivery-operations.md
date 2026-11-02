# Publication delivery operations

Migration `004-delivery.sql` adds unpublish and durable delivery-job claiming/acknowledgement. `lib/cms/delivery-worker.ts` orchestrates one batch using a required deployment adapter. No production worker, scheduler, cache/search adapter or website cutover is configured yet.

## Unpublish

`cms.unpublish(site, record, expectedPublishedRevision)` requires current publish permission and locks the record. It rejects a stale public revision, clears only the published pointer and atomically creates an unpublish job and audit event. Drafts, history and approvals remain available. Repeating the operation for the same removed revision returns the existing job. Anonymous `get_public_page` immediately stops resolving that record; the existing Git-backed website has not yet been switched to this delivery source.

## Worker lifecycle

Service workers call `reap_delivery`, then `claim_delivery` with a batch size of 1–50 and lease duration of 15–300 seconds. Due jobs and expired leases are claimed under row locks with `SKIP LOCKED`. Each claim gets a fresh random token and increments attempts. Jobs incompatible with the current public pointer become superseded.

Workers invalidate derived page, dependency, listing, sitemap and search caches. They must never write the historical job payload into the public store. Public delivery must resolve the current publication pointer even when an old invalidation arrives after a later publication.

Acknowledgement requires the exact current lease token before expiry. This prevents an old worker from acknowledging a job reclaimed by another worker. Invalidation must be idempotent: an upstream success followed by a lost acknowledgement will be retried. Failures use bounded machine error codes, not raw upstream messages that could contain secrets. Backoff starts at 30 seconds and caps at one hour. After eight attempts, a failure is terminal. The reaper makes a crashed final attempt visibly failed rather than leaving it running forever.

The worker module requires every adapter operation and reports unacknowledged outcomes honestly. It does not include a default success/no-op cache adapter. The caller must configure timeouts shorter than the lease and independently cancel stalled upstream operations. The module runs claimed jobs concurrently so serial processing does not consume later jobs' leases; tune batch size to downstream capacity.

## Remaining acceptance work

- Configure least-privilege deployed worker credentials and scheduler; service credentials never enter the browser gateway.
- Connect the public website, shared-content dependency invalidation, sitemap and search to the independent CMS.
- Build delivery status, terminal-failure alerts and an authorized manual retry workflow.
- Verify two real PostgreSQL worker connections, network timeouts, restart recovery, cache propagation and measured delivery targets.
- Extend coordinated releases and schedules; this migration operates on individual records.

Local tests prove transactional unpublish, repeat requests, stale revision rejection, lease replacement, stale acknowledgement rejection, delayed retries, capped attempts and worker privilege separation. They do not prove production propagation or complete UAT-15.
