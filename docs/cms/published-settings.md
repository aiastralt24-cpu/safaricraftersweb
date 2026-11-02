# Published website settings

## SEO projection

Migration `063-public-seo-settings.sql` adds `cms.get_public_seo_settings(website, locale)`. It reads only the settings record's published revision and returns website, record, revision and locale identities plus a narrow SEO object. English is currently the only supported public locale; another locale or a missing publication returns null. This is deliberately separate from `get_settings_workspace`, which requires membership and reads editing state.

The SQL projection allows only title template, description, indexing and optional sharing-image metadata. Other settings, unknown keys and nested private image properties do not cross the public boundary. The image must be a current processed WebP with approved, unexpired rights and no archive marker. Only this sharing image acquires public-media eligibility through settings; draft images and unrelated brand images do not.

`lib/cms/public-seo-settings.ts` validates the exact response, including website/language identity and the same SEO field schema used by the editor. Invalid responses and service errors fail rather than substitute defaults. Missing publication returns null so the eventual consumer must make an explicit availability decision. The configured transport uses anonymous credentials and refuses another website before network access.

`resolveSeoDefaults` in `seo-resolution.ts` can use this projection to resolve page overrides, title templates, descriptions, social metadata, canonical URLs and sitemap eligibility. Site noindex restrictions dominate explicit page indexing. The existing draft preview resolver still validates complete settings and describes its draft provenance.

## Rollout still pending

No public page consumer is enabled by this migration. Settings publication remains disabled pending trusted validation, media rechecks at publication and a complete consumer rollout. Before enabling, connect metadata, sitemap and crawler directives consistently, verify nested page metadata cannot override a website noindex restriction, and test actual provider delivery. Remaining header, footer, messages and navigation projections need their own explicit contracts. Do not treat this SEO reader as an unrestricted settings endpoint.

Local verification: database publication pointer/draft isolation; private-field filtering; another website and unsupported language; revoked/expired sharing-image rights; unrelated image privacy; strict application identity and schema; anonymous RPC arguments; resolved default and override precedence. Full CMS suite at implementation: 416 passing; TypeScript passing. Production provider verification remains outstanding.

## Draft validation and image rechecks

Settings now receive `settings-draft-1` findings through the existing content validation entrypoint. Checks cover the complete schema, null route, supported language, shared copy, enabled messages, enabled search and nonempty footer groups. Every image usage needs one affirmative media-evidence entry; missing or contradictory evidence cannot qualify it. Menu and featured record references remain blocked pending published target, website and language checks.

A separate `settings_delivery_not_ready` finding always remains until shared consumers are implemented. This is not an enabled settings validation policy or permission to publish. Migration 064 enforces processed WebP for settings images in evidence, availability and publication-time checks. Tests exercise a format change between draft creation and publication; the database rejects it under the existing media guard.

## Complete shared-settings projection

Migration 071 adds `get_public_settings` for the complete public settings contract. Its private projector follows an explicit deployment-owned shape: objects expose only named fields, arrays are bounded and recursively projected, and selected scalar fields cannot carry nested objects. The public reader uses only the settings published revision and checks current processed-image availability.

`public-settings.ts` validates the exact envelope, website and English locale plus the complete existing settings schema. Missing publication returns null; invalid responses or backend failures propagate. The public transport uses anonymous credentials and is bound to the configured website.

Brand, footer and fallback images included in this projection now qualify for public media delivery while their rights remain current. Unknown/private image properties do not. An unavailable required referenced image makes the complete projection unavailable. Header/menu record IDs remain references; consumers must resolve them through published navigation delivery, not editor APIs.

Tests exercise all supported optional fields with private nested additions, immutable-publication isolation, website/language identity and revoked image rights. Full suite: 448 passing; TypeScript passing. Full settings publication remains disabled; public header/footer consumers and reference-aware release checks are still pending. Nothing has been applied to a real provider.

## Footer consumer and call to action

