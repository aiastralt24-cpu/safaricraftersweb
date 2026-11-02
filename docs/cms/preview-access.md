# Private preview access

Implemented: database migration `003-previews.sql`, authenticated `GET /api/cms/preview/[id]`, and a user-token-only PostgREST gateway. Not implemented yet: login UI, preview creation/sharing UI, page rendering, protected media URLs, and deployment to a configured staging project.

A preview session binds one website, record, immutable revision and authenticated recipient. It expires after 1–1,440 minutes. A newer draft does not change an existing preview. Creating a session requires current view access and the intended recipient must already have view access to that record. Preview is not an anonymous sharing mechanism.

Each read rechecks the recipient's current permissions and the creator's membership and view permission. Membership expiry/revocation, permission removal, preview expiry or explicit preview revocation stops access. Only the creator with current view access or a website configuration administrator can revoke a session. Creation and revocation are audited. There are no direct table grants.

The API requires an Authorization bearer token. Its syntax check is not authentication: the configured managed-auth/PostgREST service verifies the JWT and PostgreSQL enforces the authenticated identity and permissions. Legacy admin cookies and shared tokens grant no access. Preview IDs alone grant no access. Missing configuration fails with 503. Unauthorized, unavailable and expired previews do not expose database details.

Every response includes private/no-store caching, noindex/nofollow/noarchive and no-referrer headers. Future HTML preview pages and media responses must apply equivalent protections and must not put access tokens in URLs. This endpoint returns JSON only; it is not yet a rendered client preview.

## Staging setup requirements

1. Resolve whether staging uses an existing or new client-owned Supabase project (owner answer pending).
2. Apply migrations 001–003 in order to an isolated staging database with managed auth roles. No migrations have been applied externally by this work.
3. Configure the `cms` schema as an exposed PostgREST schema, preserving the grants/revokes in the migrations. Do not grant broad table write access.
4. Set `CMS_SUPABASE_URL` to the project's HTTPS origin and `CMS_SUPABASE_ANON_KEY` to its public anon/publishable key. The service-role key used by legacy enquiry infrastructure must not be reused here.
5. Provision individual users and scoped website memberships through an administrative setup flow, then verify real JWT expiry/revocation, database policies and HTTP cache behavior on staging.

Local evidence: embedded PostgreSQL tests cover recipient identity, revision pinning, expiry, explicit revocation, creator membership revocation, cross-record revision rejection and anonymous denial. Gateway/handler tests cover credential forwarding, headers, non-disclosure of upstream errors and failure without configuration. These tests do not prove managed-auth deployment or a complete UAT-17 browser workflow.
