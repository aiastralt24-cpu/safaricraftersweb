# Specialist profiles

Status: draft contract, API save validation and advisory checks implemented. The client draft editor is implemented; migration and public delivery are pending; profile content previews are connected. No specialist publication policy is enabled.

## Inspected website content

Sources: `app/specialists/page.tsx`, `lib/data.ts` Specialist/EditorialVideo types, `lib/structured-data.ts` personSchema and `sanity/schemaTypes.ts` specialist model.

| Website behavior | CMS field or remaining work |
| --- | --- |
| Name, role, expertise and biography | `name`, `role`, `expertise`, `bio` |
| Field quotation | Optional `moment` copy |
| Profile portrait | `image` with approved media ID, alt/decorative, caption/credit |
| Name-specific exclusion from directory | Explicit `visible`; new profiles start hidden |
| Array position determines order | Explicit integer `sortOrder`; stable identity tie-break needed in reader |
| Team excluded from Person JSON-LD by name | Explicit `kind`: person or team; renderer must use it |
| Name joins to journeys/mentor/guide expeditions | Typed `journeys` and `expeditions` arrays of stable record references; delivery verification pending |
| First name inferred for enquiry label/query | Explicit `planning.label` and `planning.enquiryName`; adapter must URL-encode the query |
| Film sources, poster, caption and transcript | `video` uses private media IDs, poster, title, caption, transcript and captions asset; processing/delivery remains pending |
| Directory hero/intro, metadata, section label and empty state | Shared directory/page composition work, not profile fields; remains pending |
| Hero image chosen by array index | Explicit directory hero selection still required |

Profiles use `path: null` because the existing site has a shared `/specialists` directory rather than individual profile routes. No individual URL was invented. Record title must match the profile name. Name changes must retain record identity and, after migration, stable trip references. Existing name-based public behavior is unchanged until that migration is verified.

## Draft validation

The strict version-1 schema bounds text, order and relationship counts, rejects duplicate references and unknown fields, and permits incomplete drafts. Advisory checks report missing profile copy, image evidence, unsupported locales, individual-path attempts, film delivery and related-content verification. They always retain `specialist_delivery_not_ready` and never authorize publication. Image evidence must contain exactly one affirmative match for each selected portrait/poster. The saved-revision API fetches current nested-media evidence before checking a specialist.

A film is represented by asset identifiers, not arbitrary embed HTML or raw remote URLs. Existing legacy film URLs require explicit migration/storage decisions; they are not silently discarded or fetched. Film and caption media pipelines remain unfinished.

## Verification and next work

Local tests cover complete/incomplete schema data, limits/duplicates, input immutability, missing/conflicting portrait evidence, film/reference blockers, API identity checks and saved-revision media reads. No browser or provider acceptance is claimed for this backend work.

Next: strict published projection and ordering; migration of profiles and name-based trip relationships; directory composition and Person schema; role/review/publish/restore workflows; import templates and client acceptance.


## Client draft workspace

The CMS navigation now includes Specialists. The workspace lists saved profiles in pages of 50 and searches the loaded titles. It supports creating hidden profiles, editing identity/copy, choosing person/team, visibility/order, locale on creation, explicit planning copy, portrait selection with alt/decorative/caption/credit controls, and ordered journey/photography-expedition references through the existing permission-aware picker. Existing film title/caption/transcript are editable and film asset data is retained, but new film uploads/playback are not implemented.

Saving uses the current revision for optimistic concurrency and reloads persisted content. The form disables edits for records without edit permission; creation permission remains enforced by the backend. Malformed or mismatched records are not silently overwritten. Unsaved edits require confirmation before changing selection and disable saved-content checks. List/detail requests ignore results invalidated by a newer workspace generation. No publish or trusted-validation controls are offered.

Synthetic browser QA used the actual workspace with simulated API transport at 1280×900 and 390×844. It verified hidden defaults, profile creation, related-journey selection, exact-revision update, cancelled discard, loaded-title search, saved findings and dirty-check blocking with no browser errors. This does not prove provider login/permissions, real media selection, long-list pagination, cross-site races or client acceptance. Those remain pending, along with preview, review/restore and live directory delivery.


