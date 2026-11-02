# News and press releases

## Current implementation

Current release state: migration 327 replaces the temporary publication stop with revision, approval, validation and current-dependency checks. Visitor pages and discovery exist behind disabled rollout flags. Client review/publish controls are connected; hosted acceptance remains pending. Earlier sections record the preceding implementation stages.

`lib/cms/news.ts` defines a strict versioned reusable record, distinguishing `news` from `pressRelease`. Fields cover title, slug, summary, author, editorial date, topic, dateline, optional listing/hero/gallery images, Journal-compatible rich blocks, SEO, internal notes and typed relationships to pages, projects, journal articles, destinations and documents. The implemented route family is `/news/:slug`; rollout remains disabled. The editorial date is a calendar date, not a publishing schedule or embargo. Publication timing must use the existing scheduler.

`lib/cms/news-validation.ts` provides readiness checks used by the trusted direct and queued workers. It requires substantive body content and complete editorial fields, with a dateline for press releases. Images are optional, but every selected image must have exact current evidence. Related records must be available, published and in the same language. Evidence is bound to website, record and revision; missing, duplicate or unrelated evidence fails closed. Internal notes do not become public body content. Incomplete content can remain a draft. Existing Journal schemas and content remain unchanged.

## Remaining delivery path

2. Broader browser recovery parity, translation controls and scheduling after publication is enabled.
3. Current publication guards that recheck release dependencies and allow only approved validated revisions.
4. Public renderer/routes, image delivery, related-content projection, SEO, sitemap and disabled rollout switch.
5. Review/publish/withdraw/restore, scheduling, translation drafts and Office imports.
6. Hosted verification, native Office/client acceptance and handover.

Draft storage and the client workspace are implemented below. Public delivery and publishing remain blocked. Tests cover strict fields, creation/update recovery identity, incomplete editorial content, classification/dateline differences, exact evidence binding and unavailable or duplicate reference/media/link evidence.

## Draft storage and discovery

Migration 320 registers `news` records, restricts their paths to `/news/:slug`, and blocks publishing until release guards and public consumption are ready. Existing site/language route uniqueness remains authoritative; the dedicated save API rejects changing a saved slug or language. The shared create receipt and cancellation fence provide durable request recovery.

`/api/cms/news` provides strict authenticated saves and scoped search. Searches cover title, classification, topic, summary, author, dateline and body before pagination. Classification, review status, ownership and publication filters are applied in the database. Results contain bounded metadata only and reject inconsistent cursors or unexpected fields. The shared generic editor API has not been broadened.

Storage verification: eight focused News tests and all 1,828 CMS tests pass with no failures/skips. TypeScript and the offline 320-migration plan pass. Database checks cover exact create retry, classification/literal search, cross-site access, stale revisions, cancelled creation, invalid routes and direct publication fencing. Evidence: `/private/tmp/cms-news-storage-{focused,full,types,migrations}.log`. No browser editor or hosted verification is claimed.

## Client authoring

News and press releases now has a dedicated navigation entry and workspace. Editors can select classification, edit bounded editorial fields, compose paragraphs/headings/lists/quotes/tables/links/images, choose media and related content, set SEO and manage private notes. Search supports classification/status/ownership filters. The preview escapes text, disables links and excludes internal notes.

Creation stores the exact request snapshot before sending, uses a browser lock and recovers with the same request ID. Failed list/editor refresh retains recovery. Updates use current revisions; conflict reconciliation requires explicit field choices and preserves independent changes. Undo/redo covers unsaved edits. Saved slugs and languages are protected. History restoration creates a new draft, and migration 321 restores its list title with the content. Shared ownership controls are connected. Browser recovery copies for ordinary unsaved edits and update-response recovery parity remain pending.

Client verification: all 1,829 CMS tests, production build and TypeScript pass. Synthetic browser checks at 1280px and 390px cover classification, rich text, undo/redo, lost-response create recovery, private preview, conflict choices, restoration and read-only controls. The offline migration plan validates 321 migrations. Evidence: `/private/tmp/cms-news-ui-{full-final,build,types-final,browser-final,migrations}.log`. Hosted and client acceptance are still required.

