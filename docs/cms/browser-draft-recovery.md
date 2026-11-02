# Browser-close draft recovery

## Storage contract implemented

`draft-checkpoints.ts` defines opt-in local checkpoints scoped by account, website, existing record, content type and locale. Each editing tab uses a distinct checkpoint ID and retains the original base revision/payload alongside its draft. Writes and removals use Web Locks. A scope allows at most twenty checkpoints, each bounded to two million serialized characters; browser quota failures are reported rather than claiming recovery was saved.

Base identity cannot be rewritten. Newer timestamps cannot be replaced by older writes. Removal requires the exact reviewed checkpoint, preserving edits that changed since review. Corrupt entries fail closed and remain available for support. There is no automatic expiry or server write. A server revision change returns a comparison requirement, never permission to overwrite the current revision.

These are private draft contents stored on the device, not encrypted storage or a replacement for server backups. The UI must explicitly explain and enable local persistence, provide discovery/removal controls and document shared-device/sign-out behavior. Account scoping prevents accidental UI mixing; it is not isolation from scripts running on the same origin or a person with browser-profile access. Never store authentication tokens in checkpoints.

## Verification and remaining integration

Four focused tests and TypeScript pass: reload round-trip, account/site/tab separation, changed-revision comparison, denied permissions, missing opt-in/locks, failed storage confirmation, size limits, immutable bases, stale deletion and corrupt-entry preservation.

Connected editors: forms, menus, testimonials, specialists, documents, global settings, destinations, journal articles, photo expeditions, pages, homepage and journeys. Each validates its schema and rechecks current access before restore. Copies persist after save/sign-out until explicit removal. All primary editor types now have first-save recovery as described below. Remaining work includes lifecycle acceptance and hosted access verification. Concurrent-tab browser evidence is recorded below. Normal Chromium process restart is verified for forms below.

## Forms integration

Saved forms now offer an explicit per-session opt-in and Save browser recovery copy button. Manual copying is available alongside the optional automatic capture described below. The panel explains private local content, persistence after sign-out/server save, and explicit removal. It lists account/record-scoped copies and removes only the exact reviewed version. New records require an initial server save.

Restore re-fetches the record, checks current edit permission/type/path/locale, validates both checkpoint payloads and the server payload, and disables server autosave. Matching revisions restore only the local editor. Newer server revisions open whole-field comparison, retaining consent text/version pairs. Existing server save checks remain authoritative. Restoration and removal do not write content to the server.

Production-build Chromium with mocked auth/API passed checkpoint opt-in/write, reload/discovery, same-revision local restore, changed-server comparison, independent server title retention, autosave remaining off and exact-copy removal. Targeted checkpoint/conflict tests, TypeScript and production build pass. Broader editor integration and hosted access acceptance remain pending.

## Browser process restart evidence

The form recovery workflow passed with a real persistent Chromium profile: save a local checkpoint, close the browser process, start a new browser process against the same profile, authenticate through the fixture and discover/restore the copy. The local-copy opt-in remained off after restart. Restoration did not issue a server save or enable server autosave. A subsequent changed-server revision triggered comparison, and explicit removal cleared the stored copy. The temporary browser profile was removed after testing.

This verifies a normal browser shutdown/restart on the tested Chromium build, not crash/power-loss durability, private browsing, storage eviction, another device, or other browser engines. Auth/API responses remained mocked. Script: `/private/tmp/cms-form-reopen-ui.mjs`. No runtime page errors occurred.

## Optional automatic browser copies

Forms now offer a separate per-session automatic-copy option after local recovery is enabled. It updates the tab-owned checkpoint after a one-second quiet interval, only for a valid dirty draft while the editor is available. This is browser storage, not server autosave. The UI reports the last confirmed copy time and asks users to wait for confirmation before closing. Invalid input leaves the earlier copy intact; storage errors disable automatic mode. Restore and removal stop automatic mode so they do not immediately recreate a removed copy. Both preferences reset when the panel remounts for a new revision or browser session.

A real persistent Chromium profile test passed automatic creation, invalid-field pause with unchanged stored bytes, injected quota failure disabling automatic mode and preserving the earlier copy, full browser process shutdown/reopen, restoration/comparison and removal. Auth/API responses remained mocked. Targeted checkpoint/conflict tests, TypeScript and production build pass. Unsaved edits inside the debounce interval, invalid drafts and storage failures are not guaranteed recoverable; the UI states these limits.

## Menus integration

Menus now use the same explicit and optional automatic browser-copy panel, keyed by authenticated account and saved revision. Restoration re-fetches the current menu, validates type/path/locale/edit access and both checkpoint payloads, and disables server autosave. A matching revision restores the local tree; newer revisions open whole-tree comparison.

