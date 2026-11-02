# Homepage migration implementation sequence

The homepage remains on its existing implementation. The new CMS must preserve its full editorial content and approved presentation before replacing it. The source-traced inventory is `homepage-editability-inventory.json`; candidate composition types there are reuse opportunities, not working homepage functionality.

## Evidence and scope

The route imports `ConceptExperience`, which consumes bundled `lib/data` content. Ten content sections can render: hero, story/experience, ways to journey, curated journeys, upcoming departures, corporate journeys, private aviation, preferred partners, guest notes and concierge. Curated journeys and departures depend on data. Four additional sections are disabled by constants. The separate fullscreen menu also requires migration. The unused species-index flag has no rendered section to migrate.

The homepage validator currently returns `composition-draft-1` with `contentChecksPass: false`. Keep that release gate until a complete published projection and route integration exist. Updating a related CMS record does not establish that this legacy homepage consumes it.

## Implementation order

1. Add source-preserving field contracts for rotating hero frames, multiple heading emphasis fragments, composite story/statistics, card formatting, curated bento cards, departure board, corporate collage, benefit lists, grouped partner logos, testimonial carousel and six-choice concierge. Reuse existing field validators and media/reference controls. Do not change a shared schema in a way that silently alters existing published pages.
2. Build approved homepage section renderers and editor previews. Preserve source layout, responsive behavior, keyboard interactions and reduced-motion behavior. Keep editorial text and selection separate from animation implementation.
3. Resolve references from published immutable revisions. Curated order, per-item kickers and location overrides must retain identity across reorder. Explicitly handle missing content, empty groups and no upcoming departures. Use the same time semantics as the validated expedition delivery path.
4. Add homepage published projection, SEO and route integration behind an opt-in flag. Reject unsupported sections and invalid dependencies. Route body and metadata must consume the same published revision. Keep the current route unchanged when disabled.
5. Capture rendered desktop/mobile source states and source assets; create a review-only migration proposal with exact copy, formatting, selection and visibility. Map source media to verified uploads without inferring rights. Use the established review/digest/idempotent draft-apply/recovery workflow.
6. Add trusted publication checks, dependency locking, preview, rollback and sitemap integration. Verify actual provider behavior before rollout. Obtain client content/design acceptance and include homepage management in handover.

## Validation requirements

- Verify every hero frame, all menu items and focus return, each partner region, each testimonial and anonymity/film behavior.
- Verify data-empty and date-boundary states, manual selection order, linked query parameters, desktop/mobile layout and reduced motion.
- Test stale source, stale reviewed dependencies, insufficient permissions, expired media rights, unpublished references and recovery after uncertain apply outcomes.
- Compare complete source and migrated pages; generic composition validation is insufficient to approve visual or content fidelity.

Run `node scripts/cms/check-homepage-inventory.mjs` to check that the 16 traced source files still match. A mismatch requires reinspection, not automatic hash regeneration. This check does not cover all transitive files or prove completion.

## Implemented foundation — 2026-10-22

`lib/cms/editorial-heading.ts` now defines explicit lines and text/emphasis fragments. It preserves whitespace and repeated-word identity, limits the complete heading to 200 characters including line breaks, rejects empty lines and embedded line/control characters, and accepts no markup attributes. `CmsEditorialHeading` renders escaped React text with semantic emphasis; `EditorialHeadingEditor` provides fragment and line editing with validation and a visual preview. The editor component is not yet mounted in Pages.

`lib/cms/homepage-hero.ts` defines a separate draft contract for 1–10 ordered headline frames with stable unique IDs, introduction, navigation label, poster images/framing and separate desktop/mobile video asset IDs. It deliberately does not change the existing shared hero schema or enable homepage publication. Trusted video inspection, rights validation, animation/accessibility behavior and delivery remain required.

Five new contract tests and the two existing heading-emphasis tests pass; TypeScript passes. Browser interaction and full-page fidelity for these new components are not yet verified. Next connect this foundation to the homepage section editor/preview and complete the remaining section contracts.

## Composer integration — 2026-10-23

Registered `homepageHero` as a distinct composition section and added **Add homepage hero** to the media-connected page composer. Editors can add/remove/reorder uniquely identified headline frames, edit heading lines/emphasis, select desktop/mobile posters, and adjust framing. The preview selects frames manually and retains selection by ID after reorder; removing the selected frame safely selects the first remaining frame. Shared image/framing validators moved to `composition-media.ts` without changing their contracts, avoiding a schema dependency cycle.

