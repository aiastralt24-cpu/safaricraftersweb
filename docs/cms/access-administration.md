# Access administration

Migration 036 introduces a read-only access directory. An active membership must carry an explicit, unscoped permission with `action='configure'` and `content_type='access'`. Generic `configure/*` and record-specific access grants do not qualify. This intentionally tightens the previous role/permission SELECT policies. An operator must review initial access-administrator grants before applying this migration; it creates no grants or memberships automatically.

`GET /api/cms/access?site=<uuid>&kind=members|roles&limit=50&after=<uuid>` forwards the authenticated user's bearer token to fixed database functions. Responses contain `items` and `nextCursor`; a full page may require one further request to establish that the list has ended. Pagination uses ascending UUIDs. Page sizes are 1–100. Unknown and duplicate query parameters are rejected. Results are private and not cached.

Members expose user ID, role ID, optimistic version, expiration, revocation and active/expired/revoked status. Authentication profiles and email addresses are not returned. Roles expose their stored permission entries. The endpoint validates response shapes and cursor ordering instead of silently displaying a partial or malformed directory. Every read checks current membership; a revoked or expired administrator loses directory access on the next request.

This is not yet a complete access administration feature. Pending work includes the client interface, audited custom-role changes, invitations and initial bootstrap, real concurrent-client verification, and managed-auth session revocation. Membership denial prevents subsequent CMS operations but does not itself invalidate a provider session. Website/module/record permissions exist; brand/language/region restrictions from PER-03 remain to be implemented.

Verification: real SQL/RLS through the embedded PostgreSQL fixture covers explicit grants, wildcard and record-scoped denial, website isolation, expiration, revocation, anonymous denial and pagination. API tests cover token forwarding, fixed operations, strict input/output validation, cursor handling and private headers. Managed-provider/staging verification remains outstanding. No remote migration has been applied.

## Membership changes

Migration 037 adds an optimistic membership version and `update_membership`. POST `/api/cms/access` accepts exactly `site`, `userId`, `expectedVersion`, `roleId`, nullable ISO `expiresAt`, and boolean `revoked`. It updates an existing membership only; it does not create an account or send an invitation. The role must belong to the website. Expiry must be finite and in the future when specified. Setting revoked false restores an existing revoked membership.

Changes lock the website, recheck the actor's access, then lock and compare the membership version. Every successful change increments the version and records the actor plus before/after values in the audit log. Failed changes roll back both the membership and audit insertion. At least one active access administrator without expiry must remain. Temporary administrators cannot serve as the only recovery path. Future role/permission mutation functions must take the same website lock and preserve this invariant. Operator SQL bypasses these application protections and must be controlled operationally.

The HTTP endpoint rejects cross-origin writes, unexpected fields and query parameters, validates the returned identity/version, and uses the user's token. An uncertain response requires reloading the member; retrying an old version cannot overwrite a later change. Apply migrations 036 and 037 before deploying the updated API.

Embedded SQL tests verify role changes, future expiry, revoke/restore, stale writes, cross-site role denial, audit provenance, and final permanent administrator protection. These tests do not prove concurrent-client behavior or managed-auth session invalidation in production.

## Client workspace

The CMS Access tab now lists existing members and allows role selection, UTC expiry and revocation/restoration with a before/after review. Unsaved changes participate in the workspace navigation guard. Failed or uncertain saves disable further edits until access is reloaded. Roles load through all pages before editing; members load in pages of 50. The server remains the authority on every operation. Friendly user labels and invitations remain pending; the current directory identifies accounts by UUID.

## Custom-role backend

Migration 038 adds role versions and an audited `save_access_role` operation. POST `/api/cms/access/roles` accepts `site`, nullable `roleId`, nullable `expectedVersion`, `name`, and a complete `permissions` array. Creation requires both nullable fields to be null; updates require both current identity and version. Role listings now include `version`; deploy migration 038 with the updated API.

