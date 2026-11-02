# Private Aviation CMS migration

Status: source/rendered inventory complete; editing, migration and publication are not implemented for this route. Existing website is unchanged.

Evidence: `private-aviation-migration-inventory.json`, produced by `node scripts/cms/inventory-private-aviation.mjs http://localhost:3001`. Capture hashes the route, recursively imported local sources, root layout/styles and all five original media files. Desktop 1280 px and mobile 390 px retain text, heading markup, image framing, video settings, exact planning URLs and keyboard focus evidence. Screenshots are `/private/tmp/cms-aviation-inventory-{1280,390}.png`. No enquiries or CMS writes are made.

## Page-owned content and proposed contracts

| Existing section | Proposed section | Client fields and behavior to preserve |
| --- | --- | --- |
| aviation-hero | aviationHero | Partner eyebrow; editorial heading lines/emphasis; copy; labelled planning action; processed silent video and poster; optional mobile variants; desktop/mobile framing; two caption labels and mobile secondary-caption visibility. |
| aviation-intro | aviationIntroduction | Eyebrow; heading; paragraphs; planning action; accessible sequence label; four ordered steps with stable IDs, title and copy. Numbering derived from order. |
| aviation-fleet | aviationFleet | Eyebrow; heading; introductory copy; ordered aircraft cards with stable IDs, aircraft name/type, image/alt/framing and summary; labelled range/flight-time/seating values; source attribution and operating-conditions disclaimer. Preserve strings and units rather than converting approximate claims to numeric guarantees. |
| aviation-journey | aviationJourney | Image/alt/framing, eyebrow, heading and ordered journey steps with stable IDs/title/copy; desktop image position and mobile order. |
| aviation-service | aviationServices | Eyebrow, heading, introduction and three ordered numbered service cards with stable IDs/title/copy. |

Shared header, footer and end-of-page enquiry CTA belong to global settings. The unused `.aviation-cta` CSS selectors are not an extra rendered page section. No disabled JSX content was identified in the inspected route. The aircraft array and inline route-step array are captured alongside rendered content so migration can retain ownership and ordering.

## Fidelity and validation requirements

- Keep one H1 across visibility schedules. Use the existing section controls where supported; do not accept unsupported region targeting.
- Preserve `/plan?experience=private-aviation` exactly for both planning actions. Validate approved intent links explicitly, rather than generally allowing arbitrary query strings.
- Preserve desktop hero ratio 1920/745 and mobile 4/3; retain both caption values when mobile hides the secondary caption.
- Preserve the alternating aircraft layout on desktop and stacked mobile layout, including distinct image focal points. Keep optional mobile images independent of desktop originals.
- Source video is autoplay/muted/loop/playsInline, decorative, with metadata preload. Browser muted state is not proof of a silent media asset. Apply existing processing, tenant isolation and rights checks to video and poster before publication; verify reduced-motion behavior and poster fallback.
- Aircraft specifications and claims need client evidence/review. Source capture does not verify aircraft performance, availability or the named partnership. Preserve the visible source attribution and operating limitations.
- The existing page title/description are page-specific, but canonical and social image inherit root defaults. The capture intentionally records this. Proposed migration must present page-specific canonical and social defaults for explicit review, without silently changing the source evidence.
- Public output must be an allowlisted projection of a published immutable revision; draft/hidden/future-only assets must not become public. Recheck referenced links/media at publication and on public read.

## Implementation and acceptance sequence

1. Add strict five-section contracts, incomplete draft factories, composition registration, exact-route palette and a page template.
2. Implement copy/list/media/video/framing editors and private preview; verify saved draft, ordering, readonly permissions, preview revision pinning and unsaved-change behavior.
3. Build source-hash-bound migration with original-media mappings, reviewed content/SEO differences, atomic expected-revision apply and lost-response recovery. Never replace an existing draft without comparison.
4. Implement renderer and scoped motion preserving source layout; test mobile/desktop, keyboard, reduced motion, video fallback and edited content lengths.
5. Add trusted validation, release guards, filtered public delivery/images/video, SEO and sitemap, plus revision-bound editor review/publish/restore/withdraw controls.
6. Validate database lifecycle, stale revisions, cross-site access, dependency withdrawal, projection leakage and recovery; keep legacy delivery until managed migration and client acceptance succeed.