## Specialist content previews

The profile editor includes a live content preview and the existing private-preview sharing controls for saved revisions. The authenticated preview viewer dispatches specialist documents to the same renderer. It renders plain-text copy, private portrait media, field note, visibility/person-or-team status and planning text; the planning button is disabled and never submits an enquiry. Hidden profiles are deliberately inspectable by authorized reviewers and clearly labeled hidden. Unsupported/malformed profile content renders a repair message.

Film metadata/transcript can be inspected, but playback is explicitly unavailable. Related content is currently summarized by counts; final related-trip cards and directory layout are not yet rendered. This is a profile content preview, not visual parity with the complete published directory. No Person JSON-LD or public profile output is emitted by this component.

A database test proves saved specialist previews remain pinned after a subsequent edit, deny a different recipient/anonymous access, respect explicit revocation and leave publication null. Existing shared expiry/membership checks remain in force. Desktop/mobile synthetic browser checks verified the profile copy, hidden label and disabled planning button through the editor. Actual provider authentication, media preview and recipient sharing acceptance remain pending.


## Source migration review

`planSpecialistMigration` accepts explicit specialist, journey and expedition source collections and returns a deterministic review-only plan. Each candidate preserves its source, related source trips, source digest and content-based migration key. Original copy is not rewritten. Portrait mappings, typed trip mappings and any film mapping must be supplied before a candidate is marked draft-ready; that readiness is structural and does not establish provider availability or publication rights.

The adapter preserves the inspected legacy directory rules: Kairav Engineer is hidden, Safari Crafters Field Team is a team, source array order is retained, and the existing first-name planning text/query is carried forward unless explicitly mapped. These are migration compatibility rules, not permanent name-based public rendering. Duplicate names/slugs or collapsed target mappings prevent readiness. Unknown source fields and unmatched trip assignments remain visible in the review; no fuzzy name matching or film URL fetching occurs. Unused mapping keys are reported.

Repository review found three profiles, all requiring portrait mappings; zero exact journey assignments, three exact expedition references and no profile films. Journey assignment “Safari Crafters” and expedition assignment “Team Safari Crafters” do not match the existing “Safari Crafters Field Team” profile. They require an explicit identity decision and are reported as unmatched assignments. No data was imported. Apply transactions, idempotency receipts, current asset/reference evidence and the client migration review panel remain pending.

## Authenticated migration review

`POST /api/cms/migrations/specialists` accepts `action: review`, website UUID, locale, source collections and mappings. It uses the shared bounded JSON reader, rejects cross-origin and anonymous requests, and limits each review to 25 profiles. Migration 079 provides `review_specialist_migration_links`: callers need specialist creation permission; media evidence requires media-library view permission and ready, approved, unexpired, unarchived WebP assets; trip evidence requires same-website identity, requested type and record-view permission. Draft trip references are permitted for migration review and are not represented as published.

The API checks returned evidence identities/cardinality before using it, rejects malformed evidence as unavailable, and adds candidate findings for unavailable portraits or wrong-language/type trip mappings. Film/caption availability remains unsupported and blocks those candidates even with a structurally valid film mapping. Review digests bind the website, locale, source plan, mappings as represented by the plan and current evidence. `applyAvailable` now reflects complete mapped candidates, no unused mappings and no unmatched source assignments. Apply rechecks evidence and uses transaction receipts as described below; a digest alone is not authorization.

Tests cover stable/scoped digests, media denial, reference language/type mismatch, malformed/extra/missing evidence, caller origin/authentication and database permission/website isolation. Migration 079 is local only; provider behavior and concurrent availability changes remain unverified.

## Transactional import and receipts

Migration 080 adds private specialist migration batches, `apply_specialist_migration` and `get_specialist_migration_result`. Apply requires specialist creation permission, a UUID request key, source/review digests and 1–25 manifest items. It preserves original profile sources, related trip sources and explicit mappings alongside the draft payload. Original source keys are unique per website, preventing a second import under a new request key.