`SiteFooter` selects the existing footer unless `CMS_FOOTER_DELIVERY_ENABLED=true`. Enabled delivery reads published English settings with anonymous credentials, validates them and passes only brand/contact/footer/social fields to `CmsFooter`. Missing or unavailable settings produce an error; they do not fall back to draft or legacy copy.

The footer renders configured contact details, addresses, social profiles, link groups, legal links, copyright/disclaimer, brand images and marks. The optional `footer.cta` message/button is editable in shared settings. Migration 072 projects this field, and validation requires a title/button when it is enabled. Existing settings without it remain compatible.

Synthetic browser checks covered copy, email/tel links, social-link attributes, CTA editing/toggling, navigation and responsive width. Image variants and real provider delivery remain unverified in that fixture. Full CMS suite: 450 passing; TypeScript passing. Footer rollout remains disabled, and settings publication still awaits the complete shared-consumer/reference workflow.

## Header reference assembly

Migration 073 adds `get_public_header`: one read assembles published settings, the configured main/utility/mobile menu publications and featured record evidence. A main menu is required. Any configured menu that is unavailable makes the header unavailable; an unconfigured optional menu remains null. Featured evidence follows supported published journey/destination/journal readers.

`published-header.ts` validates exact website and menu identities, projects menu visibility at the supplied time, preserves featured order and omits unavailable featured records. If no mobile menu is configured, it explicitly returns the main menu as the mobile menu. A narrowed model contains branding, presentation settings, menus, CTA and featured links.

The loader defaults disabled and is not yet connected to the visible Header. Region context, language-selector behavior, visible presentation variants and shared-settings publication checks still need completion. Full suite: 454 passing; TypeScript passing. No real provider migration or header rollout was enabled.

## Header settings consumer

`SiteHeader` now selects the shared published header when `CMS_HEADER_SETTINGS_ENABLED=true`. This takes precedence over the standalone navigation flag/ID; the disabled path preserves that earlier behavior. The setting defaults false in `.env.example`.

The Header renders configured brand name or logo/mobile-logo, tagline, CTA, main/mobile menus, utility links and featured links. CSS selects the desktop or mobile menu; hidden links are excluded by the existing focus trap. Compact and sticky preferences are applied. Standard presentation is solid; transparent presentation retains existing scroll/light-opening readability behavior.

Language-selector activation is rejected until localized route delivery is implemented, rather than displaying an inert control. Other shared-settings publication blockers remain in place. Synthetic browser checks passed for desktop/mobile menu selection, links, focus handling and compact/non-sticky behavior. Real image variants, transparent hero-route presentation and provider-backed client acceptance still need validation. Full suite: 455 passing; TypeScript passing.

### Announcement and floating CTA delivery
`CMS_MESSAGES_DELIVERY_ENABLED` defaults false and performs no read while disabled. Enabled delivery reads the strict published settings snapshot and selects only announcement/stickyCta. Missing publication or invalid identity fails rather than using drafts. SiteMessages integrates into the root main content; CmsMessages suppresses promotions on CMS, Studio and preview paths. Enabled announcements render in normal flow with header clearance; floating CTA has safe-area spacing and sits below the header/menu overlay. Plain text preserves paragraph breaks, and new-window links include noopener/noreferrer. Disabled controls render nothing.

Synthetic desktop/mobile QA verified copy, visibility toggle, new-window attributes, CTA navigation and overflow without browser errors. Actual provider publication, varied long content, modal/keyboard coexistence and all public route layouts still require acceptance testing. Settings publication remains disabled pending remaining consumer/reference work. This change does not turn on rollout flags.

### Search settings consumer
`CMS_SEARCH_SETTINGS_ENABLED` defaults false. Enabled rollout requires published settings. The search route returns not-found before loading catalogues when search is disabled. Collection selection gates catalogue reads and result assembly, and the client applies the same selection to results/category controls. Configured placeholder and empty-result heading replace those defaults. Existing per-module publication switches still determine the source of supported catalogues.

