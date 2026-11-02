# Journey file import v1 — implementation contract

Status: parser implemented and fixture-tested. Downloadable client templates, authenticated upload, import review and database application remain pending. These parsers return proposed input; they never save, approve or publish it.

## Excel

Use an `.xlsx` workbook containing Instructions and Pages, plus optional Itinerary, FAQs and Media sheets. Column keys are those in `lib/cms/import-contract.ts`, in row 1. Instructions A1/B1 must contain `templateVersion` / text `1.0`; A2/B2 must contain `pageType` / `journey`. Additional instruction rows can contain guidance. Use text cells for content, including version numbers, dates and prices; only position accepts numbers. Blank rows are preserved in diagnostic numbering and skipped by the validator. Unknown headings fail contract validation. Worksheet names and references must be unambiguous.

Formulas, external relationships, merged cells, boolean/error/date cells, macro payloads and embedded objects are rejected. Formula results are never evaluated or trusted. Excel serial numbers cannot silently become dates in editorial text. A numeric style on a position cell does not change its plain numeric value.

## Word

The distributed template at `public/cms/templates/journey-v1.docx` now uses readable vertical records: first row contains the section name and `record`, second row contains `field` and `value`, and subsequent rows contain one field key/value pair. Duplicate a whole table to add a child record. Field keys must be unique in each table. Empty optional tables are ignored by validation. `source.rowTables[section][issue.row - 2]` identifies the one-based document table containing a finding; the field name identifies its row. The metadata table remains unchanged. Horizontal tables described below remain supported for existing files.

Use a `.docx` with a metadata table first: one row, three cells `CMSJourney`, `1.0`, `journey`. Each subsequent table represents Pages, Itinerary, FAQs or Media: first row has a single cell with the section name; second row contains stable column keys; remaining rows contain values. Each section may occur only once. A data row must have the same number of cells as its header.

Run order and paragraph boundaries are preserved. Body paragraphs outside tables are instructions and are not imported as page copy. Embedded media, fields, tracked changes, nested tables and merged data cells are rejected; media currently uses uploaded CMS asset IDs. Image extraction/quarantine is a later capability, not implemented here.

Issues use the shared sheet/row/field format. For horizontal Word tables, source.tables maps each section to its first one-based document table number; add one to the issue row to locate the actual Word table row (the section-label row precedes the column-key row). Use rowTables for repeated vertical record tables.

## Resource limits and provenance

The archive reader inflates one entry at a time. Limits: 5 MB upload, 200 ZIP entries, 5 MB per expanded entry, 20 MB total expansion, 500 data rows across content sheets, 32 columns. Declared entry sizes and actual bytes are checked. Duplicate ZIP names, encrypted entries and invalid paths are rejected. DTD/entity declarations and invalid XML are rejected before parsing. Each result records original byte count and SHA-256 digest for future audit attachment. File parsing remains a server operation; future HTTP integration must authenticate and enforce request size before buffering the body.

Parser tests use generated minimal OOXML archives; real Excel/Word application round trips and client usability checks remain required before acceptance.

## Local check

Run `npm run cms:import-check -- /absolute/path/file.xlsx` (or `.docx`). This prints source provenance, findings and proposed changes. The CLI has no database connection, so it validates new records; updates report an inaccessible record until the authenticated server supplies current records to the contract. Never use a client-supplied revision inventory as authorization.

ZIP handling follows [yauzl's lazy entry and size validation APIs](https://github.com/thejoshwolfe/yauzl#readme). XML parsing uses [fast-xml-parser](https://github.com/NaturalIntelligence/fast-xml-parser), with independent rejection of entity declarations.
