# About page CMS delivery

The existing `/about` source has been inspected: hero label/title/copy/image/credit/focal point; story label/heading/two paragraphs/contact action; leadership label/heading/introduction and three portraits with names, roles and two biography paragraphs each; principles label/heading/introduction, two numbered items and conservation link; page SEO; emphasis and reveal motion. The current original route remains active by default.

`CMS_ABOUT_PAGE_ENABLED=true` plus configured public delivery selects an ordinary published page at `/about`. The request-cached loader serves both content and metadata, reads the anonymous published page and website SEO settings, and distinguishes missing content (not found) from invalid/backend failure. It does not use drafts or fall back to legacy content after enabled delivery fails. No flag was enabled.

Supported composition sections are hero, text, imageText, cards and CTA. They cover story/leadership/principle content and actions using existing editor fields. The renderer supports background, width, spacing, alignment, media order, heading level, anchors and scheduled visibility. Desktop and mobile hero images keep independent alt/decorative settings and credits. Paragraph inline links use the shared renderer. Configured unsupported sections/animation/region targeting fail explicitly, including future scheduled content. One nonblank H1 must remain visible now and through all future visibility boundaries.

| Existing content | Proposed control | Remaining migration work |
| --- | --- | --- |
| Hero label/headline/intro and image credit | Hero eyebrow/title/copy/desktop image | Map inspected media; preserve or add approved focal-point handling |
| Story heading, paragraphs and contact action | Text plus approved CTA/text link | Preserve exact source wording and emphasis |
| Leadership heading and intro | Text | Preserve label and heading hierarchy |
| Three names, roles, biographies and portraits | Ordered imageText/text sections | Approved presentation mapping, accessible portraits and media rights |
| Principles heading, numbered items and conservation link | Text/cards | Preserve labels, numbering and copy in reviewed layout |
| SEO | Page SEO plus website defaults | Review metadata parity |
| Reveal motion and italic heading emphasis | Not yet represented by this delivery contract | Complete representation or obtain a documented design exception; no exception assumed |

Four projection/runtime tests passed for section ordering, independent images, inline links, presentation, metadata, strict envelopes, unsupported fields/controls, distant heading gaps, anonymous reads and error handling. Regular Playwright (Browser plugin absent) exercised the actual renderer using synthetic composition and intercepted local image delivery at 1280px and 390px. Independent mobile alt/credit, media-first ordering, cards, inline links, overflow and captured browser errors passed; mobile screenshot inspected. The image fixture is test content, not a migrated asset. Temporary route removed.

Pending: trusted publication policy/release guards, editor release wiring, sitemap integration, source-preserving reviewed migration, exact legacy design parity choices, media/provider verification and client UAT. This route/renderer foundation is not a completed About editing and release workflow or a claim that all business-editable elements are covered.

## Trusted publication and media consistency
Local migration 108 enables About publication under the shared ordinary-page policy `composition-5`. The validator applies strict About projection, SEO and exact media evidence. Duplicate/contradictory media evidence cannot pass. Visible headings/labels/copy and configured card collections must be complete; links must be verified public destinations or anchors visible throughout the linking section's schedule. Existing connected ordinary-page routes use the same updated version; other page routes remain invalid. Fresh receipts are required before subsequent publication under the new version.

Migration 107 aligns ordinary-page and homepage image checks with public media delivery: only processed WebP with approved current rights is available. The trusted evidence, published record reader checks and release-time locked media checks agree. Existing invalid-format published snapshots would become unavailable under the stricter reader, so media inventory/provider staging verification is required before deploying this migration. No real provider migration or rollout occurred.

The About release trigger locks/rechecks non-anchor destinations and preserves the published route/type and English identity. The ordinary media trigger locks/rechecks images. Local workflow acceptance uses author/reviewer/publisher actors and actual trusted-worker receipts, rejects pre-validation release, rejects source JPEG media, blocks later rights revocation and withdrawn link destinations, then publishes a readable five-section page. Existing route/type guards and schema validation remain separate defenses. Multi-connection races and production behavior are not proven by sequential PGlite tests.

