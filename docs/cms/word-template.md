# Journey Word template v1

The client template is `public/cms/templates/journey-v1.docx`, served at `/cms/templates/journey-v1.docx`. It has five pages: instructions, journey details, one itinerary day, one FAQ and one media placement. Input cells are blank and shaded; instructions explain create/update intent, revision IDs, content guidance and draft-only import behavior.

Each content table uses two columns: field and value. Clients can duplicate entire itinerary/FAQ/media tables for additional items. The parser recognizes repeated vertical record tables and retains source-table locations for diagnostics. Existing horizontal structured tables remain supported. Embedded images are still not extracted; this version takes uploaded CMS asset IDs.

Generated with the bundled python-docx runtime using `scripts/build-cms-word-template.py`. Arguments are the absolute repository path, a JSON export of `journeyTemplate`, and the populated-fixture output path. The script writes the blank client template and a separate fixture containing clearly synthetic verification copy. Test fixtures are not exposed as downloads.

All five pages of the final document were rendered with bundled LibreOffice through the Documents skill renderer and visually inspected. The blank template produces only the expected empty-import finding; the populated fixture produces one valid proposed journey. Repeated child-table parsing is tested. Native Microsoft Word editing/save/reopen and client-led usability trials remain pending.

The document is available, but the client upload/review interface and staging authentication are not yet complete. It must not be presented as a fully deployed CMS workflow.