## Trusted validation

Migration 322 adds service-only evidence for the exact current News revision, including selected images, typed related records and internal links. Cross-site or stale revision requests return no evidence. Browser users cannot invoke the evidence function directly. Both trusted worker paths dispatch `news-1` validation and store immutable revision-bound findings. The editor provides request and refresh controls, rejects mismatched policy/revision results and treats expired receipts as invalid.

A successful content check still cannot publish News: the database release fence remains active. Public readers, current release dependency locks and the delivery route must be implemented before enabling publication.

Trusted-check verification: all 1,830 CMS tests, production build and TypeScript pass. Desktop/mobile browser checks request and refresh trusted News results while exercising existing authoring/recovery. The offline plan validates 322 migrations. Evidence: `/private/tmp/cms-news-validation-{full,build,types,browser,migrations}.log`. Hosted workers and client acceptance remain pending.

## Published reader boundary

Migration 323 provides anonymous detail and paginated list readers. Detail output explicitly excludes internal notes, raw relationship IDs and ownership; it includes only the published revision and approved public fields. The list uses the published revision timestamp, so editing a private draft cannot change a public modified date. Reads require a successful receipt under the deployed `news-1` policy and recheck selected media rights, typed reference publication/language and internal links. Related documents must permit public downloads. The current-draft evidence function retains its original scope; a separate service-only immutable-revision helper supports public readers.

`lib/cms/published-news.ts` rejects private or unknown envelope/content fields, wrong paths/languages and incomplete editorial content. This is not a live route. The draft publication fence remains enabled. Related-content cards and transitive dependency delivery, release locking and sitemap still need integration before publishing is enabled. Visitor rendering and metadata are covered below. Public image admission and route ownership are covered below. Reader fixtures temporarily disable only the News publication fence inside rolled-back transactions; they do not demonstrate real publication admission.

Reader verification: nine focused News/public-boundary tests and all 1,832 CMS tests pass with zero failures/skips. TypeScript and the offline 323-migration plan pass. Evidence: `/private/tmp/cms-news-public-{focused,full-final,types,migrations}.log`. No new route/browser, production-build or hosted-release claim is made for this reader-only batch.

## Anonymous runtime

`public-news-runtime.ts` connects detail/list RPCs using only the anonymous key and no-store requests. Both `CMS_PUBLIC_DELIVERY_ENABLED=true` and `CMS_NEWS_DELIVERY_ENABLED=true` are required, along with a valid website ID and provider configuration. No environment setting was enabled. Missing configuration cannot silently return an empty published listing. Provider errors propagate; an explicit null detail represents unavailable content. Invalid slugs are rejected before network access.

List responses are strict and bounded to 100 rows per page and 100 pages. IDs must increase across pages, paths cannot repeat, and private/unknown fields are rejected. Optional listing images remain null until configured. Items sort by descending editorial date with stable record-ID ties. Four focused runtime/public-boundary tests and TypeScript pass (`/private/tmp/cms-news-runtime-{tests-final,types}.log`). Visitor routes and release admission are still pending; this runtime is not yet a deployed News page.

## Public image admission

Migration 324 connects News to the existing private-bucket media gate. Only asset IDs in the currently deliverable published News projection qualify. Drafts and cross-site requests do not grant access; withdrawal or revoked image rights removes admission. Existing page families retain their checks through the previous media function. The prior function remains inaccessible to browser roles. The News publication fence remains active.

Verification: all 1,835 CMS tests pass with zero failures/skips (`/private/tmp/cms-news-images-full.log`), including anonymous image access before publication, after the transactional reader fixture publishes, across sites, after rights revocation and after withdrawal. The offline plan validates 324 migrations (`/private/tmp/cms-news-images-migrations.log`). This does not verify hosted storage or enable publication. Next: connect visitor rendering/SEO, then implement release admission and review controls. Route reservation is covered below.

## Route ownership