A request is scoped to website and actor. Reusing it compares source digest, review digest and the complete manifest; a mismatch is rejected. A completed exact replay returns the recorded result before current media rechecks, so later rights withdrawal cannot make a committed import appear unsuccessful. New imports lock and verify approved processed portrait images and same-site, same-type, same-locale trip records under current viewing permissions. Portraits are mandatory and unsupported films are rejected. All drafts, source keys, audit entries and the receipt commit together; any item failure rolls the batch back. No publication occurs.

The status function requires current creation permission and reads only the caller's receipt. A missing receipt is not proof that an in-flight request failed. Local database tests cover draft-only persistence, retained provenance, exact recovery after rights withdrawal, changed-manifest rejection, duplicate source prevention, permissions and full rollback. Real PostgreSQL concurrent retries remain unverified. Migration 080 has not been applied remotely. The HTTP endpoint now connects review, apply and recovery with response validation, as described below.


## Import API and interrupted-response recovery

The same endpoint accepts `action: apply` with the unchanged reviewed source/mappings, locale, `reviewDigest` and UUID `requestKey`. It checks for a completed caller-owned receipt first. Exact replay invokes the database again with the complete original manifest to verify equality; it does not trust digests alone or recheck newer media rights for a previously committed import. Changed source/review identities are rejected. New imports fetch current evidence again and reject stale reviews before writing. All candidates must be ready, with no unused mappings or unmatched source assignments. Film imports remain blocked.

The manifest retains each profile's original source, related trip sources, explicit mappings and validated payload. It can exceed the database manifest limit for a large mapping bundle; split such work into smaller reviewed batches. Results must have unique record, revision and source identities and match every planned source key. Invalid/missing receipts return an unavailable/recovery error, never a success claim.

`action: status` requires only website and request key. A valid completed receipt returns `status: complete`; no visible completed receipt returns `status: unconfirmed` with an explicit warning that a pending request may still finish. The client must retain its exact request and key during recovery and must not invent a replacement key after an ambiguous response.

Tests cover review freshness, source-preserving apply manifests, recovery before changed availability, mismatch/malformed receipt rejection, unresolved assignments and status scoping. A PGlite integration test runs the actual HTTP handler through review/apply/replay/status database procedures. Real provider transport/concurrency remain pending; client controls are described below.

## Explicit legacy-name matching

Migration mappings accept `aliases`, mapping an unmatched source assignment label to a `specialist_<source-digest>` candidate key from the same snapshot. This is an explicit identity decision; no aliases are automatically assigned. An alias cannot override an existing profile name, name a missing candidate or use a blank label. Duplicate profile-name ambiguity remains an error.

Trip selection evaluates mentor and guide assignments independently, so two labels assigned to the same profile are both recorded as used while linking the trip once. Original trip sources retain their legacy names. Unused aliases prevent apply, and aliases participate in the review digest and preserved import manifest. Trip slug duplicate counts are precomputed rather than rescanning the complete catalogue for each match.

Tests cover explicit mapping, multi-role deduplication, preserved sources, rejected overrides/missing targets/blank names, unused aliases and API apply provenance. The actual repository's team-name assignments remain unresolved until a reviewer selects the intended profile in the migration controls.


## Client migration panel

The Specialists workspace now includes Import existing specialist profiles. Upload a site JSON export under 1 MB containing specialists (up to 25), journeys and expeditions. Select an explicit target profile for each unmatched assignment label; match original portraits through the media picker and related trips through the typed record picker. Portrait alternative text and credit are preserved from the source. Mapping/locale changes invalidate the review and acknowledgement. Proposed profiles, warnings and remaining errors can be inspected before acknowledging and saving drafts.

Before issuing apply, the panel stores actor/site-scoped recovery identifiers in localStorage. Storage failure prevents the write. Source copy and mappings are not persisted in browser storage. While a request is pending, editing/discard/new import are locked; the exact in-memory request can be retried, or status can be checked after a reload. Verified completion clears recovery identifiers and refreshes the profile list. A missing receipt remains unconfirmed and does not unlock a second import. Malformed recovery data remains locked for administrator investigation. The containing workspace tracks pending migration work in its unsaved-work guard.