Full local suite: 684 passing; TypeScript passing. Older generic unsupported-page tests now use `/concept`, because `/about` has a connected validator; this preserves those tests' original purpose. Editor release controls, sitemap integration, reviewed source/media migration and client acceptance remain pending.

## Editor release and sitemap
The Pages workspace recognizes English `/about` records as publishable, provides supported-layout guidance and exposes trusted-check requests plus review, confirmed publication and withdrawal. Busy/unsaved state disables those actions. The existing history mechanism restores old content as a new draft requiring fresh approval/validation. Pending migration recovery blocks competing page creation/selection/editing; migration recovery controls remain available.

With About delivery enabled, sitemap generation removes the legacy static `/about` entry and reads the actual published About page. Missing, excluded/noindex or differently canonicalized pages are omitted. Website noindex remains authoritative over a page override. No fabricated modification time is assigned to the CMS snapshot. Disabled delivery retains the legacy entry; backend failure does not fabricate a successful migrated sitemap item.

Synthetic desktop/mobile browser checks exercised the actual PagesWorkspace: trusted check request, submission, approval, cancel/confirm publication, withdrawal, unsaved-state guards, restored pending migration lock and return to normal controls after recovery data removal. There were no captured browser errors. The fixture used the public shell, so this is workflow evidence, not final authenticated admin visual acceptance. Mobile screenshot inspected; temporary route removed. Sitemap tests verify published identity, missing data, page/website indexing and canonical/exclusion behavior. Source/media migration, representation of original focal point/emphasis/motion, real-provider validation and client UAT remain pending.

## Hero framing controls
Hero composition data now accepts optional `desktopFraming` and `mobileFraming` objects: approved natural/wide/square/portrait shapes and bounded horizontal/vertical focal points (0–100%). The image asset contract is unchanged. Omitted framing preserves existing public image proportions; mobile inherits desktop unless explicitly overridden. A mobile override works with either a separate mobile image or the desktop image. Original proportions do not crop; focal points matter only when the selected frame crops the image.

The Pages image editor exposes shape and focal controls, an independent mobile override and reset to inheritance. About, Specialist and Expedition hero renderers and private composition previews consume the same framing conversion. Responsive framing switches at each renderer's existing image breakpoint (About 700px, directory pages 860px, editor preview 760px). Legacy unconfigured private previews retain their existing thumbnail sizing.

Verification: 687 CMS tests passed, including strict framing validation, unchanged legacy field acceptance, published projection retention and mobile inheritance. TypeScript and production build passed. Browser checks at 1280px and 390px verified actual crop dimensions/object positioning using the same desktop asset, editor shape/focal changes and mobile override reset. The temporary fixture used the public shell and intercepted local test images; it is not authenticated CMS visual acceptance or provider verification. Mobile screenshot inspected; fixture removed. Build passed before the final preview-only legacy-thumbnail guard; that guard received a subsequent TypeScript check.

Pending: migrate the original About hero with its 50%/58% focal point after reviewing the crop/layout, preserve heading emphasis and motion, review full source/media migration, validate real backend delivery and complete client UAT. No production data or rollout flags were changed.

## Source inventory and fidelity plan
The read-only About inventory now captures all nine headings (including `field.`, `intent.` and `terms.` emphasis), section labels, three profile biographies, two principles, both editorial links and four hashed source images. The hero and each portrait have distinct recorded focal points. Fresh desktop/mobile captures wait for image decoding and fonts; the mobile layout is reloaded at its own viewport before measurements. Source/image freshness and structural preservation tests pass (2 new tests).

`about-migration-plan.md` maps captured fields to the remaining authoring/rendering work and migration gates. The source's full-width overlay hero, non-hero eyebrows, separate profile names/roles, portrait crops, numbered principles and motion cannot yet be faithfully represented by the current generic About composition. None have an approved exception. No candidate is falsely marked import-ready, and no content, assets or rollout flags were changed in a real backend.

