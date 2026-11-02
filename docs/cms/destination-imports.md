# Structured destination imports

The destination v1 table contract is implemented in `lib/cms/destination-import-contract.ts`. It is not yet an enabled upload format.

| Table | Purpose |
| --- | --- |
| Pages | Import identity, create/update intent, expected revision, slug, title and language |
| Content | Scalar field path and text: narrative, editorial, field intelligence and SEO |
| Lists | Ordered best-for and highlight entries |
| Media | Listing/hero/gallery/social placement, CMS asset, alt text, decorative flag and credit |
| Related | Typed CMS record relationships and destination pairing copy |
| FAQs | Ordered questions and answers |
| Sources | Research citations, HTTPS URL and access date |
| Notes | Ordered editorial title, introduction and body |

Character limits are hard errors; recommended word counts and SEO lengths are warnings. Values are never automatically shortened. Table validation reports sheet, row and field, rejects unknown columns and malformed cells, permits numeric normalization only for display order and limits each input to 500 total rows and 2 million text characters. Some import fields intentionally use tighter practical limits than the general CMS editor, such as image credits; excess content is reported, not truncated.

The table-level `valid` result means only that table shape and cell constraints passed. It does not establish valid create/update semantics, safe references, a complete destination payload, review approval or publication authorization. The draft planner now resolves update identities against caller-scoped existing snapshots, checks the expected revision, and validates the complete proposed payload. Media/reference availability, authenticated review/apply integration, Word/Excel generators and generated-template round-trip tests remain pending before enabling uploads.

TypeScript and all 319 CMS tests pass at this milestone. Existing journey imports remain unchanged. No document was uploaded or content applied.

## Draft planning and preservation

`planDestinationImport` produces complete proposed draft snapshots without writing or publishing. Any error rejects the entire plan. Updates require the existing CMS record UUID and exact current revision; URL and language changes are rejected. Creates use unique temporary import IDs and cannot specify an existing revision. Reserved country/atlas URLs are rejected.

Omitted Content rows preserve existing scalar values. An included row with an empty value explicitly clears that scalar, subject to schema validation. Page title is always required. Omitted collections and images remain unchanged.

To replace or clear a collection on an update, list its field name in the Pages `replaceCollections` cell, separated by commas. Supported names are `bestFor`, `highlights`, `image`, `heroImage`, `gallery`, `seo.socialImage`, `journeys`, `expeditions`, `pairings`, `faqs`, `sources`, and `editorial.scoop`. Supply the complete replacement rows; no rows means clear. Item IDs identify rows within the import, not persisted item identities, so this is full-collection replacement rather than item-level merging. Positions must be unique positive integers within each collection. Single-image placements accept only one row.

The planner rejects orphan rows, duplicate identities/URLs/scalar fields/positions, malformed references and invalid complete payloads. It preserves source inputs. It does not prove related records or images are available; the future authenticated review/apply layer must obtain current evidence and enforce optimistic concurrency again at write time.

TypeScript and all 324 CMS tests passed after this milestone. No upload format was enabled and no content was applied.

## Office parsing

`parseDestinationXlsx` and `parseDestinationDocx` share the existing bounded OOXML boundary with journey imports. Excel uses Instructions A1:B2 for templateVersion/pageType and stable field keys in each sheet's first row. Word uses a first metadata table containing `CMSDestination`, `1.0`, `destination`; section tables support horizontal columns or repeated two-column record tables, as in journey templates.

Both return source byte count, SHA-256 digest and parsed tables; Word also returns source table locations. Destination type/version is checked before planning. Blank rows retain diagnostic positions but do not create destination records. Existing archive limits, formula/external-link/macro rejection and Word embedded-content/tracked-change checks apply.

Synthetic Office archive tests prove equivalent Word/Excel draft proposals and retained diagnostic locations. TypeScript and all 328 CMS tests passed. Downloadable destination templates, generated-file round trips, actual Office application checks and authenticated upload/review/apply integration remain pending. Parser availability alone does not enable destination uploads.

