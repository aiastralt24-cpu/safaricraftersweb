# Pages workspace

The CMS navigation now includes Pages: a paginated list of page records, new page drafts, explicit saving and revision restoration. Page title/path are editable on creation; existing paths stay fixed until redirect-aware migration is implemented. Saves preserve other payload fields and use the current revision. Invalid/missing compositions display a repair message without overwriting existing data.

The section outline supports reordering, removing, hidden duplication, section labels, visibility and approved background choices. Content forms now support text paragraphs/lists/links, call-to-action buttons, FAQs and tabs. Other section families retain their content and can be arranged but their detailed forms are still outstanding. Rich-text blocks can be edited, added, reordered or removed without flattening lists or links. FAQ/tab items keep stable IDs; deleting the default tab selects a remaining tab. CTA buttons expose their destination/window setting, enforce the two-button limit and keep at least one button. Composed-page publishing remains unavailable pending trusted validation and public rendering.

The UI keeps local edits until Save page draft. It validates the complete composition before saving through the existing authenticated draft API. Navigation uses the shared unsaved-changes warning, and revision restoration requires a clean editor. Write permissions and concurrency remain database-enforced.

Browser evidence used a temporary in-memory API fixture: created /our-approach, added/edited a paragraph, duplicated a section (hidden), saved and reloaded the resulting draft and observed the list update and clean state. At 390px no horizontal overflow or console errors/warnings were observed. Screenshot: /private/tmp/cms-pages-mobile.png. Fixture removed afterward. This does not verify managed staging authentication/persistence, all section forms, or client UAT.

Further browser verification used an isolated synthetic composition: added tabs, edited a numbered list, added a link, observed invalid state for a JavaScript URL and valid state after replacing it with /journeys, added a second tab, selected it as default and reordered it. Composition stayed valid. At 390px no horizontal overflow or captured console errors/warnings occurred. Temporary fixture removed. Evidence: /private/tmp/cms-rich-mobile.png. Deletion confirmations and every form branch have not yet received full browser coverage.

Image section forms now support hero, image-and-text and gallery content through the existing authenticated image picker. Desktop/mobile hero images remain separate; gallery items retain IDs when reordered. Per-placement descriptions, captions, credits and decorative intent are editable without modifying library metadata. Image-and-text supports structured body content and an optional button; hero supports up to two buttons. Empty image sections intentionally start incomplete: local outline operations allow moving/removing them, but full composition validation still blocks saving until required fields are filled.

Synthetic browser verification added a hero, selected a library image, filled required alt text and observed valid composition, then added an independently empty mobile image. Mobile overflow/console checks passed at 390px. The image transport deliberately returned a preview failure in this fixture. This does not prove live image storage access. Evidence: /private/tmp/cms-image-sections-mobile.png. Temporary fixture removed. Twenty composition/editor API tests passed, including incomplete image draft manipulation and strict-save rejection.

## Section undo/redo — 23 October 2026

The shared PageComposer now records unsaved section content/control and structural changes in an in-memory history. Undo/redo restores complete snapshots, including partial text and stable section identifiers. Editing after undo discards the abandoned redo branch. Read-only/busy state blocks changes, and incoming replacement content or the existing revision-key remount resets history. It never saves, publishes or writes browser storage. Native text-input keyboard undo remains untouched; section history uses explicit buttons.

History retains at most 50 previous/future steps within a 4,000,000-character snapshot budget; large drafts may retain fewer steps. Current content is never truncated. This scope does not yet cover page title, SEO, global settings or other standalone editors, and is not autosave or server revision restoration.

Verification: 18 targeted history/composition/source-inventory tests passed; TypeScript and production build passed. A temporary local browser fixture using the real PageComposer verified edit/undo/redo, a new branch, disabled editing and incoming draft reset. Fixture removed after execution.

### Full page draft history

PagesWorkspace now owns one ordered history across title, new-page path, composition, SEO and Concept navigation. Its PageComposer disables the nested toolbar so undo order is unambiguous. History is scoped to website, actor, record type and an incrementing load/create/duplicate generation; loading even identical content clears the previous session. Successful saves reload the returned revision and reset history. Undo/redo mark the draft dirty and reset duplicate SEO/navigation confirmations, so recovery never bypasses explicit duplicate review or directly changes live content. Existing-page paths remain locked.

The real PagesWorkspace passed a local browser fixture covering interleaved title/SEO changes, undo order, redo, a single toolbar, busy-state lock, successful-save reset and edits after saving. Persistence in this fixture was mocked; it is not managed-provider or client acceptance. The temporary route was removed. Standalone PageComposer consumers retain their section history. Other record/settings editors and autosave remain unfinished.