## Editable heading emphasis
Hero, text, image/text, cards and CTA section headings now accept an optional exact `titleAccent` phrase. The composer exposes it as plain text, explains that the first matching occurrence is emphasized and reports a stale phrase after a heading edit. Empty editor input removes the override. Strict schemas reject non-matching/blank phrases or emphasis without a title. Public About, Specialist, Expedition and Legal renderers and composition preview preserve the full title and render the matching phrase with a React `<em>`; supplied markup remains escaped. Dark approved backgrounds use the lighter editorial accent color.

All three captured About emphasized words are representable without rewriting their headings. This closes heading emphasis only; the original overlay hero, non-hero labels, profile/portrait grouping and framing, numbered principles, motion and actual migration remain pending. Tests cover captured-source phrase retention, public projection, legacy plain headings and invalid/stale phrases. Desktop/mobile browser checks verified editing, warning/reset and escaped HTML-like input; temporary route removed. Full local CMS suite: 691 passed. No real data or rollout changes.

## Section labels and portrait framing
Text, image/text, cards and CTA sections now have optional plain-text `eyebrow` labels (maximum 200 characters). The composer edits them separately from titles, clearing the field removes the override, and all connected public consumers of those section types plus the composition preview render them above the heading. Hero labels retain their existing contract. No arbitrary markup is accepted/rendered. This permits original story/principles labels and separate profile names (label) and roles (heading), without merging names into body copy.

Image/text sections now accept the same optional desktop/mobile framing controls as heroes. About portrait rendering and the private preview apply them, including mobile inheritance/reset. An approved 5:6 portrait option supports the source mobile portrait proportions alongside natural, 16:9, square and 3:4. Original default behavior is retained when framing is absent. This does not establish exact legacy desktop portrait dimensions, leadership grouping, hero layout or motion parity.

Validation: 692 CMS tests passed, including source-profile name/role and focal-point retention. Browser checks at 1280px and 390px verified the actual About renderer's separate label/heading, 3:4 desktop vs 5:6 mobile crop, 58%/42% focal point and overflow. Mobile screenshot inspected; test images were intercepted local fixtures and the temporary route was removed. Client/provider acceptance and migration remain pending.

## Numbered principles layout
Cards now have an optional approved `layout` (`grid` or `numbered`), section introduction and per-item label. Existing cards without a layout remain grids. The collection editor supports layout selection, introduction, labels and existing add/remove/reorder actions. Columns are shown only for grids. Numbered layouts reject item images during schema validation rather than hiding or deleting them; changing back to grid retains them.

The shared numbered renderer is connected to About and the draft preview. It retains the section eyebrow, heading/emphasis and introduction beside a vertically ordered set of labeled principles. Two-digit decorative numbers follow the current item order; titles, copy and links remain editable. It uses the source layout's two-column proportions, sticky desktop heading, heading scale and stacked mobile layout. Preview headings are not sticky. Grid rendering also displays the new introduction and item labels, so toggling layouts does not drop that content.

Two new tests verify complete captured principle content through public projection, original numbering, reorder retention, legacy grid compatibility and rejection of unsupported layout/hidden images. Desktop/mobile browser checks verified original copy/link/emphasis, editing labels, reordered numbering, responsive columns and overflow. Mobile screenshot inspected. The fixture uses the shared real renderer and editor in a temporary local page; it does not prove authenticated-provider behavior or final source-page design parity. The fixture was removed. No real content was published.

Remaining About work: grouped leadership layout and exact portrait dimensions, full-width hero presentation, approved motion, source/media migration review and application, real-provider delivery and client acceptance.

## Grouped leadership layout
Cards now support an approved `leadership` layout with a grouped section label/title/introduction and ordered profiles. Profiles retain separate names and roles, biography paragraphs separated by blank lines, images, accessible text, optional credits/captions/links and portrait presentation. Tall editorial and square portrait choices carry bounded focal points attached to each profile, so reordering does not transfer framing to another person.