Migration 325 reserves `/news` and its descendants in the shared application/database custom-page policy. Other record types cannot claim News URLs; News records retain their existing strict slug identity check. Redirect source eligibility uses the same database policy. The migration locks both route-owning tables before checking for existing records or redirect aliases, and refuses to proceed if a conflict exists. It neither renames nor deletes existing client content. All previous reserved namespaces remain protected.

Route verification includes application/database policy parity, rejection of competing record types and a rolled-back existing-client-page fixture proving migration refusal without data loss. The production build and TypeScript pass. Fresh desktop/mobile source captures for Concept, Bespoke Safaris, Private Aviation, Kenya and Tanzania match every non-provenance field exactly; only the shared route-policy source hash and capture timestamps changed. The offline plan contains 325 migrations. No hosted migration, page publication or rollout setting changed.

Final route batch: all 1,836 CMS tests pass with zero failures/skips (`/private/tmp/cms-news-routes-full-final.log`). Build, TypeScript, capture and migration-plan evidence use `/private/tmp/cms-news-routes-*`. News remains unpublished pending visitor routes and release admission.

## Visitor pages and metadata

`/news` lists eligible published items in editorial-date order; `/news/[slug]` renders the strict anonymous projection. Both remain disabled unless the public delivery and News flags are explicitly enabled. The example environment keeps News off. Missing provider configuration raises an error; a missing/withdrawn detail returns 404. The renderer supports press-release classification/dateline, author/date, rich body blocks, optional hero/list images, gallery and image credits. Articles without images retain a readable heading layout. Private notes and raw relationships never enter this projection.

Article metadata honors page/global indexing and canonical settings and includes editorial publication date and author. JSON-LD uses NewsArticle. Related-content cards, release admission and approval/publish UI are still pending; routes do not bypass the database publication fence.

Verification: all 1,837 CMS tests, production build and final TypeScript pass. A local synthetic-provider browser check at 1280px/390px exercises list/detail navigation, safe text, delivered images, text-only articles, canonical metadata, noindex and withdrawn/rights-revoked 404 and empty-list states. Mobile screenshot inspected. Evidence: `/private/tmp/cms-news-pages-{full,build-final,types-final,browser}.log`; screenshots `/private/tmp/cms-news-public-{1280,390}.png`. Fixture and preview server were stopped after checks. This is local delivery evidence, not hosted publication or client acceptance.

## Search and sitemap

News discovery now connects the eligible anonymous list to site search and the sitemap. Search includes a News filter, title/topic/summary matching and a selectable News and press releases content type in client settings. Existing settings are preserved; the client can explicitly select News alongside existing types. The sitemap uses the published revision timestamp and includes the News index only when at least one eligible article exists. Both discovery entry points honor the disabled-by-default rollout flags and propagate provider failures.

Noindex and alternate-canonical articles are excluded from both discovery surfaces. Sitemap-only exclusion retains site-search visibility; disabling News in search settings removes its results. Withdrawal or revoked rights removes entries through the public reader. Browser tests verify each policy against local synthetic responses; these are not provider-side release acceptance tests. The production build passed. Fresh desktop/mobile source captures for Concept, Bespoke Safaris, Private Aviation, Kenya and Tanzania retain identical content/media/interaction data; only capture provenance and the three shared search/settings source hashes changed.

Discovery verification: all 1,839 CMS tests, production build, final TypeScript and extended desktop/mobile browser checks pass. Evidence: `/private/tmp/cms-news-discovery-{full,build-final,types,browser}.log`. Both local preview servers were stopped. No hosted settings or rollout flags changed. Next: related-content delivery and current-dependency release checks, then connect review/approval/publication controls.

## Related content

Migration 326 resolves the five supported relationship groups through their current public readers: pages, projects, journal articles, destinations and public documents. It derives titles from published content and document links from exact record/revision IDs. Unavailable or wrong-language/type/site targets invalidate News delivery; project references reuse the existing bounded transitive project checks. Anonymous callers cannot access the pre-related reader or the internal resolver. The public envelope now requires a bounded, unique, strict related-card list, and the visitor article renders those links. Raw relationship IDs and private notes remain excluded.

