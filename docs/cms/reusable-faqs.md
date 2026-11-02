# Reusable FAQs

29 October 2026. Implements the foundation of retained PRD §14; not a completed client module.

## Implemented locally

- Versioned strict draft fields: question (200 characters), rich-text answer, topic (120), distinct keywords, review date, typed page/product/destination/document relationships and private notes.
- Incomplete answers may be saved; readiness reports missing answers. References and keywords reject duplicates.
- Authenticated same-origin save API at `/api/cms/faqs`, with request-key recovery for creation and expected-revision protection for updates. Locale, path and record type cannot silently change through this API.
- Search API on the same route filters by text, review status, ownership and publication state, with bounded keyset pagination and strictly verified response identities. Database permission filtering happens before pagination.
- Migration 309 extends the shared record system and cancellation fence. FAQs are pathless reusable records; publication is explicitly blocked until trusted validation and public consumers are connected.
- Existing record ownership and revision storage apply; their client controls are not yet connected for FAQs.

## Client authoring

The CMS now exposes a FAQs workspace with search/status/ownership filters, language selection for new drafts, character counters, the shared rich-text editor, typed relationship pickers and a private answer preview that omits internal notes. Undo/redo and read-only permissions apply. New-record requests persist in actor/site-scoped browser storage and use Web Locks; retry recovers the original request, and server-confirmed cancellation preserves an already committed draft. Stale saves fetch and verify the latest record, preserve local edits and expose field-by-field comparison. Independent edits carry forward; conflicting fields require an explicit choice. Answer blocks and relationships are selected as whole fields. Applying choices is local only and a subsequent save still checks the revision. Ownership controls reuse the existing version-guarded panel.

Revision history now supports restoring an earlier answer as a new draft, with dirty-state, permissions and expected-revision guards. Migration 310 restores the question as the list title while retaining prior restoration rules for other types.

## Trusted validation

Migration 311 adds service-only revision-bound FAQ evidence and the `faq-1` validation policy. The worker checks substantive answer content, overdue review dates, exact related-record coverage/type/language/publication and internal links. Missing or duplicate evidence fails closed; public product relationships and non-English release remain unavailable. The editor can queue checks and refresh expiring receipts. Migration 313 replaces the temporary stop with approval, current validation and execution-time evidence checks.

## Public reader foundation

Migration 312 introduces `get_public_faq` and a shared current-evidence predicate. The reader exposes only record/revision identity, language, question and answer. It reads the immutable published revision even while a newer private draft exists, requires the current validation policy, rechecks review dates/internal links/related records and rejects non-public document evidence. A strict TypeScript boundary rejects unexpected private fields and mismatched identities. The public reader is available to anonymous callers; actual website page consumption is still pending. Reader isolation fixtures disable admission inside rolled-back transactions, while the separate release test uses normal review and publication. English custom-page composition and runtime are connected; other page families and translated delivery remain pending.

## Review and publication

Migration 313 enforces the current approved revision, an unexpired `faq-1` validation receipt and current release evidence before publication. Later private draft edits preserve the published answer. The client exposes submit, approve/request changes, explicit publish confirmation and withdrawal confirmation using existing record permissions. Published FAQ library rows are supported. Local integration covers missing validation, overdue evidence, unchanged public answers after private edits and withdrawal.

## Page reuse integration prerequisites

Migration 314 adds FAQ selection to the existing permission-filtered record library. Editors can resolve ordered selections without exposing inaccessible titles; draft records remain labelled as drafts. `public-faq-runtime.ts` uses the anonymous key, bounds requests to 50 distinct selections and five concurrent reads, preserves order and omits withdrawn records. Invalid identities or provider failures abort resolution rather than falling back to private text. `CmsReusableFaqs` renders supplied verified answers with the existing rich-text renderer and native disclosure controls. English custom pages now offer a reusable FAQ section using ordered record selection; the custom route resolves and renders published answers. Each page supports at most 50 distinct answers with bounded concurrent reads. Draft preview is explicitly based on saved FAQ drafts and never copies internal notes into the page payload. Other page families and translated routes are not yet connected.

## Remaining acceptance

1. Hosted and client verification of recovery storage, concurrent tabs and device privacy expectations.
2. Complete browser and hosted verification of ownership assignment, reference selection, cancellation and concurrent tabs.
3. Other page families, translated consumers, dependency invalidation/cache integration and hosted publication/concurrency verification.
4. Relevant structured data and full rendered-page/client acceptance; the English custom-page consumer omits withdrawn answers without falling back to draft text.
5. Structured import/export as required, translations and browser workflow coverage.
6. Hosted permission/concurrency checks and client acceptance.

## Verification