Each permission contains exactly `action`, `contentType`, and nullable `recordId`. The database validates the supported action/module vocabulary, rejects duplicates, and verifies scoped record ownership and type (including explicit lead scopes). Record-specific create permissions are rejected. Access administration is only representable as unscoped `configure/access`. A role can have no permissions. Names are trimmed, bounded and case-insensitively unique within a website through the serialized mutation function.

Role edits replace the complete permission set atomically, increment the role version, and record before/after state with the actor. They take the same website lock as membership changes and cannot remove the final active, non-expiring access administrator. There is no role-deletion operation. Direct operator SQL remains outside these guards. Role creation does not grant the role to anyone automatically.

The backend and focused SQL/API tests are implemented. A custom-role editor with explicit impact review is still pending. Concurrent managed-provider testing and guarding membership assignment against a role changing after it was reviewed are also outstanding.

## Reviewed role version

Migration 039 replaces the six-argument membership function with a seven-argument function requiring `p_expected_role`. The HTTP membership command now requires positive `expectedRoleVersion`; the workspace sends the chosen role's loaded version. Under the same website lock used by role editing, the database compares this version before modifying the membership. Stale role reviews fail with a conflict, including when the membership itself has not changed. The old callable signature is removed so direct authenticated RPC calls cannot bypass this requirement. Successful audit events record `reviewedRoleVersion`.

Deploy migration 039 and the updated API/client together; older clients fail closed. Tests demonstrate rejection without mutation for a stale role, successful assignment after loading the current role version, and audit binding. This does not prevent a later authorized edit to a role from affecting its existing members; the forthcoming role editor must explicitly review that impact. Real concurrent-provider verification remains pending.

## Custom-role editor

The Access screen includes role creation and editing with action/module/optional record scopes. Invalid combinations and duplicate permissions are blocked locally and remain enforced independently in SQL. The review separates permission additions and removals, includes the name change, and explicitly explains the effect on all assigned members. Confirmation requires acknowledgement. Role and membership edits cannot be made simultaneously; both participate in the workspace unsaved-change guard. An uncertain role save locks further edits until access is reloaded.

The browser flow was exercised using a temporary synthetic page, from new role and permission entry through review acknowledgement to save completion. The fixture was removed without changing real permissions. Production identity integration, friendly account labels, invitation flows, per-member impact counts and real concurrent-provider verification remain outstanding.

## Account identities and protected access history

Migration 040 adds the managed-auth email to member directory results, only after explicit website access-administration authorization. It joins only memberships belonging to the selected website; it does not provide global account search or expose authentication metadata. Null email accounts retain their user ID as identification. The client shows email plus ID and preserves the label after membership saves. Earlier notes that the directory returns IDs only describe the pre-040 implementation.

`GET /api/cms/access/history?site=<uuid>&before=<event-id>&limit=50` lists only membership.updated, role.created and role.updated events, newest first, with actor ID, timestamp and before/after details. It requires the same access-administrator grant. Cursor IDs are decimal strings to preserve PostgreSQL bigint precision; descending pagination is validated and responses are private/no-store. Other content and enquiry audit events are excluded. The API rejects unexpected event fields. A dedicated history viewer is pending.

Apply migration 040 with the updated directory API; older shapes fail validation. SQL tests cover website and account isolation, anonymous denial, filtering unrelated audit events, ordering and pagination. Actual generated role events also pass the API event schema. Authentication-provider integration remains unverified.

## History viewer

The Access screen now includes an on-demand, paginated history viewer. Each event expands to show the actor, stable event/target IDs, UTC timestamp and before/after values. Membership events include expiry, revocation and versions; role events include the permission lists. Current directory emails and names are explicitly labeled as current lookup labels, not immutable historical snapshots. Unknown actors/roles retain their IDs.

History clears when loaded membership/role versions change and must be loaded again. Failed reads clear prior results rather than leave a misleading complete history. Request generation checks ignore responses from obsolete loads or unmounted views. Loading older events uses the exact string cursor. Synthetic browser verification covered loading and expanding a membership event, a large bigint ID, and the before/after table. No real audit data was read.
