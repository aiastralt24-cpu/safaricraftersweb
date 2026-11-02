# Native Office formatting imports

## Implemented: journal Excel text

Use the existing journal `.xlsx` template. Bold, italic, superscript and subscript are retained in the **text** cells for paragraph rows in **Blocks** and rows in **ListItems**. Formatting can cover the entire cell or individual text runs. The parser resolves inline strings, shared strings, the default cell font, explicit cell fonts and inherited font references, including explicit run overrides that turn bold/italic off. The original text, whitespace, row positions and item ordering remain unchanged.

The parsed formatting is attached to exact source sheet/row/text coordinates, validated against the full text and converted into paragraph/list spans by the journal planner. Duplicate, orphaned, mismatched or malformed formatting cannot produce an import proposal. Existing unformatted files keep their original payload shape. The authenticated review includes the resulting spans in its proposed draft and digest; the client must review again if formatting changes. Importing still creates drafts only.

Underline, strikethrough, unsupported character positions and invalid style/font references in these supported cells fail with a source sheet/row error rather than silently flattening the content. External hyperlinks/relationships, formulas, macros, merged cells and archive limits retain their existing restrictions. Font family, size and colour remain website presentation, not imported editorial formatting. Formatting on titles, headings, metadata, table cells and other fields is outside this implemented scope.

## Implemented: journal Word text

The structured `.docx` parser retains direct run and supported inherited bold, italic, superscript and subscript for the same paragraph and list-item text fields in both horizontal and vertical record tables. Mixed runs and explicit bold/italic-off settings preserve exact text, whitespace and line breaks. Source row coordinates and review validation use the same sidecar contract as Excel.

Document run defaults, default/explicit paragraph styles and default/explicit character styles now supply the supported marks. Based-on chains are applied from parent to child. Bold/italic style values follow Word toggle semantics; direct run values explicitly set or clear them. Script positioning inherits until replaced by a later style or direct run value. Unknown/duplicate references, cycles, cross-type chains and duplicate default styles are rejected. Table/numbering styles must remain presentation-only; conditional table marks, paragraph character defaults, complex-script-specific effects, unsupported marks and inline hyperlinks remain rejected rather than flattened. This does not implement Word’s complete formatting system or import arbitrary Word documents.

## Verification and remaining work

Six additional fixture tests cover rich runs, exact whitespace, shared strings, cell fonts, inherited/default fonts, explicit overrides, rejected formatting and authenticated file review. Four further Word tests cover both layouts, mixed runs, explicit overrides, rejected direct/inherited styles and authenticated review. All 1,446 CMS tests pass without skips and the production build passes. These fixtures contain actual OOXML archives; they are not proof of opening/editing the workbook in native Microsoft Excel.

Conditional table/numbering formatting and unsupported Word effects remain outside the supported style cascade. Other content families do not gain native formatting support from this journal-specific change. Both downloadable journal templates now include formatting guidance and limits; their regenerated blank and filled files pass the journal import checks. All nine Word pages and the changed Excel instruction ranges were visually inspected. Native Office application trials, client import acceptance and hosted import/publication verification remain required. No source content was migrated or published.

## Supported style inheritance verification

Four additional actual-archive tests cover document defaults, default/explicit paragraph and character styles, based-on toggles, direct overrides, both structured table layouts, exact whitespace/text, rejected ambiguous/cyclic/wrong-type references and authenticated review binding. Changing inherited formatting changes the reviewed proposal digest. The downloadable blank and filled Word files were regenerated with current guidance and passed all 20 journal-file tests. The nine-page blank render retains seven pages pixel-identically to the previously reviewed output; the two changed instruction pages (5 and 7) were visually checked without clipping or layout spill.

All 1,595 CMS tests pass without skips (`/private/tmp/cms-word-style-full.log`); build and final TypeScript pass (`/private/tmp/cms-word-style-build.log`, `/private/tmp/cms-word-style-types.log`). After template regeneration, the 20 targeted file tests pass again (`/private/tmp/cms-word-style-contracts.log`). No browser UI or public rendering contract changed, and no source content was imported or published. This remains local OOXML/parser evidence; native Microsoft Word/Excel and independent client trials remain pending. Overall readiness stays 49/100.

Reference: Microsoft’s [Bold property documentation](https://learn.microsoft.com/en-us/dotnet/api/documentformat.openxml.wordprocessing.bold?view=openxml-3.0.1) and [based-on style documentation](https://learn.microsoft.com/en-us/dotnet/api/documentformat.openxml.wordprocessing.basedon?view=openxml-3.0.1).