Video references, when present, remain preserved and explicitly disclosed as unplayable in this preview; the image picker is not misused as a video picker. This is static draft composition only. The root homepage record/route workflow, trusted video delivery and final homepage renderer remain unconnected; the ordinary Pages workspace still handles page records and does not yet save a `/` homepage record.

Validation: installed Playwright (Browser plugin unavailable), synthetic local composer fixture at 1280px and 390px. Verified frame creation/text editing, semantic emphasis and line breaks, stable reorder/selected-frame behavior, mobile poster creation, and fallback after selected-frame removal. No page errors. Screenshot review confirms the static poster preview; the fixture includes the legacy global shell and is not a final CMS visual acceptance test. Fixture route removed. All 721 CMS tests pass; the existing section-count assertion was updated to include the new contract.

## Homepage record workspace — 2026-10-23

The CMS navigation now has a separate Homepage view using the shared composition/SEO draft workspace in `recordType='homepage'` mode. It lists homepage records, fixes the path to `/`, creates and saves homepage drafts, reloads them after save, and includes the expected revision on subsequent updates. The visible creation control is disabled when a homepage record is listed; database route uniqueness remains authoritative. About/legal migration panels are excluded from this mode. Existing invalid or non-composition homepage payloads are preserved and require migration before editing.

The content API now rejects homepage saves with a non-root path, invalid composition or a title that differs from the composition title. Valid saves retain unrelated outer payload fields and caller-scoped RPC authorization. This API guard does not yet add a new direct-RPC homepage-specific database constraint; complete route/type validation at that boundary remains part of the release work.

Synthetic browser checks at 1280px and 390px verified create, fixed path, save/reload, exact expected-revision updates, dirty-state reset and duplicate-creation UI guard. No page errors; temporary fixture removed. These checks exercise the real workspace against an in-memory test API, not a production database or a real client account. Homepage publication and public website delivery remain disabled/unconnected.

## Database homepage identity — 2026-10-23

Migration `111-homepage-identity.sql` adds a `NOT VALID` check requiring every new or updated `homepage` record to have path `/`. `NULL` is rejected explicitly. The migration performs no content updates and preserves legacy non-root/null-path homepage rows in place. Such rows cannot receive further updates until an authorized explicit migration resolves their route; the existing `save_draft` route/type immutability guard still applies. Do not automatically rewrite a legacy row to `/`, because another record may already own that website/locale route.

Before applying to a provider, inspect legacy exceptions with:

```sql
select id, website_id, locale, path
from cms.records
where content_type = 'homepage' and path is distinct from '/';
```

Resolve exceptions through reviewed migration before eventually validating the constraint. Website/locale route uniqueness remains enforced by the existing unique constraint. This does not add homepage publication or a complete composition validator in SQL.

Local validation: all 157 database/migration tests passed, including full-schema caller-scoped `save_draft` creation/update, duplicate-route rejection, stale revision and unauthorized actor rejection, unchanged publication, and a separate legacy-preservation migration test. PGlite evidence is local and does not substitute for provider PostgreSQL concurrency/deployment verification. Migration 111 has not been applied remotely.

## Story and experience composition — 2026-10-23

Added `homepageStory` as a grouped composition contract with story label, explicit heading lines/emphasis, plain copy, validated CTA and an experience ledger. Statistics retain stable IDs, numeric values, independently editable suffixes, labels and internal evidence notes. Figures must be finite nonnegative safe integers; duplicate identities and unsafe links block composition saves. Empty evidence is allowed in drafts and does not mean the claim is verified. New statistics use a visibly unfinished label rather than fabricated evidence.

The page composer can add/edit this section, reorder statistics and preview the grouped two-column story with responsive statistics. `CmsHomepageStory` renders escaped copy, formatted numbers and accessible description-list label/value semantics. Evidence notes are omitted from rendered markup. The eventual public projection must also strip internal evidence from delivered payloads; that route is not implemented yet. Count-up animation and final source-theme fidelity remain pending; this preview is intentionally static and does not modify the existing homepage.