Browser-side contracts check uploaded source bounds, review source/candidate identities and readiness, receipt coverage/unique identities, and recovery website/account/request/source/review identity. Unit tests cover those checks. Desktop/mobile browser QA exercised source upload, explicit alias, portrait/trip pickers, acknowledgement, simulated lost response after commit, reload recovery and storage cleanup. The server fixture used the actual review/apply handler with simulated database procedures; database procedures were tested separately. Image preview failure was expected because the fixture supplied no real image bytes.

The first browser run at 127.0.0.1 hit the existing origin check because the development request URL used localhost. The same flow passed at http://localhost:3001 without weakening that check. Use that canonical local hostname for CMS writes; deployment proxy/origin behavior remains an acceptance item. Temporary fixtures were removed. Film import, real provider storage/permissions, storage-failure browser scenarios, long-list behavior and complete migration/client UAT remain pending.

## Published specialist profile reader

Migration 081 adds an anonymous/authenticated `get_public_specialist` reader scoped by website, profile UUID and English locale. It reads only the published revision, requires null route and explicit visible state, checks required copy/planning/image fields, and constructs an allowlisted nested payload. Extra internal fields are stripped. A newer hidden/private draft does not alter an older visible published revision; publishing hidden state removes the profile from public reads.

Portrait delivery requires current approved, ready, unarchived, unexpired WebP media. The public-media authorization function grants access only to the exposed portrait of an available published specialist, not arbitrary nested/private references. Revocation removes both profile and portrait availability when no other publication authorizes the asset.

Journey references resolve to current published, same-language journeys with safe routes. The application reader strictly validates website/profile/locale identity, required data, exact unique reference coverage and route prefixes; enquiry names are URL-encoded into the planning query. No raw source/migration provenance is returned.

Films and photography-expedition delivery are not complete, so a published profile containing either currently returns unavailable rather than silently dropping those features. Specialist publication policy and website rollout remain disabled. Public page composition, related expedition delivery and full publishing workflow still need implementation. This reader alone does not switch `/specialists` to CMS content.

Tests cover transport identity, reference coverage, hidden/malformed/private payload rejection, private draft versus published revision, nested field stripping, wrong website/locale and current portrait rights/public-media access. No enabled-provider or visual directory acceptance is claimed.

## Published directory ordering and pagination

Migration 082 adds `list_public_specialists`, scoped to website and English locale. It uses the published-profile reader for each candidate, so hidden profiles, private drafts and profiles with unavailable dependencies are excluded. Results sort by the explicit display order followed by record UUID; a paired order/UUID cursor advances past the previous page. SQL validates cursor pairs and accepts limits from 1 to 100, fetching one extra item to determine whether another page exists.

The application transport requests 50 profiles per page. The directory reader verifies every envelope and reference, website/language identity, strictly increasing ordering, unique record identities and a continuation cursor matching the final item. It returns only a complete traversal, with limits of 20 pages and 1,000 profiles; malformed or oversized results throw instead of returning a partial directory. An empty available directory is a valid result.

Tests cover SQL order ties, multiple pages, website/language isolation, hidden records, current image-rights withdrawal, invalid limits/cursor pairs and application transport/projection. Traversal tests cover duplicate/reversed results, invalid continuations, page/record bounds and successful completion at 1,000 profiles. Ordering is verified under unchanged data: separate RPC calls do not share a database snapshot. Concurrent reordering or publication can still omit a profile without producing a detectable duplicate; release-consistent directory snapshots remain future work.

Migration 082 remains local. No public page adapter or specialist publication policy was enabled. `/specialists` still uses its existing content source. Page composition, related photography expeditions, films, trusted publishing validation and live-provider acceptance remain pending.

## Public profile display

`components/CmsSpecialists.tsx` renders validated published profiles using their stable record identities. It preserves input ordering, paragraph breaks, moment quotations, contextual portrait alt/decorative settings, captions/credits and every selected published journey. Enquiry buttons use the saved label and encoded planning target. Related-content heading and empty-state copy are required inputs from the containing page; there are no name-based exclusions, first-name button derivations or arbitrary four-trip truncation.