## Save conflict recovery

The workspace API preserves the HTTP status on thrown errors. For an existing page whose save returns 409, PagesWorkspace fetches the latest editor record without discarding local changes. It refuses reconciliation when identity, type, locale, route or edit permission differs, or when the latest content requires migration. A 409 without a changed revision retains the original error rather than misclassifying URL collisions as concurrent edits.

The comparison uses the original loaded draft, the local draft and the newest saved draft. Non-overlapping changes get suggested choices. Concurrent changes to the same field group require explicit selection; composition is intentionally treated as an entire section set, never silently merged by array index. Editors can inspect both versions and cancel without losing their work. The draft is locked during comparison. Applying choices updates only local state and the expected revision; the next explicit save still uses database optimistic concurrency and can conflict again if another editor saves meanwhile. Unknown fields from the latest payload are preserved. Nothing is automatically published.

Local browser verification with the real PagesWorkspace and mocked API proved retained local edits, locked editing during comparison, required choices, remote SEO preservation, zero writes before explicit save, preserved extra payload fields and a save bound to the latest revision. Three new unit tests cover independent edits, explicit conflicts, equal concurrent changes, deletion/empty values and immutable merging. Provider-backed concurrent editing and other record editors remain pending.

## Opt-in draft autosave

Existing page/homepage records offer autosave after three seconds without another edit. New and duplicated pages require an explicit first save. The timer captures the draft, actor/site/record identity, loaded revision and editor generation; it cancels when those change or when manual work makes saving ineligible. Loading another draft disables the opt-in. A successful save retains opt-in for further edits to the same draft.

Autosave waits for a valid composition, title and SEO/Concept-menu data, edit permission and an idle editor. It uses the normal save command and expected revision, never approval or publication. Controls lock during a pending save. Errors disable autosave and preserve the open draft, avoiding retry loops; conflicts disable it and open the existing comparison workflow. Manual saving remains available. Successful saves clear stale error status and reset unsaved history as documented above.

Real local browser checks with mocked persistence verified opt-in, debounce/newest snapshot, repeat saves against updated revisions, incomplete-field pause, retained edits on failure, no automatic retries, cancellation on reload and no duplicate write after a manual save. Temporary fixture removed. This does not prove real-provider availability, offline recovery after closing the tab, or autosave in other content editors.

## Approved paragraph formatting

The shared paragraph editor now supports bold, italic and mutually exclusive normal/superscript/subscript character position per paragraph part, including linked text. Plain paragraphs can be converted to formatted parts without changing their visible text. Existing unformatted content remains valid. Formatting is represented by optional structured fields on inline spans; arbitrary HTML/style/event-handler fields are rejected by the strict schema. The fallback text must still equal concatenated span text exactly.

CmsInlineText renders approved semantic elements and escapes text through React. Shared composition previews and the About, specialist, expedition and text-section public renderers reuse it. The generic public-page payload projection preserves the composition, so existing schema-valid inline marks survive delivery without a new SQL migration. This does not add formatting to the separate journal model, list items or every bespoke text field. Quotes and tables remain pending.

Local browser checks exercised bold/italic/script controls, serialization, link preservation and literal rendering of pasted script text. Three source/browser inventories were refreshed after changing the shared schema. The temporary browser fixture was removed. Real-provider publication and client acceptance remain pending.

## Shared rich-text quotes and tables

RichText now includes quote blocks (required text, optional attribution) and rectangular table blocks (required caption and nonempty column headings, 1–8 columns, 1–50 rows). Cells are plain text up to 5,000 characters; empty cells are allowed. Structural limits and matching row widths are enforced on schema parsing, including composition saves/imports. The table editor keeps row widths aligned when columns are added/removed and confirms destructive removal.

CmsRichTextBlock centralizes paragraph, quote, table, list and link rendering for composition preview and the existing About, specialist, expedition and text-section renderers. Tables use caption, scope=col headers and a keyboard-focusable horizontal scroll region. Text is escaped, not interpreted as HTML. Legal-page completeness checks understand the new block kinds. The generic public composition projection retains their structured data.

Local browser verification covered creation/editing, quote attribution, JSON round trip, column removal preserving rectangular rows, accessible markup/focus and escaped cell text. Dedicated unit checks cover schema bounds, missing captions/headings, inconsistent rows and composition round trips. Three affected inventories were refreshed; temporary fixture removed. The separate journal model, inline list/cell formatting and native import-template authoring of these new blocks are not completed by this change. Real publication/client acceptance remains pending.