## Excel template artifact

`public/cms/templates/destination-v1.xlsx` contains Instructions plus the eight destination data sheets. Instructions include field-specific character limits and editorial guidance from the contract. The blank data sheets have frozen headers, amber input cells, categorical selections, numeric position validation and red over-limit formatting across the first 100 input rows. Import validation remains authoritative, including when pasted values bypass spreadsheet controls. Dates are deliberately text in the YYYY-MM-DD interchange format.

The reproducible builder is `scripts/build-cms-destination-excel.mjs`: copy it into a bundled artifact-tool runtime directory containing `schema.json` exported from `destinationTemplate` plus `destinationContentFields`, then pass the repository's absolute path. It also produces a separate internal populated fixture for parser verification. No example content is in the client template.

All nine sheet opening views were rendered and inspected. The generated blank and populated files passed real parser/planner tests (5 destination file tests passing; latest full CMS suite remains 328 tests from the preceding milestone). Microsoft Excel interactive validation and full field-guide visual review remain unverified. Word template generation and authenticated import UI/apply are still pending.

## Word template artifact

`public/cms/templates/destination-v1.docx` provides eight reusable vertical record forms, import identity metadata, update-preservation instructions and a complete scalar field-limit reference. Duplicate whole tables for additional records and leave unused value columns empty. The parser ignores all-blank forms while retaining table locations. The builder is `scripts/build-cms-destination-word.py`, run using bundled Python with repository and destination schema JSON arguments.

The final eleven-page document was rendered with bundled LibreOffice and every page visually inspected. The generated blank file yields only the expected missing-page finding; the populated internal fixture yields one correct draft and preserves its source table location. All 330 CMS tests passed. Interactive Microsoft Word editing and file round trips in the client's Office version remain unverified. No destination upload route or apply workflow has been enabled.

## Authenticated file review endpoint

POST `/api/cms/import/destinations` accepts raw Office bytes with bearer authentication and `X-CMS-Site`, `X-CMS-Format` (`xlsx` or `docx`) and `X-CMS-Action: review`. It checks website membership before parsing, enforces the shared 5 MB streaming limit and rejects cross-origin requests. Update records are fetched using the caller token, in bounded groups, with a 5 MB aggregate response limit and exact identity/type/route checks.

Responses contain source provenance, the proposed draft plan and a digest bound to website, uploaded bytes and proposed snapshots. They explicitly return `applyAvailable: false` and `verification.mediaAndReferences: false`. This is a read-only review route; apply requests are rejected. The current-record review is not publication approval or proof of current asset/reference availability.

TypeScript and all 334 CMS tests passed, including real-file review, preservation of server content, digest changes, stale revisions, record mismatches, missing membership, authentication, origin and file limits. Tests inject the RPC transport; real-provider and browser end-to-end verification remain pending.

## Current availability evidence

Migration 053 adds `review_destination_import_links`, requiring create permission for new records and edit permission for every existing destination in the batch. It returns bounded, ordered asset and typed reference evidence scoped to the website and caller visibility. Images must be processed WebP with current approved rights; related records must be visible and of the requested type. The API additionally checks language and self-pairing.

Structurally valid plans now receive these checks and include evidence in the review digest. `verification.mediaAndReferences` means the check ran, not that it passed; use `plan.valid` and findings. Proposed snapshots remain visible when availability fails. Malformed/mismatched evidence fails closed. Structural failures skip evidence checks. `applyAvailable` remains false until atomic write-time checks and import persistence are connected. Draft references do not require publication here; publication readiness is checked separately.

TypeScript and all 337 CMS tests passed, including embedded-database permissions/site/type isolation and API evidence changes, wrong languages, self-reference and exact evidence identity checks. Migration 053 is local only; provider integration remains unverified.

## Atomic draft persistence boundary