The responsive layout places portraits before copy on mobile for both odd and even entries. The component uses existing page typography and related-trip styles from `app/simple.css`, plus scoped layout styles. `publishedSpecialistStructuredData` emits Person data only for an explicit person profile, with stable UUID anchor identity and the authorized public-image route. Teams do not masquerade as people. Use the existing `JsonLd` component to escape script-sensitive characters when embedding this data.

Browser checks used a temporary route with two validated sample profiles and intercepted placeholder image responses. At 1280×900 and 390×844, checks passed for selected trips, encoded enquiry links, decorative alt text, credits, paragraph whitespace, HTML-text escaping, one Person entity, mobile portrait order, no horizontal overflow and an empty directory. The mobile screenshot was inspected. Browser plugin not available; regular Playwright was used. Temporary fixture route removed after QA. This validates the renderer, not live provider image delivery or the complete public route.

The existing `/specialists` page has not switched sources. Its page-level hero, SEO, headings and empty state need saved CMS controls and publication integration; related expeditions and films still need complete delivery. The new component is ready for that integration, not a claim of a client-ready specialist page.

## Page-composer directory controls

Pages now offers **Add specialist directory** as an approved composition section. Its three editable fields are directory heading (200 characters), related journeys heading (200 characters) and empty directory message (2,000 characters). The latter two require nonblank text. Unknown data fields are rejected. Profile selection is automatic: available visible published profiles follow their specialist display order. This section deliberately has no separate selection list or competing ordering rule.

Existing page hero controls provide desktop/mobile images, eyebrow, heading, copy and buttons, and the page SEO editor provides metadata controls. A client can combine these with the directory section in a page draft. Standard section visibility, ordering and hidden duplication apply. The composition preview displays the saved labels, including the empty-state message, but explicitly identifies profile loading as unfinished; it does not imply the profile list is empty or published.

The shared composition contract now contains the original 20 section families plus the specialist directory. Tests cover hero/directory round-trip preservation, hidden duplication, field limits, unknown-field rejection and continued publication blocking. All 532 CMS tests passed. Desktop/mobile browser QA exercised adding the section, editing labels, draft serialization, label preview and hidden duplication. A textarea locator was corrected to use its accessible textbox role after an exact label lookup timed out. The temporary route was removed; this was a local composer fixture, not a persisted provider acceptance test.

Pending: resolve profiles inside composition previews, map published page composition to the public renderer, validate section visibility/layout support, integrate SEO and hero delivery, and prove the complete saved-page publication workflow. There is no automatic creation or replacement of a `/specialists` record, no live route switch and no new publication authorization.

## Published profiles in composition preview

The directory section now resolves current published profiles in both the unsaved page preview and the authenticated shared-page viewer. Both pass the page's website identity. This supersedes the profile-loading placeholder above. The preview explicitly says these profiles are current publications, not pinned to the page revision or simulated preview time. Draft profile edits are excluded. It shows copy, portraits with captions/credits, selected journey links and encoded enquiry buttons; a failed portrait has an explicit unavailable message.

`GET /api/cms/published/specialists?site=<uuid>&locale=en` requires configured public delivery and the configured website. Unsupported/duplicate query fields are rejected, foreign websites return unavailable, and data failures return 503 without internal details. Empty complete results return 200 with an empty list. Responses are no-store and noindex. No credentials or private sources are returned. The endpoint traverses the existing bounded SQL reader and emits validated envelopes, not caller-supplied derived links.

The browser checks identity, schema, visibility, dependency coverage, unique ordering and maximum count again, then derives links from the validated profiles. Website/language changes remount the composition child; refresh clears previous content, aborted/unmounted responses cannot update state, and errors are distinct from an empty directory. The public reader does not grant a preview recipient access to other drafts. Public delivery remains disabled until configured; in that state the preview shows unavailable rather than fabricated profiles.

Two runtime tests cover response projection, identity/duplicate/private-derived-field rejection, malformed requests, foreign-site rejection, empty results and unavailable upstream/configuration. Desktop/mobile browser QA used intercepted responses and exercised successful profiles, missing portraits, credits, journey links, encoded planning links, refresh, empty/error distinction and foreign-site responses. Alert assertions were scoped to the CMS to exclude Next.js's route announcer. Temporary fixture route removed. This is not live-provider acceptance, and portraits in the fixture deliberately failed; existing public-media tests cover authorization separately.

