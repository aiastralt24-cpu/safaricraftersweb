# Asset usage and safe archive

Migration 015 adds nested `assetId` reference discovery across each record's current draft and published revision. `usage` on `/api/cms/media` returns up to 50 records in stable ID order, with separate draft/published flags and an optional record-ID cursor. It requires image-library view permission and filters each record by its own current view permission. Hidden record titles/paths are not disclosed.

`archive` accepts site, asset, expected revision and an explicit `archived` boolean. It requires document-delete permission and performs a reversible archive or restore, never file deletion. Archive checks all current drafts, published revisions and unexpired/unrevoked previews, including references the actor cannot read. An in-use failure is generic and reveals no hidden record details. Archive and restore events are audited; restoring does not approve usage rights or publish content.

New revisions and preview sessions take shared locks on referenced media and reject archived references. The archive function holds the media row lock while checking use, coordinating new references with an archive decision. Existing unknown asset references can remain in incomplete drafts, but cannot pass journey publication validation. Historical revisions alone do not block archiving; restoring such a revision requires first restoring its archived assets.

## Remaining work

The media-library UI, visual usage browser, private image previews, global replacement with impact review and actual byte-version history remain pending. Active previews block archiving but are not enumerated by the record usage list to avoid exposing preview recipients; archive errors explain this possibility. Service-role maintenance remains a privileged trust boundary and is not limited to editor commands. Indexed dependency storage and load tests are required before large-site deployment.

Verification: 42 PostgreSQL integration tests include nested draft usage, public-only usage after a draft removes an image, preview protection, permission separation, archive/restore, archived-reference rejection and usage privacy. Three media API tests verify fixed command dispatch and revision binding. TypeScript and whitespace checks pass. True multi-connection concurrency remains unverified.