The shared renderer is connected to About and private composition preview. Desktop profiles alternate image/copy columns, while mobile stacks portraits before copy. The tall portrait dimensions follow the source's desktop minimum height and mobile 5:6 proportions; square profiles remain square. Full-page comparison is still required before claiming visual parity. Profile copy uses normal React text with explicit paragraph elements, not HTML.

Leadership schema validation requires at least one complete named profile, role, biography and image. Portrait configuration is rejected in other layouts rather than silently ignored. The editor provides a reset to remove portrait configuration when changing layouts. An existing collection-editor bug was also fixed: clearing an optional item label now deletes that label instead of trying to delete the unrelated href field.

Validation: 696 CMS tests pass, including all captured profile content/framing, reordered profile identity, incomplete-profile rejection and protection against ignored portrait data. Desktop/mobile browser checks exercised the real shared renderer and collection editor, confirming three roles, six paragraphs, focal positions, desktop alternation/mobile stacking, retained square portrait after reordering, overflow and label clearing. The mobile screenshot was inspected. The temporary route was removed; source images were local fixtures, not migrated public CMS assets. TypeScript passed. No real data or rollout changed.

Next gates: full-width hero presentation, approved About motion, complete-page source comparison, deterministic source/media migration with review/recovery, real-provider delivery and client acceptance.

## Full-width overlay hero
Hero sections now accept an optional approved `layout` of `split` or `overlay`; omitted values preserve existing split rendering. The image editor exposes the choice and explains that overlay images fill the hero frame. Focal points remain editable independently for desktop/mobile. Crop shapes are retained for switching back to split layout but are not applied to overlay frame dimensions. The image-side and mobile-order split controls likewise do not reposition overlay text.

The shared overlay renderer is connected to About, Specialist and Expedition public page renderers and private composition preview. It supports heading/emphasis, label, copy, buttons, text alignment, approved content width/spacing, separate mobile imagery/alt, caption/credit and an enforced contrast scrim. The first About overlay hero removes the old CMS top padding. The shared overlay image breakpoint is 700px. Captions/credits remain readable on mobile, unlike the original legacy hero that hid credits there; this deliberate visible-credit behavior must be included in the full-page review. Preview remains a draft layout representation, not a guarantee of final page dimensions.

Validation: 698 CMS tests passed, including source hero copy/emphasis/credit/focal-point retention and approved-layout validation. TypeScript passed. Desktop/mobile browser checks verified actual About full-width and top placement, responsive focal point and independent alt/credit switching, heading text/emphasis and overflow. Mobile screenshot inspected; local image responses were intercepted fixtures, and the temporary route was removed. Production deployment, media migration and client acceptance have not occurred.

Remaining About gates: approved motion, complete-page source comparison, deterministic reviewed source/media migration with recovery, provider delivery checks and client acceptance.

## About motion connection
The existing composition animation controls (`none`, `fade`, `reveal`) are now supported for About. Region targeting remains rejected. Other page types retain their existing motion restrictions. The Pages guidance explains the About options and reduced-motion behavior; composition preview remains deliberately unanimated.

A scoped client enhancer wraps the server-rendered About content. It loads GSAP/ScrollTrigger only when a section requests motion. Fade animates opacity; reveal adds entrance translations and source-inspired profile/portrait choreography, with scroll-linked image movement and scrim entrance for overlay heroes. Leadership/principles are treated as grouped content rather than animating the entire page as one element. No CSS initially hides server content. A failed enhancement reverts its media context.

`prefers-reduced-motion` changes are observed through GSAP matchMedia. Reduced motion reverts transforms/opacity and removes triggers. Unmount and revision changes clean up scoped contexts, listeners and active font/load refresh callbacks. Keyboard focus completes the relevant entrance so a focused link cannot remain inside transparent content. This is a source-informed implementation, not a claim of identical timing across every legacy animation.

Validation: 699 CMS tests passed, including the three approved motion modes and unchanged rejection of region targeting/unsupported motion. Desktop/mobile browser checks on the actual About renderer verified hero movement, profile entrances, focused CTA visibility, live reduced-motion switching, and unmount/remount. No captured page errors. The temporary fixture was removed. TypeScript passed. Provider publication/rollout is still disabled; all data used here was local synthetic composition.

