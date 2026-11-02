# Independent journal module

Status: draft editor, previews, public article/listing/search/sitemap code, reviewed Office imports and local database publication checks are implemented. Real-provider rollout, migration and client acceptance remain pending. Delivery flags are disabled; existing public pages still read their current content source.

## Draft model v1

The `journalArticle` content type uses `/journal/<slug>` and `journalArticleSchema` in `lib/cms/journal.ts`. The API requires matching envelope/payload titles and a matching route; updates retain the existing database revision and permission checks.

Fields include title, slug, category, author credit, explicit ISO calendar date, optional read-time label, description, listing image, optional separate hero image, gallery, pull quote, SEO overrides, research sources and an editable CTA. A new draft has no inferred author or date. The CTA begins with the current public article wording and can be disabled or edited.

Body blocks have unique stable IDs and one of six types: paragraph, h2/h3 heading, ordered/unordered list, attributed quote, safe link or private image reference. Text is data, not executable HTML; the future renderer must use React text nodes, not `dangerouslySetInnerHTML`. Image references use the existing alt/decorative, caption and credit contract. Unknown properties and legacy URL images are rejected rather than silently dropped.

Draft limits: 200 blocks, 10,000 characters per paragraph/quote, 50 list items of up to 2,000 characters, 50 gallery images and 100 sources. The shared API body-size limit also applies. Copy is never automatically shortened.

## Validation and delivery boundary

Advisory validation checks required editorial fields, meaningful body text, listing image, CTA heading, route consistency, SEO findings and current authorized media evidence across listing, hero, gallery, inline and social images. The journal-1 validator now reports readiness from actual content/media checks and rejects non-English publication. Local migration 058 adds its deployment-owned publication policy. Advisory results alone cannot authorize publication; a trusted worker must record the current revision receipt.

Saving a structurally valid incomplete draft is allowed. Publication readiness is a separate check. Media evidence is fetched using the caller's token and stored revision; upload/browser claims cannot substitute for it.

## Migration requirements

Existing body strings must be converted explicitly into paragraph blocks with deterministic IDs; preserve order, exact copy, author/date/read-time labels, pull quote and SEO. Current legacy hero selection uses the first gallery image differing from the listing image: migration must record that choice explicitly, not change the image accidentally. Asset URLs need approved private asset mappings. Existing article videos need a future supported video contract and delivery pathway; do not discard them or mark such articles migration-ready. Existing sources and CTA wording must be preserved or mapped explicitly. No migration has run.

## Evidence and next work

Five journal-specific tests exercise structured data round-tripping, invalid/legacy data rejection, complete nested media checks, publication blocking, save boundaries and caller-scoped advisory validation. Next: client editor and readable preview, then immutable published projection, route/list/search/sitemap integration, publication verification and migration rehearsal.

## Client editor and preview

The CMS navigation now includes Journal. Editors can create and save drafts, edit all v1 fields, add/reorder/remove structured body blocks, choose private images, edit SEO and sources, and configure the article CTA. Existing saved slugs and locales are locked. Invalid/legacy articles are left intact with a migration message rather than overwritten with defaults. Read-only records disable editing, and all saves retain server-side permissions and expected revisions.

The article content preview renders structured text as escaped React text, lists, headings, images and quotes. Links and CTA actions are disabled in preview. A single explicit preview toggle avoids loading private images until requested. The secure assigned-recipient preview viewer also supports journal drafts through its existing expiry/access checks. Revision history offers restore-as-new-draft with expected-revision protection.

Local browser evidence uses a synthetic in-memory backend: creation, field edits, missing-heading validation, block reordering, preview, save/reload and saved-URL locking passed on desktop; the preview was checked at 390×844. Real-provider persistence, media access, cross-user permissions, shared-preview expiry and revision restore still need end-to-end verification. No live article was changed.

## Public delivery contract (not activated)

`published-journal.ts` accepts an explicit published-revision envelope bound to `/journal/<slug>` and English. It requires complete editorial content, a listing image and a valid enabled CTA; research provenance (`sources`) and unknown fields are excluded from the public contract. It cannot authorize publication or verify current rights itself.

`public-journal-runtime.ts` calls only `get_public_journal_article` with the configured website and anonymous credentials. Both `CMS_PUBLIC_DELIVERY_ENABLED` and `CMS_JOURNAL_DELIVERY_ENABLED` must be `true`. Invalid URLs/locales and request overrides are rejected; absence returns 404, unavailable/malformed delivery returns a generic 503, and responses are not cached. Service-role credentials are never used by this transport.

