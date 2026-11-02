# Editorial page Word/Excel import

Status: versioned table contract, cell validation and bounded Office parsing implemented. Content planning, server review/apply, client templates and import UI remain pending. Parsing does not save or publish pages.

## Version 1.0 format

Excel Instructions must contain `templateVersion` / text `1.0` and `pageType` / `page` in rows 1 and 2. Word metadata uses `CMSPage`, `1.0`, `page`. Horizontal and vertical record tables use the existing Office import format. The authoritative fields and limits are in `lib/cms/page-import-contract.ts`.

| Table | Purpose |
| --- | --- |
| Pages | Stable import ID, explicit create/update, expected revision, custom URL, title, locale, section replacement intent |
| Sections | Stable section ID/order, one of the six approved editorial kinds, label, heading/layout/visibility/motion controls |
| SectionContent | Named section title, accent, eyebrow, copy and layout values |
| Blocks | Ordered paragraph/list/link rich-text blocks |
| ListItems | Ordered text belonging to a list block |
| Cards | Ordered cards and their text/link fields |
| Images | Already-processed CMS image references for a section or card, alt text and attribution |
| Buttons | Ordered labeled links and new-window choice |
| Downloads | Ordered published document references pinned to a reviewed revision |
| SEO | Named page metadata values |

Every child row carries a page import ID. Section children also carry a section ID. Display order is the only numeric cell type; boolean choices are literal text. The later planner must check all identities, relationship ownership, duplicates, ordering, kind-specific fields, safe URLs, image/link/reference eligibility and update conflicts. Passing cell validation alone is not acceptance of a composition.

## Limits and preservation

Use at most 500 rows across content tables, with the existing 5 MB Office upload and ZIP/XML expansion limits. Text has explicit Unicode character limits, including 200-character headings, 10,000-character paragraphs/copy, 500-character alternative text and 2,048-character links. SEO title/description recommendations are warnings at 60/160 characters; hard limits remain separate. Nothing is shortened automatically. Blank row placeholders and exact text whitespace are retained for faithful diagnostics. Unknown sheets, columns and scalar content fields produce errors rather than disappearing.

The shared parser rejects formulas, macros, external workbook relationships and unsafe XML/archives. Word uses table-based content; it does not infer arbitrary document layout or invent claims. Media uses existing CMS IDs, not untrusted file URLs. This format is an explicit structured template, not general-purpose Word conversion.

## Remaining delivery work

- Build complete section planning with explicit replacement semantics and source-cell findings.
- Bind updates to caller-scoped current revisions and preserve unsupported existing data.
- Produce real client XLSX/DOCX downloads with examples, instructions and readable limits.
- Connect authenticated upload, review/diff and deliberate draft application with safe retries.
- Verify all six section types, wrong/expired references, conflicts, rejected uploads, real Office round trips and client usability.
- Keep approval/publication separate from import; no uploaded file can authorize its own release.

## Draft proposal planner — 2026-10-23

`planPageImport` now builds independent proposed draft snapshots for all six editorial families. It joins stable page/section/item IDs, sorts explicit positions, builds rich-text lists/links, maps section/card images, buttons and version-pinned downloads, and validates composition/SEO schemas. Card roles/eyebrows, introduction and column count are included in the table contract. Scalar fields inappropriate to the chosen section fail strict section validation.

Creates require a new import ID and no expected revision. Updates require an accessible supplied current record with an exact UUID revision match; URL/language changes are refused. Any section rows on update require `replaceSections=true`, which replaces the entire section list. Metadata-only updates retain sections. Unknown existing top-level payload fields require migration rather than silent loss. Input objects are not mutated. Errors anywhere result in no proposed changes, preventing accidental partial application. At most 25 pages and 500 total rows are accepted.