Next: compare a complete source-derived About draft (including story layout, hero, leadership, principles and motion), resolve presentation differences, then execute reviewed media/content migration with identity checks and recovery. Client/provider acceptance remains outstanding.

## Complete source-derived review proposal
The local About planner now creates `about-migration-review.json` with all four source sections and explicit outstanding findings. It verifies source/component/style/motion/image hashes and validates the proposal through the public About projection. Proposed media bindings are source-hash checked, but all current images remain review placeholders. `readyToApply` is false and no apply operation is connected.

Desktop/mobile rendering confirmed all captured copy, nine headings, three emphasis phrases, four images and both source links. Desktop full-page screenshot inspected. This establishes content preservation, not full visual parity: the story's two-column layout/button treatment is still missing, and provider media evidence, design/motion acceptance and safe migration application/recovery remain outstanding. The temporary route was removed. No production content or rollout changed.

## Story presentation completed
Text sections now offer stacked or split heading/copy layouts, with a required heading for split presentation. Standalone rich-text links can use approved text-link or button styling. The composer and rich-text editor expose both choices; ordinary plain text/link payloads remain unchanged by default. The shared text renderer is used by About, Specialist, Expedition, Legal and composition preview, and other composition body renderers honor button styling. Link destination checks remain unchanged; styling cannot authorize a private or unsafe destination.

The About planner now emits a split story section and button-styled `/contact` link. The generated review artifact retains all source content and no longer reports the story implementation gap. Complete desktop/mobile browser checks verified nine headings, three emphasis phrases, four images, original copy/links, two desktop columns versus one mobile column, button treatment and no horizontal overflow or page errors. Desktop screenshot inspected; temporary route removed. Full CMS suite: 703 passed, including unsafe-link rejection through styled links. No source images were migrated or production data changed.

Remaining migration gates: verified processed media bindings/rights/availability, final client design/motion review, atomic About draft application and recovery, and actual provider delivery/rollback acceptance.

## Read-only migration review API
The About review endpoint now authorizes the draft target and verifies proposed media mappings using source upload provenance and current processed-media/rights evidence from local migration 109. Strict evidence identity checks prevent missing or contradictory evidence from passing; stale targets and foreign origins are rejected. No apply command exists yet, and all reviews return `applyAvailable: false`. See `about-migration-plan.md` for test scope and remaining transactional/UI/provider gates.

## Draft migration transaction foundation
Local migration 110 now supports atomic About draft creation/update and actor-scoped result receipts. It rechecks target identity/revision and locked source/media/rights evidence, rejects changed manifests, rolls back failures and safely returns the original receipt on exact retries without overwriting later edits. Database tests verify publication remains unchanged and revoked permission prevents receipt/replay access. The HTTP/UI apply path remains disabled until its recovery integration is complete; nothing was migrated into a real backend.

## Migration API apply/status connected
About migration review, apply and status now use the transaction/receipt backend. Exact original evidence and digests are retained for retry identity; current target/media checks protect first application, and completed retries cannot overwrite subsequent draft edits. Local HTTP-to-database acceptance includes response loss after commit and safe recovery. The client mapping/review/recovery panel and real-provider validation remain outstanding; there has been no real migration or publication.

## Client migration contracts
Browser-side verification and bounded account-scoped recovery contracts now support the About migration flow. They verify the reconstructed source proposal and exact evidence/digests, retain only retry identifiers/mappings/evidence and reject mismatched receipts. Direct API results include request identity. The client mapping/review/recovery panel is the next integration step; these helpers alone do not establish a completed client migration workflow.

## Client migration panel connected
The Pages workspace now includes the four-image About mapping, before/after review, acknowledgement and persistent recovery panel. Desktop/mobile checks passed for mapping, verified proposal display, storage-failure prevention and recovery after a lost response/reload without duplicate application. These were synthetic local checks, not a real migration. Real provider/media verification and client UAT remain open.
