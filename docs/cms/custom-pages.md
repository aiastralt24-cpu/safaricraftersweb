# Custom page delivery — implementation contract

Status: namespace contract implemented; publication and visitor delivery are not yet connected. This is part of the original page-management scope, not an exclusion from it.

## URL ownership

New custom pages can use lowercase ASCII words/numbers separated by single hyphens and slash-delimited segments, up to 500 characters including the leading slash. No trailing/repeated slash, percent encoding, whitespace/control characters, file extensions, query, fragment or dot segments. Inputs are rejected rather than silently canonicalized into another identity.

The first-segment reservations in `lib/cms/custom-page-path.ts` protect deployment-owned page families, API/admin/CMS/auth surfaces, static assets and legacy redirect sources. Reserving a root also reserves every descendant. PostgreSQL migration 156 implements the same eligibility predicate. It is not an authorization grant and is not yet wired into a publication gate. Existing supported About/legal/directory pages continue through their own contracts.

Eligible namespaces are not guaranteed to be unused. Save/publication must still enforce website/language uniqueness, current record identity, permissions, immutable revision validation and any redirect collision rules. Route changes must use the PRD's explicit redirect/affected-reference workflow. No existing draft or published record is rewritten by this contract.

## Required next implementation

- Connect a declared general page template to pure projection and an actual catch-all visitor renderer without shadowing specialized routes.
- Add trusted validation and publication policy/gates for eligible custom paths, including images, download pins, heading schedules and referenced destinations.
- Extend the public database projection, delivery flag and metadata, navigation references, sitemap and search where appropriate.
- Connect new-page template selection and creation; keep unsupported sections/drafts intact with actionable findings.
- Verify anonymous versus draft access, route conflicts, media/document revocation, save/review/publish/restore/withdraw, and responsive rendering using persisted records.
- Complete page hierarchy, duplication with slug/SEO/navigation confirmation, owner/review dates and broader page-management requirements separately. Namespace eligibility does not satisfy these requirements.

## Verification

Tests compare the TypeScript and PostgreSQL policies for accepted paths, every reserved root and child, malformed paths and length boundaries. The application test inspects actual app route-bearing directories, public directories and configured redirect sources so new deployment-owned namespaces require an ownership decision. Empty temporary directories are not routes. All migration tests run locally; no managed-provider migration has occurred.

## Projection and route implementation — 2026-10-23

The custom projection now reuses the approved About editorial section contract (hero, text, image/text, cards, CTA, downloads), then binds the eligible custom path for metadata. It retains schedule/H1, media shape, reference-link and audience restrictions; this is not publication authorization. The shared renderer accepts only its actual inputs, sections and revision ID, so it does not pretend a custom page is `/about`.

`app/[...pagePath]/page.tsx` reads through `loadCustomPageRoute`, using anonymous public-page and published SEO RPCs without draft fallback. It returns not-found for disabled/invalid routes and absent published content. Missing configuration/settings or malformed data fail closed. `CMS_CUSTOM_PAGES_ENABLED=false` was added only to `.env.example`; runtime environments were not changed. Custom pages remain blocked by the existing publication validator until release/database integration is finished.

Tests cover path binding, document pins, metadata canonical, scheduled H1, unsupported locale/region, private payload rejection, anonymous/no-store RPC use and disabled/missing settings behavior. Live local Chromium verified the disabled route returns 404 and `/about` still returns 200 with its H1 and no page errors. Enabled custom-page browser delivery from persisted content remains pending. No temporary app fixture was needed.

## Trusted custom-page release — 2026-10-23

Custom paths now pass through the trusted composition validator using the shared approved editorial contract. Reserved/unconnected routes continue to receive publication-not-ready findings, and unsupported sections or missing document evidence fail validation. This is additive under composition-5; existing approved template contracts are unchanged.

Migration 157 adds a database release trigger. General pages must use an eligible English custom path; specialized About/legal/directory routes retain their existing guards. A published custom page cannot change path/type/language during a release. The guard rechecks link availability under locks, allowing validated local anchors and mail links under the existing grammar. Existing global media and document-reference guards still apply. No remote migration has run.

The persisted local lifecycle proves draft privacy, approval/receipt requirements, trusted validation, anonymous projection, old release stability during editing, refusal of path takeover/rename, link withdrawal after validation, restored-content revalidation and withdrawal. It uses real PGlite database operations and validator receipts; no synthetic receipt is used for this custom-page lifecycle. A queued empty custom page now reports its missing valid composition rather than the old unsupported-route finding. Full regression exposed and resolved an eager module-binding cycle in the section-list alias.

Client workflow controls, enabled visitor-route testing against persisted content, dynamic navigation/link evidence, sitemap/search and managed deployment remain unfinished. The visitor flag remains disabled. This supersedes the earlier statement that the validator rejects all custom pages.

## Client editing and workflow — 2026-10-23

The Pages workspace now recognizes saved English custom pages as supported for trusted checks and review/release actions. Its messages and confirmation identify the custom-page rollout; visitor delivery remains disabled until enabled deployment acceptance. The default new-page choice is Editorial page, which starts with one H1 text introduction and an empty path requiring client input. Blank drafts remain available.