Production-build Chromium with mocked auth/API verified automatic checkpointing, reload discovery, parent/child tree restoration, changed-server comparison, independent title retention and explicit removal without server writes. Targeted checkpoint/menu-conflict tests, TypeScript and production build pass. Other editors and hosted acceptance remain pending.

## Testimonials and specialists

Both editors now reuse the optional automatic browser-copy controls, scoped to the signed-in account, website and record. Restore re-fetches and validates identity, locale, current editing permission and editor schemas, disables server autosave, and compares changed revisions using the established whole-field conflict rules. Copies remain local until an explicit server save.

Production-build Chromium with mocked auth/API passed automatic checkpointing, reload discovery/restoration, concurrent name choices, independent remote role retention and no server writes for both modules. Targeted checkpoint/conflict tests, TypeScript and production build pass. Remaining editor integrations and hosted acceptance are still pending.

## Documents integration

Saved documents now offer the shared manual and optional automatic browser copies. Recovery re-fetches the current document and checks record identity, editing permission and language across saved baseline, recovered draft and current server payload. It preserves file references, disables server autosave and opens comparison when revisions differ. Pending file-rights edits block recovery; file eligibility remains subject to existing publication checks. Region values are restored as normalized lines.

Production-build Chromium with mocked auth/API passed automatic copying, reload discovery/restoration, overlapping title comparison and independent remote description retention, with no server writes or runtime page errors. TypeScript, production build and six focused checkpoint/document-conflict tests pass. This is local workflow evidence, not hosted-provider acceptance.

## Global settings integration

Settings use the same opt-in manual and automatic browser-copy panel for existing records. Recovery re-fetches the current settings, checks identity and editing access, validates baseline/recovered/server payloads, and refreshes configuration permission. Every successful restoration clears the previous impact review and acknowledgement. Newer revisions open whole-group comparison; applying choices also requires a new impact review before saving. No server autosave is introduced.

Production-build Chromium with mocked auth/API passed automatic checkpointing, reload discovery/restoration, invalidation of an acknowledged impact review, refusal after editing access was revoked, whole-brand-group comparison, independent remote contact retention and renewed acknowledgement before save. No server saves or runtime page errors occurred. TypeScript, production build and six targeted checkpoint/settings-conflict tests pass. Hosted permission and client acceptance remain pending.

## Destinations integration

Saved destinations now support manual and optional automatic browser copies. Recovery re-fetches identity, current edit access, locale and route; validates recovered, baseline and current destination payloads; and refuses copies whose slug does not match the current route. Imports and migrations block copying/restoration while pending. Restoration disables server autosave and opens existing whole-field comparison for changed revisions.

Production-build Chromium with mocked auth/API passed automatic copy, reload discovery/restoration, overlapping title comparison, independent remote description retention and no server writes or runtime page errors. TypeScript, production build and seven targeted checkpoint/destination-conflict tests pass. Hosted access, concurrent editors and client acceptance remain pending.

## Journal integration

Saved journal articles now support manual and optional automatic browser copies. Restore re-fetches record identity, current edit permission, locale and route, validates all three payloads and requires their slugs to match the current URL. Pending imports or migrations block recovery. Restoration disables server autosave; newer revisions use whole-field comparison, retaining article body blocks as a group.

Production-build Chromium with mocked auth/API passed automatic copy, reload discovery/restoration, local article-body retention, overlapping title comparison and independent remote summary retention without server writes or runtime page errors. TypeScript, production build and seven targeted checkpoint/journal-conflict tests pass. Hosted access and client acceptance remain pending.

## Photography expeditions integration

Saved expeditions now support manual and optional automatic browser copies. Restore checks current identity, edit access, locale and URL, validates baseline/recovered/server payloads, and ignores responses after the editor generation changes. Imports and migrations block recovery. Restoration disables server autosave and compares newer revisions through existing whole-field rules.

Production-build Chromium with mocked auth/API passed automatic copying, reload discovery/restoration, itinerary-copy retention, rejection after a server route change, overlapping title comparison and independent remote description retention. No server saves or runtime page errors occurred. TypeScript, production build and seven targeted checkpoint/expedition-conflict tests pass. Hosted verification and client acceptance remain pending.

## Pages and homepage integration

The shared page/homepage editor now supports manual and optional automatic browser copies for saved records. Checkpoints capture title, fixed path, composition, SEO and Concept navigation in the editor's complete draft shape. Recovery validates that shape, composition and SEO, refuses route changes or navigation on an unrelated page, and re-fetches current record identity, locale and editing access. Successful restoration disables server autosave. Newer revisions use explicit whole-field comparison; unrelated current payload fields remain on the server record used for subsequent saves. Migration/import activity and invalid stored content block copying.