Relationship/type/unused-field findings identify their source table and row. Final composition-schema findings identify the source section row with the detailed composition field path; they are not yet remapped to every originating child cell. Cell limits and recommendations remain distinct. The planner allows structurally valid incomplete drafts: publication-specific H1/link/media/document eligibility requires the normal trusted validation later. Processed image IDs and document revision strings are syntax-checked here, not authenticated or fetched.

Tests cover all section families, exact text preservation, independent proposals, metadata-only updates, deliberate replacement, stale revisions, unknown existing data, orphan rows, duplicate IDs/positions, unsupported image targets, inapplicable fields, unsafe links and invalid document pins. Generated Word and Excel inputs now produce the same planned drafts. Server-scoped evidence gathering, review/apply/idempotency, downloadable Office templates and client UI remain pending.

## Reference review boundary — 2026-10-23

`pageImportLinks` collects image IDs and unique document/version pairs from the entire proposed snapshot, including retained content and hidden sections. `verifyPageImportEvidence` rejects missing, extra, duplicated, reordered or malformed evidence and reports unavailable references for each affected page. UUID pairs are normalized; image IDs retain their exact case. Page-level findings use row zero as an internal placeholder that the pending upload API must map to the source Pages row.

Migration 160 adds authenticated `review_page_import_links`. It requires permission to create pages and/or edit the supplied English custom-page targets. It returns only ordered IDs and availability booleans, never storage paths or private document metadata. Images require current view permission, processed WebP status and approved unexpired rights. Document pins require current document view permission, matching English locale and published revision, and the existing internal release eligibility check. The eligibility check supports authenticated visitor documents without granting visitors access. This is review-time evidence, not a publication receipt or write authorization; the pending apply transaction must recheck current eligibility and revision conflicts.

The database migration is exercised locally, not applied to a managed deployment. Authenticated upload/review orchestration, atomic draft application and retries, downloadable templates and client review UI remain pending.

## Authenticated review and atomic draft application — 2026-10-23

`POST /api/cms/import/pages` now supports review, apply and receipt status. It checks the bearer identity, website membership, request origin and bounded Office upload. It reads requested existing pages with the caller's token, verifies their identities and custom routes, and rebuilds the complete proposal from original file bytes. Review results bind the source digest, current draft content, manifest and image/document eligibility. Apply rebuilds that proposal and refuses changed content or evidence. An empty template is rejected before reference review.

Migration 161 adds an atomic `apply_page_import` transaction and caller-private receipts. Creates and updates enforce page permissions, English custom routes, unchanged existing URLs/language, current revision matches and supported section families. The transaction locks and rechecks image rights and pinned document/file eligibility before saving. An invalid later item rolls back earlier drafts, import keys and the receipt. Successful retries with the same actor/site/request/source/review/manifest return the original IDs; mismatched reuse fails. Status distinguishes a verified completed receipt from an unconfirmed request. Saving retains the normal draft/review/publication workflow; it never publishes.

Local verification includes real Word bytes through the HTTP handler into the database, review/apply/replay, saved content, stale revisions, preserved images/documents, expired eligibility, permission denial, receipt privacy and rollback. A genuinely published document is accepted as a pinned import dependency without publishing the imported page. No migration has been applied to managed infrastructure. The client upload/diff screen, downloadable Office templates and real Microsoft Office/client UAT remain pending.

## Client upload/review/recovery panel — 2026-10-23

The Pages workspace now includes a Word/Excel import panel. It verifies file identity and server review readiness, displays source-row findings, separates create from update and whole-section replacement, previews proposed composition, and requires an acknowledgement before saving. Page editing and migration controls are disabled while an import is pending; the workspace's unsaved-work guard includes import state. Completion reloads the current record/list.

The browser stores only actor/site-scoped recovery IDs, digests and expected record identities, not the uploaded file or page content. An interrupted save offers a receipt check and, while the selected file remains available, a retry of the same reviewed request. Reload recovery verifies the saved receipt against the original identities before clearing recovery state. Malformed/mismatched recovery data prevents starting a second import.