Still pending: a published page renderer using this directory section, hero/SEO integration, complete visibility/layout controls, pinned coordinated releases, specialist expedition/film delivery and trusted publishing workflow. Current-directory reads retain the cross-page snapshot limitation documented above.

## Composed public-page adapter and renderer

`lib/cms/specialist-page.ts` projects published `page` envelopes for the fixed `/specialists` route. It accepts hero, rich text, call-to-action and specialist-directory sections, preserves their order and validated controls, and requires one configured visible directory and exactly one currently visible H1. Hidden valid sections remain stored but are omitted. Schedules and locale visibility are evaluated at an explicit time. An unsupported enabled section is rejected even if scheduled for the future; animation and region targeting remain explicitly unavailable. These checks do not authorize publication or prove database media rights.

The loader reads only the fixed route for the configured UUID website and English locale. Missing page returns null; invalid content or failed dependencies throw. Directory reads occur only when the directory section is currently visible. It uses existing bounded published-profile traversal, with the previously documented cross-request snapshot limitation. Page metadata delegates to the shared SEO resolver, preserving page overrides, global defaults/noindex, canonical and social-image behavior. An explicit page SEO title stays absolute rather than receiving the website suffix again.

`components/CmsSpecialistPage.tsx` renders the supported sections with page-controlled spacing, width, background, text alignment, hero media position and mobile order. Desktop and mobile hero assets retain independent alternative text and captions/credits. Rich text is rendered as React text/list/link elements; new-window buttons receive safe rel attributes. The directory embeds the existing profile renderer and selects profile/related headings below its section heading. Person structured data appears only when a directory is rendered. The existing `/specialists` route is not yet connected to this adapter.

Three unit tests cover composition/image/SEO preservation, unsupported future content, heading/directory requirements, hidden sections, request scoping, missing/failed responses and schedule-bound directory loading. Desktop/mobile browser QA used a temporary composed-page fixture with placeholder images: hero image and alt/credit switching, one H1, nested profile heading, mobile order, lists, links and overflow passed. Visual inspection found dark hero supporting text inherited a dark global color; a scoped contrast fix was applied and computed colors verified on desktop/mobile. Temporary fixtures were removed. Production build status is recorded in the progress log.

Next: opt-in route integration and runtime configuration, full publication validation/media dependencies, scheduled-heading acceptance and release snapshots, broader section-family rendering, and provider-backed UAT. Existing production content and publication policies remain unchanged.

## Opt-in Specialists route

The real `/specialists` route now checks `CMS_SPECIALISTS_DELIVERY_ENABLED`. With the default false value it retains the legacy content and metadata. When explicitly true it requires `CMS_PUBLIC_DELIVERY_ENABLED=true`, the configured website UUID, database URL and anonymous key. An enabled-but-incomplete configuration throws; it does not fall back to old content. `.env.example` documents the switch as disabled. No local or production rollout value was changed.

The configured page reader binds all requests to that website, English and `/specialists`. The route loads the published composition/directory and published SEO defaults, sharing one React request-cached result between metadata and rendering. SEO defaults are required for this migrated route even if other legacy routes have not enabled the separate global SEO switch. Missing composition yields not-found; malformed data, unavailable dependencies or missing settings fail instead of mixing sources. Only anonymous published RPCs are called; service-role configuration is unused. The route is dynamically rendered so publication changes and visibility schedules are evaluated per request.

Runtime tests cover disabled/invalid configuration, fixed scope, anonymous credentials, missing page/settings, foreign settings and directory failures. Full CMS suite: 539 passing. Browser QA at 1280×900 and 390×844 checked the real route with rollout off, then a temporary route running the actual loader/metadata/renderer against controlled RPC responses. Title, description, canonical, noindex, empty-state copy and no legacy-content mixing passed; mobile screenshot inspected. This does not prove enabled-route behavior against a real provider. The temporary fixture was removed before the production build.

Activation still requires published page/profile/settings records, migrations, current approved image dependencies, complete trusted publication checks and provider-backed acceptance. Settings/page/specialist publishing remains gated. Sitemap indexing consistency, pinned directory releases, all composition sections, expeditions and films remain unfinished. Do not enable this switch solely because the local renderer and build pass.