Browser validation (installed Playwright, Browser plugin unavailable) at 1280px/390px verified edits, `75+` and `6,000+` formatting, reordering, omission of evidence notes, a single story label and responsive two-column-to-one-column layout. No page errors. Temporary fixture removed; screenshots inspected. Two added contract tests verify grouped content round-tripping and rejection of invalid figures/links/duplicate identities.

## Journey planning choices — 2026-10-23

Added the distinct `homepageConcierge` composition contract, editor and static renderer. It retains separate multiline/emphasized main heading and prompt, 1–12 ordered stable-ID planning choices, and an independent contact action. Links use the existing safe-URL contract and preserve encoded query values. The existing homepage's five regions plus contact action can now be represented without reducing the six actions to the generic two-button CTA limit. Added **Add journey planning choices** to the composer.

Tests cover exact source region-query round-tripping, separate contact action, bounds, duplicate identities and unsafe destinations. Synthetic browser checks at 1280px and 390px verified link edits/reorder, encoded query retention, heading semantics, keyboard focus and responsive layout. An initial check used an overly exact accessible-label selector (the label includes character-count help); corrected the test selector and reran successfully. No product defect was found in that timeout. Temporary test route removed. Preview is static; final source-theme fidelity, full source migration, published link availability and public homepage delivery remain pending.

## Ways to journey cards — 2026-10-23

Added `homepageJourneyTypes`, a grouped section with editable formatted heading and 1–12 ordered cards. Each card has an explicit multiline/emphasized heading, a bounded paragraph with semantic strong-emphasis fragments, library image/alt/caption/credit and a safe CTA. The new `editorialCopySchema` preserves spaces and punctuation without accepting markup fields. Existing shared rich-text contracts were not changed. Image placeholders keep new drafts editable but prevent validation/save until media requirements are met.

Composer and preview support adding/removing/reordering cards while retaining each card's media, link and description. The renderer uses semantic strong text, safe React text escaping and a three-column desktop / one-column mobile grid. Browser checks at 1280px and 390px verified emphasis, text spacing, card order, image alt and responsive columns. An initial timeout came from an exact textarea-label selector; DOM inspection showed the expected field, the selector was corrected and both viewports passed. Temporary fixture removed and screenshots inspected. Synthetic images were used, not migrated source assets.

All 731 CMS tests pass, including new copy-bounds/markup, source-content representation, unsafe-link and incomplete-image tests. Source asset mapping, full source-theme fidelity/motion and published homepage delivery are still pending.

## Rendered source capture — 2026-10-23

Added `scripts/cms/snapshot-homepage.mjs` and the generated `homepage-rendered-inventory.json`. The read-only localhost capture verifies the 16 inventoried source hashes before and after browser interaction, captures desktop/mobile section content, cycles every partner region and guest note, records menu links and metadata, and hashes each captured local source image. It never invokes CMS write APIs or enables delivery. The existing homepage remains the source.

The current artifact contains 10 rendered sections, three partner regions (17 India, 38 Africa, 23 Indian Subcontinent logos), six guest-note states and 100 distinct images. Heading/paragraph text-node structures retain emphasis/line-break markup alongside normalized reading text. Counter extraction omits `aria-hidden` animation duplicates, preserving 75+, 24+, 6,000+ and 450+ exactly once.

Three validation tests passed: source/image byte freshness; every partner state's exact source names/images without duplicate marquee copies; responsive section identity, planning query links and distinct guest-note states. This is stronger migration evidence, not client or visual acceptance. The capture uses reduced motion and therefore includes only the initial hero frame; rotating frames/video, hidden source sections, decorative menu image stacks and additional transitive assets remain separate migration work. Source consent/rights are not inferred from image presence. Upcoming departures are time-sensitive and captured at the artifact timestamp.

## Preferred partner regions — 2026-10-23

Added `homepagePartners`, a grouped partner editor and static preview. The contract supports 1–20 regions with 1–100 logos each, preserving the current 17/38/23 distribution without truncating the Africa region to the generic logo-strip limit. Regions and partners have stable identities; editors can change region labels, default region, partner names, image metadata and order. Removing a default region chooses an existing remaining region; at least one region and one logo per region remain required. Duplicate IDs within a collection and missing images fail composition validation.