Inventory evidence is covered by `tests/cms-private-aviation-inventory.test.mjs`. It establishes source fidelity and capture completeness, not CMS editing or production readiness.

## Content contract milestone (2026-10-23)

`lib/cms/private-aviation-content.ts` defines strict contracts for the five proposed section types. Copy is bounded and preserved without trimming/coercion. Ordered paragraphs, steps, aircraft and specifications carry unique stable IDs. Fleet claims remain labelled strings with required source/operating note. Hero supports an image fallback or processed asset references for desktop/mobile video, independent mobile poster and focal points, explicit panorama/landscape ratios, and captions whose mobile visibility does not discard text. Images use the existing accessible image contract; headings use explicit editorial lines/runs rather than HTML. Playback controls and arbitrary remote media URLs are not accepted.

Tests use captured source copy/specifications and verify round-trip preservation, reorder identity, hidden-caption retention, mobile independence, strict nested fields, duplicate identities, empty/overlong copy, unsafe URLs and framing limits. These are field contracts only: composition registration, draft factories, editor, preview, trusted publication/media checks and rollout are pending. Schema acceptance is not media verification or publication authorization.

## Composition and structural projection (2026-10-23)

Registered all five Aviation schemas in composition (52 section types total). Added independent incomplete section factories and an empty page-draft factory. Factories contain no aircraft claims, asset approvals or invented source copy; incomplete fields cannot pass save validation. No template/palette is exposed yet, since the corresponding editor is still pending.

`projectPrivateAviationPage` accepts the strict ordinary-page envelope and English context, rejects extra payload fields, unsupported visible sections and region targeting, and enforces one visible hero H1 at the current time and every future visibility boundary. Projection preserves typed content and excludes hidden/future sections. This is structural preview data, not a public delivery endpoint or authority to publish. Content validation still reports publication_not_ready for this route.

Tests cover independent draft state, missing-content rejection, supported schema registration, hidden duplication, schedule visibility, future loss of H1, unsupported fields/sections/context and continued publication blocking. Refreshed the Concept, Bespoke and Aviation read-only inventories because the shared composition dependency changed.

## Aviation editor implementation (2026-10-23)

Added a dedicated empty Private Aviation template and exact-route five-section palette. PageComposer now renders Aviation fields and insertion buttons. Forms cover editorial heading runs, all copy/links/captions, route/journey/service ordering, aircraft identity/type/summary, nested labelled specification rows, source/operating note, image accessibility/credits, desktop/mobile framing and independent mobile images. Hero uses the existing verified-video picker, image/video choice, independent mobile video/poster, framing and caption visibility. Collection IDs survive reorder; new items receive UUIDs; all collections enforce their schema maximum and retain at least one item. Read-only fieldsets disable nested actions.

The template does not populate source claims or automatically import current website content. Publication stays disabled for this route. Private visual preview, source-bound migration and public lifecycle remain pending; editor validation still prevents incomplete content from being saved.

Aviation editor validation: desktop/mobile synthetic interaction checks, all 1,200 CMS tests (zero skips), and production build including TypeScript passed.

## Private content preview (2026-10-23)

CompositionPreview now routes all five Aviation section types to typed content previews, retaining shared visibility schedules, audience filters and validation. Shows editorial headings, copy, labelled aircraft specifications/source note, ordered sequences, accessible images/credits, exact planning links and captions. Hero poster supports independent mobile media and original panorama/landscape framing; the secondary caption is hidden on mobile only when requested. Video uses the existing private MediaVideo loader with manual controls and no autoplay. A missing/denied video loader retains the poster and readable content; existing media retry/error behavior is reused. This is explicitly a content/layout review, not the final source website theme or motion.

Browser plugin unavailable; Playwright synthetic CompositionPreview fixture passed at 1280/390 px: five sections, one content H1, three ordered lists, original aircraft/specification values, exact planning links, mobile caption visibility/retention, absent/denied video loader, retry, poster persistence and denied-image fallback retaining text. Initial PNG fixture was correctly refused by the WebP-only private image component; changed the fixture to generated WebP and reran both sizes successfully. No page errors/framework overlays. Screenshots `/private/tmp/cms-aviation-preview-1280.png` and `/private/tmp/cms-aviation-preview-390.png`. Temporary fixture removed. Real media/provider access, successful video playback and final website visual/motion acceptance remain unverified.