## Sitemap integration

When specialist delivery is enabled, `/specialists` is removed from the static-route sitemap list and considered through the same fully validated published-page loader used by the route. Missing page yields no entry; configuration or dependency errors are propagated rather than replaced by a legacy URL. The shared SEO resolver decides eligibility, so page/site noindex, explicit sitemap exclusion and a canonical pointing elsewhere prevent inclusion. An explicit include cannot override those restrictions. With rollout off, the existing static entry is unchanged.

The migrated entry intentionally omits lastModified: the current page envelope contains no authoritative publication timestamp, and the legacy review date would be misleading for independently published content. Tests cover absent pages, canonical normalization and differences, noindex precedence, exclusion and agreement with rendered metadata. The actual local sitemap with rollout off was fetched and parsed: one Specialists entry and no duplicate URLs. Enabled-provider acceptance remains pending; sitemap evaluation still inherits the directory snapshot and publication limitations described above.

## Saved-page readiness feedback

Pages now includes the existing revision-bound Content checks panel. It checks saved content and validation status, disables checks while edits are unsaved and does not offer a trusted-check request or publish action. The panel is keyed by website, record and revision; the containing workspace handles session scope. Findings do not authorize publication.

For `/specialists`, advisory checks now identify unsupported page type/language, extra top-level data, a missing or duplicate visible directory, unsupported enabled sections, animation and region settings. They share the renderer's supported-section list. Generic composition/SEO/media checks still run, and the page validator still returns `contentChecksPass: false` with the existing publication gate.

Heading readiness checks evaluate the present and every future visibility start/end boundary across the bounded composition. Since visibility is constant between these boundaries, this catches a heading expiring many years later without an arbitrary sampling horizon. The first time without exactly one nonblank English-visible H1 is reported explicitly. End times are exclusive. A scheduled directory is allowed when the page heading remains valid; hidden sections do not create future boundaries or renderer-readiness errors. Structural composition failures are reported by the generic validator.

Three focused tests cover future/current/exact-end heading gaps, whitespace headings, locale visibility, unsupported feature fields, hidden and scheduled sections, preserved input and continued publication blocking. Full CMS suite: 544 passing. Desktop/mobile browser fixture used the real Pages workspace and server-computed findings with simulated content/status transport; saved findings and dirty-draft disabling passed. Temporary fixture removed. Full provider authorization, actual persisted revision checks and eventual trusted publishing remain separate acceptance requirements.

## Current reference evidence for saved specialist profiles

Migration 083 adds `get_specialist_reference_status`, scoped to the specialist website, record and revision. It requires profile viewing permission or the trusted service role; anonymous calls are denied. It resolves only selected journey/expedition IDs through the existing published dependency reader for the profile's language. Available evidence contains record ID, type and locale; unavailable evidence contains only ID and false. Titles and paths are omitted. Missing records, drafts, other-language content and dependencies with withdrawn image rights remain unavailable. Photography expeditions currently remain unavailable because their public reader is incomplete.

Editor checks request this evidence for the saved revision, and trusted-worker input includes it as `specialistStatus`. Validation requires exactly one matching piece of evidence for every selected ID, the expected content type and matching locale; duplicates, missing/wrong evidence and unexpected IDs cannot pass reference readiness. Findings point to the affected selection. Expeditions retain a separate delivery blocker even if supplied evidence claims availability. The generic specialist publication blocker remains, and no policy has been enabled.

The full suite passed 546 tests after the implementation, including a PGlite database scenario for revision scoping, draft/published transitions, other-site requests, wrong revisions, unauthorized/anonymous callers, worker input, changed language and revoked media. A further worker-flow regression test passed afterward, proving evidence reaches the validator while its publication result stays invalid. TypeScript passed. No new rendered controls were added, so this backend milestone has no new browser/build claim. Migration 083 is local only; provider concurrency and end-to-end trusted publication remain pending.