The preview uses keyboard-accessible tabs (arrows/Home/End), stable selection across reorder, and fallback after selected-region removal. Only the active region loads private image previews. It is a static grid with visible partner names, not the final source marquee; animation, source-theme visual acceptance and real media mapping remain pending. Public projection/release validation is still unconnected.

Desktop/mobile browser checks passed for region editing, keyboard selection, reorder, default/selected removal and responsive grid. Temporary fixture removed and screenshots inspected. Contract tests cover all 78 existing partner names/group sizes and invalid defaults/identities/images. An initial test incorrectly required IDs to be globally unique across independent region collections; corrected it to the established collection-scoped identity contract. No production data changed.

## Corporate journeys composition — 2026-10-23

Added the grouped `homepageCorporate` contract, editor and static preview. Fields include label, multiline/emphasized heading, ordered introductory paragraphs, ordered format labels/titles/destinations, separate CTA, and independent main/inset images with alt/caption/credit. Both images are required before saving. Collections retain stable IDs and reject duplicate IDs; format destinations use the safe-link validator. The inset stays in document flow with overlap so caption content can contribute to section height.

Desktop/mobile browser checks passed for paragraph and format edits/reorder, two distinct images/captions and the two-column-to-one-column layout. Synthetic media were used; temporary route removed and screenshots inspected. Contract tests cover grouped content preservation and missing-media/duplicate/empty-copy/unsafe-link failures. Final source typography, collage framing, motion and complete-page fidelity remain subject to migration and acceptance; the live source remains unchanged.

## Private aviation composition — 2026-10-23

Added `homepageAviation`, editor and static renderer with separate section label, formatted heading, summary, named ordered benefits, CTA and image metadata. Desktop/mobile framing reuses the existing validated framing controls. Benefits have stable identities; duplicate identities, missing required image information, unsafe links and invalid focal-point values block validation. The renderer uses semantic list markup and retains the benefits' accessible label.

This completes draft composition controls for the seven fixed-content homepage sections (hero, story/experience, ways to journey, corporate journeys, private aviation, preferred partners and concierge). It does not complete their source migration, final visual/motion fidelity or publication. Curated journey cards, upcoming departures and guest notes still require homepage-specific integration with their content collections; hidden source sections and the separate homepage menu also remain in scope.

Private-aviation validation: all 740 CMS tests passed and TypeScript passed. Desktop/mobile browser checks verified benefit edits/order, CTA destination, image alt, independent framing selection and responsive layout. Initial navigation timed out waiting for the full load event; the same local server remained in use and the rerun waited for the editor DOM, then passed both widths. No app error was reported. Temporary fixture removed; screenshots inspected. Synthetic images were used and no source data was migrated.

## Curated journey records — 2026-10-23

Added `homepageJourneys`, a record-picker-backed composition section with label, formatted heading, introduction, directory CTA, card action label and ordered journey references with per-record editorial kickers. Reordering the selected records preserves each kicker by record identity. The first selected journey receives the featured-card presentation.

Added `resolveHomepageJourneys` against the existing strict published journey summary contract. It preserves selected order and published revision IDs and rejects duplicate catalogue identities, malformed paths, missing/withdrawn selections and missing hero images as a complete-collection failure. It never falls back to bundled data or a draft. This resolver is not yet attached to a public homepage route, a locked release dependency check or provider publication workflow.

The authenticated editor preview separately fetches each selected saved draft through the existing caller-scoped record loader, checks identity/type/path and exactly one hero, and labels its use of drafts explicitly. A missing selection produces an unavailable-collection message rather than a shortened card list. Preview shares without a record loader do not gain access to other drafts. Async cleanup aborts stale loads, and results are keyed to the current selection before rendering.

Curated-journey validation: all 743 CMS tests pass. Desktop/mobile browser checks passed for caller-provided draft resolution, editorial-label identity across reorder, responsive cards, and complete-collection failure when a selected record becomes unavailable. Initial page-heading wait timed out; read-only inspection confirmed HTTP 200 and the expected editor without an app error, and the rerun on the same server passed. Temporary fixture removed and screenshots inspected. These are synthetic draft API checks, not provider/published-homepage integration. The current preview card layout still requires source-theme visual fidelity work.

## Upcoming departure board — 2026-10-23

