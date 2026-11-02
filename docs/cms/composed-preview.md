# In-editor composition preview

Pages now includes a toggleable draft layout preview that uses the current in-memory composition, including unsaved edits. It validates the composition before rendering, uses React text nodes (no raw HTML), and supports text, CTA, FAQ, tabs, hero, image/text and gallery sections. Unsupported families display an explicit placeholder. Final website branding and animation are not represented; this is not a public renderer or recipient-bound preview link.

Visibility uses explicit time, locale and optional region context. Editors can change the time and region. Hidden/ineligible sections are omitted and counted. Approved background, width, spacing, alignment, desktop/mobile image and media ordering controls apply to preview layout. Image requests use the existing authenticated private preview loader; decorative images use empty alternative text. New-window links include noopener/noreferrer.

Tabs use linked tab/tabpanel roles, roving tab stops, arrow/Home/End keyboard controls and native focus movement. FAQ uses native details/summary. Rich text lists/links remain structured.

Verification: TypeScript passed. An isolated synthetic browser fixture verified initial hidden/region suppression, ArrowRight tab selection and panel change, FAQ expansion, and appearance of region-specific CTA after entering india. At 390px there was no horizontal overflow or captured console error/warning. Screenshot: /private/tmp/cms-composed-preview-mobile.png. Fixture removed. Image preview rendering, all layout combinations, schedule boundaries in the UI and authenticated staging end-to-end use remain unverified; schedule semantics already have unit coverage. Page publishing remains unavailable.

## Navigate from draft preview to section controls

Editable Pages/Homepage draft previews provide an **Edit section: [label]** button above each visible section. Activating it by mouse or keyboard moves focus to that section's editing fieldset and scrolls it into view. Stable section IDs bind the target, so reordering or audience/time filtering does not shift the selection to a different section. Navigation does not change or save the draft. Busy/read-only workspaces do not expose these buttons; import and shared preview consumers remain display-only.

Verified with the production build and the extended MICE authoring browser fixture: all six section targets, keyboard Enter, reversed ordering, a hidden section, no extra saves and read-only restrictions. The mobile toolbar was visually inspected. Provider-authenticated acceptance, individual field selection and shared/inherited-content impact indicators remain pending; this completes section navigation only.

## Responsive viewport presets

Draft previews now offer Available space, Desktop (1280×800), Tablet (768×1024) and Mobile (390×844). Fixed presets render the existing React preview in a same-origin empty iframe with copied stylesheets, so CSS viewport media queries respond to the selected width independently of the CMS window. The canvas scrolls within its bounds. No application scripts or uploaded HTML are copied into the frame. Navigation links are prevented from replacing the preview; local anchors can scroll within it. Section-edit buttons still focus the parent editor. Closing the preview or switching between inline and framed mode resets transient preview interactions, not the draft content.

Browser acceptance verifies exact frame widths and MICE grid transitions (four/two/one columns), parent editor focus, contained Home-link navigation, unchanged save count and the complete authoring/review regression flow. The mobile canvas screenshot was visually inspected. Production build including TypeScript passes. This is local mocked-provider evidence; all page-family visual parity, individual-field selection and client acceptance remain separate requirements.