Supported search types currently are journey, destination, photoExpedition and journalArticle. Page/product/project remain in the full draft contract, but now produce explicit preparation findings and cannot be silently enabled in the public settings reader. Connecting their sources remains part of the full CMS scope. Navigation links to search are not automatically removed; menu configuration still needs reconciliation before settings publication is enabled.

### Published SEO defaults on migrated detail routes
`CMS_SEO_SETTINGS_ENABLED` remains false until the sitewide metadata migration is complete. The loader reads the narrow published SEO RPC, with exact website/language identity and no draft fallback. Journey, destination and journal CMS detail branches use the common resolver when enabled. Titles are returned as absolute Next.js metadata titles to avoid applying the parent template twice. Page overrides win for copy/canonical/sharing fields; website noindex always wins for indexing. Sharing image URLs are absolute published-media URLs; journal article type/date/author metadata is preserved. Sitemap returns no entries under website noindex before catalogue reads.

Legacy detail branches, root/static metadata and country/atlas templates still require migration. The flag must not be described as enforcing sitewide noindex until those consumers are connected. Journey currently exposes only its legacy title/description SEO fields; richer page-level journey SEO needs its own contract migration. Settings publication remains blocked. Rendered real-provider metadata and deployment acceptance remain pending.

### Cookie choices and analytics enforcement
Published cookie wording is opt-in through `CMS_COOKIE_SETTINGS_ENABLED`. When analytics is enabled without that switch, the site renders functional default cookie controls. Without either analytics or published cookie configuration, no banner is injected. CMS/Studio/preview paths suppress public controls.

All funnel calls now require a current explicit analytics acceptance, independently of CMS rollout. Versioned preferences expire after 180 days; malformed/future/expired choices deny analytics. Do Not Track also denies it. Rejecting clears only funnel visit/deduplication session keys, preserving cart/editor/auth data. Choices can be reopened; cross-tab storage changes refresh the controls. Storage failures are shown and block analytics for the current JS session, without claiming the choice persisted. The existing event endpoint does not independently authenticate consent; these checks govern the application client, not arbitrary callers. No legal-compliance certification is claimed.

Browser QA covered accept/reject/reopen/reload and policy links with synthetic settings. Separate tests assert that rejected/absent/malformed/DNT/failed-storage choices send no event, accepted choices do, and deduplication remains effective. Provider-sourced wording, multi-tab/browser-restart scenarios, keyboard/screen-reader acceptance and third-party tracking integrations remain to be verified.

### Settings reference validation
Migration 074 adds caller-authorized, website/revision-scoped settings reference evidence. Menus are checked through published navigation reads; featured content uses published navigation target evidence. Missing, withdrawn, wrong-site and unsupported targets are unavailable. Anonymous users cannot call this draft evidence RPC. Trusted validation input includes the same evidence, and both direct/queued workers and editor advisory checks consume it.

Application validation requires unique affirmative evidence, matching locale and the correct menu-versus-featured type; unexpected evidence is rejected. Shared link `href` fields use the existing deployment-owned navigation URL policy, so administrative/unknown paths and unverified anchors are preparation errors. External HTTPS links receive syntax checks, not reachability checks.

This does not enable settings publication. Remaining release work includes publish-time reference locking/rechecks, remaining consumers and client publication controls. Evidence is current at validation time; it is not a guarantee that targets remain available later. Migration 074 must be applied before deploying the updated advisory endpoint/workers. No remote migration was performed here.

### Publish-time direct-reference guard
Migration 075 installs a settings publication-pointer trigger. It checks English/pathless settings, bounds reference input, locks direct referenced records in UUID order, rechecks configured menu publication and featured evidence, rejects self-references, and validates shared hrefs under a share lock on the deployment-owned route inventory. Withdrawal remains allowed. Changing the locale/path of an already published settings record cannot bypass these checks.

