# Corporate Travel & MICE CMS integration

## Current implementation

The Pages workspace offers a Corporate Travel & MICE draft template at `/mice`. Its palette contains six source-aligned section types: hero, introduction, travel formats, destinations, planning process and enquiry. The public route supports the CMS behind `CMS_MICE_DELIVERY_ENABLED`; the flag remains disabled, retaining legacy visitor behavior. Migration 212 and the trusted workers now permit locally verified MICE publication with the existing dependency guards. No provider rollout has occurred.

`mice-content.ts` defines strict content contracts, including editorial heading emphasis/lines, image asset IDs/alt/captions/credits, focal points, local links/anchors, breadcrumbs, repeatable paragraphs/cards/steps and an optional saved form reference. Collections have bounds and unique IDs. Arbitrary HTML, remote image URLs and forged form publication flags are rejected. Local links intentionally exclude query strings and external hosts in this initial contract.

`mice-section-drafts.ts` supplies empty editable fields with presentation defaults. Empty required fields cannot be saved. `mice-section-fields.tsx` connects every section contract to controls, including collection insertion, removal and reordering. The page remains subject to ordinary composition validation, revision conflict handling and existing draft recovery.

## Evidence

All 1,376 CMS tests, TypeScript and production build pass. `node --experimental-strip-types scripts/check-cms-mice-authoring.mjs` passes with real Chromium and mocked auth/content APIs: template and restricted palette, all six forms, incomplete-save refusal, validated edits across every section, and no publication action. This is local authoring evidence only, not provider persistence or visual equivalence.

Registering the section schemas changed the shared composition source fingerprint. The Concept, Bespoke and Aviation migration inventories refresh only that dependency fingerprint and record why; their original captured views, media evidence and timestamps remain unchanged.

## Remaining integration

1. Migration review, atomic draft application and client recovery are locally implemented. Verify them against the real provider.
2. Complete source visual parity and supported-control acceptance for the shared MICE renderer.
3. Local integrated CMS-mode browser acceptance passes; verify route, public images, SEO and sitemap on the real staging provider before enabling the rollout flag.
4. Worker/publication allowlists are connected and the local review → publish → withdraw → restore lifecycle passes. Apply migration 212 only through the reviewed staging migration sequence.
5. Verify hosted form intake, notification scope, dependency withdrawal, caching and scheduling behavior.
6. Complete provider-backed edit → preview → review → publish → restore, desktop/mobile comparison and client acceptance.

This does not complete R08 or the separate bespoke-country requirements. The weighted project score is unchanged.

## Preview and structural projection

`mice-page.ts` projects a strict page envelope with its record/revision identity and SEO. It requires one hero H1 and one explicitly referenced enquiry form throughout all future visibility boundaries, verifies local anchor targets at each boundary, and rejects unsupported locales, region targeting and animation. This is structural checking only; it does not certify assets, form compatibility or publication.

`CmsMiceSection` renders the six section families using the existing MICE layout classes with editable heading emphasis, copy, image framing/credits, breadcrumb labels, lists and action links. The composition preview supplies authenticated private-image loading and the existing referenced-form preview. Testing the form only validates browser answers; it does not submit enquiries or notifications. Editor-specific heading/media styles are scoped to prevent media-picker chrome and dark heading colors from leaking into the layout.

The browser script now checks all six preview sections at 1280px and 390px, one H1, readable dark-section heading colors, and linked-form testing with no additional server writes. It captures preview screenshots for inspection. Assets and content APIs remain mocked. All 1,379 CMS tests pass; TypeScript and production build pass. Existing-content migration, full visual parity, corporate-form compatibility, trusted publication and anonymous public delivery remain pending.

## Source capture and review proposal

`capture-cms-mice-source.mjs` captures the unchanged local `/mice` page at 1280px and 390px without submitting its form. `mice-migration-inventory.json` retains six sections, exact heading runs/line breaks, paragraphs, links, breadcrumb labels, image alt text/focal points/credit, metadata tags and seven corporate form fields. Source files and both original images are SHA-256 bound. Both views have one H1 and no document overflow; captured content/form controls match across widths.