Production-build Chromium with mocked auth/API passed automatic copying, reload discovery/restoration, overlapping title choices, independent remote section retention and fixed paths for both ordinary pages and homepage, with no server saves or runtime page errors. TypeScript, production build and six targeted checkpoint/page-recovery tests pass. Concept-specific browser acceptance subsequently passed as recorded below. New records and hosted verification remain pending.

## Journeys integration and regression checkpoint

Saved journeys now support manual and optional automatic browser copies. Copies retain the complete merged payload, including structured/unseen fields, alongside the original baseline. Recovery checks current identity, edit permission, locale, URL, title and collection IDs/positions; invalid drafts preserve the previous usable copy. It ignores responses after the journey workspace scope changes, disables server autosave and compares newer revisions using whole-field rules.

Production-build Chromium with mocked auth/API passed automatic copying, reload discovery/restoration, overlapping title comparison and independent remote summary retention without writes during recovery. A subsequent explicit save used the latest revision and preserved structured introduction and unseen nested fields. No runtime page errors occurred. TypeScript and the final production build pass. The CMS regression suite passed 1,355 tests before the final copy-validity guard; that guard uses the tested recovery parser and was then checked with TypeScript, build and the browser workflow.

All existing primary content editors now have a local browser-copy integration. This does not close R13: new-record recovery and real hosted permissions/concurrency remain. These tests do not prove provider staging or client readiness.

## Concurrent tabs and Concept navigation acceptance

Two real Chromium tabs in one browser context created distinct copies for the same account/site/record. Both copies were discoverable. After one tab reviewed the list and the other updated its copy, deleting the stale reviewed entry was refused and the newer draft remained intact. Refreshing the list permitted removal of the reviewed latest entry while preserving the other copy. No server writes or runtime page errors occurred. This verifies browser-storage coordination, not provider-side concurrent publication.

The Concept page passed automatic copying, reload discovery/restoration, explicit choices between recovered and newer Concept navigation, independent remote page-section retention and fixed-route preservation. Restoring the recovered navigation did not write to the server. Auth/API responses were mocked in both checks. Scripts: `/private/tmp/cms-recovery-tabs-ui.mjs` and `/private/tmp/cms-concept-recovery-ui.mjs`; both ran against the existing production build.

## Recovery before the first server save

`new-draft-checkpoints.ts` defines a separate browser-only namespace scoped by account, site and content type. Each copy has its own local UUID and locale; the strict envelope has no server record or revision fields. It uses Web Locks, a twenty-copy limit, a two-million-character bound, confirmed writes/removals and stale-delete protection. Corrupt entries remain in storage and fail closed. Copies persist until explicitly removed.

Forms are the first integrated editor. New forms offer optional manual/automatic copying; discovery remains available when no draft is open and when viewing an existing form. Restore checks the account/site/type scope and form schema, rechecks authenticated site access, opens a new unsaved form and disables server autosave. The server enforces creation permission on explicit save. Copies are not linked to the resulting server record: the UI tells editors to open an already-saved record instead of restoring the same new-draft copy again. Nothing is automatically published or removed.

TypeScript, production build and three new storage tests passed. Production-build Chromium with mocked auth/API passed copying before any server record existed, reload discovery, full field restoration, no writes during recovery, explicit save with null record/revision, unpublished result and subsequent local-copy removal. No runtime page errors occurred. Other new-record editors, process-restart/concurrent-tab acceptance for this separate namespace and hosted verification remain pending.

## New menus, testimonials and specialist profiles

These three editors now reuse first-save recovery with separate account/site/content-type scopes. Restoration validates the appropriate schema and rechecks authenticated site access before opening a new unsaved draft. Testimonial and specialist restoration also rejects responses from an older editor generation. Server autosave remains off; creation permission is enforced by the explicit server save. Profile copies display their name in the discovery list.

Production-build Chromium with mocked auth/API passed automatic copying before first save, reload discovery, restoration and explicit creation with null record/revision for all three modules. The full saved payload matched the browser copy, including testimonial consent and other schema fields; nothing was published. No writes occurred during recovery and no runtime page errors occurred. TypeScript, production build and nine targeted tests pass. Remaining new-record integrations and hosted/client acceptance are still pending.

## New destinations, journal articles and photo expeditions

These editors now offer first-save recovery using their existing strict content schemas. Pending imports/migrations block recovery. Restore rechecks authenticated site access, retains the local slug and locale, opens a new unsaved draft and leaves server autosave disabled. Expedition restore also checks its editor generation. Server save remains responsible for creation permission and URL availability.