The trigger is defense in depth, not the complete settings publication gate. It does not enable the settings validation policy. Direct target pointer races are serialized; transitive menu/destination dependencies and their media-rights races still need a fuller release-lock strategy and concurrency verification. Existing public readers continue to check availability. Settings with no main menu are still permitted by this low-level reference guard; completeness remains the validator's responsibility. Apply migrations in sequence; no remote migration was performed.

### Missing-page copy
`CMS_ERROR_SETTINGS_ENABLED` opts the missing-page route into published `errors.notFound` title/body/button. Enabled copy must have nonblank title/body. Disabled, missing, invalid, wrong-site, wrong-language or failed settings reads retain the built-in recovery text. The backend request composes a 1.5-second abort signal with the gateway timeout; no drafts are read. A configured message without a button renders without injecting a default button.

This fallback only protects the missing-page settings read. Failures in the surrounding root layout need their own boundary; server-error and maintenance consumers remain pending. Real-provider and production streaming/status behavior need acceptance testing. Local direct navigation to an unknown URL returned HTTP 404 with fallback copy, and synthetic custom copy/recovery links passed desktop/mobile QA.

### Server-error recovery copy
The same `CMS_ERROR_SETTINGS_ENABLED` flag now controls server-error wording. `app/error.tsx` immediately renders the built-in recovery view, with retry delegated to Next.js reset. A same-origin public endpoint returns only the enabled published server-error message or null, with no-store/noindex headers; it accepts no caller-supplied website identity or diagnostic payload. The client omits credentials, rejects redirects/invalid responses, aborts after 2.5 seconds and cancels on unmount. Valid configured copy replaces title/body and optional secondary link; retry remains available.

Synthetic UI QA verified the view and reset callback, not an actual production exception/recovery sequence. Root-layout failures still require a global error boundary. Maintenance routing, real-provider delivery and production boundary behavior remain pending.

### Maintenance request interception
`CMS_MAINTENANCE_ENABLED` defaults false. When explicitly enabled, Next.js proxy checks published maintenance settings for visitor GET/HEAD requests. An enabled, nonblank message produces standalone escaped HTML with HTTP 503, Retry-After 300, no-store/noindex and a restrictive CSP. No site layout/backend-dependent components are rendered. CMS/Studio/admin/portal/preview, API, framework and asset/font routes remain accessible; robots/favicon are exempt. POST and other mutation requests are unchanged. This is visitor maintenance presentation, not an access-control or API shutdown mechanism.

A missing/invalid/unavailable settings snapshot lets the original request continue (fail-open), using a 1.5-second settings fetch deadline. There is no long-lived cache that can trap the site in maintenance after an editor disables it, but enabled-mode latency/load require provider benchmarking. Internal button links to visitor pages also encounter maintenance; use an external support destination for a usable recovery action during an outage.

Local QA exercised the exact HTML response through a temporary route, including 503/HEAD headers and keyboard/mobile rendering. The disabled proxy allowed ordinary pages. Actual enabled provider interception, client navigation/RSC behavior, redirect precedence, cross-browser acceptance and deployment/CDN handling remain unverified. Settings publishing is still disabled and no rollout flag was enabled.

### Root-layout emergency recovery
`app/global-error.tsx` supplies its own HTML/body, title, viewport and noindex metadata. `GlobalRecovery` uses inline styling and plain anchors, with no router/CMS/shared-layout dependency. It offers retry, home and the existing support email. Emergency fallback copy is bundled so a settings/backend failure cannot remove recovery; normal server-error messages remain CMS-controlled.

The standalone view and callback were verified at desktop/mobile sizes after disabling shared CSS and removing unrelated header/menu/footer fixture surfaces. Actual production root-layout exception capture/reset remains a deployment acceptance item. This change does not claim that recovery can repair a persistent backend outage.