The dedicated database reader and public endpoint are implemented locally; website consumers are not connected yet. Neither flag has been enabled. Database media-rights checks, public source-field filtering, published-pointer isolation, listing/search/sitemap parity and publication policy must be implemented and tested before activation.


### Published database reader

Migration 055 adds `get_public_journal_article` for anonymous/authenticated delivery, backed by explicit nested projections. Research sources, unknown properties and internal nested metadata are omitted; nested objects supplied in public scalar/list fields cause rejection. The reader selects only the published revision for the configured website, route and English locale. It rechecks current approved, unarchived, unexpired processed-WebP media for the public payload. Internal projection helpers are not executable by anonymous users.

The GET endpoint is `/api/cms/published/journal/<slug>` and retains the two opt-in flags. The migration has not been applied remotely and the flags remain disabled. The full embedded-database suite verifies a newer draft stays hidden, cross-site/language misses, omission of nested notes, revocation/MIME/expiry failures, unpublishing and helper permissions. These checks do not establish real-provider readiness. Public media authorization, website rendering and a journal publication policy are the next dependencies.

### Journal public image authorization

Migration 056 extends the existing public image authorization function. A journal image is eligible only when it appears in the filtered payload returned by the published article reader. Asset IDs present only in research provenance or a newer draft do not grant access. The existing processed-WebP, inspection, approved-rights, expiry and archive checks still apply. Existing journey/page/destination rules are retained. The existing public media handler continues to verify bytes/digest and recheck authorization before responding.

All 356 CMS tests passed, including embedded-database tests for draft-only and internal-note images, website isolation, revocation, archiving and unpublishing. Migrations remain local. A read-only HTTP check of the running local server returned the expected generic 503 with no-store/noindex headers while journal delivery is disabled. The earlier failed local request was a sandbox-connectivity limitation, not proof the server had stopped.

### Website article rendering

The `/journal/[slug]` route now uses the independent reader when `CMS_JOURNAL_DELIVERY_ENABLED=true`. Disabled mode retains existing legacy article content. Enabled mode never falls back to legacy data: absent records are not found and backend/configuration failures propagate as unavailable. The route is dynamic, and React request caching shares the article read between metadata and page rendering.

`CmsJournal` renders all six body block types, public image URLs with contextual alt/decorative attributes, captions/credits, full gallery and the editable CTA using existing article styles. Text remains escaped. Metadata uses SEO/social/canonical/robots overrides and article dates; Article JSON-LD uses editorial facts without inventing modification timestamps. Website-level SEO inheritance remains future work.

Verified using a temporary synthetic page/image fixture in the in-app browser on desktop and 390×844 mobile: headings, multiline copy, lists, quotes and images were readable; an article link navigated to the journal listing; no console errors or framework overlays appeared. Fixtures removed before production build. All 359 CMS tests and build passed. This does not prove real-provider full-route delivery. Keep the flag disabled until publication, listing/search/sitemap consistency and migration checks are complete.

### Published catalogue, search and sitemap

Migration 057 provides bounded identity-cursor pagination over the same published reader, returning only listing fields and published revision timestamps. The TypeScript catalogue reader rejects duplicate paths, non-progressing cursors and malformed summaries, caps traversal at 10,000 records, and sorts accepted results by editorial date, title and record ID. It uses configured anonymous credentials and both delivery flags.

Search and sitemap now replace legacy journal entries with this catalogue when journal delivery is enabled; they do not merge stale legacy URLs or fall back after errors. Search omits explicit noindex articles; sitemap also omits explicit sitemap exclusions and uses the published revision modification time. Global inherited indexing defaults still need integration. The public journal listing UI is the remaining catalogue consumer to connect before activation.

Database tests cover keyset traversal, site/language isolation, filtered image metadata, absent private provenance and rights revocation. Contract tests cover deterministic ordering, malformed/duplicate/non-progressing results, traversal limits, discovery exclusions and anonymous RPC arguments. The catalogue migration remains local and the delivery flag remains off.

### Journal listing consumer

The dynamic `/journal` route now reads the published catalogue when journal delivery is enabled. `CmsJournalListing` provides categories derived from actual articles, result counts, public-image cards, article links and an empty catalogue message. It renders images directly through the authorization-checked media URL rather than an image-optimizer cache. Disabled mode still uses the existing listing. Errors do not trigger a legacy fallback.

Local browser QA used synthetic catalogue data: category selection reduced two cards to one, the empty catalogue removed categories/cards and displayed its message, returning data restored cards, and mobile cards fit a 390×844 viewport. Article navigation reached its expected URL; the synthetic unpublished article correctly returned the existing 404 page. No console errors/framework overlays appeared. Fixtures removed. Real-provider listing-to-detail verification and editable listing heading/copy/empty-state labels remain pending, alongside publication validation and migration.


