# Page SEO drafts

Pages now expose a versioned SEO draft object: title, meta description, canonical HTTPS URL, indexing/link-following directives, social title/description/image, breadcrumb label and sitemap preference. Optional defaults are represented by blank text and explicit inherit values. The editor shows field character counts and whether a value is an override. It does not yet resolve the actual inherited value/source.

The page editor preserves other payload fields and saves SEO in the same optimistic revision as page composition. Existing pages without SEO receive initial inherited values when edited. Existing malformed SEO blocks saving for migration rather than being replaced. API page/homepage saves reject malformed SEO when present. Direct database saves are not yet guarded by this complete SEO schema; page publication remains disabled pending trusted complete validation.

Canonical validation rejects non-HTTPS schemes, credentials, whitespace, backslashes and fragments. Arbitrary JSON-LD or scripts are not accepted. Draft advisory findings flag noindex and conflicting sitemap inclusion. Social-image references are covered by existing recursive media checks. These checks do not promise ranking or permit publication.

Validation: 23 tests across SEO, editor API and content validation passed; TypeScript passed. Temporary synthetic browser fixture checked unsafe canonical rejection, corrected input, noindex/sitemap warnings and 390px layout without overflow or console errors. Fixture removed. No live metadata changed.

Remaining PRD requirements: actual default-source resolution, structured-data templates, language relationships, all other indexable types, duplicate-title/link/orphan checks, redirects/robots management, delivered metadata/sitemap/hreflang consumers, publication authority and staging UAT.

## Draft inheritance resolution

Saved pages now have a Resolve inherited SEO values panel. It submits the current form title and validated SEO, reads the authorized page revision and locale-matched settings draft, and returns each calculated value with a source plus the settings revision used. Missing/inaccessible/invalid settings produce an explicit error, not invented defaults. Page changes clear previous results. This is a snapshot of draft settings; it is not proof of currently published metadata, and subsequent settings edits require a new check.

`CMS_PUBLIC_SITE_ORIGIN` supplies this deployment's canonical HTTPS origin. It must contain no path, query, credentials or fragment. Multi-site deployments need site-specific origins before delivery; this deployment-level configuration must not be reused for unrelated public sites. No network fetch is made to canonical addresses.

Resolution rules preserve site-wide noindex regardless of page index overrides; noindex pages and pages canonicalized elsewhere are excluded from the proposed sitemap result. Title templates resolve `%s` against the page title; social fields inherit resolved metadata when blank. The sharing-image result identifies the asset but does not establish approved media rights or produce a public image URL.

Six SEO/resolve tests and TypeScript passed. Synthetic browser checks verified source labels, invalidation after title edits and clean mobile layout/console. Fixture removed. The route is private/no-store and does not write settings, metadata, sitemap entries or publication receipts. Live consumers, structured data, language relationships and staging remain outstanding.