### Root SEO inheritance and website indexing header
The root layout now resolves published SEO defaults under the existing disabled `CMS_SEO_SETTINGS_ENABLED` flag. It retains site identity/base URL/canonical configuration, applies the shared title template and description, and replaces inherited sharing images with the configured published asset (or an empty list). Explicit child metadata remains authoritative for page-specific copy. Default root/home title copy still belongs to the page/site content model.

Visitor requests also receive `X-Robots-Tag: noindex` when the published website setting is noindex, preventing a child metadata override from lifting that restriction. It adds no permissive index header otherwise. The proxy reads maintenance and SEO independently in parallel. SEO read failures propagate when this rollout is enabled rather than silently restoring indexability. Admin/API/asset exemptions retain their existing directives. This requires provider latency/failure and deployment-header acceptance testing before rollout.

Next.js child-route inheritance was verified in the browser: one title-template application, explicit page description retained, shared social description and noindex inherited. A same-segment test initially expected a template incorrectly; both dev and production showed the parent template, and moving the test page beneath the layout corrected the fixture. No production application title defect was found. Remaining legacy/page metadata still needs field-by-field CMS migration; root inheritance does not make hardcoded page overrides editable.

### Saved settings checks in the editor
SettingsWorkspace now exposes the existing revision-bound ValidationPanel. It requests advisory checks and existing trusted-status evidence for the saved revision, displays actionable field/reference/link/release findings, and disables checks for unsaved edits. Panel identity includes site/locale/record/revision. Trusted-check request and publishing controls remain unavailable while settings publication is incomplete. Loaded records must have settings type, null path and requested locale; request generations prevent older loads from overwriting newer results.

Synthetic desktop/mobile QA exercised the actual settings component and validator with simulated API transport. It verified findings, unsaved-edit blocking and absence of release actions. Real-provider validation/status permissions and multi-locale/site request-race acceptance remain pending.

### Browser branding and organization identity
`CMS_BRAND_METADATA_ENABLED` defaults false. When enabled, published brand/favicon/contact/social fields supply application name, Open Graph site name, browser icon and the root Organization/WebSite JSON-LD graph. The request-scoped brand read is shared between root metadata and layout rendering through React cache. Page titles, canonical configuration and robots restrictions are preserved. Empty optional contact/logo/address/profile fields are omitted rather than invented; public media URLs identify the logo/favicon. The existing JSON-LD serializer escapes `<` before insertion.

A missing or identity-invalid published settings response fails instead of falling back to unrelated branding. Default flags retain legacy output. Unit tests cover metadata preservation, icon removal, contact/logo/profile mapping, stable organization references and transport isolation. Real browser icon rendering, provider media availability and structured-data deployment acceptance remain pending. This does not make page-specific organization/person/trip schema fields editable automatically.

### Fallback image for sharing metadata
Migration 076 projects the published fallback image as the effective website sharing image only when `seo.socialImage` is absent. Explicit website sharing images remain authoritative; a revoked/unavailable explicit image does not silently switch to fallback. Selected fallback media uses the same approved/ready/WebP/current-rights checks and narrow public field projection as explicit sharing media. Page-level sharing overrides still take precedence in the application resolver.

Draft SEO resolution now applies the same precedence and identifies `Website fallback image` as the source when appropriate. Existing root/detail SEO consumers receive the resolved public sharing image through the narrow settings RPC, so no additional rollout switch was introduced. Migration must precede relying on this behavior. This covers social metadata fallback; it does not replace required editorial hero images or introduce automatic on-error substitutions in visible image components. Visible optional-image fallback policy remains to be completed where applicable.

### Settings revision history and restore
The settings editor exposes the existing recent revision history, identifying current draft and published revisions. Editors can restore an older revision after confirmation; the request includes the expected current revision and the backend creates a fresh draft. Unsaved edits/busy state disable restoration. Reload clears prior impact acknowledgement and revision-bound checks. Configuration permissions on sensitive restored values remain database-enforced.

