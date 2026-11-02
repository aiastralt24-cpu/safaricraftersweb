# Tanzania country-page CMS

## Current implementation

Tanzania's English `/destinations/tanzania` CMS workflow is implemented and locally verified from migration through publication, withdrawal and restoration. Hosted staging and client acceptance remain unverified. `CMS_TANZANIA_DELIVERY_ENABLED=false` preserves the existing visitor page by default; no provider migration, deployment or rollout activation has been performed.

The content contract has nine groups: hero, facts, introduction, places, gallery, itineraries, FAQ, planner and related countries, plus SEO. It retains source copy, Ndutu's caption, image credits, the two-line FAQ heading and per-action planner context. The blank Tanzania template and country-specific editors support heading emphasis, images, ordered rows, character limits and read-only access. Previews at desktop/tablet/mobile sizes show private images, FAQ/gallery interactions and non-submitting planner context dialogs.

Width, spacing, text alignment and optional fade/reveal motion are supported. Background palettes and desktop/mobile image ordering are supported with explicit Original layout inheritance. The hero remains image-led, and image ordering applies only to places. Preview place cards retain a static layout; the public renderer retains the country's source CSS behavior. Itinerary descriptions remain in the content model but are omitted from card faces, matching the existing source renderer.

## Migration and recovery

`scripts/capture-cms-tanzania-source.mjs` captures both source viewports, nine sections, twelve unique original images and 48 interaction states: twenty planner dialogs, eighteen gallery views and ten FAQs. It hashes source dependencies and original media, records SEO/structured data, framing, text and links, blocks non-GET/HEAD requests and never submits an enquiry. `tanzania-source-inventory.json` is the retained evidence; hashes do not establish media rights.

`planTanzaniaMigration` requires the exact proof and rejects missing/stale/duplicate entries and conflicting image bindings. It preserves captured copy, gallery ordering, captions, credits and SEO. Its artifact remains review-only; it cannot approve assets or save content.

**Review existing Tanzania content** in the Pages workspace connects that proposal to authenticated review. The editor maps all twelve originals to processed library assets and acknowledges the proposed copy/images/SEO. The server checks caller/site/record scope, current revision, original bytes, processing and current rights. The browser independently verifies proposal and evidence digests.

Migration 282 atomically saves a draft with an account-specific immutable receipt. It locks and rechecks current authority, revision and media evidence. Revoked/expired rights, archived images, changed source/storage/revision and unreviewed references reject the whole operation. Recovery uses account/site-scoped storage and Web Locks; failed storage prevents sending an untracked save. Lost responses, refreshes, failed record loads and retries from two tabs retain one request and do not create duplicate revisions or overwrite later work.

## Publication and public delivery

`projectTanzaniaPage` checks saved identity, composition, SEO and exactly one hero H1 throughout schedules. Trusted validation requires website/record/revision-bound image and link evidence, includes hidden media and verifies future self-anchor availability. Migration 283 adds service-only evidence without dropping existing worker fields. Direct and queued workers retain generic checks and use the existing `composition-5` policy.

Migration 284 installs the publication trigger and locked dependency checks. Migration 285 projects only approved fields and currently visible content, removing internal notes, future copy, hidden sections and editorial labels. Public reads require an eligible published revision, current-policy validation, available images and valid links. Migrations 286–287 connect public image access and the release guard while preserving existing page families and localized URL protections.

The normal local workflow is save → trusted validation → submit → approve → confirmed publish. It is tested with every trigger enabled. Revoking rights after validation prevents publication; revocation after publication removes public page/image eligibility. Withdrawal removes the page and images; restore creates a new draft requiring fresh validation/review before republishing.

`readPublishedTanzania` uses anonymous, no-store reads, verifies site/language/identity and rechecks page/SEO consistency. `CmsTanzaniaPage` renders the approved content and public image endpoint, FAQ/breadcrumb structured data, gallery and real planner actions with configured labels/context. Metadata and sitemap use the published SEO policy. With rollout enabled, missing/withdrawn content is unavailable; there is no legacy or draft fallback. Rollout also requires `CMS_PUBLIC_DELIVERY_ENABLED` and the normal provider configuration.

