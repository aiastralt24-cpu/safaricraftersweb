# Journey Excel template v1

The downloadable workbook is `public/cms/templates/journey-v1.xlsx`, served at `/cms/templates/journey-v1.xlsx` by Next.js. It contains Instructions, Pages, Itinerary, FAQs and Media. Only instructions contain examples; data sheets start empty so a client cannot accidentally import sample journeys.

Editable areas are amber, identifying columns/header rows are frozen, create/update and media-role fields have dropdowns, positions have whole-number validation, and overlong button labels turn red. The Instructions field guide contains per-field length recommendations and blocking-limit guidance. The CMS remains authoritative for all validation; Excel formatting is assistance, not enforcement. Long-prose word counts and warnings appear in the import review, not as formulas in the input cells.

The blank workbook and a generated populated fixture pass through the same OOXML parser used by the upload API. The blank file correctly requests at least one journey; it creates no records. The populated fixture yields one valid proposed draft. Trailing formatted blank rows are removed before row limits are counted; internal blank rows remain for accurate cell locations.

Every sheet was rendered and inspected using the bundled spreadsheet runtime, including all Pages column groups and the entire instruction guide. Native Microsoft Excel editing and save/reopen testing are still pending. The preview renderer displays the metadata version as 1, but exported XML and the importer retain the required literal text `1.0`; the visible title also states v1.0.

## Regeneration

The source is `scripts/build-cms-excel-template.mjs`. Use the installed Spreadsheets skill and bundled dependency loader. Copy the builder to a temporary directory with a `node_modules` symlink to the bundled Node packages. Export `journeyTemplate` from `lib/cms/import-contract.ts` to `schema.json` beside that builder. Run the artifact-operation marker immediately before the first authoring operation, then execute the builder with the bundled Node binary, passing the absolute repository directory. The builder writes the public blank workbook, temporary rendered previews and a populated `filled.xlsx` fixture beside itself. Copy the verified populated fixture into `tests/fixtures/journey-v1-filled.xlsx`. Keep renderer sidecar files out of `public`.

This delivers the Excel template only. The Word template, client download/upload interface and full client handover remain pending.