### Revision-bound publication validation

Migration 058 enables the local `journal-1` publication policy, includes stored locale in trusted validation inputs, and extends the current processed-WebP checks to journal assets. The publication trigger locks and rechecks each asset, so a stale successful validation cannot bypass changed MIME or rights. Published article routes must continue to match their published slug and English locale. A database trigger also rejects changes to those identities while published.

The normal editor → submit → separate reviewer approval → trusted validation → publisher flow is tested in embedded PostgreSQL. Missing receipts, self-approval, invalid replacement content and media changes after validation block publication. A rejected replacement retains the prior published revision; a valid replacement updates delivery. All 365 CMS tests and TypeScript passed. Remote migration, actual worker configuration, concurrent-provider testing and client workflow controls still need verification/implementation. No live publication occurred.

### Client review and publication controls

Saved articles now expose advisory checks, trusted-check requests, submission, separate-reviewer approval/change requests, and revision-bound publication/withdrawal confirmations. Unsaved changes disable workflow operations. Pending confirmations reset when the current revision, review state, published revision, publish permission or disabled state changes. Withdrawal sends the actual published revision even if a newer draft exists. The API/database remain responsible for permissions, author/approver separation and trusted receipt checks.

The workspace reloads the saved record/list after each successful action and distinguishes database publication from configured visitor rollout. It does not claim that a delivery worker has completed; detailed job status remains to be integrated.

Browser QA used a synthetic workflow fixture on desktop and 390×844 mobile: submit, approve, publication confirmation, revision-change cancellation, permission-removal cancellation, confirmed publish/withdraw revision IDs and dirty-state disabling all passed. No real API writes occurred. The fixture was removed. Full real-provider workspace checks remain pending.

### Read-only migration planner and inventory

`planJournalMigration` in `lib/cms/journal-migration.ts` preserves each complete source object and its digest, retains exact paragraphs with deterministic IDs, converts only ISO/full-English-month calendar dates, and requires per-source-digest/per-image-path mappings. It blocks changed alt text/credit/purpose, malformed/unknown data, unsupported video, duplicate slugs and unused image mappings. An image mapping is not evidence of current website ownership or rights; authenticated server checks must still verify it before saving.

Hero selection exactly follows the legacy page: first gallery image with a different URL from the listing image, otherwise the listing image. The proposed public gallery retains the current visible subset (exclude hero/listing URLs, first four remaining images). Original hidden descriptors and supplied mappings remain in the review, with a warning, rather than disappearing. The planner cannot write or publish.

Run `node --experimental-strip-types scripts/audit-cms-journal-migration.mjs` to regenerate `journal-migration-inventory.json` from the current website snapshot. The inspected snapshot has 15 articles, no video fields, and zero ready drafts without asset mappings. The report contains 62 blocking/warning findings, primarily image mappings plus date-format and hidden-gallery disclosures. All paragraph counts and dates were checked against the real snapshot. This inventory does not include live Sanity-only changes; reconciliation with that source remains pending.

Next: authenticated review with current media evidence, atomic draft saving with replay recovery, and a client migration-review interface. No source content has been changed.

### Authenticated migration review

`POST /api/cms/migrations/journal` accepts review/apply batches of 1–25 legacy articles, explicit locale and source-digest-keyed image mappings. It checks bearer authentication, same-origin requests and bounded JSON before producing a plan. Migration media evidence is obtained only through the caller-token `review_journal_migration_media` RPC in local migration 059, which requires article create permission and document view access, and checks website ownership, processed WebP, inspection, rights, expiry and archive state.

Evidence must match every requested asset in order; malformed or incomplete evidence returns unavailable. Retained hidden-gallery mappings are checked too. Readiness and the review digest reflect current media evidence, website and locale. Responses are private/no-store. Review offers apply only when every candidate is ready and there are no unused mappings.

Verified with the full 374-test CMS run and an additional focused hidden-gallery evidence test; TypeScript passed. Atomic migration apply/recovery and the client mapping/review UI are next. Migration 059 has not been applied remotely.


### Atomic migration saving and recovery

Local migration 060 adds `apply_journal_migration` and `get_journal_migration_result`. Apply requires article-create permission and creates only drafts, in one transaction for the complete batch. The private batch manifest retains original source objects and every supplied mapping, including hidden-gallery images. It locks and checks current site-owned processed-image rights for visible and retained mappings before saving. Duplicate import identities and route collisions cannot overwrite existing records.

