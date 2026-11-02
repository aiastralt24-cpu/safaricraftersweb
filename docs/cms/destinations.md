# Destination content

The independent destination draft contract is defined in `lib/cms/destinations.ts`, based on the existing `Destination` model in `lib/data.ts`. Schema version 1 covers identity/geography, rich/concierge status, planning copy, seasons/wildlife/photography, homepage teaser copy, hero and gallery, video descriptors, highlights, related journeys/expeditions, habitat and access, field intelligence, destination pairings, FAQs, SEO, research sources, editorial headlines/copy and scoop entries.

Images use inspected CMS asset IDs and alternative text rather than legacy file URLs. Optional video descriptors use asset IDs and poster/transcript/caption information; video processing and publication are not enabled by this schema. Related journeys, expeditions and pairings use record UUIDs rather than legacy titles or slugs. The migration must resolve those identities explicitly and preserve original source data for review. Existing source content has not been transformed or overwritten.

Draft creation requires a valid slug/title and the complete structured shape, but permits empty editorial text and missing images so authors can work incrementally. Field lengths and collection limits are enforced on the server. Unknown fields, duplicate relationships, malformed source URLs/dates and meaningful images without alt text fail validation. The content API requires `/destinations/<slug>` to match the payload. Existing URL changes remain subject to the database's separate route-migration rule.

Advisory destination validation provides incomplete-field guidance and always reports `publication_not_ready`. There is no destination trusted publication policy yet. Full reference resolution, media availability, required publication fields, visitor projection, live detail/list/search/sitemap integration, migration and an editor/preview remain pending. Direct authenticated database writes remain governed by the existing generic save-draft RPC; the new full shape validation currently occurs at the HTTP save boundary. Trusted publication must independently revalidate stored data before any live delivery.

This contract covers the existing individual Destination model. Country and regional atlas templates, hardcoded hero overrides and bespoke country editorial components have separate content requirements. They must be inventoried/mapped before claiming all destination pages are client-editable. The current website still renders from its existing source.

Verification: schema roundtrip retains editorial/field-intelligence/FAQ/source content; negative tests cover unsafe and unknown inputs, duplicate references and missing alt text; API tests verify caller identity and route validation. This does not prove visual rendering, migration fidelity or production integration.

## Destination editor

The CMS now has a Destinations workspace with a paginated record list, new draft creation, optimistic saves, unsaved-change protection and restore-as-draft revision history. Existing incompatible payloads are retained and shown as needing migration instead of silently reshaped. Saved slug and locale changes are disabled; route migration remains separate.

The editor covers every field in destination schema v1: page/planning copy with character counters, field intelligence, editorial headings and scoop entries, ordered highlights/best-for lists, image selection and metadata/gallery ordering, related record selection, pairing copy, FAQs, research sources, video descriptors and SEO overrides. Video descriptors are explicitly draft-only. Missing required collection fields prevent saving; incomplete narrative fields can be saved as drafts.

Synthetic browser verification exercised new draft creation, title/slug/country/description changes, save/reload and saved-URL locking. This verifies the client flow with a controlled API fixture, not managed-database integration or full collection/media interactions. Secure destination preview, live rendering/publication, migration and country/atlas content remain pending.

## Draft preview and sharing

Destination drafts now have an in-editor content preview and can use the existing recipient-bound preview sharing controls. Sharing is disabled while local changes are unsaved. The secure viewer renders the selected saved destination revision through the same schema-validated component. Images continue through the private media loader and require current media access. No related records are fetched by this component; it shows saved pairing copy and explicit reference IDs instead. Video playback and planner submission remain disabled.

The preview shows destination narrative, field intelligence, editorial notes, gallery, FAQs, planning copy and research sources, plus a small review of homepage/SEO overrides. It explicitly describes itself as a content preview rather than the final website layout. Final public design, complete SEO presentation, referenced content resolution and video delivery remain pending.

An embedded-database destination scenario verifies that later edits do not alter a shared revision, other recipients are denied and revoked previews become unavailable. A synthetic browser fixture verifies narrative, region labeling, reference boundaries and FAQ expansion; it was removed afterward. No real preview was shared or live content published. Managed-provider and media-access end-to-end checks remain outstanding.