`planMiceMigration` validates a complete source proof and explicit source-hash-to-asset bindings. Unknown/stale bindings, duplicate source mappings and reuse of one processed asset for different source images are rejected. The two uses of the India image retain their distinct alt text while sharing its asset binding. Unmapped images get clearly marked review-only IDs. A supplied form UUID is a proposed reference, never proof of eligibility.

The corporate form already has a proposal in the existing Contact form migration. MICE checks that the shared form component hash, field identities, required flags, default choices, option labels and submit label still match that evidence. It returns the retained legacy definition for review rather than inventing a separate intake mapping. The introductory note above the form is now independently editable and rendered in preview.

The planner always returns `readyToApply: false`. It preserves captured social/indexing metadata as evidence but requires explicit reconciliation before publishing; no social image is inferred. No draft, form, lead or publication was written. All 1,381 CMS tests, TypeScript and production build pass. The browser authoring script verifies that the new form-note field survives saving and appears in preview. Real form compatibility/lead mapping, verified media, authorized migration application and public delivery remain pending.

## Corporate form compatibility

`mice-form-resolution.ts` validates the seven legacy corporate field identities and types, their required/optional state, unconditional visibility, explicit destination default and enquiry-purpose consent. Labels and other copy remain editable. Renaming core fields or changing their semantics requires an explicit mapping migration. General form publication checks also reject unsupported attachments and notification routes; inbox-only operation is reported as a warning.

The published-form resolver checks same-site IDs, English locale and a valid published revision for every configured current/future form dependency, returning only revision bindings after all forms pass. It accepts a trusted published-source callback; the trusted worker and anonymous page runtime still need wiring. Draft preview is separate: `MiceFormPreview` loads through the editor's existing authority, displays compatibility findings, blocks incompatible testing and supports refresh after corrections. No preview submits data.

Local intake integration confirms the corporate form passes company, destination option ID, brief, versioned consent and `/mice` source attribution to the persistence adapter, and rejects unaccepted required consent before persistence. This does not prove hosted database storage, email notification, or preservation of the legacy combined-notes presentation.

All 1,385 CMS tests, TypeScript and production build pass. Chromium acceptance tests a compatible corporate form without a server write, removes its required phone field and observes testing blocked, then restores the form and confirms refresh recovery. Provider verification, migration apply, publication checks and public route delivery remain pending.

## Authenticated migration media review

`POST /api/cms/migrations/mice` now accepts read-only reviews with an exact target/revision and the two original image mappings. New-page review requires creation access; replacement review requires an editable English `/mice` record at the expected revision. Cross-origin requests and extra fields are rejected; review requests cannot supply evidence. Apply/status support is described below. Responses are private/no-store and contain the current draft, proposal, metadata, evidence and a digest binding the review to its target and media state. `applyAvailable` is true only when both images and the selected published form qualify.

MICE reuses `review_contact_migration_media`, whose existing database policy checks image-1 processing, original SHA-256, same-site processed storage path, media revision/hash, approved nonempty rights evidence, expiry and archive status. The TypeScript verifier binds returned evidence to the exact requested assets and rejects contradictory available-state claims. Media-only review reuses existing SQL; selected-form review now requires migration 206. No provider deployment has been performed.

Local database/API integration verifies valid evidence, revoked/expired rights, archive, wrong original digest, wrong storage path, missing assets, cross-website denial and revoked membership. The review never creates a revision. These are local PostgreSQL-compatible checks, not actual provider/storage acceptance. The selected form now receives published-revision compatibility evidence through migration 206. The client review exists; Apply and its recovery interface remain pending.

After the media-review integration, all 1,389 CMS tests, TypeScript and production build pass. No external provider writes or publication occurred.

## Client migration review controls

The Pages workspace now exposes **Review existing MICE content**. Editors can map the two original photographs through the existing media picker, optionally select a corporate form, and choose a new or selected MICE draft as the review target. Review is disabled until distinct images are selected. The authenticated response echoes its selection; the panel checks target/revision/form/image identity, validates the proposed composition and recomputes verification from the returned evidence before displaying it. Changing selections or the target invalidates the old review, and obsolete/unmounted responses are ignored.