### Directory page publication (2026-10-22)
The ordinary page at `/specialists` now passes supported composition publication checks under composition-2 (local migration 099), alongside `/photo-expeditions`. This replaces the directory page's unconditional draft-only gate. The database workflow requires independent approval and a current trusted receipt and protects the published route/language. Individual specialist profiles still have separate incomplete publication requirements. Page-editor workflow controls for this route and production acceptance remain pending; no rollout has been enabled.

### Directory editor controls (2026-10-22)
Pages now exposes trusted-check requests and review/publish/withdraw controls for `/specialists` according to record permissions. Confirmations bind to the selected revision and explicitly mention specialist rollout configuration. Unsaved edits disable workflow actions. This supersedes the missing directory-controls note; individual specialist profiles still require separate publication work and live acceptance remains pending.

### Supported profile publication (2026-10-22)
Local migration 101 enables specialist-1 trusted receipts for complete supported English profiles with approved processed portraits and currently deliverable journey links. Independent review and fresh receipt checks apply; release locks/rechecks journey records and media, and the public directory rechecks eligibility after later withdrawal. Related expedition links and films remain blocked pending their full implementation. The normal profile workflow now has local database acceptance coverage. Editor controls, production/provider acceptance and remaining PRD scope are still pending; nothing was deployed.

### Profile editor workflow (2026-10-22)
The specialist profile editor now provides permission-based trusted-check requests, review, publish and withdraw actions. Confirmation identifies the saved revision; dirty or pending migration state blocks changes. Successful publication is distinct from public visibility: the profile must be marked visible and specialist rollout must be configured. These controls supersede the earlier missing-controls note. Backend policies remain authoritative; live setup and remaining film/expedition-link support are pending.

### Restoring specialist content (2026-10-22)
Restore creates a new draft from historical content; it does not switch the published profile immediately. Local migration 102 also restores the profile's list name. Fresh independent approval and trusted validation are required before publication, and linked journey/media eligibility is checked again at release. Historical revisions stay retained. The complete backend sequence is verified locally; revision-history controls in the specialist editor and live provider acceptance remain pending.

### Revision history in the editor (2026-10-22)
Open **Revision history** on a saved specialist to see the current draft and published revision. Editors can choose **Restore specialist draft** for an older version, then confirm. This creates a new draft and refreshes the name/history while leaving publication unchanged. Unsaved changes and pending operations block restoration; users without edit permission cannot restore. Recheck content, request trusted validation and submit for independent approval before publishing the restored draft. This supersedes the earlier missing-history-controls note.

## Unsaved profile history

Specialist profiles now use shared bounded in-memory undo/redo for the full payload and locale, including text, portrait, related records and retained film fields. New/load/save/restore boundaries reset history. Controls lock during migrations/operations and read-only access, while existing load-generation checks remain. Multiline expertise, biography and field-note controls have explicit stable accessible names, including after restoring text.

Verification: 11 targeted specialist/history tests passed. The actual workspace with an in-memory API passed browser checks for ordered name/biography undo/redo, busy locking, save reset, record switching and new-profile locale history. The temporary fixture was removed. Specialist autosave, conflict recovery and real-provider/client verification remain pending.

## Concurrent profile saves and autosave

Existing profiles now support opt-in three-second autosave through the normal revision-checked draft endpoint. Invalid profiles, migrations and active operations suspend it; new profiles require an explicit first save. Saves lock editing/navigation and keep leave protection active. Errors preserve content and disable autosave without retry loops. Account/site remounting and existing request-generation checks remain in effect.

On conflict, the current caller-scoped profile must match identity, type, null profile route, locale and edit permission, with a changed revision. The comparison includes optional portrait/film changes. Overlapping fields require explicit choices; related-record lists and other compound fields are selected whole. Applying choices updates only the local draft, clears undo history and uses the latest revision for the next explicit save. Cancel preserves unsaved edits. Autosave stays disabled after conflicts until the editor enables it again.

Verification: 12 targeted specialist/conflict tests and TypeScript passed. The real workspace with a local in-memory API passed browser checks for debounce, invalid-field pause, manual-save cancellation, offline failure/no retry loop, re-enabling, conflict pause/cancellation, required name choice, retained remote role and explicit revision-safe save. New-profile autosave is disabled. The fixture was removed. Actual provider concurrency and client acceptance remain pending.