## Source-bound migration proposal (2026-10-23)

Added `planPrivateAviationMigration`, a pure review-only planner. It requires exact source/media hash evidence, rejects duplicate/stale/unknown mappings and reuse of one processed asset for different originals, and retains explicit review-only placeholders for unmapped media. Refreshed the capture to preserve exact heading lines/runs and emphasis. Proposal includes all five sections, all captured paragraphs and aircraft/specifications, step order, original alt text/focal points, decorative hero poster/video semantics, exact planning intent and mobile caption visibility. The existing source disclaimer is retained unchanged.

SEO comparison explicitly proposes replacing the inherited homepage canonical with `/private-aviation`. The inherited global sharing image is outside the page media inventory; proposal retains settings inheritance and flags it for review rather than inventing an approved asset binding. `readyToApply` remains false even with all five mappings. Backend provenance/processing/rights checks, client claim verification, layout acceptance, atomic application/recovery and public release remain pending.

Tests compare every captured paragraph and heading, labelled fleet values, video/poster roles, strict structural projection, explicit SEO differences, stale/duplicate/conflicting mapping rejection, missing-media placeholders and absence of apply authority.

## Mixed-media review evidence (2026-10-23)

Migration 186 adds the authenticated, read-only `review_aviation_migration_media` RPC. Requires exactly four unique images and one unique video, delegates to established source/processing/rights readers and returns ordered kind-bound evidence without storage keys or rights notes. Reuses current tenant/permission checks, original upload hashes, processing versions and available-media rules. No write/application capability is granted.

The TypeScript verifier strictly matches count, order, kind, identity and original hash; rejects contradictory availability, private extra fields and duplicate/incorrect mappings. Database tests use five synthetic processed assets inside a rolled-back transaction, verifying matching evidence, wrong originals/types, malformed mappings, revoked/expired rights, outsider/cross-site denial and revoked membership. The database's existing video metadata constraint rejects an attempt to add audio; the test asserts that constraint rather than fabricating impossible stored state. Atomic apply must still lock and recheck evidence at write time. Provider rollout remains pending.

## Atomic draft application and recovery (2026-10-23)

Migration 187 adds actor/site-scoped immutable migration receipts, `apply_aviation_migration` and `get_aviation_migration_result`. Create/edit authority is checked on every application including completed retries. Existing targets must be English ordinary pages at `/private-aviation` with the expected revision. Identity validation precedes ordered upload/media share locks; each asset is re-read with its original upload hash, processing/storage rules, current revision/hash and rights expiry evaluated at wall-clock time. Image references and video slots must match their respective mapped sets exactly. Current evidence must equal the reviewed evidence before `save_draft` creates a revision. Application never publishes.

Failures roll back batch, revision and audit changes. Completed retries require the same source/review/manifest identity and return the original receipt, even after later edits, without overwriting those edits. Results are visible only to the original actor with current record access. RLS protects the receipt table; authenticated callers use the restricted functions.

Local database tests cover revoked media rollback/no receipt, changed evidence after rights restoration, missing video and image/video role mismatch, create/retry, later-edit preservation, reused-key rejection, stale revision, current-revision replacement, actor-private receipts, outsider/revoked-member denial and unchanged unpublished state. Fixtures roll back. All 1,207 CMS tests passed with zero skips. Provider concurrency and managed deployment remain unverified; API source/review digest binding and recovery UI are next. The SQL transaction provides atomic draft safety, not a source-fidelity or publication attestation.

## Review/apply/status API (2026-10-23)

`POST /api/cms/migrations/aviation` uses the caller bearer token, same-origin policy, bounded strict commands and private no-store responses. Review validates source mappings against the captured proposal, checks create/edit authority and exact English Aviation revision, then obtains mixed-media evidence. Returns explicit SEO comparison as well as before/proposed payload and findings. Original source paths determine image/video roles; the caller cannot substitute roles. Apply binds the selection, full proposal and ordered evidence to the review digest, checks current evidence again and delegates atomic application to migration 187. Completed retries recover only matching receipts and still invoke the transaction's current-authority check. Status distinguishes unconfirmed requests from completed receipts; unavailable or mismatched receipt/result shapes fail closed.