Migration 054 introduces `apply_destination_import` and actor/site-scoped receipts. It accepts complete validated draft manifests with namespaced `destination_import_` SHA-256 source keys, create/update operation, record/revision for updates, locale and payload. Limits are 25 destinations and 1.1 MB of manifest JSON per transaction. The future API must enforce these limits before presenting an applicable review.

The database independently checks membership, create/edit/view permissions, expected revisions, unchanged URLs/languages, reserved routes, image rights/processing and typed related-record visibility/language. Dependencies are locked during saving. Self-pairings and video imports are rejected. It creates new draft revisions through `save_draft` and never changes published pointers. Any failure rolls back the entire batch and receipt. Create source keys are unique per website; identical request/source/review/manifest retries return the original receipt, while changed requests are rejected.

`get_destination_import_receipt` returns only completed receipts visible to the original actor with current website membership. Missing receipts are not proof of rollback. Full payload validation and recomputing the reviewed manifest remain responsibilities of the server API; the digest is an identity binding, not publication authorization.

All 339 CMS tests pass, including create/update, stale revision rollback, retry/digest conflicts, permission denial, private receipts, media/reference rejection, URL ownership and self-pairing. These run in embedded PostgreSQL; real-provider concurrency remains unverified. Migration 054 has not been applied remotely, and API apply is still disabled pending integration.

## API saving and recovery

The destination upload endpoint now accepts `review`, `apply` and `status`. Apply requires `Idempotency-Key` (UUID), `X-CMS-Review` (the exact review digest) and the original file bytes. It checks for a matching completed receipt first. Otherwise it reparses the file, reloads caller-visible records, rebuilds full schema-validated snapshots, refreshes availability evidence and compares the resulting digest before calling atomic draft persistence. It never accepts a client-provided manifest.

Review enforces the persistence limit of 25 destinations, a conservative 1 MB compact manifest limit, and rejects video imports. Valid plans expose `applyAvailable: true`. This is draft-save eligibility only. Source keys are deterministic namespaced hashes of import IDs. API responses verify result count, unique record/source identities, source-key correspondence and update target identities.

Status requires website and request ID headers, with no original file needed. It returns a validated actor-scoped completed receipt or `unconfirmed`; the latter never proves rollback. Malformed save receipts return a recovery-directed error because the database may already have committed. The client must retain its request ID and check before starting a different request.

TypeScript and all 342 CMS tests passed. A generated Excel file completed actual API review, database draft creation and receipt-based retry using embedded PostgreSQL. API tests also cover changed-content conflicts and malformed recovery/save receipts. Client UI, real-provider verification and concurrent-request tests remain pending; no remote migration or publication occurred.

## Client review interface

The destination workspace now includes Word/Excel template downloads, bounded file selection, findings, per-destination proposals and explicit acknowledgement before saving. Client checks bind review responses to the selected file SHA-256/size/format and reject inconsistent readiness. Recovery validates request/source/review digests, source keys, unique records and expected update targets.

Before apply, the panel stores only recovery identifiers in browser storage. Uncertain results keep file controls locked; the same file can be retried while still in memory, and reload restores status lookup. Original Office content is not persisted. Unconfirmed status never unlocks a new import. Corrupted storage fails closed and needs operator investigation. Pending imports participate in navigation warnings and prevent overlapping destination edits/migrations.

All 345 CMS tests and the production build passed after interface integration. Browser workflow, native file chooser, reload and responsive visual checks remain pending. The independent provider is still unconfigured; this is local implementation, not a deployed client workflow.

### Human-readable proposal preview
Each proposed destination now offers **Preview proposed destination** before draft confirmation. It renders destination copy, facts, FAQs, gallery and other supported content through the existing draft preview, using the authenticated private media loader. One preview is mounted at a time. **All proposed content** retains the complete payload for exact field inspection. The preview represents content, not a guarantee of final website styling or related-page availability. Acknowledgement is still required to save.

Verified locally with synthetic review responses on desktop and a 390×844 mobile viewport, including preview/FAQ toggles, acknowledgement and discard. Real-provider media and full upload-to-save browser verification remain pending.
