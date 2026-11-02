# Applications and industries

PRD §14 requires reusable records, relationships, search/filtering, ownership, revisions, relevant SEO and publishing. This module uses record type `application` with classification `application` or `industry`; it does not repurpose travel destinations. Implementation is locally verified, not hosted or client accepted. Visitor rollout remains off.

## Current implementation

- Strict versioned drafts: title, slug, classification, summary, rich blocks, optional image, SEO, private notes, bounded relationships and evidence-bearing claims.
- Applications use `/applications/<slug>`; industries use `/industries/<slug>`. Kind, route and language cannot silently change on update. Both URL namespaces are reserved against custom pages and redirect sources; migration preflight stops on existing collisions without moving or deleting content.
- Client workspace: rich editing, image/reference pickers, claim fields, private preview, classification/search/ownership/status filters, content ownership, undo/redo and revision restoration.
- Recovery: durable creation IDs and cancellation, browser checkpoints, lost-update reconciliation and explicit concurrent-edit choices. Scope includes account, website, record, locale, route, classification and revision. Preview excludes private notes and claims/evidence.
- Claim approval: eligible reviewer assignment, assignment generations, saved evidence review, private PDF preview loader and explicit attestation. Approval binds the statement, review date, document revision and processed PDF revision. Changed evidence, expired/revoked rights, lost access and reassignment invalidate approval. The free-text contact is not an assignment or permission grant.
- Trusted `application-1` checks: schema, classification/URL identity, language, substantive content, SEO, exact media evidence, typed published same-language references, internal links and current claim approvals. Results are bound to the saved revision.
- Publication: exact current approved revision, fresh validation receipt and current evidence required. Directly selected records, media, private document files, claim owners and approval rows are locked during release checking. Shared permissions, separate-reviewer and MFA policies apply. Saving a newer draft preserves the published revision.
- Client workflow: submit, request changes, approve, confirm publication and confirm withdrawal. Unsaved changes disable these actions. An unverified result blocks further workflow actions until reloading the record establishes server state. Withdrawal retains drafts and history.
- Translation authoring: shared source-family navigation, recoverable draft creation, saved-content comparison and independent translation review are connected to both classifications. Draft copies preserve classification and the source path in the selected language, clear explicit canonical URLs, and remain unpublished. Source changes invalidate review. The workspace locks conflicting actions during translation operations and resets draft recovery/history context when switching languages.
- Scheduling: the client workspace uses shared saved-revision publication/withdrawal controls with explicit UTC offsets and cancellation. The worker performs fresh application validation and rechecks approval, pinned revision and publisher permissions before execution. Both application and industry classifications pass local publish/withdraw and blocked-execution database checks. Hosted worker/timer activation remains pending.
- Public boundary: anonymous detail and classified-list readers allow only visitor fields and related cards; internal notes, claims, raw relationships and private evidence IDs are omitted. Current rights and dependency evidence are rechecked. Lists use the published revision's timestamp.
- Related applications: bounded queue traversal checks each application once, handles cycles, and hides results with invalid dependencies. Candidate-revision checking permits repairs to broken published cycles. Traversal over 1,000 distinct applications fails closed.
- Public media: only assets in the currently deliverable public payload are admitted. Draft-only images remain private. Withdrawal or invalidation removes this module's admission; other valid public uses retain their own checks.
- Visitor pages: dynamic application/industry directories and detail routes render breadcrumbs, rich content, public images, related cards, SEO metadata and return links using existing website styles. Empty and withdrawn content has explicit empty/not-found behavior. Malformed private responses and provider outages fail closed.
- Discovery: both classifications appear in the Applications and industries search category; clients can include/exclude that category in published search settings. Summary text is searchable. Sitemap directories and detail URLs use current deliverable records and published timestamps. Noindex and non-self canonical records are omitted; sitemap-only exclusions retain search eligibility. Provider failures propagate and duplicate identities across classifications are rejected.
- Runtime: anonymous, no-store requests; strict identity/privacy and bounded pagination; classified lists ordered by title with a 10,000-row delivery bound. Both `CMS_PUBLIC_DELIVERY_ENABLED` and `CMS_APPLICATION_DELIVERY_ENABLED` must be true. Rollout-off routes return 404.

## Database migrations

| Migration | Responsibility |
| --- | --- |
| 353 | Draft records, classified search, recoverable creation/cancellation and revision-title restoration |
| 354 | Permission-scoped application reference selection |
| 355 | Claim reviewer assignment, evidence snapshots and approval |
| 356 | Saved-revision trusted validation |
| 357 | Ownership of application/industry URL namespaces |
| 358 | Anonymous public readers and historical claim checks |
| 359 | Public media admission |
| 360 | Guarded publication and candidate-aware relationship checks |
| 361–363 | Scoped import evidence, atomic draft batches, receipts and cancellation |

