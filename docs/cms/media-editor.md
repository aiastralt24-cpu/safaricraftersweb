# Media metadata and usage rights

Migration 013 adds editable image title, description, default alternative text, caption, folder and tags. Each media object has a revision counter that advances on every update, including service-worker changes. File identity, bytes, dimensions, hash and storage key remain immutable through editor commands.

`POST /api/cms/media` accepts authenticated JSON commands:

- `list`: site, optional `after` asset ID and `search` text; at most 50 results in stable ID order.
- `get`: site and asset ID.
- `edit`: site, asset, expected `revision`, title, description, alt, caption, folder and tags.
- `rights`: site, asset, expected `revision`, status (`pending`, `approved`, `revoked`), evidence and nullable ISO expiry.

Search treats input as literal text across title, description, folder and tags. Read permission is collection-level `view` on `document`; metadata editing requires `edit`; rights changes require `configure`. These permissions are checked against current membership on every database operation. Records from another website or without read permission are unavailable. Metadata changes cannot smuggle rights fields or storage changes through the API.

Approved rights require nonblank evidence and a future expiry when specified. Rights evidence is only returned to users with rights-management permission. Metadata and rights updates are audited with actor, asset, revision and action; evidence text is not copied into audit details. A stale revision aborts the operation, including a metadata edit whose underlying rights were changed by another administrator.

Default alt text is a library default, not a silent override of page-specific text. Existing journey media references retain their own alt/caption values. The editor APIs do not publish content, change source bytes or expose storage locations.

## Remaining work and verification

The `/cms` Media library now includes text search, pagination, metadata forms, separately permissioned rights forms, visible-record usage lookup and archive/restore controls. Metadata and rights have independent unsaved states so saving one does not discard changes in the other. Navigation guards protect dirty forms; revision checks remain enforced by the server. Private thumbnails, selection into pages, byte-version operations, focal points/crops, rights evidence attachments and brand scope remain pending. Migration 014 suppresses affected public CMS journey reads and provides a withdrawal sweep; production scheduling/cache invalidation remains pending (see `media-withdrawal.md`). Do not treat this as complete rights lifecycle management.

Browser checks used a temporary synthetic-data fixture with the actual component: metadata save preserving unsaved rights evidence, rights save, usage lookup, search, archive result, desktop layout at 1280×900 and mobile at 390×844. No console warnings/errors or horizontal overflow were observed. A locator timeout was resolved using the visible combobox role; archive-click observation timed out, but a fresh snapshot verified archived state and the Restore control. Restore interaction and real authenticated staging remain unverified. The fixture was removed after testing.

38 local PostgreSQL tests include metadata edits, revision conflicts, rights permission separation, evidence validation/redaction, literal search, website isolation and audit records. Two media API tests check fixed RPC dispatch and rejection of privileged fields. TypeScript and whitespace checks pass. Managed auth/staging and client UI workflows remain unverified.