The panel displays current media verification, unresolved findings, source-content preview and proposed SEO. Review itself does not save or publish. A verified review now exposes the draft-only Apply control described below. An image passing review is not a permanent grant: migration 206 revalidates images and the published corporate form under locks. The Apply API and client recovery still need to use this transaction.

`check-cms-mice-migration-review.mjs` passes with real Chromium and the real review handler, with mocked auth/catalogue/database calls: image selection, six-section source preview, unavailable media, selection invalidation and no write actions. All 1,389 CMS tests, TypeScript and production build pass. Authorized migration apply and its recovery workflow remain pending.

## Atomic draft application and published-form evidence

Migration `206-mice-migration.sql` adds an authenticated, draft-only transaction and actor/site-bound receipt lookup. It validates the exact manifest, target `/mice` and expected revision, matches every image reference to the two reviewed bindings, locks uploads/media and rechecks original hashes, processed storage ownership, revisions, readiness and current rights. It locks the selected form record, checks current view authority, requires the reviewed published English revision and validates the seven corporate field mappings, destination default and enquiry consent. Unsupported files or notification routes fail compatibility. The payload must reference that form in exactly one enquiry section.

The compatibility helper supplements the existing generic form publication validator; it is not a replacement for full form schema validation. The review RPC returns only published identity and availability, never private definitions or routing. The HTTP review includes this evidence in its digest, rejects mismatched or contradictory responses, and the panel displays whether the published form qualifies. An unpublished or incompatible form does not qualify even when its editor draft is valid.

Failed application rolls back both draft and receipt. Exact retries return the original result after current authorization checks, including after later draft edits or form withdrawal; changed requests cannot reuse the key. No publication pointer is changed. Local SQL tests cover unavailable/changed images, changed/unpublished/incompatible forms, mismatched payload references, stale target revisions, cross-site/caller denial, receipt privacy and retry behavior. These tests use local PostgreSQL-compatible storage and synthetic published pointers, not hosted concurrency or real publication acceptance.

The apply/status API and durable client Apply/recovery controls are now connected locally. Migration 206 has not been deployed. Trusted MICE publication and anonymous delivery remain separate pending work; R08 and the overall weighted score are unchanged.

Validation for this batch: all 1,392 CMS tests, TypeScript and production build pass. The Chromium review script passes with the real HTTP handler and mocked database, including compatible published-form evidence and withdrawal. No provider migration, deployment or public-content change was performed.

## Apply and receipt-status API

The migration endpoint accepts strict `apply` and `status` commands alongside review. Apply requires the original review digest, image evidence, compatible published-form evidence and an immutable request key. It reconstructs the captured page on the server, checks that evidence belongs to the selected assets/form and matches the digest, rechecks current target authority/revision and current evidence, then invokes migration 206. Browser-supplied page payloads and additional fields are rejected. Database locks remain the final protection against changes between HTTP checks and saving.

For completed retries, the API checks the actor-bound receipt and reenters the exact transaction for current write authorization and immutable-manifest enforcement. It returns the original record/revision even after later edits. Status returns `unconfirmed` for no visible receipt, never a claim that an in-flight request failed. Malformed, mismatched or inconsistent results fail closed.

Local HTTP-to-database integration deliberately loses the application response after the save, obtains its receipt and retries: exactly one additional revision and receipt exist, and the published pointer stays unchanged. Unit checks cover forged/changed/withdrawn evidence, request-key mismatch, private headers and malformed receipt/result identity. The browser now provides durable Apply/retry controls as described below. No hosted migration or deployment has occurred.

Apply/status batch verification: all 1,395 CMS tests, TypeScript, production build and the Chromium migration-review script pass. The browser test uses mocked database calls; provider-backed application and client recovery acceptance remain pending.

## Client Apply and durable recovery

The panel verifies the full server review against the captured proposal, metadata, selection, source digest, image evidence and published form revision before enabling Apply. An explicit draft-only acknowledgement is required. Changing selections clears the review and acknowledgement. Other page operations are held while a review or save is pending.

Before the first request, the client stores bounded recovery identifiers/evidence under an account-and-site key; page copy and credentials are not stored. Web Locks serialize MICE save/recovery operations across tabs. A stored request is reused, and a stale tab retains its original in-memory request even after another tab clears storage. Missing Web Locks or failed storage access blocks a new write.