Verification: all 1,840 CMS tests pass, including a rolled-back published-page relationship fixture, cross-site readers, dependency withdrawal and image-access removal. Build, TypeScript and the extended desktop/mobile browser checks pass. A final stricter UUID URL-format check passed five focused public-boundary/runtime tests. The offline inventory validates 326 migrations. Evidence: `/private/tmp/cms-news-related-{full,build,types,browser,focused,migrations}.log`. The browser uses a synthetic project link; hosted verification and per-family relationship acceptance remain required. The database publication fence is still active. Next: current-dependency publication admission, then client submit/approve/publish controls.

## Publication admission

Migration 327 replaces the temporary stop while retaining News route identity enforcement. Publishing requires the exact current approved revision, a valid unexpired `news-1` receipt under current policy, English route/payload identity, current media/link/reference evidence and deliverable related cards. Directly selected related records and image rows are held with share locks during the check. Editing a new draft does not require reapproval of the already published revision. The existing shared publish RPC retains permission checks, delivery-job creation and audit events; withdrawal uses its expected published revision.

The transactional integration test uses actual trusted validation, independent submit/approve roles and the ordinary publish RPC. It revokes image rights after approval and expects rejection, restores rights and publishes successfully, then rejects publication of a newer unapproved invalid draft and withdraws the existing article. Reader access is checked after publication and withdrawal. This local database evidence does not prove hosted concurrent transactions or delivery-worker deployment; those remain acceptance work.

Publication batch verification: all 1,840 CMS tests pass with zero failures/skips (`/private/tmp/cms-news-release-full.log`); the offline plan validates 327 migrations (`/private/tmp/cms-news-release-migrations.log`). This batch changes database admission and its integration tests; no new browser or hosted release is claimed. Next: connect client workflow controls and verify the complete editor-to-publication flow.

## Client review and publication controls

The News workspace now requires explicit review status, published revision and per-action permission fields in record responses. It provides submit, approve, request-changes, revision-bound publish confirmation and expected-revision withdrawal. Unsaved content, unresolved creation/conflicts and busy operations disable workflow actions. Publication copy distinguishes a recorded publication from visitor rollout. After an action, the workspace reloads and verifies the resulting state; an unverified response blocks further workflow actions until a successful reload. A lost approval response is recoverable without repeating the approval.

Verification: all 1,840 CMS tests, production build and final TypeScript pass. Synthetic browser checks at 1280px/390px cover unsaved-edit disabling, submit/approve, a committed-but-lost approval response, reload reconciliation, publication cancellation/confirmation and withdrawal, alongside existing creation recovery, previews, conflict handling, history and read-only checks. Evidence: `/private/tmp/cms-news-workflow-{full,build,types,browser}.log`. The local server was stopped. Real-provider UI-to-database acceptance remains pending; browser and transactional database evidence are separate.

Remaining News work includes ordinary browser draft/update recovery parity, structured Office imports, scheduling/translation integration and hosted/client acceptance. Full-CMS scope and the fixed readiness score remain unchanged; local workflow completion alone does not establish client readiness.

## Browser draft recovery

News now reuses the opt-in browser recovery panels for new and saved records, including manual copies and debounced automatic copies. Each copy remains scoped to its account, website, content type and (for saved records) record/language. Recovery revalidates current access and strict News content before changing the editor. Saved copies also require the unchanged slug/path; a newer server revision opens the existing explicit conflict comparison. Restoration only changes the local editor, and saving is still explicit. Copies persist until the client removes them; the panels explain their private-content implications.

Desktop/mobile browser checks restore an unsaved new draft after reload without making a server save, then restore an existing-record copy without changing server content. Existing conflict, creation recovery and workflow tests still run. Two focused recovery tests cover cross-account/site/type rejection, strict payloads, permissions, identity changes and newer-revision comparison. Update-response recovery parity, Office imports, scheduling/translation and hosted acceptance remain outstanding.