Database tests prove published settings remain unchanged, draft history is retained, approvals reset and stale expected revisions are rejected. Synthetic desktop/mobile QA exercises cancel/confirm, restored fields, retained history and unsaved-change blocking. Real-provider permission/conflict handling remains an acceptance item. The initial read exposes 20 revisions; the older-history API and loading control described below extend access beyond that page.

### Settings editorial review
SettingsWorkspace now exposes revision-bound submit, approve and request-changes actions according to returned permissions/review state. Unsaved edits and busy state disable actions; responses reload the saved revision and discard earlier impact acknowledgement. Messaging explicitly distinguishes approval from publication. No publish/unpublish button or trusted-validation request is enabled yet.

Database tests cover author self-approval denial, stale approval denial, changes-requested/resubmission, successful separate approval with unchanged published revision, and publication refusal without trusted validation. Existing configuration guards continue to protect sensitive settings. Browser QA exercises the review component's transitions and exact revision callback with synthetic transport; real provider role/account acceptance remains pending.

### Settings completeness findings
Saved-draft checks require a main navigation reference, reject duplicate featured records and report whitespace-only link labels at their exact field paths. Configured contact addresses require a visible label and address; configured social profiles require visible link text. Empty optional address/profile collections remain valid. These are release-preparation findings: incomplete drafts can still be saved for later work, and checks never rewrite their content.

These checks supplement schema, media, URL and published-reference evidence. They do not remove `settings_delivery_not_ready`, enable a trusted settings publication policy, or replace provider/concurrency acceptance. Local validation tests cover incomplete, corrected and omitted optional values without mutating the input.

### Older revision history API
Migration 077 adds `cms.list_revision_history` for authenticated readers under existing record/revision row-level permissions. `GET /api/cms/history?site=<uuid>&record=<uuid>&before=<revision-uuid>&limit=20` returns `{result:{recordId,items,nextCursor}}`; `before` is optional and `limit` ranges from 1 to 100. Items contain only revision ID, parent revision, author ID and creation time. No draft payload is returned. Responses are private and uncached.

The cursor is resolved within the selected record and website, retaining database timestamp precision. Descending creation time plus UUID ordering handles equal timestamps. `nextCursor: null` marks the last page. New saves ahead of a cursor do not shift older entries. Inaccessible records return no history; a cursor from another record is rejected. The application validates response shape, identity, page size, duplicate IDs and cursor consistency before returning it.

The settings UI starts with its existing 20 entries and offers Load older revisions when that page is full. It appends older entries without replacing the draft, exposes a terminal-history message, and permits restoration from the expanded list using the existing expected-current-revision guard. Failed requests preserve the current list and cursor for retry. Busy/unsaved states disable loading and restoration. Reloading settings clears older-history state; stale load responses are discarded. A full final page may require one additional empty request to establish the end. Migration 077 is local only. Existing restore authorization remains unchanged.

Synthetic desktop/mobile browser checks exercised initial count, failure/retry, terminal page, dirty-state blocking and cancel/confirm of an older revision. Provider deployment, real-account permissions and cross-site race acceptance remain pending.


### Settings dependency release checks
Migration 078 closes the gap between a published menu existing and its linked content remaining available. Settings reference evidence now reports a menu unavailable if any of its public reference evidence is unavailable. The public navigation reader retains its existing ability to prune unavailable entries; that fallback does not make a fresh settings release ready.

Before a settings release, a private database helper follows the published menu/destination reference graph from configured menus and featured records. It locks referenced records and their image-rights rows for the transaction, checks publication/locale/current media availability, and retains existing type/route/public-reader checks. Traversal is bounded to 2,000 distinct records and 4,000 edges and rejects a reference back to the settings record. Only navigation and destination records expand the graph, matching current public-reader relationships. Immutable revisions supply payloads after publication pointers are locked. The helper and menu-readiness predicate are not directly callable by authenticated or anonymous clients.