Added `homepageDepartures` editor, published-directory preview and a horizontal board renderer. The section stores formatted heading/labels, directory and card CTAs, accessible board label, empty-state copy and optional identity-bound title/location overrides. Overrides do not filter the automatic directory; overrides for absent/undated expeditions are retained but unused. Their order does not change chronological card ordering.

The projection reuses strict expedition directory validation and UTC calendar-date filtering, keeps the nearest upcoming departure per expedition, includes today, and uses deterministic date/identity ordering. It rejects malformed/mixed-website inputs. Preview uses the existing site/locale-checked published expedition endpoint and its complete-directory validation; unsaved expedition drafts are excluded. Failed loading is shown as unavailable, distinct from a successful empty schedule. Departure date labels reuse the site's existing formatter rather than parsing free-text labels.

Desktop/mobile browser checks passed with synthetic published endpoint responses: nearest-date selection (including leap day), editable card labels, focusable horizontal board, and distinct failed/empty responses. Temporary fixture removed and screenshots inspected. Automatic scrolling, final source-theme fidelity, reviewed source overrides, public homepage route and dependency publication checks remain pending. No provider or rollout configuration changed.

## Homepage guest notes — 2026-10-23

Added `homepageGuestNotes`, its testimonial picker/presentation editor and carousel draft preview. Selection stores a separate editorial landscape image and journey destination per testimonial, preserving them by record identity when reordered. The source guest portrait is never copied automatically. Section label, formatted heading, reviews CTA, journey-action label and accessible previous/next labels are editable.

Draft projection validates the requested record identity/type and testimonial contract, then uses the existing anonymity rules. Cards carry only display name, quote, trip/category, selected landscape/link and revision identity; internal consent evidence, withheld name/role/employer/city and guest portrait are omitted. Draft review separately displays consent status and wording-verification status. The server-side published projection additionally rejects non-granted consent or unverified wording. This projection is not yet wired to a trusted published-testimonial reader, locked dependency check or public homepage route.

Desktop/mobile browser tests passed for anonymity, exact private-data markers, next/wrap behavior, reorder, responsive layout and complete-collection failure on an unavailable testimonial. An initial assertion searched for the generic word PRIVATE and matched the existing site's private-journey wording; corrected the test to the exact synthetic secret strings, then reran successfully. No disclosure defect was found. Temporary fixture removed and screenshots inspected.

Guest films/captions/transcripts remain unsupported in this section and must be retained through explicit migration, not silently removed. Final source styling, consent/media verification with the provider and release integration remain pending. Anonymous quotes/trip details still require editorial review for identifying text, as in the existing testimonial workflow.

## Source-preserving editorial conversion — 2026-10-23

Added `captured-editorial.ts` to convert captured heading trees into explicit lines/emphasis and description trees into strong-emphasis fragments. It collapses only normal HTML whitespace across fragment boundaries, bounds depth/node/text counts, and rejects unknown tags/attributes rather than dropping formatting. This matters because captured `textContent` joins text around `<br>` without a separator; migration must use the recorded parts, not the flattened reading string.

Added literal-only TypeScript AST inspection in `static-homepage-hero.mjs`; it reads `defaultHeroLines` without executing website code and rejects calls/spreads/computed values/duplicates. Resolution mirrors the current source's bundled-homepage override or title fallback, including an empty heroLines array. The read-only homepage capture now includes all five resolved source hero frames, in addition to the initial reduced-motion browser frame. The refreshed inventory retains 10 sections, three partner regions, six guest-note states and 100 image hashes. This supersedes the earlier limitation that hero headline text was captured only for the initial frame; rotation/video validation remains pending.

Seven focused tests and TypeScript pass: every captured non-hero heading maps without wording loss while retaining line breaks/emphasis, journey-card strong copy round-trips, unsupported structures fail, hero source extraction rejects executable expressions, captured frames match source resolution, and source/media/partner integrity checks pass. No CMS draft was created or applied. The next migration step is constructing the complete reviewed composition with media/record bindings and explicit remaining blockers.

## Read-only dependency review

Run `node --experimental-strip-types scripts/cms/review-homepage-migration.mjs` to verify current source/image/video bytes and regenerate `docs/cms/homepage-migration-review.json`. This currently lists 10 visible section families, 100 images, two hero videos, three curated journeys, seven captured upcoming expedition records and six guest notes. Departure membership reflects capture time and must not become a permanent CMS selection filter.

