# Independent public content delivery

Local migration 033 restricts `get_public_page` to journey/page/homepage records and projects only known public top-level payload fields. Reads resolve the published revision rather than the current draft, match website/path/locale, and retain the existing immediate media-availability check. Database RLS on draft tables remains unchanged. Nested payload validity continues to depend on trusted publication checks; the SQL projection is not a complete JSON-schema validator.

`GET /api/cms/published?path=/journeys/example&locale=en` is a read-only application boundary. The website UUID is configured server-side; query overrides and repeated parameters are rejected. Journey and composed-page payloads are structurally validated again before response. Missing publications return 404; disabled/unconfigured or invalid delivery returns 503. All responses are private/no-store, including failures, so a withdrawal is not retained by this application cache. Public page API responses contain record/revision identities, type and validated payload, not editor history or permissions.

Set `CMS_PUBLIC_DELIVERY_ENABLED=true` only in a prepared environment with `CMS_WEBSITE_ID`, `CMS_SUPABASE_URL` and `CMS_SUPABASE_ANON_KEY`. The transport deliberately does not use the service-role key. It calls only the narrow published-page function. Invalid upstream content fails closed instead of falling back to an old snapshot.

This endpoint is not a completed website cutover. Existing website pages continue to use their current source. Public image delivery, actual journey/page renderers, global settings and menu consumers, referenced-record resolution, sitemap/search invalidation and staging UAT remain required. Composed-page publication remains blocked by its validator until renderer/dependency checks are complete. Publicly returned nested data must remain covered by versioned validators before new types are enabled.

Local tests cover published/draft separation, private top-level field stripping, missing locale/site, malformed payload rejection, query overrides and public-key-only transport. They do not prove real provider permissions or CDN invalidation behavior.

## Published image delivery

Local migration 034 adds `get_public_media` and a restrictive publication-aware storage read path. The processed-image bucket remains private. Anonymous reads require an inspected WebP with current approved rights, no archive flag, and an asset reference in a published journey/page/homepage with a route. Draft-only references, missing/withdrawn rights, wrong websites and unpublished records do not authorize access. Original uploads keep their separate private storage policy. Existing authenticated media-library access is preserved.

`GET /api/cms/published/media/<assetId>` shares the disabled-by-default public delivery setting and server-configured website. It uses the anon key for both descriptor and storage reads, validates the exact site/asset/delivery.webp key, bounds bytes, checks MIME/length/SHA-256, and re-reads current authorization after fetching before returning image bytes. Responses are no-store and do not expose signed storage links or service credentials. A failed final authorization returns no image. An already downloaded image cannot be recalled; these controls govern new reads, not copies retained by visitors.

Local SQL tests exercise draft/public reference transitions, rights expiry, website boundaries and anonymous storage visibility. HTTP tests cover malformed paths, wrong MIME, truncation, overflow, hash mismatch, withdrawal/descriptor change during fetch, and public-only credentials. Managed storage/CDN behavior and real deployed image rendering still require staging validation. The current public website has not been switched to this route.

## Journey detail renderer

`CMS_JOURNEY_RENDERING_ENABLED=true` switches `/journeys/[slug]` to the independent published journey reader and renderer. It requires public delivery configuration; the default is false. Missing published records return not-found. Invalid content or an unavailable connection fails rather than reviving a Git/Sanity copy. Metadata uses the published SEO title/description with title/summary fallbacks and the existing journey canonical route. Social-image and structured-data integration are still pending.

The renderer displays published summary/intro, region/duration/season/group/difficulty/price guidance, ordered itinerary, FAQs, gallery and hero/mobile image selection. Public images use the verified image API directly rather than the Next image optimizer cache. The planning link continues to the existing `/plan` flow; independent form assignment, global settings/menu delivery, additional legacy journey fields, listings and sitemap/search synchronization remain unfinished. This renderer is not sufficient for a full site cutover.

Journey details now use request-time rendering, including the existing-source branch, to prevent static HTML from masking CMS withdrawal after configuration changes. This increases server-render work compared with the previous static route. Public reads remain no-store; React request memoization shares a read between metadata and rendering within one request. No cross-request published snapshot cache is introduced.

Tests verify sorted published content without source mutation, slug/path validation, missing records, malformed records, configuration and transport failures. Synthetic mobile layout/FAQ interaction passed at 390px with no overflow. The synthetic fixture had no media; real inspected image delivery and the actual enabled route still require staging UAT. The environment switch was not enabled in the current site.

## Published journey catalogue and sitemap

Migration 035 adds a public-credential `list_published_journeys` RPC with fixed website/locale scope, UUID pagination (up to 100 rows), published-only revision reads and the same live media-availability rule as detail reads. Only display fields and a hero descriptor are projected. Draft titles do not change published cards. Withdrawal removes a record from subsequent list requests.

When `CMS_JOURNEY_RENDERING_ENABLED=true`, `/journeys` renders the independent catalogue and the journey subset of `/sitemap.xml` uses the same catalogue. Other sitemap content retains its existing source. Both routes now render on request; they do not retain a static list of removed journeys. An empty catalogue shows a clear no-published-journeys state and contributes no journey detail URLs to the sitemap. Errors fail instead of falling back to legacy listings. Sitemap modification dates come from the published revision creation time, not subsequent draft edits.

The reader validates each summary and cursor progression, reads all pages before returning a title-sorted catalogue, and rejects malformed/partial responses. A defensive ceiling of 100 pages (10,000 records) throws rather than silently truncating; larger catalogues require a streamed/indexed delivery design. Separate paginated reads are not a database snapshot: a concurrent publish may appear on a subsequent request. There is no server-side list cache in this implementation.

Local tests cover published/draft separation, withdrawal, deterministic pagination, multiple-page collection, malformed/duplicate rows, errors and public-only credentials. Enabled staging execution, visual catalogue UAT, full-site search and links to journeys from other collections remain outstanding. The switch remains off.

## Journey search integration

With the journey CMS switch enabled, `/search` now gets journey entries exclusively from the validated published catalogue. Description, duration and best-season text join title/region in the searchable text, while cards keep their concise region label. Other collections retain their existing source. The search route is request-rendered and does not fall back to old journeys on catalogue errors.

Withdrawal removes a journey from the next server-rendered search payload. An already-open browser keeps its loaded result set until it refreshes; this implementation does not push publication events into open tabs. The synthetic browser test refreshed the supplied catalogue and confirmed that only the withdrawn journey disappeared, with an unrelated journal result preserved. Mobile results had no overflow at 390px. No live publication/withdrawal was performed.