Unit tests cover caller identity, no-mutation review, denied/stale/wrong-route/cross-origin requests, incomplete or changed evidence, tampered digest, malformed status receipts and wrong-target results. The actual local database lifecycle additionally runs the handler through named RPC calls: loses a completed apply response, retrieves status, saves a newer client edit, then replays the original command and verifies the newer edit remains current. All data changes roll back; no managed API/provider changes made.

Aviation migration API production build including TypeScript passed.

## Migration browser review and recovery implementation (2026-10-23)

Added strict browser review validation against the local source-bound proposal, explicit SEO comparison and server source/review digests. Recovery stores bounded actor/site/request identities, mappings and evidence only—no page copy or bearer token. Unconfirmed status retains the request; completion requires exact receipt identity, a new revision and the expected target when replacing. Recovery reconstructs the same apply command.

The Aviation migration panel offers four image pickers and one verified video picker, new/existing draft selection, before/proposed previews, explicit canonical/social-image changes, acknowledgement, apply, discard and pending status/retry. Pending requests are stored before sending; a reload restores recovery state. Parent page controls and other migration panels are locked while this review/recovery is active. Success opens the returned saved record, including newly created pages. Client review still does not grant publication authority.

Migration panel validation: desktop/mobile synthetic recovery checks, all 1,215 CMS tests with zero skips, and production build including TypeScript passed.

## Saved preview and video-loader wiring (2026-10-23)

Inspection found that ordinary PagesWorkspace and SecurePreviewViewer were not receiving a video loader. Connected the existing authenticated, no-store, cancellable video-media endpoint in both paths. This benefits Aviation and Concept video review without changing database/storage permissions. Shared previews still require current assignment/record access, and images/videos additionally require media-library access. Updated viewer guidance accordingly.

Extended the real database migration lifecycle to share the saved Aviation revision, edit the page, verify the recipient still sees the original pinned payload, verify separate authorized video lookup, deny outsiders, and revoke the preview. Browser checks at 1280/390 used synthetic sign-in and mocked API responses, verified bearer/site-scoped image/video requests, denied-video retry, five-section pinned content, and refresh after revocation removing all page content. Initial navigation timed out; rerun used the same server. Screenshot review caught white-on-pale image-error text inside dark sections; added explicit dark text on the media placeholder and repeated both viewport checks with a computed-color assertion.

All 1,215 CMS tests passed, with the extended database scenario; browser fixtures removed before production builds. Real successful video playback/provider UAT remain pending. Preview revocation removes the shared page; it does not revoke independent media-library permissions.

Final production build including TypeScript passed after the media-placeholder contrast fix.

## Source-preserving website renderer (2026-10-23)

Added CmsAviationPage for the five typed projected sections. Uses source classes and responsive layout, editorial heading runs, exact planning links, ordered numbering, aircraft specification lists/source note, accessible image callbacks, mobile-image/caption handling and hero framing/media callback. Caller must own audience projection and media authorization. Source-specific crop geometry remains for natural image framing; explicit image shapes use existing framing variables. Hero callback is intentionally separate until the authorized public poster/video delivery component is connected.

Local browser source comparison at 1280/390 px passed all section paragraphs, headings/font sizes, links, specification values, captions/visibility, image alt/focal points and image/video dimensions (image tolerance under 2 px), one H1, keyboard action focus and no horizontal overflow. Fixture mapped original local assets to the pure migration proposal; no live delivery switch. Initial fixture imports were one directory too deep; corrected fixture and reran successfully. Screenshots `/private/tmp/cms-aviation-render-1280.png` and `/private/tmp/cms-aviation-render-390.png`; fixture removed before suite/build.

This milestone covers original layout fidelity. Generic edited heading-level styling, background/spacing/alignment/media-order controls, scoped motion, actual public hero video fallback, route/SEO/sitemap integration and release validation remain pending. Existing public route is unchanged.

Renderer validation: all 1,215 CMS tests passed with zero skips; production build including TypeScript passed.

## Editable presentation and scoped motion (2026-10-23)

Connected background, content width, spacing, alignment, heading levels and desktop/mobile media ordering to the website renderer. Corrected draft defaults to the source white fleet background and source image ordering. Forest uses the source surface color. Original source comparison (including computed backgrounds) and edited controls passed at 1280/390: centered compact white reading-width introduction with H3, desktop images after text, and mobile text before images. All 1,215 CMS tests and production build passed for presentation controls.

