# Authenticated editor API

`/api/cms/content` is the independent CMS JSON API. It requires an explicit managed-auth bearer JWT and the separate CMS environment settings. The gateway forwards the user's token to PostgREST; PostgreSQL functions and RLS enforce permissions. No legacy shared-token authentication or service-role fallback is accepted.

## Reads

- `GET /api/cms/content`: accessible websites.
- `GET /api/cms/content?site=<uuid>`: up to 50 accessible records. Optional `type`, `after` (last returned UUID) and `limit` (1–100) support filtering and keyset pagination in UUID order.
- `GET /api/cms/content?site=<uuid>&record=<uuid>`: current draft payload, revision pointers, review state, effective action permissions and the most recent 20 revision summaries. An inaccessible or missing record returns 404.

The read functions in migration 005 run as the invoker and preserve table RLS. UI permission flags are hints; subsequent writes always recheck permissions. Pagination is not a transaction snapshot: clients should refresh after creating records, because UUID ordering is not creation order.

## Commands

POST JSON with an `action`:

| Action | Required fields |
| --- | --- |
| save | site, record (UUID or null for create), expectedRevision (UUID or null for create), type, path (string or null), title, payload; locale defaults to en |
| submit / approve / request_changes / publish / unpublish | site, record, revision |
| restore | site, record, revision to restore, expectedRevision currently being edited |
| preview | site, record, revision, recipient; minutes defaults to 60 |
| revoke_preview | preview |

The operation is selected from a fixed allowlist, never supplied as an arbitrary RPC name. Unknown fields are rejected. Actor identity comes from the JWT, not JSON. Updates require their current revision. Paths and content types cannot be silently changed by the underlying save function. The unpublish revision is the expected published revision, which can differ from the current draft revision.

Requests are bounded while streaming, even if Content-Length is missing or incorrect. The transport cap is 1.1 MB; the database has its own payload cap. Cross-origin browser writes are rejected. Responses are private and noncacheable. Known workflow failures return an actionable 422 message; stale/duplicate conflicts return 409. Raw database messages and upstream details are not returned. Successful void RPC responses are handled as success.

This API permits incomplete draft content; it does not grant publication validation. Publish remains blocked until the exact approved revision has a trusted validation result. A production validation worker is still required.

## Remaining integration

Apply migrations 001–005 to isolated staging, connect actual user login, implement client forms and the section builder, and verify the complete editing workflow with real JWTs and browser interactions. Import upload/apply endpoints, templates, media delivery and full history pagination are not included in this checkpoint. No external database was changed.