## Destination readiness checks

Saved destination drafts can now run advisory checks through the existing validation panel. The API reads the stored revision, obtains current nested media status and resolves stored journey/expedition/destination references using the caller's token and selected website. It rejects mismatched reference response identities and does not accept browser-provided availability claims.

Checks require country, description, introduction, best months, listing and hero images; validate all nested image asset availability; reject self-pairings; and require available, published related records in the same locale. Video descriptors remain blocked pending video processing/delivery. A missing or inaccessible reference yields an unavailable finding without disclosing its details. Clean draft readiness still includes `publication_not_ready` and never grants publication or enqueues trusted destination validation.

This is advisory evidence at check time. The related-record check currently establishes a published pointer, not that every related public renderer is available. Trusted-worker reference inputs, publication-time reference locking/rechecks, withdrawal behavior and final public rendering must be implemented before enabling destination publication. Embedded/unit tests cover readiness states and the caller-scoped stored-reference lookup; production integration remains pending.

## Public renderer implementation (not connected)

`components/CmsDestination.tsx` and `app/destinations/cms-destination.css` implement a visitor-facing destination layout for the independent CMS. It covers hero/caption/credit, narrative/editorial copy, facts, highlights, field intelligence, scoop notes, gallery, resolved related links, FAQs, research citations and a planner CTA. Homepage teaser/listing fields and SEO metadata are intended for their separate list/metadata consumers. Unsupported video remains blocked by the projection.

`projectPublishedDestination` validates an exact destination envelope, route and required fields, then requires one published-reference descriptor for every stored related relationship. It validates type-specific local routes and same-language targets, rejects duplicate/extra/missing descriptors and self references, and removes raw relationship UUIDs from the visitor content/cards. It is a projection, not an authorization mechanism: its future caller must source both inputs from publication-authorized database readers and independently verify current media rights.

No public route imports this renderer yet. Destination public SQL/media authorization, trusted worker reference inputs and publication-time checks, current-reference withdrawal behavior, route/list/search/sitemap integration and browser visual testing remain pending. The current website is unchanged. Unit tests verify the projection contract and failure cases; TypeScript verifies component integration types, not rendered appearance.

## Trusted relationship evidence

Migration 041 adds service-only `get_destination_reference_status` and augments destination `get_validation_input` results with locale and reference status. Evidence is derived exclusively from the requested current saved revision. Targets must belong to the same website and expected content type and cannot be the source record. Published status requires a published revision, matching type-specific path/slug and current nested media availability. Locale is returned for the shared validator's language check. Missing/wrong-site/wrong-type targets yield only unavailable status. Malformed stored relationship arrays fail rather than being silently ignored.

Both direct and queued validation workers now pass this evidence through the shared destination checks. No destination validation policy is registered yet: publication remains blocked while transaction-time relationship checks and public delivery are incomplete. This input does not recursively prove every linked destination's own references are valid. Future public readers must account for withdrawals and related media changes at read time.

SQL verification covers caller denial, real worker input/schema compatibility, wrong type/site isolation, published-route mismatch, withdrawal and current-revision identity. Tests use embedded PostgreSQL rather than concurrent managed-provider sessions. Migration 041 has not been applied remotely.

## Publication-time relationship guard

Migration 042 adds a destination-specific BEFORE UPDATE trigger for a changed, non-null published revision. It validates relationship array shapes and bounds, rejects duplicates/self-pairings, locks related records in UUID order and checks website/type, locale, published revision and matching route/slug. It locks each related image object and rechecks current media rights/inspection before permitting the source pointer update. Failures roll back the publication change.

This protects the publication transaction even when earlier validation evidence became stale. It does not register a destination publication policy, authorize a publication, recursively validate linked destinations, or automatically withdraw source destinations after a later linked-record change. Public readers must recheck availability; that integration is still pending. Mutually linked concurrent publications can produce database-detected deadlocks and require retry; true multi-client managed-provider behavior has not been verified.