Refresh restores Check result and Retry same request controls. Unconfirmed status preserves recovery. A valid success receipt is insufficient to clear recovery: the saved record and page list must load successfully first. Reload failure retains the same request for recovery. The panel does not offer an unsafe discard of an uncertain save.

Browser acceptance uses the real handler and mocked database: verified review, disabled Apply before acknowledgement, lost response after save, refresh, failed record reload, exact retry and a stale second-tab retry after storage cleanup. Exactly one fixture draft is saved. This is local recovery evidence, not hosted concurrency acceptance.

Validation: client contract tests, TypeScript, production build and Chromium pass. The full run reports 1,394 passing / 4 failing out of 1,398 tests. The four failures are source-inventory mismatches for Concept, Bespoke Safaris, Homepage and Aviation after `lib/data.ts` and `content/site-content.json` changed outside this batch; these source changes were preserved and capture hashes were not overwritten. Their evidence needs revalidation before those migrations are accepted. MICE trusted publication, anonymous delivery, hosted rollout and client acceptance remain pending.

Source-capture follow-up: the four inventory failures above are resolved by fresh desktop/mobile captures against a rebuilt local site. Captured content remains equivalent (Concept has generated CSS class-name differences only), and source hashes include the new shared MICE schema dependency. See `source-capture-revalidation.json`. All 1,398 CMS tests now pass; public delivery and provider acceptance remain pending.

## Publication validation and trusted evidence snapshot

`mice-page-validation.ts` now evaluates a complete saved English `/mice` revision. Its evidence schema binds website, record and revision; exact image/form sets reject missing, duplicate or unrelated evidence. It checks structural projection and SEO, current image availability, every configured current/future corporate form, and local paths/anchors across all visibility boundaries. A published page path does not imply that an arbitrary cross-page anchor exists. Same-page anchors are checked against the scheduled sections.

Migration 207 adds `get_mice_publication_evidence`, available only to the service role. It reads only the current matching page revision, gathers media through the shared rights policy, resolves all visible-configured enquiry forms through their same-site published pointers and compatibility guard, and obtains verified local paths. Returned form evidence contains identities and availability, never private definitions or notification configuration. Stale revisions, foreign websites and unsupported targets return no snapshot.

Unit checks cover wrong identity/evidence, form withdrawal and future replacements, image coverage/rights and scheduled links. Local SQL-to-validator integration accepts eligible evidence and rejects form withdrawal; editor/anonymous execution is denied. This is a pure content check plus a trusted reader, not publication authorization. The current shared pipeline still rejects MICE publication; connecting the worker, publish-time dependency locks/guards, invalidation and anonymous renderer remains necessary. No provider migration was run.

Validation for the publication-evidence batch: all 1,403 CMS tests and TypeScript pass. Offline migration planning validates the 207-file sequence against a synthetic empty ledger; it executes no SQL and does not establish a provider’s actual migration history.

## Trusted worker integration

Migration 208 includes the MICE evidence snapshot in `get_validation_input`, preserving all existing content-type evidence. Direct and fenced queue workers share `evaluateValidationInput`: MICE structural, link, media and published-form findings are now recorded alongside the existing deployment publication gate. Both paths still produce an invalid `composition-5` receipt with `publication_not_ready` until publish-time checks and public delivery are finished. The separate `mice-1` content-check identifier does not override database policy.

Local database integration reads the actual current revision/evidence and records the blocked result. Worker tests cover eligible evidence, withdrawn forms, missing/foreign evidence and malformed transport data. Malformed data cannot produce a valid receipt; queue processing requests retry with its existing lease token. Current validation: all 1,405 CMS tests and TypeScript pass. No provider migrations or public-content changes were performed.

## Publish-time dependency guard

Migration 209 adds a private dependency assertion and a record-publication trigger. It requires an English MICE page with supported sections/controls, locks all referenced form and local-destination records in deterministic ID order, locks linked-page media, and then rechecks same-site published corporate form compatibility and local destinations. Future configured forms are included. Existing shared media checks remain responsible for the page’s own media. Local and same-page anchor scheduling remains the trusted structural validator’s responsibility; arbitrary external URLs and cross-page anchors are rejected.