Client verification tests cover source binding, page identity/routes/title, composition/SEO validation, current document/image evidence and receipt identity. Playwright exercised the real panel at 1280px and 390px: upload, review, preview, required acknowledgement, a simulated lost save acknowledgement, reload, receipt recovery and list refresh. Those browser responses were controlled fixtures; real HTTP/database review/apply/replay is covered separately by the database integration test. Browser plugin was unavailable. Screenshots were inspected and no horizontal overflow or runtime page errors occurred. Temporary QA routes were removed. Downloadable templates and real Office/client UAT remain pending; the panel states that templates are being prepared.

## Downloadable Excel template — 2026-10-23

The Pages import panel now links to `/cms/templates/page-v1.xlsx`. The blank workbook contains Instructions and every supported data sheet, frozen row/identity headers, amber input cells, supported choice lists and conditional length warnings. Instructions explain create/update identities, whole-section replacement, stable relationships, approved image/document IDs, supported section fields and examples. The first 100 data rows per sheet are styled; the importer still enforces 500 total records and the 5 MB limit. Excel LEN-based color warnings are advisory; authoritative Unicode/field-specific limits are checked by the server. Native Microsoft Excel behavior is not yet verified.

The builder is `scripts/build-cms-page-excel-template.mjs` using the bundled artifact tool and a JSON export of the page contract. A filled fixture verifies the actual exported workbook through `parsePageXlsx` and `planPageImport`, including exact newlines. Blank templates do not create sample records. The exported cells contain no formulas; conditional-format expressions provide visual warnings. Button/card link label limits were aligned to 30 characters and anchors to 80 in the source contract. Every worksheet was rendered for inspection, and a deliberately overlong title produced a red warning. The local HTTP download was compared byte-for-byte with the exported file. Word template creation and native Office/client UAT remain pending.

## Word template and Office save round trips — 2026-10-23

The Pages panel now also links to `/cms/templates/page-v1.docx`. Its 13 pages include create/update instructions, section and SEO field limits, all six section families, and copyable two-column record tables for every supported sheet. Amber cells accept values; field names and the template identity remain unchanged. The blank document contains no sample content to import. A filled DOCX fixture produces exactly the same draft snapshot as the Excel fixture, including line breaks. All rendered Word pages were visually inspected with the bundled LibreOffice renderer; the HTTP download matches the exported file byte-for-byte.

Bundled LibreOffice Writer and Calc opened/saved the filled DOCX and XLSX examples. Their re-imported snapshots now match the originals. This check exposed numeric XML newline references (`&#10;`) being retained as literal text in Calc output. Both shared XML parser modes now decode numeric references; DTD/entity declarations are still rejected before parsing. Regression coverage verifies decimal newlines, hexadecimal Unicode, escaped punctuation and literal entity-looking text without double decoding. This is a LibreOffice compatibility check, not proof of native Microsoft Word/Excel behavior. Microsoft Office round trips, broader content/layout variations and client usability acceptance remain pending.

## Saved-draft change summary — 2026-10-23

Page proposals now include a comparison against the normalized current draft read by the server. Stable section IDs distinguish additions, removals, reordering, content/control changes and changes combined with moves. The review screen shows previous/proposed page titles, removed section labels, previous/proposed positions and kinds, changed section fields, and previous/proposed SEO values including clearing a field. Unchanged object-key ordering does not create a false difference. New-page summaries omit empty/default SEO noise.

The comparison is part of the review digest and is rebuilt during apply. It is based on the current editable draft, not the published revision. It summarizes section changes and preserves the existing proposed-layout/full-payload review; it does not yet provide word-level highlighting inside rich text. Browser checks at 1280px and 390px covered removed-section warnings, cleared SEO, preview, acknowledgement and interrupted-save recovery using controlled responses. The planner and database integration suites independently exercise actual current-draft reads and digest rebuilds.
