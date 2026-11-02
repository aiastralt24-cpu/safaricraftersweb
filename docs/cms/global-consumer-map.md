# Global settings: public consumer evidence

Source audit after specialist editing safeguards. These are implemented code connections, not evidence that the client can change deployed content. All require configured staging, published settings, approved media/references and the applicable rollout gate. Do not recreate these consumers based on older checklist wording.

| Settings | Public entry point and consumer | Gate | Remaining evidence/gap |
|---|---|---|---|
| Brand name, tagline, desktop/mobile logos | Root `SiteHeader` → `readPublishedHeader` → `Header`/`CmsBrandMark`; `SiteFooter` → `CmsFooter` | `CMS_HEADER_SETTINGS_ENABLED`, `CMS_FOOTER_DELIVERY_ENABLED` | Real published revision, approved assets, desktop/mobile comparison |
| Header variants, sticky behavior, main/utility/mobile menus, featured content and CTA | `SiteHeader`, `published-header.ts`, `Header.tsx` | `CMS_HEADER_SETTINGS_ENABLED`; legacy menu-only adapter uses `CMS_NAVIGATION_DELIVERY_ENABLED` | Real menu/reference publication and mobile interaction |
| Footer groups, CTA, legal links, copyright, disclaimer, marks, social and contact details | `SiteFooter` → `footer-settings.ts` → `CmsFooter` | `CMS_FOOTER_DELIVERY_ENABLED` | Deployed click/media/rights checks |
| Announcement and sticky CTA | Root layout wraps children in `SiteMessages` → `message-settings.ts` → `CmsMessages` | `CMS_MESSAGES_DELIVERY_ENABLED` | Real revision switching and narrow-screen overlay/cookie collision checks; admin/studio/preview excluded in code |
| Brand metadata/favicon and organization/contact schema | Root `generateMetadata` and JSON-LD → `brand-settings.ts`/`brand-metadata.ts` | `CMS_BRAND_METADATA_ENABLED` | Deployed head and structured-data inspection |
| SEO defaults, social image, indexing | Root metadata plus per-page resolution → `seo-settings.ts`/`public-seo-settings.ts` | `CMS_SEO_SETTINGS_ENABLED` | Verify every applicable route; global fallback image is projected for SEO by migration 076, not established as a universal missing-content-image replacement |
| Search enabled state, placeholder, empty copy and content types | `/search` → `readSearchSettings` and search UI | `CMS_SEARCH_SETTINGS_ENABLED` | Supported types/locales are bounded; complete search scope remains R21 |
| Cookie text, buttons and policy link | Root `SiteCookiePreferences` → `CookiePreferences` | `CMS_COOKIE_SETTINGS_ENABLED` | Operational consent is already present locally; production analytics approval, cross-browser/storage behavior and retention remain R25 |
| 404 content and link | `app/not-found.tsx` → `readErrorMessage` → `MissingPage` | `CMS_ERROR_SETTINGS_ENABLED` | Real error routes/fallback behavior |
| 500 content and link | `app/error.tsx` → `ServerErrorPage` → public error-message API | `CMS_ERROR_SETTINGS_ENABLED` | Real outage paths; reset button text is still fixed UI copy |
| Maintenance content and link | `proxy.ts` → `maintenance.ts` | `CMS_MAINTENANCE_ENABLED` | Actual host/proxy behavior, exemptions, GET/HEAD 503 and operator recovery; fixed eyebrow is not editable |
| Language selector | Contract/editor exists; publication validation and published-header explicitly reject enabled selection | No completed localized delivery | R20 translation/routes/fallback workflow must precede release |

All public readers also require the common public-delivery configuration. The maintenance/error readers intentionally use bounded fallback behavior during provider failure; this differs from ordinary enabled readers which reject unavailable publication. These paths need separate deployed failure trials.

## Verification

27 relevant settings/header/SEO/search/consent/maintenance/error tests passed in this audit. Source traces establish wiring; the tests cover identity/transport contracts, disabled gates, fallback behavior and selected output semantics. They do not establish every field's rendered behavior, accessibility, responsive layout or real-provider publication.

## Remaining global work

1. Configure staging and execute settings edit → impact review → approval → publish → visitor verification against actual revisions.
2. Validate the table's connections with desktop/mobile content comparison and failed/withdrawn publication scenarios.
3. Resolve fixed public UI copy (including reset/maintenance/skip-link text) against the PRD's every-element editability requirement; do not mark all labels editable.
4. Complete language routing and determine the intended use of fallback images outside SEO before adding consumers.
5. Verify announcement/sticky CTA/cookie/cart overlays together and confirm no inaccessible or obscured actions.

## Overlay correction

A browser fixture using the actual CmsMessages/CookiePreferences styles confirmed that at 390×844 the open cookie panel covered a still-visible/focusable sticky CTA. CmsMessages.css now hides the CTA while a cookie panel or open dialog exists, removing it from keyboard navigation until the overlay closes. In-flow cookie preferences receive bottom clearance when the sticky CTA is present.

After-change checks at 390×844 and 1280×844 verified hidden-link focus exclusion, restored CTA navigation after closing preferences, reopening preferences, and suppression behind an open native dialog. No fixture console/page errors occurred. Screenshots were inspected. Eight consent/public-settings tests passed. Browser plugin was unavailable; Playwright was used with intercepted local HTML and production styles. This is CSS/DOM-state evidence, not a full React consent/cart integration or a deployed-provider check. Full overlay behavior on staging, additional browsers and variable client copy still need verification.

### Migration source fingerprint revalidation (2026-10-23)

Concept, Bespoke and Aviation source inventories now bind the overlay-adjusted `components/CmsMessages.css` hash `9ebfdc07ce5554e8a46fa4ea2d0f43d1a69be26f3fc5bc3efa11bb5a9539b3d1`; their original capture hash was `a35136925bc378cbb52c2fca6ba745c92b47c3c31783d8ad362a2c680975350c`. The added selectors apply only to a CMS sticky CTA with an open cookie panel/dialog or adjacent cookie preferences. Legacy captures have no CMS sticky CTA; captured page content and media remain unchanged. Overlay behavior was independently checked at 390px and 1280px. This is source-dependency revalidation, not a new capture or staging approval.