The new SQL scenario uses operator-level pointer writes only to isolate the trigger from the deliberately disabled destination publication policy. It proves rejection after withdrawal/no publication, locale mismatch, route mismatch, related-image rights revocation and self pairing; successful update after rights restoration; and preservation of the original draft and null published pointer after failures. No production publication took place.

## Published destination reader

Migration 043 adds `get_public_destination` for anonymous/authenticated reads of the exact published revision. It filters root payload fields and resolves direct relationships from their published revisions. Its private graph helper checks nested destination relationships, website/type/language, route identity and current image availability. Withdrawn dependencies and revoked rights make delivery unavailable. Traversal handles cycles and has explicit node/edge bounds; excessive or malformed graphs fail closed.

`/api/cms/published/destinations/[slug]` uses the existing opt-in public-delivery configuration and anonymous key, validates locale/query inputs and projects the database response through the strict destination schema. Responses disable caching. Missing content returns 404; disabled or failed delivery returns 503 without upstream details.

Embedded database and API tests cover published-revision isolation, field filtering, nested withdrawal, rights revocation, circular pairings, isolation and malformed responses. These are local checks. Destination-only asset authorization, live page/list/SEO integration, visual verification and publication-policy enablement remain pending. No remote migration or live source switch was performed.

## Destination public images

Migration 044 extends `media_is_published`, so the existing public image endpoint and private-bucket storage policy can serve processed WebP images referenced in a published destination's listing, hero, gallery or SEO social-image fields. Arbitrary private fields and later draft revisions cannot authorize access. The published destination graph must currently pass `destination_delivery_references`; withdrawn relationships or unavailable nested media therefore stop image delivery too. An asset legitimately used by another available published record can remain public through that record.

Embedded SQL tests verify anonymous metadata and storage access together, including draft/private-field isolation, wrong-website denial, linked withdrawal, rights revocation/restoration and destination withdrawal. All 290 CMS tests passed. Managed-provider storage behavior and performance at production graph sizes remain unverified. No remote migration or live destination route change was made.

## Opt-in destination detail routes

`CMS_DESTINATION_RENDERING_ENABLED=true` connects individual `/destinations/[slug]` pages to the published destination reader and visitor renderer. It additionally requires public delivery configuration. The flag defaults to false. Missing published records return not-found, and unavailable upstream delivery fails rather than restoring legacy content. Country and regional-atlas slugs, including Uganda/Rwanda aliases, retain their existing specialized templates; migration of those templates is separate. Do not create individual destination records at these reserved URLs.

The route is dynamic, with request-scoped React deduplication and uncached RPC reads. Metadata uses the saved SEO fields and processed public image URLs, falling back to the published title, description and hero. This changes the rendering/cache strategy of the shared route even while the source flag is disabled. Global SEO inheritance, catalogue/list/search/sitemap consumers, browser visual checks and full provider UAT remain pending. Tests cover source selection and metadata mapping; TypeScript, all 292 CMS tests and the production build pass locally. No source flag was enabled.

## Published catalogue reader

Migration 045 exposes `list_published_destinations` to anonymous/authenticated readers with website, locale, UUID cursor and a page size capped at 100. Summaries derive only from published revisions and include listing copy/image, geography, modification time and indexing/sitemap preferences. Every candidate must pass the current destination dependency graph check. No draft narrative or internal notes are projected.

`readPublishedDestinationList` validates each summary, checks increasing record IDs and unique routes, bounds total traversal and sorts completed results by title. Its configured RPC reader uses only the anonymous key and uncached requests. Catalogue consumers must still exclude reserved country/atlas URLs and respect their own SEO/discovery rules. Concurrent publications across separate pagination requests do not form a database snapshot; production performance and provider integration require verification.

TypeScript and all 295 CMS tests pass locally. Listing/search/sitemap consumers have not yet switched to this reader. No migration was applied remotely.

## Search and sitemap consumers

Search and sitemap now share destination discovery selection with the `CMS_DESTINATION_RENDERING_ENABLED` rollout. With the flag disabled they retain legacy entries without requesting the CMS. With it enabled, published catalogue entries replace individual legacy destinations; missing records and failed reads never fall back. Reserved country/atlas URLs remain owned by their existing specialized templates, using one shared reserved-route list. CMS records colliding with reserved URLs are excluded from discovery.

