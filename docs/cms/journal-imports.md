# Structured journal imports

## Current scope

The local CMS supports journal Word/Excel download → upload → review → preview → save drafts → recover an interrupted save. The implementation includes file parsing, a strict draft planner, authenticated review, atomic database apply and actor/site-scoped receipts. Imports never approve or publish an article. Hosted provider verification, native Microsoft Office trials and client acceptance remain pending.

The legacy JSON migration panel is a separate flow for preserving website snapshots.

## Template contract

| Table | Purpose |
| --- | --- |
| Pages | Import identity, create/update intent, expected revision, title, slug, locale and explicit collection replacement |
| Content | Metadata, date, description, standalone quote, scalar SEO fields and CTA settings |
| Blocks | Ordered paragraph, heading, list, quote, table, link or image blocks |
| Tables | Header and data rows linked to a table block, with up to eight columns |
| ListItems | Ordered entries linked to a list block within the same article |
| Media | Listing, hero, gallery and social-sharing image descriptors |
| Sources | Research citations with HTTPS URL and calendar access date |

Excel uses Instructions metadata `templateVersion: 1.0` and `pageType: journalArticle`. Word starts with the three-cell metadata table `CMSJournal`, `1.0`, `journalArticle`. Both horizontal named column tables and repeatable two-column field/value record tables are accepted. Keep these identities and field names unchanged.

Limits are 25 articles, 500 data rows, 5 MB per file and two million text characters. Unknown sheets, columns and fields are errors. Only positions may be numeric; booleans use literal true/false and dates use text in YYYY-MM-DD form. Hard character limits reject excess text without shortening it. Description guidance of 50 words, SEO title guidance of 60 characters and SEO description guidance of 160 characters produce review warnings.

Each block accepts only the fields for its kind. IDs and positions must be unique within their collection. Related rows must resolve to a block in the same article. Images reference uploaded CMS asset IDs and carry alt/decorative, caption and credit data. Lists allow 50 entries. Tables allow eight columns and 50 data rows. Text is never interpreted as HTML.

## Formatting

In paragraph Blocks.text cells and ListItems.text cells, the importer retains bold, italic, superscript and subscript. Excel supports cell fonts and individual rich-text runs. Word supports direct run formatting in both table layouts. Use at most 200 formatted parts per cell. Text, whitespace, line breaks and row coordinates must match exactly before a proposal can be produced.

Underline and strikethrough are unsupported in these fields. Word inherited editorial styles, unknown/cyclic style references and paragraph character defaults are rejected rather than flattened. Keep template styles and apply formatting directly to selected words. Use a link block for a URL. Font family, size and colour follow website presentation; formatting in other fields is not imported. See `native-office-formatting.md` for parser coverage and remaining limitations.

## Create and update safely

Create uses a new portable import ID. Update uses the existing CMS record UUID and exact expected revision from caller-scoped evidence. Import cannot change an existing URL or language. Omitted scalar fields are preserved; an explicit empty Content value clears that field.

To replace or clear body, gallery, sources, image, heroImage or seo.socialImage, list the exact collection name in replaceCollections. Listed collections without new rows are cleared. Omitted collections are preserved. Replacing body replaces all blocks and their children. Any error invalidates the entire proposal.

The client previews proposed drafts and replacement warnings, then requires acknowledgement before saving. Pending request identifiers are stored before apply. An uncertain response locks conflicting controls and can be checked after reload. Recovery identifiers persist locally; the uploaded file does not.

## Server and persistence safeguards

`POST /api/cms/import/journal` accepts bounded raw DOCX/XLSX bytes with X-CMS-Site, X-CMS-Format and X-CMS-Action (review/apply/status). Apply also requires Idempotency-Key and X-CMS-Review. Bearer authentication and same-origin checks precede parsing. ZIP/XML limits, formula/macro/external-reference restrictions and embedded-media/tracked-change rejection remain enforced.

The endpoint checks membership, fetches update records with the caller token, reconstructs proposals from original bytes and reviews current image evidence. Review identity binds file bytes, site, full plan and current evidence. Apply recomputes review, locks affected records/media, rechecks revisions/routes/permissions/rights and commits atomically. Exact replay returns the original receipt. Status is actor/site scoped. Missing receipts remain unconfirmed. Migration 061 supplies the journal-specific review/apply/receipt operations; later shared migrations remain required.

## Downloads and regeneration

- `public/cms/templates/journal-v1.docx`: nine-page blank form with instructions, field limits and seven repeatable record tables.
- `public/cms/templates/journal-v1.xlsx`: Instructions plus seven blank content sheets. Amber input cells, frozen identities/headings, dropdowns, position validation and bounded character-limit warnings help clients prepare files. Server review remains authoritative.

Use the bundled document/spreadsheet runtimes with `scripts/build-cms-journal-word-template.py` and `scripts/build-cms-journal-excel-template.mjs`. Both require a schema JSON containing `{...journalTemplate, contentFields: journalContentFields}` from `lib/cms/journal-import-contract.ts`. Builders also generate separate populated fixtures under tests/fixtures; samples are never included in public input cells.

The formatting-guidance refresh rendered and visually inspected all nine Word pages and the changed Excel instruction ranges. All seven Excel content sheets preserve identical XML, including validation and formatting, compared with the prior download. The 16 journal file tests pass, covering blank downloads, populated fixtures, exact text, formatting and authenticated review. Evidence is in `/private/tmp/cms-format-templates`.

Earlier local browser checks cover desktop/mobile download, both file formats, preview fidelity and interrupted-save recovery with controlled transport responses. The broader implementation last passed 1,446 CMS tests and a production build before this guidance-only refresh. These checks do not prove native Word/Excel editing, hosted publication or client usability. Those remain acceptance requirements.