Browser-recovery batch: all 1,842 CMS tests, production build, TypeScript and desktop/mobile authoring checks pass. Evidence: `/private/tmp/cms-news-recovery-{full,build,types,browser,focused}.log`. Local preview stopped; no hosted settings changed.

## Interrupted update reconciliation

An unsuccessful News update now reads the current record before another save is offered. Strict identity, edit permission and slug checks precede reconciliation. If the server content matches the attempted content, the editor loads that state without repeating the write; this confirms content equivalence, not who committed it. If the original revision is unchanged, edits remain open for an explicit retry. A different newer revision opens conflict comparison. If the read also fails, local edits remain open and the client is told to retain the tab or a browser recovery copy.

This does not add a durable update-request receipt. Recovery across closing the tab depends on the already available opt-in browser copy; the in-session check itself writes nothing. Creation continues to use its separate durable request identity.

Update-recovery verification: 17 targeted News tests, production build, TypeScript and the extended desktop/mobile browser workflow pass (`/private/tmp/cms-news-update-{tests,build,types,browser}.log`). Browser checks verify exactly one write after a committed-but-lost response and explicit retry after an uncommitted request. Existing concurrent-edit comparison, recovery and publication checks also pass. No database/schema changes were made in this batch; the broader suite was not rerun. Local preview stopped. Next: structured News Office import contract, review and application.


## Scheduled publication and withdrawal

The News editor now exposes the shared publication schedule panel for saved records. Publishing requires approval; withdrawal pins the currently published revision. Unsaved edits, unresolved workflow status, imports and creation recovery disable scheduling. Date/time entry requires an explicit UTC offset and shows the execution instant. Users can refresh schedule status and cancel pending schedules. The editorial date on a News item remains independent of its release schedule.

The existing worker runs trusted News validation when a publication becomes due, then applies the ordinary publication guards. A transactional News integration test exercises successful publication and withdrawal plus blocking for missing required content, a newer revision and revoked publisher access. No new migration or alternate publishing path was needed.

Scheduling verification: the focused transactional database test, 20 scheduler regression tests, production build and TypeScript pass. Desktop (1280px) and mobile (390px) checks exercise schedule creation, explicit-offset conversion, cancellation, withdrawal targeting, unsaved-edit disabling and read-only controls alongside the existing authoring workflow. Evidence: `/private/tmp/cms-news-schedule-{db,regression,build,types,browser}.log`. These are local checks; the hosted worker has not been activated or verified by this batch.

Remaining News work: translation integration, hosted worker/concurrency verification and client acceptance. Structured imports and downloadable templates are documented in [News imports](news-imports.md). Full-CMS readiness remains governed by the completion scorecard, not the number of local tests.


## Translation draft creation and review

News now reuses the shared translation creation, family navigation and review panels. Creating a translation copies a saved source into a separate language draft and retains the source path within that language. It clears an explicit source canonical URL. Copying does not translate the text or publish it. The editor validates the returned News content and route before opening it. Unsaved edits, creation/import recovery and uncertain workflow status disable these operations; active translation creation/navigation also locks the surrounding editor.

Creation retains its request identity through an interrupted response. Recovery opens the existing draft rather than creating another. Review loads a comparison of the current saved source and translation before explicit acknowledgement. Source edits invalidate the recorded review. The database retains ordinary access controls and the configured separate-reviewer requirement.

Multilingual public delivery remains incomplete. These controls provide translation authoring and review, not proof that non-English News routes are available to visitors.

Translation verification: a transactional News test covers idempotent creation, canonical clearing, separate review, source-change invalidation, family navigation and inaccessible-record rejection. All 17 shared translation tests, production build and TypeScript pass. Desktop (1280px) and mobile (390px) browser checks cover unsaved-edit guards, a committed-but-lost creation response, recovery into one language draft, comparison before review, source-change notification and return to the primary source. Existing News authoring and scheduling checks also pass. Evidence: `/private/tmp/cms-news-translation-{db,regression,build,types,browser}.log`. No hosted changes or new migrations were required.