Database regression coverage proves menu target withdrawal and revoked target media make settings evidence unavailable and prevent release; restoring availability allows the release. This is sequential PGlite coverage, not proof of concurrent PostgreSQL execution. Real-provider multi-session races, graph-boundary fixtures, lock contention/deadlock retries and long-running rights-expiry behavior remain acceptance items. Overlapping graphs can acquire locks in different traversal orders; PostgreSQL may abort a transaction on deadlock, requiring a fresh retry rather than assuming publication succeeded. Migration remains local and settings publication policy stays disabled.


### Deep dependency regression and editor recovery messages
Additional PGlite coverage exercises settings → featured destination → paired destination → journey, including a pairing cycle and repeated roots. A withdrawn deep journey blocks release and marks the featured destination unavailable; restoring it permits release. Cross-website, wrong-language and settings-self roots are rejected. Repeated roots are deduplicated; the test does not claim to exercise the 2,000-distinct-record or 4,000-edge limits.

The API now translates settings dependency, unsupported link/route and invalid history-cursor errors into actionable editor messages, without exposing database details or hints. Editors are told to recheck published content/language/media rights or reload the history workspace. These messages do not retry publication automatically.

The local shell has no `psql`, `postgres`, `initdb`, `pg_ctl` or `docker` executable on its current PATH. Consequently, simultaneous PostgreSQL transaction testing is still unverified; PGlite's sequential checks must not be used as proof of that acceptance gate.

### Settings trusted publication policy

Local migration 103 enables `settings-1`. This supersedes the unconditional `settings_delivery_not_ready` finding and earlier notes that no settings validation policy exists. Existing shared consumers cover branding/header, footer/contact, messages, cookie wording, search configuration, SEO/sharing, error messages and maintenance presentation. Deployment switches remain off unless explicitly configured; enabling the database policy does not enable any website consumer or apply migrations remotely.

The validator accepts only complete English settings with a null route, required main menu, supported search types, language selector disabled, current media/reference evidence and verified links. Unsupported search types/localized delivery remain actionable errors. Existing database guards retain independent approval, immutable revision receipts, sensitive configuration permission, processed media, URL checks and locks/rechecks on menu/featured dependencies. These checks run again at publication, so a previously valid receipt cannot release a withdrawn menu.

Acceptance tests use `cms.save_draft`, separate author/reviewer/publisher actors, the real trusted validation worker and `cms.publish` in PGlite. They prove pre-validation refusal, self-approval refusal, successful settings/header public reads, dependency withdrawal refusal, invalid replacement isolation and restore-as-new-draft requiring fresh review/validation. The background worker also acknowledges a complete settings revision under the matching policy version. Full local CMS suite: 652 passing; TypeScript passing. This is sequential local database evidence, not proof of managed-provider permissions, multi-connection races, production delivery or deployment readiness. Settings admin release controls are the next integration step.

### Settings admin release controls
The Settings workspace now permits eligible users to request trusted checks for saved English revisions and exposes publication/withdrawal controls from the returned publish permission. Publication requires an approved revision and is disabled when that revision is already published. Both release actions show the exact revision and require a second confirmation; changes to revision, review state, permission or dirty/busy state discard pending confirmation. The request handler also checks the selected revision before sending it. Server authorization, trusted receipt validity, sensitive configuration permission and dependency guards remain authoritative.

Withdrawal explicitly explains that website surfaces using CMS settings can become unavailable and recommends restore-as-draft for corrections. Success messaging distinguishes publication from deployment rollout. Existing draft impact review, history and independent review remain in place. Earlier notes saying these controls or trusted-check requests are unavailable are superseded.

Regular Playwright (Browser plugin not available) exercised the actual SettingsWorkspace with a simulated API at 1280px and 390px: trusted request, canceled release, exact publish identity, refreshed publication state, withdrawal, dirty-state confirmation invalidation and permission hiding all passed without captured browser errors. Mobile screenshot inspected. This isolated fixture uses the public shell and does not prove final authenticated admin styling or real-account/provider integration. Fixture removed. Existing backend release/rollback acceptance remains covered by the prior 652-test suite.