Production-build Chromium with mocked auth/API verified automatic copying, reload discovery/restoration and explicit first save for all three modules. Each saved payload matched the browser copy, each request had null record/revision, and the newly chosen slug produced the expected content-type path. No writes occurred during restoration, nothing was published and no runtime page errors occurred. TypeScript, production build and twelve targeted tests pass. New page/homepage, journey, document and initial-settings recovery remain to be connected, alongside hosted/client verification.

## New documents and initial settings

New documents now reuse the first-save recovery panel with document-schema and language checks. Pending file-rights work blocks restoration/copying, and metadata/file references remain subject to normal eligibility checks before publication. Recovery rechecks authenticated site access and the editor generation, restores normalized regions, and disables server autosave.

Initial settings recovery checks the selected locale, re-fetches current settings and requires an explicit null record plus current creation permission. It refuses a copy if settings now exist, rather than replacing that record. Successful restoration refreshes configuration access and clears impact review/acknowledgement. A fresh impact review is required before an explicit first save. Other locales must be loaded before their copies can be restored.

Production-build Chromium with mocked auth/API passed new-document reload recovery, region preservation, explicit first save and local-copy removal. Initial-settings checks passed rejection of newly existing settings and revoked creation permission, recovery with no server write, mandatory impact review and an explicit unpublished first save. TypeScript, production build and seven targeted tests pass. New pages/homepage and journeys, new-copy lifecycle acceptance and hosted/client verification remain pending.

## New journeys, pages, homepage and duplicated pages

First-save recovery is now connected for all primary editors. Journey copies retain the merged payload and require a valid slug and usable collections. Restoration opens a new English draft; subsequent saves preserve unseen restored fields. Page copies include title, path, composition, SEO, Concept navigation and duplicate source identity. The parser separates page/homepage paths and requires a custom URL for duplicates. Restored duplicates reset both SEO and navigation confirmations; they cannot save until reviewed again. Homepage restoration refuses an existing homepage found by a fresh list read. New records still require server creation permission and URL checks at explicit save.

Production-build Chromium with mocked auth/API passed new journey, ordinary page, homepage and duplicated-page workflows: automatic copy, reload discovery/restoration, fixed intended URL and explicit first save with null server identity/revision. It also passed refusal when a homepage appeared meanwhile and required duplicate confirmations while preserving source sections. No writes occurred during recovery, no content was published and no runtime page errors occurred. TypeScript, final production build and the full 1,359-test CMS regression suite pass.

Remaining recovery acceptance: process restart and concurrent tabs for the separate new-copy namespace, failed first-save behavior, broader browser/storage lifecycle checks and hosted permissions/concurrency. This is local implementation evidence; provider staging and client handover remain incomplete.

## Reproducible new-copy lifecycle acceptance

[`scripts/check-cms-new-draft-recovery.mjs`](../../scripts/check-cms-new-draft-recovery.mjs) now retains the new-form lifecycle acceptance test in the repository. It uses a temporary persistent Chromium profile and mocked auth/CMS requests. It passed a complete browser-process shutdown/restart, unchanged stored bytes, reset copy preferences, restoration with server autosave off, a known non-committing 403 first-save rejection preserving both the editor and copy, a second explicit successful save, and exact-copy removal. Two real tabs then created separate copies; stale reviewed deletion was refused after the other tab updated its copy, preserving the newer content. The temporary profile is removed at completion.

Run against a built local fixture server:

```sh
CMS_SUPABASE_URL=https://cms-fixture.test CMS_SUPABASE_ANON_KEY=sb_publishable_fixtureonly000000 npm run start -- --port 3002 --hostname localhost
```

In another terminal, run `node scripts/check-cms-new-draft-recovery.mjs`. It defaults to `http://localhost:3002/cms`; `CMS_RECOVERY_TEST_URL` can select another local fixture URL. The script refuses non-local hosts. All CMS requests are intercepted. This verifies normal Chromium shutdown/restart and the separate new-copy namespace, not crash/power-loss durability, browser eviction, all browser engines, hosted authorization or an ambiguous save that committed before its response was lost.

No application code changed in this acceptance batch, so the previous production build was reused. Remaining acceptance includes ambiguous first-save handling, browser/storage edge cases and hosted permissions/concurrency.

## Ambiguous first-save server foundation

[First-save recovery](first-save-recovery.md) documents migration 204 and the optional keyed editor API. Exact requests can recover their original record/revision result atomically. The full 1,362-test suite, TypeScript, production build and offline migration plan pass. Editors do not yet supply persisted request identities, so this server foundation does not yet prevent duplicate retries in the client workflow. Provider migration and multi-connection concurrency remain unverified.