Local database tests cover foreign/missing/unpublished forms, a newly published form that removes the required phone mapping, missing future dependencies, invalid destinations and unsupported controls. The helper is not executable by editors. A valid dependency check still cannot bypass the reserved-route block: the published pointer remains null. This guard does not yet provide reverse invalidation or anonymous delivery after later dependency withdrawal; those remain required before release.

All 1,405 CMS tests pass, with the expanded changed-form guard case also passing its targeted database run. Offline migration planning validates the 209-file sequence against a synthetic empty ledger. No provider migrations were executed.

## Anonymous database reader

Migration 210 adds an allowlisted current-content projection and `get_public_mice`. The reader requires a matching published page and valid deployment-policy receipt, checks current image rights, resolves the currently visible corporate form through its same-site published revision and compatibility guard, and rechecks local destinations/anchors. Missing or withdrawn dependencies return no page. Later editor drafts never replace the published revision in this response.

The projection removes internal fields, editorial labels and private form details. Future/inactive sections are omitted. Scheduling bounds are removed from the projected current snapshot so the renderer cannot forecast missing future sections from private source content; each future request must obtain a fresh projection. Same-page anchors must exist in that snapshot. The application loader must use fresh reads and the existing site-wide delivery invalidation.

Existing form publish/unpublish delivery jobs invalidate the root layout through `app/api/cms/workers/delivery/route.ts`; a second MICE-specific cache queue is unnecessary. This does not prove hosted cache behavior. The reader independently checks dependencies after invalidation, and the forthcoming application loader must not cache stale eligibility.

Local database tests use a synthetic published pointer/receipt solely to isolate this reader (the real publication gate remains closed). Anonymous output excludes internal markers and future copy, remains on the published revision after later edits, and becomes unavailable for wrong site/locale, withdrawn or incompatible forms, revoked/archived media or invalid validation. No provider migration or application rollout has occurred. Loader/renderer, public image integration, metadata/sitemap and end-to-end release acceptance remain pending.

Reader batch validation: all 1,405 CMS tests pass, including expanded anonymous-reader cases. Offline planning validates the 210-file migration sequence against a synthetic ledger; it does not execute provider SQL.

## Public application loader and renderer

`published-mice.ts` is an opt-in server loader using `CMS_MICE_DELIVERY_ENABLED` (documented false by default). It requires public delivery and complete corporate-intake configuration before network access. Page/form/SEO reads use no-store transport, exact same-site identities and published revisions only. It validates corporate field compatibility, returns form bindings without definitions or secrets, and rereads page/form/SEO identities to reject changes during loading. An absent page returns no content; a missing dependency or transport/configuration failure does not substitute a draft or legacy fallback.

`CmsMicePage` reuses the six source-aligned sections, public image URLs and `PublicEnquiryForm` pinned to the resolved corporate form revision/locale. It rejects mismatched form bindings. This wrapper is not yet wired to `/mice`; the existing live route is unchanged, public MICE image authorization remains pending, and the disabled flag must stay off until integration/acceptance. The shared section renderer already has preview browser evidence; the public wrapper still needs integrated browser acceptance.

Loader tests cover disabled/missing configuration, safe credential use and returned bindings, wrong identities, withdrawn/incompatible forms, missing SEO, transport errors, and page/form/SEO changes between reads. These are mocked transport tests, not provider acceptance.

Loader/renderer batch validation: all 1,409 CMS tests, TypeScript and production build pass. Public route/browser/provider acceptance remains pending.

## Route, image and sitemap integration

Migration 211 authorizes MICE images only through `get_public_mice` and excludes `/mice` from the generic raw-page media fallback. Generic `get_public_page` access also delegates to the MICE projection. Local anonymous tests verify that current images work, future-only images stay private, and page/image reads become unavailable when the corporate form, image rights or validation becomes ineligible. Existing unrelated content-type rules are retained.