An optional JSON mapping-manifest filename can be supplied. Its shape is:

```json
{
  "captureDigest": "<exact captureDigest from the generated review>",
  "media": [{"sourcePath": "/assets/example.webp", "sourceSha256": "<source SHA-256>", "assetId": "<proposed CMS asset ID>"}],
  "records": [{"sourceKey": "<exact sourceKey from the generated review>", "recordId": "<proposed CMS record UUID>"}]
}
```

Bindings require exact capture identity and unchanged source hashes. Unknown, stale, duplicate or placeholder mappings are rejected. Guest-note source keys bind the captured quote, trip and link rather than assuming array position or the guest's name identifies a CMS testimonial. Mapped records still need website/type/revision verification; mapped media need processed-byte/rights checks; testimonials need consent and verification. No IDs are invented for missing mappings. Even fully mapped reviews remain `readyToApply: false`: complete composition, source presentation, provider checks and a recoverable draft-application workflow are still required. This command performs no database, upload or publication operation.

## Complete mapped composition proposal

The same review command now calls `planHomepageMigration`. Until all required source mappings are supplied, `previewPayload` is explicitly null. With complete mappings, it constructs and validates all 10 visible homepage section families in their captured order, including all five hero frames, responsive hero video IDs, formatted headings/copy, statistics, ordered journey kickers, source departure title/location overrides, corporate captions/formats, aviation benefits/framing, all 78 partner logos, six guest-note selections and six planning/contact actions. Binding input order does not alter source order. No placeholder CMS references are introduced.

This is a review proposal, not approved migration content. The mapped journey/testimonial/expedition payloads and images still require comparison against captured source content. Corporate image focal points and final source motion/presentation remain unresolved; supporting statistic evidence is deliberately left empty. The departure empty-state copy is explicitly new proposed content because the legacy page hid this section when no departures remained. Captured structured detail now includes exact kickers, accessibility labels, corporate labels and departure metadata; recapturing changes the capture digest, invalidating earlier binding manifests. No source website files or published content are changed by this workflow.

## Corporate responsive crop preservation

The corporate section now has independent main/inset focal points for desktop and optional mobile overrides. Migration populates all four from captured computed object positions. Layout aspect ratios remain controlled by the approved corporate composition; editors move the subject without changing the collage shape. Missing mobile overrides inherit desktop; resetting one image removes only its framing overrides. This closes the previously noted corporate focal-point data gap, while full-page source visual/motion acceptance remains pending.

## Mapped source-record comparison

`review-homepage-migration.mjs` also accepts a second optional file after the mapping manifest: `record-evidence.json`. It must contain `{ "websiteId": "<UUID>", "records": [...] }`. Each record envelope contains exactly `websiteId`, `id`, `currentRevision`, `locale` (`en`), `type`, `path` and `payload`. Supply site-scoped authorized draft reads; keep raw evidence outside version control because testimonial payloads can contain private consent/identity fields. The generated artifact includes only comparison findings and revision identities, not the supplied payloads.

Comparison requires complete source mappings and rejects duplicate/unexpected evidence. It checks record site/type/route; journey title/duration/region/hero mapping/alt text; guest public display name, quote, trip, category, verification and consent status; and expedition duration/listing image/purpose/nearest captured departure date and label. Missing or malformed records fail comparison. Departure checks use the capture date, so final review must also consider current availability. The departure title/location overrides remain bound to captured source values in the composition.

`sourceMatches` is narrowly a source comparison result, never provider attestation or permission to apply/publish. The next trusted application path must fetch these records itself, check current revisions and rights under lock, and verify full visual behavior. No file-supplied evidence may bypass those checks.

## Authenticated source-record review endpoint

`POST /api/cms/migrations/homepage` accepts `{ action: "review", site, recordId, expectedRevision, mappings }` with the same capture-bound mapping manifest. A new homepage uses null target/revision; an existing homepage requires its current revision and edit permission, root path `/`, English locale and homepage content type. New targets require homepage-create permission.

The endpoint uses the caller's bearer token and existing invoker/RLS `get_editor_record` function scoped to both site and exact selected record ID. It reads dependency records in batches of four, validates each response identity/type/locale/route, and returns no partial proposal if a record cannot be read. The response contains the proposed composition, field-only record comparison, revision identities, a review digest and `applyAvailable: false`. It accepts neither client record payloads nor an apply action; it does not save, publish, upload or change flags. Private responses are non-cacheable.