Added CmsAviationMotion using per-instance IntersectionObserver and native transform/opacity animations. Honors none/fade/reveal controls, cleans up on revision replacement/unmount, responds to reduced-motion preference changes and reveals focused content immediately. Server markup remains visible with JavaScript disabled or missing animation/observer support. Uses a div inside the existing application main landmark, correcting the renderer's redundant main. No global selectors or public-route changes.

Synthetic browser harness passed at 1280/390 for none/fade/reveal, keyboard-focus visibility, revision replacement, runtime reduced-motion changes, no JavaScript and missing IntersectionObserver. Corrected a temporary fixture import before running; the harness exposed the redundant landmark. Fixture removed before full validation. These checks cover the motion wrapper; actual public hero video fallback, route/SEO/sitemap, publication validation, provider rollout and client acceptance remain pending.

Final motion validation: all 1,215 CMS tests passed with zero skips; production build including TypeScript passed.

## Public hero player foundation (2026-10-23)

Added CmsAviationHeroMedia for a caller-authorized public projection. Uses only guarded same-origin published image/video endpoints, retains the responsive poster underneath video, selects mobile assets/alternative text at the source 600 px hero breakpoint, displays poster credits, and exposes keyboard-accessible pause/resume. Reduced motion, save-data, slow connections and hidden documents suppress video. Media errors and rejected play promises fall back to the poster; changed media resets playback state. Cleanup removes preference/visibility listeners and ignores stale play failures.

This component does not authorize publication and is not yet connected to the live Aviation route. The next integration must supply only verified published projections and retain independent endpoint rights checks. Browser control tests use synthetic endpoint responses and a stubbed successful play promise, so they do not attest real provider playback or video encoding support.

Browser controls passed at 1280/390: desktop/mobile video identity and poster alt, pause/resume, runtime reduced-motion changes, dispatched media errors, rejected play promises, and save-data suppression. Mobile initially could not click the temporary fixture's button because it was beneath the site's sticky header; positioned the harness below the header and reran successfully. Temporary route removed before suite/build. This is isolated player validation, not final full-page placement or real provider playback.

Hero player validation: all 1,215 CMS tests passed with zero skips; production build including TypeScript passed.

## Editorial publication validation foundation (2026-10-23)

Added Aviation-specific editorial findings to stored-content validation: exact English page identity, strict projected composition/SEO, one hero H1 through future scheduling boundaries, supported section palette, and exact public destinations for hero/introduction actions. The approved planning query is `/plan?experience=private-aviation`; other query forms, missing anchors, unpublished dynamic paths, owned non-public subdomains and URL-normalized path tricks fail verification. Anchor checks evaluate every future visibility boundary. External HTTPS acceptance means syntax only, not remote reachability.

Added optional trusted Aviation path evidence to the validation worker input. Both direct and queued workers forward it to editorial checks. Database evidence production and release-time checks are not yet connected, so dynamic destinations fail closed when no evidence is supplied. Kept `publication_not_ready` and the existing video publication gate intact; this milestone cannot issue a successful Aviation publication receipt.

Four tests cover source content, identity, future anchor/H1 changes, exact links, both workers with/without destination evidence, and continued media/publication rejection.

The first full suite detected stale source hashes in the Concept, Bespoke and Aviation inventories after shared content-validation changed. Recaptured all three from the unchanged running site: 174/129/119 source dependencies respectively, preserving 10/8/5 sections and 105/8/5 local media assets. This refresh changes migration source digests, so earlier reviews require review against current evidence; no stored client content was changed.

Editorial validation milestone verified: after refreshing shared-source inventories, all 1,219 CMS tests passed with zero skips and the final production build including TypeScript passed.

## Database link evidence and release dependency checks (2026-10-23)

Migration 188 adds `aviationPublishedPaths` to trusted validation input while preserving other content types' evidence. It resolves exact same-site paths against current public eligibility and keeps record/revision/site binding. Migration 189 adds Aviation-specific action extraction, the exact planning-query allowance, and a release trigger. The trigger includes future scheduled sections, skips explicitly hidden/expired sections, locks referenced records/media and fixed-route evidence in stable order, then checks destination availability again. It rejects changing a published Aviation route's identity. Anchor existence and full schedule/structure validation remain the trusted validator's responsibility.