`app/mice/page.tsx` now selects the CMS loader/renderer only when `CMS_MICE_DELIVERY_ENABLED=true`. Its default is the byte-identical legacy implementation moved to `LegacyMicePage.tsx`. CMS metadata resolves published SEO defaults; missing CMS content produces noindex/not-found rather than legacy fallback. Sitemap uses the published MICE page only in CMS mode and respects noindex/exclusion. The flag remains false in `.env.example`, and the database publication gate remains closed.

Fresh desktop/mobile captures confirm the flag-off route’s content, metadata, original media and corporate form controls match the retained evidence exactly. MICE capture evidence now includes both wrapper and legacy source. Contact’s shared-form inventory was updated only for that verified source relocation, retaining its original capture. Scripts capture both files on subsequent runs. Enabled-mode integrated browser acceptance, provider rollout and client acceptance remain pending; no deployment was performed.

Route/image batch validation: all 1,410 CMS tests, TypeScript and the final production build pass. Offline migration planning validates the 211-file sequence against a synthetic ledger. Chromium capture verifies default legacy behavior; enabled CMS browser/provider acceptance is still outstanding.

## Enabled-route browser acceptance

The local-only provider shim (`scripts/cms-fixtures/mice-public-provider.mjs`) exercises the built Next route, image endpoint and public form endpoint without external provider access or enquiry submissions. `scripts/check-cms-mice-public.mjs` passes at 1280px and 390px: six sections, one H1, decoded images, canonical metadata, no document overflow, and readable full-width enquiry controls with separate labels and visible focus. MICE-specific public form styling is scoped to `.cms-mice-page`; shared form behavior and other page families are unchanged. Desktop/mobile screenshots were visually inspected, including the mobile enquiry controls.

Withdrawal of the page, corporate form or image rights produces route/image 404s. A changed browser form revision displays the unavailable state and removes the submit control. No browser page errors or POST requests occurred. The fixture challenge does not issue a token; actual spam verification and submission require provider acceptance. This verifies local application integration, not hosted database/storage/cache behavior, accessibility certification or client acceptance.

All 1,410 CMS tests and the production build (including TypeScript) pass. The MICE rollout flag and publication gate remain disabled. Next release work is to reconcile the remaining publication-policy gates, then verify edit → approve → publish → withdraw/restore with real staging dependencies and obtain client acceptance.

## Local publication lifecycle

Migration 212 adds `/mice` to the reserved-route exemption while retaining `cms_mice_page_release` and all existing approval, validation, media and dependency triggers. The shared trusted worker evaluator replaces only the generic `publication_not_ready` finding for this exact page type/path with the full revision-bound MICE checks. Missing/foreign evidence, invalid structure, unavailable forms and generic media failures remain blocking. The standalone advisory validator remains conservative because it does not receive trusted MICE evidence.

Local database acceptance uses actual worker evidence/receipts and separate editor, reviewer and publisher identities, without disabling triggers: approved publication exposes the page/images; an editor cannot publish; withdrawing the form after validation blocks publication without moving the public pointer; published route changes are rejected; unpublishing removes page/image access; restoring the original content creates a new draft that passes validation, approval and republication. Separate synthetic-reader tests still isolate defensive projection and are not counted as publication evidence.

Validation: all 1,411 CMS tests pass with zero skipped, production build (including TypeScript) passes, and the offline migration plan validates the 212-file sequence against a synthetic empty ledger. No provider SQL was executed. The staging preflight still reports all nine base settings missing. Hosted concurrency, storage/cache behavior, real challenge/submission, schedules and client acceptance remain outstanding.

## CMS review and publication controls

The Pages workspace now recognizes English `/mice` records as supported and exposes trusted-check requests, review actions, publication scheduling and the existing revision-bound publication/withdrawal confirmation. Labels identify the MICE page and its rollout. Other locales remain unsupported, and controls continue to respect permissions and unsaved/busy state.

The extended `scripts/check-cms-mice-authoring.mjs` browser check passes against the production build with mocked authentication/content APIs: six-section editing and responsive preview, saved draft validation, trusted-check request, submit, approve, cancel without publication, explicit publish confirmation, explicit withdrawal and permission/locale restrictions. This complements the real local SQL lifecycle tests; it does not establish a provider-backed browser workflow. Production build including TypeScript passes.
