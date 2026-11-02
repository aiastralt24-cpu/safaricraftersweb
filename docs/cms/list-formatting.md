# Formatted lists

Shared rich-text lists and journal lists now support optional per-item formatting: bold, italic, superscript/subscript and safe inline links. Existing string-only lists remain valid. `itemSpans`, when present, must have exactly one entry per item; a null entry means plain text. Every formatted entry must reproduce its full item text exactly. This preserves text used by existing readers/search while preventing disagreement between fallback text and visible formatting.

The shared list editor reuses paragraph formatting controls and keeps text and spans together when moving or removing items. Adding an item adds an unformatted entry. The journal editor applies its existing 2,000-character item bound; shared rich text retains its existing bound. The shared paragraph editor now gives textareas explicit stable accessible names, avoiding their initial text being included in the label.

Preview/public rendering uses the existing escaped inline renderer. Journal draft previews disable links. Migration 221 extends the journal public allowlist with aligned list spans, strips private span fields, and rejects mismatched text, wrong types and malformed arrays. Native Word/Excel inline-formatting import is not implemented by this change; existing plain-list import behavior is unchanged and must not be represented as preserving Office formatting.

## Verification

All 1,436 CMS tests pass with no skips, and the production build passes. Schema tests cover backward compatibility, exact text/position correspondence, bounds and unsafe/unknown span fields. Local SQL verifies projection alignment and private-field removal. `scripts/check-cms-list-formatting.mjs` uses a local production build with mocked Auth/content APIs. At 1280px and 390px it exercises formatting, inline links, subscript, item movement, save/reload, preview and removal while preserving formatting identity; no content is published. Browser plugin unavailable; regular Playwright used.

Fresh desktop/mobile Concept, Bespoke Safaris and Aviation captures are identical in all rendered fields after the shared schema/renderer change. Source-bound inventories and source-capture-revalidation.json record the changed dependencies. Offline planning includes all 221 migrations against a synthetic empty ledger. No provider migration or hosted/client acceptance is claimed.

Remaining R14 work includes bespoke-only formatting coverage, native inline-formatting imports and client acceptance.