The digest changes with the target, proposed content, record revisions or comparison result. It is review identity, not an authorization token. These API checks have automated simulated-provider coverage; live provider exercise, original/processed media and rights verification, revision locks, current departure review and atomic/recoverable application are still required.

## Homepage workspace review panel

The Homepage workspace includes a read-only migration panel for a prepared mapping JSON file. It reports mapping counts, calls the authenticated review endpoint, lists source differences and the proposed section order, and keeps application/publication unavailable. File size, schema, mapping uniqueness, response target/site/capture identity, full record coverage and comparison consistency are checked before displaying a result. Neither mapping files nor review results are persisted in browser storage.

The panel clears results when the selected revision changes or unsaved changes/another operation disables review. Switching website/account remounts it; abort/generation checks discard stale responses. Preparing actual source-to-CMS mappings and validating media remain separate migration work. This operator review screen does not replace the client-facing everyday content editor or visual acceptance.

## Image provenance and rights review

The authenticated review now verifies all mapped source images using the existing `review_about_migration_media` database function in bounded four-image batches (up to four concurrent batches). Despite its historical name, that RPC checks arbitrary caller-visible image mappings against upload original hashes, image inspection version, expected processed WebP storage location, processed status, archive state, rights approval/evidence and expiry. No new database migration is required beyond the existing image-evidence migration.

Every returned item must match its requested asset/hash and have internally consistent evidence. Missing, reordered or contradictory evidence fails the whole review. Unavailable images remain visible with source/provenance or processing/rights issues. The review digest includes media evidence and revisions. The UI validates full media coverage before showing passed-image counts.

Hero videos remain explicitly unverified: image inspection is not video verification, and no video is sent to the image RPC. Overall media readiness stays false even if all 100 captured images pass. Batches are read-only observations, not an atomic readiness snapshot; application must recheck all rights/revisions and video conditions under transaction locks. Database tests cover batching, revoked rights and cross-user denial locally; live provider exercise remains pending.

## Background-video processing policy (not yet enabled)

The existing upload reservation, storage bucket, inspection worker and media completion path are image-only. No video MIME type has been enabled in those paths. Local checks found no FFmpeg/FFprobe executable in PATH, standard Homebrew locations or the bundled runtime, so real video decoding/transcoding is not yet validated.

`video-inspection-policy.ts` adds bounded source preflight and FFprobe-style metadata validation for a future isolated worker: MP4 filenames/media type/file-type boxes; at most 100 MB; one H.264/HEVC video stream and at most one audio stream; maximum 4096-pixel dimension, 8,847,360 pixels, 60 fps and 180 seconds with consistent positive duration. These are initial background-video limits, not a general editorial-film policy. Audio-bearing sources require a separately generated silent derivative. Container preflight and metadata checks deliberately emit no ready/verified/inspection-version flag.

Both actual captured hero MP4 originals passed container preflight and retained their recorded source SHA-256 values. Their codec, duration, decode completeness and processing remain unverified until the actual decoder runs. The processor still needs a bounded malware scan, private temporary storage, no shell invocation, restricted media protocols, disabled external track references, bounded full decoding/transcoding, stripped metadata/audio and independent delivery inspection. FFmpeg's authoritative MOV/MP4 demuxer documentation explicitly describes external-reference loading controls: https://raw.githubusercontent.com/FFmpeg/FFmpeg/master/doc/demuxers.texi (MOV/MP4 section, `enable_drefs` and `use_absolute_path`). No upload/storage/public-delivery rights may be granted from header or metadata checks alone.

## Real local hero-video processing

Installed the local FFmpeg/FFprobe runtime through Homebrew and added `hero-video-inspection.ts`. The worker function requires absolute executable paths (`CMS_FFMPEG_PATH`, `CMS_FFPROBE_PATH`), performs the bounded source preflight and a caller-supplied malware scan, writes originals to a private temporary directory, and probes the input before encoding. FFmpeg runs without a shell or inherited application credentials, with file-only inputs and external MOV track references disabled, two codec threads and bounded time/output. It emits silent H.264/yuv420p at 30 fps with a maximum 1920-pixel dimension, strips source metadata/chapters and enables fast-start MP4. It checks derivative format/size/duration and fully decodes the derivative again before returning `hero-video-1` evidence. Temporary processing files are removed in finally cleanup.