Six focused FAQ tests pass, including a local PGlite scenario for creation replay, revision locking, website isolation, cancellation and route/publication fences. The complete CMS suite passes 1,784 tests with no failures or skips. Production build and post-build TypeScript pass. `scripts/check-cms-faq-authoring.mjs` passes at 1280px and 390px with a synthetic provider, covering authoring, undo/redo, lost-response recovery, preview privacy, explicit conflict choices, preservation of independent edits, revision restoration and read-only access. This does not prove hosted behaviour. Offline empty-ledger planning validates all 315 migrations; no hosted migration was applied. Latest logs: `/private/tmp/cms-faq-validation-{targeted,full,build,types,browser}.log`; migration inventory: `/private/tmp/cms-faq-validation-migrations.log`.

This foundation does not earn another fixed scorecard gate. Overall score remains 51/100; the broader additional-modules requirement is open.

Reader milestone verification: full CMS suite and TypeScript pass; logs `/private/tmp/cms-faq-public-{full,types,migrations}.log`. No UI changes or new production build in this reader-only batch. The preceding UI build/browser evidence remains separate.

Release milestone: normal database submit/approve/publish/withdraw and desktop/mobile confirmation flows pass. Full suite 1,784 passed, no failures/skips; production build and TypeScript pass. Logs: `/private/tmp/cms-faq-release-{targeted,full,build,types,browser,migrations}.log`. No hosted migration or client acceptance is claimed.

Reuse prerequisite checks: full CMS suite 1,787 passed with zero failures/skips, followed by three runtime tests including an additional anonymous-key dispatch check; TypeScript passes. Logs `/private/tmp/cms-faq-reuse-{full,runtime,types,migrations}.log`. No new browser/UI integration is claimed in this batch.

Migration 315 checks that selected reusable FAQs are currently public when a page publishes. English custom pages request public answers on each uncached dynamic route read, so withdrawal removes their answer without republishing the page. Source recaptures for Kenya, Tanzania, Concept, Bespoke Safaris and Private Aviation matched every non-provenance field before refreshing hashes.

Custom-page milestone: 1,790 CMS tests passed with zero failures/skips; production build and post-build TypeScript pass. Following the final composer wiring fix, desktop/mobile selection/save checks and the expanded composition test pass. Logs `/private/tmp/cms-faq-pages-{full-final,build,types-final,browser,composition,sql,migrations}.log`. No hosted deployment or client acceptance occurred.

FAQ browser recovery now reuses the shared opt-in new/saved checkpoint panels. New drafts recheck website membership and pending creation before restoration. Saved drafts recheck identity, locale and edit permission, and route newer server revisions through explicit conflict comparison. Restore is local only; no content is saved until the client saves explicitly. Copies remain in the browser until removed.

Recovery verification: 19 focused FAQ/checkpoint tests pass; production build, post-build TypeScript and desktop/mobile authoring checks pass, including opt-in creation and restoration of both new and saved browser copies. Logs `/private/tmp/cms-faq-recovery-{regression,build,types-final,browser}.log`. No full-suite rerun was needed for unchanged shared persistence logic; prior full-suite evidence is retained separately.

Structured FAQ import contracts, Office decoding and pure proposal planning are implemented. See [FAQ imports](faq-imports.md) for exact fields, preservation rules and remaining templates/review/apply/UI work.

## Translation drafts

The FAQ workspace exposes translation creation, source/family navigation and independent translation review through the shared translation service. New translations retain null paths, copy the current source payload into an unpublished draft and preserve exact retry recovery. Editors must translate the wording and review references; copying is not translation or approval. Unsaved edits and pending imports block language navigation/creation. Source changes make the translation review stale. Non-English publication and public reuse remain unavailable until their delivery and validation are implemented.

Translation verification: all 1,818 CMS tests, production build and TypeScript pass. The FAQ browser fixture now also verifies lost translation-creation responses, recovery into the French draft and navigation back to the English source at 1280px and 390px. Evidence: `/private/tmp/cms-faq-translation-{full,build,types-final,browser}.log`. These are local/synthetic checks, not hosted or client acceptance.

## Scheduled publication and withdrawal

Saved FAQ records expose the shared scheduling panel, with an explicit UTC offset, confirmation, schedule status and cancellation. Only publishers can create/cancel schedules. Unsaved edits, conflicts, imports and translation operations disable scheduling controls. Execution obtains fresh trusted FAQ validation and rechecks the pinned revision, approval and original publisher authority. Overdue answers cannot publish; a newer draft invalidates an old scheduled revision. Withdrawal uses the currently published revision.

Migration 319 fixes shared scheduler failure handling: when validation cannot run because the pinned revision is no longer current, the job stops with `publication_guard_failed` rather than spending further attempts retrying an irrecoverable revision. Transient validation failures retain the existing bounded retry policy. No provider scheduler is enabled by this local change.

Scheduling verification: all 1,819 CMS tests pass, including real local database/worker checks for valid publication, overdue review dates, stale revisions, revoked publisher membership and withdrawal. Desktop/mobile browser checks verify creation, offsets, cancellation and read-only controls. Production build, TypeScript and the offline 319-migration plan pass. Evidence: `/private/tmp/cms-faq-schedule-{full-final,browser,build,types,migrations}.log`. Hosted scheduling and client acceptance remain pending.