Migration 360 replaces the original temporary publication fence. No hosted migration has been applied in this work.

## Remaining delivery

- Language-specific public delivery. Public delivery currently supports English.
- Complete [Word/Excel imports](application-imports.md): contract, readers, planner, comparison and evidence verification are locally tested; authenticated review/apply, atomic saving and recovery/cancellation are now implemented locally; client upload/comparison/preview/recovery controls are connected locally; downloadable Word/Excel templates and equivalent filled fixtures are now locally verified; native Office and hosted/client acceptance remain.
- Resolve product/Shopify ownership. Draft product references do not establish product editing or public product delivery; releases containing those relationships remain blocked.
- Hosted worker, migration, permission, MFA and concurrent-writer verification with separate real users.
- Deployment cache/withdrawal checks, native Office trials, client editing trials and acceptance.

## Verification evidence

The last full CMS run passed 2,050 tests, including actual local database approve/validate/publish/withdraw scenarios for both classifications. Tests cover expired validation, unauthorized release, revoked media and claim evidence, published-version preservation, cycles and repairs. A transitive relationship-revocation assertion added during that broad run also passed separately. Evidence: `/private/tmp/cms-application-publication-{db,related,full,migrations}.log`. Offline planning includes 360 migrations.

Visitor page build, TypeScript and 10 targeted tests pass. Chromium fixture checks at 1280px and 390px cover directory→detail→directory, images, escaped text, canonical metadata, no horizontal overflow, related cards, text-only pages, noindex, withdrawal and provider/private-payload failure states. Rollout-off HTTP checks returned 404 for both directories and detail routes. Evidence: `/private/tmp/cms-application-pages-{build,types,tests,browser}.log`; screenshots `/private/tmp/cms-{applications,industries}-public-{1280,390}.png`.

Browser plugin not available; existing local Playwright tooling is used. Browser runs use synthetic provider responses and do not replace hosted acceptance. Local database tests do not prove provider concurrency. No deployment or real client publication has occurred. Completion-score points are not inferred from test counts.

Client release workflow: production build, TypeScript and 19 targeted application/worker tests pass. Chromium fixture runs at 1280px and 390px verify request-changes/resubmission, approval, cancelled publication, lost publication response with reload-required recovery, unsaved-edit guards and confirmed/cancelled withdrawal. Existing draft and claim recovery scenarios still pass with no uncaught page errors. Evidence: `/private/tmp/cms-application-workflow-{build,types,tests,browser}.log`; screenshots `/private/tmp/cms-application-workflow-{1280,390}.png` inspected. The synthetic browser provider is deliberately permissive; actual authorization and evidence rejection are covered by the database tests above, with hosted multi-user verification still pending. Local preview server stopped after checking.

Discovery verification: production build, TypeScript, four focused discovery/settings tests and the complete CMS regression suite pass. Desktop/mobile Chromium fixtures verify summary search, category selection, navigation to detail pages, published search-setting exclusion, noindex, canonical exclusion, sitemap-only exclusion and withdrawal. Five source inventories were recaptured; rendered content is unchanged. Evidence: `/private/tmp/cms-application-discovery-{build,types,tests,browser,full}.log`. Preview servers were stopped afterward.

Scheduling verification: production build and TypeScript pass; 17 shared scheduling tests pass. The new local database test executes eight application/industry scenarios covering valid publication and withdrawal, incomplete content, stale revisions and revoked publishers. Chromium fixtures at 1280px and 390px verify exact-revision scheduling, explicit offset conversion, cancelled/confirmed schedule creation, cancelled/confirmed cancellation, withdrawal scheduling and dirty-edit guards, alongside existing recovery/release scenarios. Evidence: `/private/tmp/cms-application-scheduling-{db,tests,build,types,browser}.log`; screenshots `/private/tmp/cms-application-scheduling-{1280,390}.png`. The browser fixture uses synthetic API responses; database execution is tested separately. No shared scheduler logic or database migration changed. Local preview stopped afterward.

Translation verification: production build, TypeScript and 17 shared translation tests pass. The application-specific database test covers both classifications, idempotent creation, unpublished drafts, payload/path identity, canonical clearing, separate-reviewer enforcement, source-change invalidation and outsider denial. Chromium fixtures at 1280px and 390px pass lost-response creation recovery without duplicate drafts, saved comparison before review, independent review controls, dirty guards and source/translation navigation, alongside the existing scheduling and release scenarios. Evidence: `/private/tmp/cms-application-translations-{db,tests,build,types,browser}.log`. No shared translation backend logic or database migrations changed; hosted and multilingual visitor verification remain pending.