Local database tests verify exact owned URLs, rejected query/fragment/path-normalization tricks, wrong-site/revision input, withdrawal removing evidence, private helper permissions, a future link passing then failing after target withdrawal, unchanged unpublished state after rejection, and route-change rejection. Release-trigger tests run on a temporary table to isolate this guard while the reserved-route publication gate remains closed; they do not prove a full Aviation publish lifecycle. All fixture writes roll back.

All 1,221 CMS tests passed with zero skips. Neither migration has been applied to a managed provider. Aviation public projection, image/video authorization, remaining release structure checks, route/SEO/sitemap and client acceptance remain pending.

## Public projection and media boundary (2026-10-23)

Migrations 190–191 add explicit nested field selection for all five Aviation families and SEO, remove editor labels/private fields, filter inactive/localized/region-scoped sections, and remove video identifiers from image-only backgrounds. Public lookup requires an immutable published revision, matching current validation policy, current projected media eligibility and verified action destinations. Generic public-page lookup delegates to this same boundary. Image authorization and Aviation hero video authorization now require references in eligible projected content; other content retains its existing independent authorization.

Database tests preserve every original section data field and SEO through projection, inject private fields throughout nested structures, exercise hidden/future/expired/region/locale sections, reject unknown active types, and verify draft/other-site/unsupported-locale denial. Shared images retain independent published-journey authorization and lose access on withdrawal. The saved draft migration scenario verifies that even its processed, approved video remains unavailable anonymously. The initial media migration had an incomplete conditional in generic page lookup; corrected it before the passing run.

All 1,223 CMS tests passed with zero skips. These migrations are local only. Successful Aviation publish/restore/withdraw lifecycle, public media lifecycle for published Aviation, release guards, website route integration and provider/client acceptance remain pending.

## Integrated Aviation release lifecycle (2026-10-23)

Migrations 192–193 extend verified-video status and route-aware media eligibility to English Aviation pages, coordinate the reserved-route exemption with a dedicated envelope/palette/region guard, and retain existing ordered video locks, approvals, validation receipts and link dependency checks. Stored-content validation now recognizes completed Aviation editorial checks instead of unconditionally rejecting its route. No delivery feature flag or live route changed.

Added a rolled-back lifecycle scenario using synthetic processed images and a provenance-bound silent video: trusted worker validation, separate editor/reviewer/publisher roles, publish, anonymous projected content/media, hidden/future image denial, newer draft preserving published revision, rights revocation preventing release and suppressing delivery, restored rights, second release, historical restore as a new draft, reapproval/publication, route-change rejection, unsupported-section rejection despite a forged successful service receipt, and withdrawal removing image/video access. Initial full run passed this lifecycle but flagged stale inventory hashes and an outdated test expecting the old unconditional route gate; refreshed inventories and replaced that assertion with missing-media checks.

Provider deployment, full website integration and real media/client acceptance remain pending.

Final release validation: all 1,224 CMS tests passed with zero skips; production build including TypeScript passed.

## Visitor and admin integration — 23 October 2026

Connected Pages workflow controls to the existing Aviation release gates. Added an anonymous, site-bound public reader that validates the projected payload and rechecks page/SEO settings to reject withdrawal or changed revisions during loading. Visitor route, public media renderer, resolved metadata and indexing-aware sitemap now use this reader when CMS_AVIATION_DELIVERY_ENABLED=true and public delivery is configured. Missing published content returns not-found; it never falls back to legacy content while enabled. The rollout is disabled by default. The original page is preserved in LegacyAviationPage.tsx.

Verification: four new reader/sitemap tests cover opt-in, anonymous RPC, missing publication, changed or withdrawn revisions/settings, private fields, mismatched site/route/locale and indexing. Full CMS suite: 1,232 passed, zero failures/skips. Production build including TypeScript passed. Refreshed the read-only legacy inventory: 129 source files, five sections, five media assets, desktop 1280px and mobile 390px. The mobile capture was inspected. The first development compiler returned an unexpected 404; the webpack development compiler rendered the route successfully, and production compilation passed. This does not prove the production route or enabled CMS path against a real provider.

Remaining: provider configuration, real approved content/media migration and authenticated edit/review/publish/restore/withdraw trials. No rollout switch was enabled and no remote data was changed.