The API requires the reviewed digest and a UUID request key. New requests recompute the plan and current media evidence; changed reviews return conflict. Completed requests are recovered before rechecking media, then replayed through SQL's exact manifest comparison. Thus later rights changes do not disguise a committed import as a failure, and retrying cannot overwrite later edits. Recovery is actor- and website-scoped. A missing receipt is explicitly unconfirmed, not proof of failure. Malformed receipts fail closed; clients should retain the request key and check status after an uncertain result.

These RPCs save drafts, not approved or published content. Direct authenticated RPC callers can author drafts, as with the ordinary draft API; a supplied review digest is a replay identity, not a server-signed content approval. Trusted publication validation and separate approval remain mandatory. The client mapping/review/recovery interface and real-provider rollout are still pending. Migration 060 has not been applied remotely.

### Browser migration contract

`lib/cms/journal-migration-client.ts` supplies bounded snapshot/mapping parsing, browser-native SHA-256 matching the server's canonical source hashing, and verification of API reviews against exact source ordering, source identities and supplied image mappings. Readiness must agree with candidate findings and valid journal schemas. Receipt verification requires every reviewed article exactly once, with unique record and revision identities.

Pending request identifiers include website and actor identity, source/review digests and request UUID. Recovery storage keys are scoped to both website and account; parsing rejects extra fields such as uploaded source content. Status verification matches the exact request and source/review identities; unconfirmed results return no completion receipt and must keep the UI locked. Image selection helpers retain exact original alternative text and credit, rejecting unsupported metadata for manual review.

These helpers are tested against actual API review output, but are not yet connected to the visible migration panel. No browser flow is claimed complete. Next: upload, guided asset mapping, readable draft preview, acknowledgment, durable pending-state persistence before apply, and receipt recovery controls.

### Guided journal migration panel

The Journal workspace now includes `JournalMigrationPanel`, keyed by website and signed-in actor. Upload a JSON journal snapshot (1 MB, up to 25 records), select inspected assets from the existing media library for each original image path, then request authenticated review. Asset selection preserves source alternative text and credits. Unsupported image descriptors remain visible as blockers. Review shows warnings, hidden-gallery retention, original/proposed JSON and a readable journal preview. Any mapping or locale change clears the review and acknowledgment.

Saving requires an explicit review acknowledgment. A versioned actor/site-scoped recovery identifier is written to localStorage before the API write; uploaded source content is not persisted. Pending requests disable source changes and competing article edits. A same-session retry uses the original review/request; reload preserves status lookup. Recovery verifies every identity before clearing stored state; unknown status remains pending. Unreadable recovery storage blocks new imports rather than silently discarding tracking.

Synthetic browser QA passed at 1280×900 and 390×844: upload → match image → authenticated-review-shaped response → original-text preview → lost apply response → locked inputs → reload → receipt recovery → unlocked inputs. This fixture used the actual panel and a real server-generated review with a mocked transport, not a production backend. No page runtime errors were observed. Screenshot evidence is `/private/tmp/journal-migration-desktop.png` and `/private/tmp/journal-migration-mobile.png`. The temporary route was removed. Real-provider migration, authorization changes during a session, and concurrent-tab recovery remain verification work.

## Paragraph formatting and public projection

Journal paragraphs now accept the shared approved inline-span fields: text, safe link, bold, italic and normal/superscript/subscript position. The article retains its 10,000-character paragraph limit, stable block IDs and exact concatenated fallback text. Existing plain paragraphs remain compatible. JournalEditor reuses ParagraphEditor, and journal draft/public renderers reuse CmsInlineText. Links remain non-navigable in the journal draft preview.

Migration **194-journal-inline-formatting.sql** replaces the journal payload projection while retaining its existing field allowlists and function permissions. It preserves approved scalar span fields, drops unknown/private fields, and returns no payload for malformed spans, inconsistent fallback text or over-limit paragraph text. Deploy this migration before accepting formatted journal publication on staging; prior projections would omit formatting.

Verification: a local browser fixture exercised authoring, formatting, article JSON round trip and non-navigable draft preview. Local database tests exercised the replacement SQL projection, privacy filtering and malformed spans, alongside the existing journal publication/privacy suite. No provider migration or real-content publication was performed. Table support is described below; list formatting and native document inline-formatting imports remain pending.

## Journal tables

Journal articles now accept stable-ID table blocks using the same richTable contract as page content: required caption/headings, 1–8 columns, 1–50 rectangular rows and bounded plain-text cells. JournalEditor reuses TableBlockEditor; draft and public article renderers reuse CmsRichTextBlock. Reordering the article body preserves table IDs and cell contents. Existing article publication requirements still require editorial text and verified media; a table does not bypass them.