Actual local original-file results (test scanner stub, not malware clearance):
- Mobile: 1280×720, 15 seconds, source 13,504,863 bytes with audio → silent 3,409,049-byte derivative.
- Desktop: 1920×1080, 69.333333 seconds, source 35,026,252 bytes with audio → silent 38,380,153-byte derivative. Transcoding does not guarantee a smaller file; delivery bitrate/quality tuning remains a separate acceptance decision.

Both derivatives decoded and advanced frames in Chromium without media errors; dimensions/durations matched. A generated audio/video fixture verified source metadata removal, silent delivery, malformed-file rejection and temporary-directory cleanup. The production scanner, process/container resource isolation, video upload reservations/private storage/completion records, rights verification, retry/recovery and public range delivery remain unconnected. Image upload paths remain unchanged and video upload is still disabled. Local derivative artifacts reside only under `/private/tmp`, not in the public website or CMS library.

## Video upload lifecycle and worker (local migration only)

`112-hero-video-upload-lifecycle.sql` adds separate MP4 reservation, claim and completion functions on the existing upload journal. Reservations retain caller permission checks, uploader-scoped idempotency and the shared active-upload quota; MP4 originals are bounded at 100 MB. Video claims use 20-minute leases and the existing three-attempt ceiling. Completion requires `hero-video-1`, exact source hash, silent H.264/yuv420p, even dimensions up to 1920, 30 fps, duration up to 180 seconds and bounded processed size. Media rows retain video metadata with rights pending by default.

The image claim/completion/transfer paths reject video reservations. Image sizes remain capped at 25 MB. Current record-media validation, publication guards and public-image delivery do not accept video assets. This migration does not enable a video transfer bucket, public video delivery, homepage publication or any client upload UI. It has only been applied in local PGlite tests, not to a remote provider.

`processHeroVideoUpload` verifies claimed job identity/paths/lease, reads exact checksum-bound original bytes, invokes the real video inspector, writes an immutable checksum-verified derivative, then calls video completion. Its adapter must use video-specific claim/finish RPCs and the forthcoming private video storage path. Processing/storage/scanner failures use the durable retry journal; lost or inconsistent completion acknowledgements return unacknowledged and must be resolved from upload status without issuing a competing failure. Expired leases cannot finish; ready/rejected uploads cannot be re-claimed.

Private per-job temporary directories may be rooted in an operator-configured absolute `CMS_VIDEO_TEMP_ROOT` scratch volume. The test suite uses an isolated root so concurrent video-worker tests cannot mistake each other's temporary directories for leaked files. Production process isolation/scanning, private video storage/transfer/API/UI, worker adapters and scheduling, video provenance/rights checks and public range delivery remain pending.

## Private video buckets and reservation API

Local migration `113-private-hero-video-storage.sql` defines `cms-video-originals` and `cms-video-media` as private MP4-only buckets capped at 100 MB. It fails on conflicting existing bucket configuration rather than changing it silently. Original insert authorization requires the exact canonical reservation key, video MIME, owner, website permission, unexpired reserved status and bounded declared bytes. Image reservations cannot use video storage; video reservations cannot use image storage. Restrictive policies prevent browser reads, overwrites and deletes in both buckets and prevent browser inserts into processed media, including in the presence of unrelated broad permissive policies. No video preview/public read is enabled.

`POST /api/cms/video-uploads` supports `reserve`, `status` and `cancel`. New reservations require `CMS_HERO_VIDEO_UPLOADS_ENABLED=true`; the example/default is disabled. Status and cancellation remain available when new uploads are disabled, allowing recovery of existing reservations. The endpoint preserves caller bearer credentials, source/site/request identity and bounded MP4 validation. Status/cancel verify the returned upload is the requested video, so an image reservation cannot be cancelled through the video endpoint. No uploaded bytes pass through this endpoint.

Both migrations remain local-only. The provider's real Storage API/MIME/size behavior, byte-transfer route, original verification worker, deployment scanner/isolation and video management UI must be tested before enabling new reservations. SQL policy tests model managed storage tables and deliberately include an unrelated broad policy; they do not constitute a live Supabase Storage test.