The sitemap omits summaries with `indexing=noindex` or `sitemap=exclude`; noindex takes precedence over explicit inclusion. Internal search intentionally retains published noindex pages. Global SEO inheritance is not yet implemented. Tests cover flag-off isolation, replacement/withdrawal behavior, reserved collisions, upstream failure and sitemap preference precedence. TypeScript, all 297 CMS tests and the production build pass. Destination landing/list integration and browser visual checks remain pending; the rollout flag is still disabled.

## Destination landing catalogue

With the destination rendering flag enabled, `/destinations` now displays published catalogue cards with inspected image URLs, descriptions, countries and best months. Visitors can filter by text and region, clear filters and use the planning link when no entries match. Regional atlas links remain separate and use their existing content; CMS records at reserved URLs are excluded. Disabled mode preserves the existing landing layout. The shared route is dynamic.

A temporary local fixture verified text filtering, region filtering, clearing, result counts and no-results behavior through the browser, with local sample images. It was removed along with its image route after verification. TypeScript and production build pass. This is not real-provider or mobile verification. Landing headline/copy, atlas editing, season filtering, global content integration and full destination detail visual checks remain outstanding; the source flag remains disabled.

## Responsive detail verification and planner context

A synthetic published projection rendered through `CmsDestination` was checked at 390px and 1280px. The hero and gallery images loaded, neither viewport showed document-width overflow, and the mobile FAQ expanded. Its planning CTA navigated to `/plan?destination=kanha`, where the existing destination context appeared. The fixture and temporary image route were removed and the viewport reset afterward. This covers the sampled content/layout, not every content combination or managed-provider delivery.

The planner now awaits published CMS destination context for individual destination URLs while the destination rollout is enabled. Country/atlas routes retain legacy lookup. Missing published records do not fall back to legacy destination data, and upstream errors remain errors. This fixes the legacy-only lookup that would otherwise omit context for new CMS-created destinations. The new source branch still needs real-provider end-to-end verification. All 297 CMS tests and production build pass; no rollout setting was enabled or enquiry submitted.

## Nested trusted readiness

Migration 046 strengthens service-only destination reference evidence: a paired destination must pass the bounded public delivery graph check, in addition to the existing published pointer, route and media checks. Thus a nested dependency withdrawal makes the pairing's `published` readiness false even if the direct paired record still has a published revision. The record remains identifiable to the trusted worker as available; the nested record's details are not added to the evidence response. Restoration is observed on the next validation read.

All 298 CMS tests pass, including withdrawal/restoration through real worker input and editor denial of the evidence RPC. This change does not register a destination publication policy. Publication enablement still needs explicit eligibility rules for reserved country/atlas URLs, supported live languages, unsupported related content renderers and processed image types, followed by workflow integration and provider verification.

## Processed-image and live-route eligibility

The shared destination checks now explain that non-English destination routes and independent photography-expedition links are not ready for publication. These checks preserve draft editing; they do not remove the requirement to implement those capabilities for the complete CMS.

Migration 047 requires destination images to have `image/webp` MIME in addition to current approval, inspection and archive checks. This applies to media evidence and public destination availability. The existing publication media trigger also rechecks MIME while holding each image lock, closing the gap between validation and publication. Other content types retain their prior checks.

TypeScript and all 300 CMS tests pass. The added database scenario verifies denial for approved JPEG metadata, publication rejection, success after processed WebP metadata and immediate delivery denial if metadata later changes back. These synthetic operator writes isolate enforcement; no production content or storage was modified. Reserved URL eligibility, validator policy registration and workflow UI remain pending.

## Reserved URL ownership

`destination-route-ownership.ts` now supplies a deployment-owned list of specialized country, atlas and alias slugs. Visitor route selection, discovery and shared destination readiness checks use this same inventory. Tests derive country slugs from current source content and compare the full expected inventory; adding a country or atlas requires updating this manifest and its database registry in a new migration.

Migration 048 creates `destination_reserved_paths`, inaccessible to anonymous/editor roles, and rejects publishing an individual destination at those URLs. It also rejects changing an already published record's path or type in a way that violates destination ownership. Drafts remain allowed so existing content can be reviewed and migrated. The gateway provides an actionable reserved-route error.