Migration **195-journal-tables.sql**, applied after 194, extends the public projection with caption/header/cell allowlisting. It rejects nested cell objects, null cells, mismatched widths, empty captions/headings and oversized tables while excluding private table metadata. Deploy it before formatted table publication on staging; old projections reject this new block kind.

Local browser checks verified table creation, editing, block reordering, JSON round trips and caption/column-header rendering. The journal/database suite passed 249 targeted tests including SQL privacy/shape cases. Temporary fixture removed and affected source inventories refreshed. This is local verification, not provider deployment or client acceptance. Native import authoring and inline list/cell formatting remain unfinished.

## Structured Office table imports

Journal v1 Word and Excel templates now include optional `Tables` records. Existing v1 documents remain compatible. Create a Blocks record with `kind=table` and its caption, then supply one `header` record and ordered `row` records linked by blockId. Columns are explicitly named column1–column8. Headings define the width; empty row cells and embedded line breaks are preserved. The importer rejects extra cells beyond the headings, missing/duplicate headings, orphan records, duplicate positions and schema limits rather than silently dropping content. Updates still require explicit body replacement and a current revision; imports only save reviewed drafts.

Both downloadable templates and filled parser fixtures were regenerated. Their actual files round-trip through the production Office parsers, including out-of-order rows, multiline cells and empty cells. All nine blank Word pages and the changed Excel instructions/table sheets were rendered and visually checked. The 22 targeted journal import tests and all 1,247 CMS tests pass. Native Microsoft Office use, independent client trials, inline formatting import and provider publication remain unverified.

## Unsaved journal history

The journal workspace now uses the bounded shared draft history for the entire article and locale. Undo/redo includes title, body blocks (including removal and tables), media selections, CTA, sources and SEO. History is in memory, marks restored values dirty, and is cleared on new/load/save/restore boundaries, including identical incoming snapshots. Controls are disabled while busy, during pending imports/migrations, for read-only records, or when no editable draft exists. The shared limit is 50 snapshots and a 4-million-character budget; the current draft is never truncated.

Verification: 54 journal/history tests passed. A browser fixture using the actual workspace verified ordered title/table edits, deletion recovery, redo, busy locking, save reset, switching articles and new-draft locale undo/redo, with no page runtime errors. The fixture used an in-memory API and was removed afterward; provider saves, journal conflict reconciliation and autosave remain separate work.

## Concurrent article saves

A 409 while saving an existing article now loads the current caller-scoped record and prepares a three-way comparison against the loaded baseline. The latest article must match identity, type, locale and route, have a newer revision and retain edit permission. Malformed or inconsistent payloads cannot be reconciled; the local draft remains open.

The comparison includes optional image additions/removals. Independently changed fields have suggested choices; overlapping edits require explicit selection. Body, gallery, SEO and other compound fields are selected as whole values to avoid silently merging ordered content. Editing, history, imports and ordinary workflow controls are locked during comparison. Applying choices only changes the local draft, resets local history and uses the latest revision on the next explicit save. Cancel preserves the original unsaved work, and another competing save triggers another comparison.

Verification: 56 targeted journal/conflict tests passed; browser checks with the actual workspace and an in-memory API covered conflicting title choices, independent author updates, locked controls, no write on reconciliation, repeated conflicts, cancellation and successful explicit resaving. TypeScript passed. The temporary fixture was removed. Real-provider concurrency and journal autosave remain pending.

## Opt-in journal autosave

Existing articles can opt into autosave after a three-second pause. Only valid, dirty drafts with edit permission are eligible; new articles require an explicit first save. Pending imports/migrations, active operations and save comparisons suspend autosave. The timer is bound to the website, account, article, revision, local-history epoch and exact content, so newer edits or manual saves cancel stale work. While a save runs, editing/navigation is locked and the workspace remains dirty for leave protection.

Autosave uses the ordinary revision-checked draft save and cannot publish. Successful saves retain the opt-in setting and clear local history. Loading or creating an article disables autosave. Errors disable it and retain the unsaved content without an automatic retry loop; conflicts disable it and open the comparison flow. The editor can re-enable autosave or explicitly save after resolving the problem.

Local browser verification covered valid debounce, invalid-field waiting, cancellation by manual save, simulated offline failure with no retry loop, re-enabling, conflict pause and new-record exclusion. The full CMS run passed 1,249 of 1,250 tests while the temporary test route existed; the remaining route-inventory test passed after fixture removal. TypeScript passed. This is local fixture evidence, not native client acceptance or real-provider persistence.