Eligible custom paths use the approved shared section palette. Existing unsupported sections remain preserved with guidance. Browser fixture checks at 1280px/390px exercised the actual workspace against simulated API state: correct palette, cancel without mutation, revision-bound publication, withdrawal and release disabled after unsaved edits. These tests complement the real SQL lifecycle; they do not claim browser-to-managed-provider integration. Temporary route removed after screenshot inspection.

## Custom-page navigation references — 2026-10-23

Migration 158 extends the shared navigation evidence resolver and release guard to published custom `page` records. Evidence uses the published composition title, eligible custom path, matching website/language and public-page media eligibility. The release trigger locks the page record and its image references, checks custom namespace ownership and recomputes availability. Fixed specialized pages continue to use their existing URL targets; this change does not make all page paths valid record targets.

The TypeScript evidence schema, trusted menu validator and public menu projection accept the same custom-page target contract. Missing targets suppress their subtree, and malformed/reserved paths fail. The existing CMS record picker already offers page records; no editor layout changed. Clients must coordinate custom-page and navigation rollout: a server publication pointer alone does not enable the disabled visitor feature flag.

The real custom-page lifecycle now publishes a menu with a trusted navigation receipt, resolves its custom page URL anonymously, prepares a reviewed replacement menu, withdraws the page, observes the live menu item disappear, and confirms release of the replacement fails despite its earlier successful check. A new validation then reports the unavailable target. The test initially attempted validation of the superseded menu revision; that fixture was corrected to validate the current revision while preserving the pre-withdrawal receipt for the release-race assertion.

## Sitemap discovery — 2026-10-23

Migration 159 adds an anonymous, website/language-scoped, cursor-paginated custom-page summary RPC. It reads published revisions only, rejects reserved namespaces and requires current public-page/media availability. Summaries expose identity, URL, published revision timestamp/title and allowlisted scalar SEO fields; no section bodies, file references or private metadata are returned. The local lifecycle proves drafts are absent and withdrawn pages disappear.

The application reader bounds pages/batches, checks ordering and duplicate paths, rejects malformed summaries and resolves published SEO defaults. Sitemap integration follows the same custom delivery flag as the visitor route. Page/site noindex, explicit sitemap exclusions and alternate canonical URLs are excluded. Disabled rollout makes no discovery fetch. Tests exercise both boundary behavior and inherited SEO rules. Managed rollout and enabled visitor-browser testing remain pending; public search has not yet been connected.

## Site search — 2026-10-23

Published custom summaries now feed the public search route when custom delivery is enabled and the configured searchable types include `page`. The search category map and interface include Pages; product/project search remains unsupported and still receives validation findings. Effective page/site noindex excludes a custom result, while sitemap-only exclusion does not hide an otherwise searchable page. Results expose the published title/path and optional page description, not section bodies or private metadata.

The shared search UI passed local fixture checks at 1280px/390px for category selection, custom-page URL, text query, configured empty wording, reset and exclusion of unconfigured categories. The same published-summary reader already has database draft/withdrawal coverage. These browser checks are fixture-based, not a managed-provider rollout. Temporary fixture removed and mobile screenshot inspected. Enabled persisted custom visitor/browser delivery and deployment acceptance remain pending.

## Persisted runtime and browser verification — 2026-10-23

The existing local lifecycle now runs `loadCustomPageRoute` and `loadCustomPageDiscovery` with enabled test configuration through an anonymous RPC transport backed by real PGlite queries. Published SEO settings come from the actual database RPC. It verifies no draft delivery, published revision identity, inclusion in sitemap/search projections and removal after withdrawal. The transport asserts anonymous credentials, no-store and website identity. This tests the application's runtime readers rather than only calling projectors directly.

For visual QA, `CMS_TEST_EXPORT_CUSTOM_PAGE=1` optionally writes the public projected test result to `/private/tmp/cms-custom-page-public-fixture.json`. Default tests write no snapshot. The actual shared visitor component and custom metadata function rendered that saved database result at 1280px/390px: one H1, expected body, canonical URL, keyboard-accessible contact link, no runtime errors/overflow. Mobile screenshot inspected and temporary route removed. This does not claim an end-to-end browser connection to managed PostgREST or production TLS/auth/storage; that deployment acceptance remains pending. Live feature flags are unchanged.

## Duplicate as a new draft — 2026-10-23

The Pages workspace can prepare a duplicate from a clean, editable English page. It copies composition and SEO content into independent state, clears the canonical override, requires a new eligible custom URL, and requires explicit SEO/social review plus confirmation that no menu entry is created automatically. Editing the title, URL or SEO fields resets the SEO confirmation. Saving uses a null record ID and expected revision, so the normal server save creates a new draft identity and enforces permissions/URL uniqueness. No approval, publication, history or menu membership is inherited.

Unknown top-level payload fields or invalid composition fail duplication rather than being silently discarded. Section IDs remain local to the new page; linked assets/documents retain their references and must pass fresh trusted checks before publication. Specialized directory sections copied onto a custom path remain preserved but must be adapted to supported sections before release. Homepage duplication and non-English duplication are not implemented by this milestone.

Unit tests prove independent copies, canonical reset, retained metadata and unknown-field rejection. Actual workspace fixture checks at 1280px/390px prove confirmation requirements, confirmation invalidation, new-identity save arguments and draft-only completion. The real database lifecycle independently saves the duplicate and verifies distinct record/revision IDs, draft status, no public delivery and unchanged source release. No automatic navigation writes occur. Temporary fixture removed and mobile screenshot inspected.