## Verification evidence

All 1,687 CMS tests pass with zero skips; production build, TypeScript and offline migration planning through 289 pass. The SQL tests exercise the real handler/database flow and dependency gates, including withdrawal/restore; browser provider responses are synthetic and do not prove hosted behavior.

- `/private/tmp/cms-tanzania-delivery-{full,db,build,types,migrations}.log`
- `/private/tmp/cms-tanzania-delivery-editor.log`: desktop/mobile editing, three preview sizes, confirmation controls and permission/language restrictions.
- `/private/tmp/cms-tanzania-delivery-browser.log`: actual Next visitor route and media endpoint at 1280/390, source hero framing, captions, SEO, FAQ, gallery, real planner context without submissions, sitemap inclusion/noindex exclusion, withdrawal and revoked-rights refusal.
- `/private/tmp/cms-tanzania-{import,validation,guards}-*.log`: recovery, dependency validation and privacy tests from preceding batches.

Fresh Kenya and Tanzania source captures exactly matched retained views, interaction states and media before refreshing dependency hashes for the visitor integration. Other existing country pages were not replaced.

## Motion controls

Tanzania sections support `none`, `fade` and `reveal` in the editor, trusted projection, database guard and public snapshot (migration 288). The public renderer and optional preview play/replay/stop controls share the existing iframe-aware animation engine. Server content is initially visible; unsupported browsers and no-JavaScript clients keep visible content. Reduced-motion cancels animations, keyboard focus reveals the relevant content immediately, and cleanup removes observers/animations. Hero imagery is excluded from entrance motion to retain its source crop.

Desktop/mobile authoring checks cover preview playback, replay under reduced motion and focus access without extra saves; Kenya's existing preview regression passes. Source captures match retained Kenya/Tanzania content, states and media before refreshing dependency hashes. The actual Next fixture passes public fade/reveal at both viewport sizes, focus access, reduced-motion cancellation and visible content without JavaScript (`/private/tmp/cms-tanzania-motion-browser.log`); other evidence is in `/private/tmp/cms-tanzania-motion-{tests,db,full,build,types,migrations,editor,kenya}.log`. Rollout remains disabled by default.

## Background and image-order controls

Tanzania now supports explicit paper/white/forest/ink palettes and desktop start/end plus mobile text-first/media-first ordering on places. `tanzaniaOverrides` distinguishes an intentional choice from inherited source styling, including explicit choices equal to historical defaults. Original layout clears the override and restores source behavior. The shared country editor uses Tanzania's own flags; foreign flags or unsupported hero/media combinations fail validation.

The renderer orders the entire captioned figure and uses the shared contrast-aware palette rules. Migration 289 keeps database acceptance and the allowlisted public projection consistent with the editor/TypeScript rules. It preserves supported overrides without exposing unknown fields.

All 1,687 CMS tests, build, TypeScript and offline planning through 289 pass. SQL tests cover all palette/order combinations and invalid flags. Desktop/mobile editor checks verify explicit default selections, save/reload and previews; Kenya's existing controls pass regression. Actual visitor checks verify four palettes, foreground colors, computed order and figure/text bounding-box positions across both widths, plus existing motion, form-dialog, gallery, SEO/sitemap and withdrawal checks. Source captures for Kenya, Tanzania, Concept, Guided Safaris and Private Aviation exactly match retained non-provenance evidence before dependency refresh. Evidence: `/private/tmp/cms-tanzania-layout-{tests,db,full,build,types,migrations,editor,kenya,browser}.log`. No hosted deployment or rollout activation occurred.

## Remaining work

1. Complete independent visual/interaction fidelity review and client acceptance of the editing controls.
2. Run migration against actual staged assets and accounts; verify provider persistence, rights and permissions.
3. Verify real enquiry submission/routing, publication jobs, cache behavior and withdrawal/restore on the staging host.
4. Complete load/accessibility/security checks, backup recovery and independent client editing/UAT.
5. Obtain release acceptance before enabling the visitor rollout; continue all other country families in the retained PRD.