TypeScript and all 302 CMS tests pass, including exact application/database inventory agreement, registry mutation denial, publication rejection and published-route move rejection. Synthetic operator pointer writes isolate this guard from the still-disabled publication policy. No remote migration applied. Trusted validator registration and workflow controls remain pending.

## Trusted publication workflow

Migration 049 registers validator version `destination-1`. The shared destination validator can now report passing content checks for eligible complete revisions: supported English route, non-reserved matching slug, required copy/images, current media evidence, same-language published relationships, and no unsupported video or expedition delivery. It no longer adds an unconditional draft-only finding. Advisory results still cannot authorize publication; the existing service-only receipt, expiry, current-revision, approval, role and transaction-time guards remain authoritative.

The destination workspace now supports trusted validation requests and editorial submit, approve, request changes, publish and withdraw actions. Actions respect loaded permissions, review state and unsaved changes. Publication/withdrawal prompt for confirmation, and withdrawal targets the published revision. Restoring older content continues to create a new draft.

All 303 CMS tests pass, including end-to-end embedded database validation/publication using the real validator, separate approval, receipt-required rejection, invalid replacement rejection and preservation of the earlier public snapshot. Production build including TypeScript passes. UI browser testing and managed-provider verification remain pending. Migration 049 has not been applied remotely, no worker or rollout flag has been enabled, and no real destination has been published. Staging rollout must include compatible journey delivery for linked journey records; remaining locale, expedition and country/atlas implementations still require their own work.

## Workflow control verification

Publication and withdrawal now use inline confirmation showing the selected revision. Cancel does not dispatch an action. Confirmation rechecks permissions, disabled state and the current/published revision; pending confirmation is cleared when those inputs or review state change.

A temporary synthetic browser fixture verified the actual component's unsaved blocking, review transitions, cancellation, explicit publication, published-revision withdrawal and hidden controls without permissions. It performed no API calls or real publication and was removed afterward. TypeScript passes. This does not replace full workspace/managed-provider end-to-end testing, which remains pending.

## Unsaved destination history

Destination workspace edits now use the shared bounded in-memory draft history. Undo/redo covers the full destination payload and locale, including nested editorial fields, ordered lists, references, media and SEO. Restoring a snapshot marks the draft dirty; save/load/new/restore boundaries clear history even for identical incoming content. History controls lock during pending imports/migrations, other operations, or read-only access. Account changes remount this workspace through its existing account/site key.

Verification: 51 targeted destination/history tests passed. A local browser fixture using the actual workspace verified collection deletion recovery, redo, busy locking, save reset, record switching and new-draft locale history without page errors. The fixture API was in memory and the temporary route was removed. Destination autosave, concurrent-save reconciliation and provider/client verification remain pending.

## Concurrent saves and opt-in autosave

Existing destination drafts now offer three-second opt-in autosave, using the normal revision-checked draft save. Invalid content, pending imports/migrations and other operations suspend it. New destinations require a manual first save. Saving locks editing and navigation; loading/creating another draft disables autosave. Failures preserve content and disable autosave without retrying indefinitely. Account changes use the existing account/site workspace remount boundary.

A conflicting save fetches the latest caller-scoped destination. Identity, type, route, language, revision and edit permission must match before comparison is available. The comparison includes optional image, hero-image and video additions/removals. Independently changed fields are suggested automatically; overlapping changes require a choice. Collections and nested objects remain whole values. Applying choices only updates the local draft and its expected revision, resets history and requires another explicit save. Cancel preserves unsaved content; another competing revision triggers another comparison. Autosave stays off after conflict recovery.

Verification: 56 targeted destination/journal-conflict tests passed. The real destination workspace with an in-memory API passed browser checks for debounce, invalid-field waiting, manual-save cancellation, offline failure/no retry loop, explicit re-enabling, conflict pause/cancellation, choosing a local title while retaining a remote country edit, revision-safe resaving and new-record exclusion. The temporary fixture was removed. Real-provider concurrency and independent client acceptance are still required.
