# Independent CMS architecture

Status note (22 October 2026): the boundaries below were recorded at foundation time. Their “pending” statements are historical, not a current completion checklist. Current local implementation and validation evidence are tracked in `progress.md` and the module documents in this directory. Remote deployment, live-site cutover and full PRD/UAT completion remain unverified.

Decision: the owner selected an independent backend that can replace Sanity on 22 October 2026.

## Boundaries

- **Admin:** a new client workspace, separate from legacy shared-token administration. Individual identity is mandatory. Pending work: authentication UI, invitation/bootstrap workflow, HTTP API and editor.
- **Database:** dedicated `cms` schema in PostgreSQL. Website membership, role permissions, content identity, immutable revisions, approval pointers, audit records and delivery outbox are established in `database/cms/001-foundation.sql`.
- **Authorization:** managed JWT authentication supplies `auth.uid()`. Membership and grants are checked in database functions on each operation. The HTTP layer must also validate sessions, origins, payload schemas and rate limits. Service credentials are never sent to browsers or accepted as a substitute for an editor identity.
- **Content writes:** narrow functions enforce current revision, content/website scope and workflow transitions. Editors receive no direct table write permissions. Server-side content validation is still required before a trusted worker can record a successful validation result.
- **Publication:** only the approved current revision with a successful trusted validation can become the published pointer. Audit and delivery job creation happen in the same transaction. Repeat publication of the same revision is idempotent. Pending work: dependent multi-record releases, outbox processing, cache/search/sitemap updates, scheduling and unpublish workflows.
- **Recovery:** restoring an old revision creates a new draft. It does not silently replace the public page or bypass approval. Pending work: approved rollback UI/operation, asset recovery and full database restore exercise.
- **Public delivery:** the public query joins only the published revision. The website is not switched to this source yet. Real authenticated draft preview and signed expiring links are pending.
- **Imports:** the portable journey contract validates normalized rows before database access. Workbook/Word parsing, upload quarantine, durable import jobs, confirmation UI, asset resolution and transactional draft application remain to be built. Row limits and field guidance are enforced independently of spreadsheet validation.
- **Media:** planned private originals/quarantine, scanning and derivative jobs; only processed approved assets become publicly addressable. Do not treat existing image-upload code as fulfilling this requirement.
- **Leads:** remain separate from editorial revisions. Existing reliable submission/outbox behaviour is preserved until new identity, scope and workflow integration is validated.

## Local test evidence and limits

The database migration is tested with embedded PostgreSQL through PGlite, using a minimal auth fixture and real database roles/RLS. Tests cover draft isolation, website isolation, stale saves, self-approval, publish permission, trusted validation, immutable history, approval invalidation, restore-as-draft and revocation. This does not replace tests against the actual managed-auth provider, concurrent network clients, staging deployment or recovery environment.

The SQL migration has not been applied to a hosted database. Existing production/Sanity data has not been changed by this foundation work. Provision a separate staging environment before integration testing.

## Sources used for foundation design

- [PostgreSQL row security through Supabase](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [PGlite local PostgreSQL test runtime](https://pglite.dev/docs/)

## Decisions still requiring business/environment information

Client account ownership, initial administrators, hosting budget, data residency, retention periods, backup destination, required languages, email sender, asset-scanning service and deployment ownership. Implement portable foundations first; do not buy services, change existing permissions or claim operational SLAs without resolving these.
