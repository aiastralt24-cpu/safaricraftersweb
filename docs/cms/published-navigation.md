# Published navigation delivery

Migration 065 adds `get_public_navigation(website, record, locale)` for published English menu revisions. The SQL response exposes only the menu contract's public scalar fields, explicit visibility arrays, target fields and featured record IDs. Other fields are omitted. Missing publication, another website or unsupported language returns null.

Reference evidence is computed from the current published journey, destination and journal readers. A draft record, a withdrawn publication or a record whose public reader rejects delivery is unavailable. Other content types remain unavailable until their public delivery contracts are connected. This prevents an editor's record title or draft path from being substituted into a menu.

The application validates the envelope, website/menu/language identity and exact reference set. An available reference must have the matching content type and route prefix. Visibility uses the supplied request time and optional region; region-restricted items remain hidden without a region. A hidden or unavailable ancestor suppresses descendants. Empty group headings are removed, including nested groups. Array order remains sibling order. Featured references omit unavailable entries.

The resulting `items` contain safe links, labels, descriptions, presentation and available featured reference URLs. No original draft or arbitrary payload fields are returned by the application projection. Direct URL links follow the existing URL schema; their existence is not yet checked against a route inventory.

This is not an enabled public header or navigation publication policy. Still required: client-facing rendering and responsive/accessibility verification, featured summaries, supported page-type expansion, URL inventory checks, trusted publication validation and settings reference enforcement. Test publication pointers are set only inside the isolated database harness; no real backend menu was published.

Validation: 425 CMS tests passing and TypeScript passing at implementation. Coverage includes actual database publication/draft isolation and reference withdrawal, private-field stripping, application evidence/identity validation and visibility boundaries. Real provider execution remains unverified.

## Header consumer

`SiteHeader` now loads the main menu through `readHeaderNavigation` only when `CMS_NAVIGATION_DELIVERY_ENABLED=true`. Set `CMS_MAIN_NAVIGATION_ID` to the published navigation UUID, with the standard public delivery credentials configured. Missing publication or backend failure is an error, not a legacy-menu fallback. Keep disabled until publication and provider verification are complete.

The existing Header dialog accepts the resolved menu: nested lists, groups, descriptions, featured published titles, direct and record links, new-window attributes, current-page indication and existing focus/scroll controls. Featured titles come from the target's published revision, not its internal title. The server currently supplies request-time visibility without a region; region-restricted items therefore remain hidden. Brand/CTA labels are still managed by the legacy header and require the shared-settings consumer work.

QA used a synthetic rendered menu and verified desktop/mobile focus trapping, Escape focus restoration, links and new-window attributes. Full suite: 426 passing. Real provider rollout, region determination, all browser engines, long-menu stress/accessibility checks and client-led tasks remain outstanding.

## Draft reference checks

Migration 066 factors the reference resolver into a private SQL helper shared by public delivery and authorized draft validation. `get_navigation_reference_status` requires view access (or the trusted service role), exact website/menu/revision membership and a supported locale. Its output reflects current published targets rather than stored editor claims.

The editor advisory validation endpoint checks the requested revision before requesting this evidence. It reports unavailable/type/language/path mismatches, duplicate featured choices, empty groups and unverified internal URLs. Hidden items are checked because they may later become visible. `navigation-draft-1` always retains a publication blocker until final transaction rechecks and workflow validation policy are implemented; it is not a trusted successful publication receipt.

Full suite after integration: 432 passing; TypeScript passing. The publication-time race check described in the rollout requirements remains pending, not covered by a claim of completed publication validation.

## Release-time reference checks

Migration 067 adds a trigger for publishing navigation and changing its published route/language/type. It locks direct referenced records, resolves their published revisions, checks expected language and route, locks directly referenced media and checks rights/expiry/format. Public evidence is recomputed and record target declarations must match. A failed release leaves the previous published revision unchanged; unpublishing remains possible.

The isolated database test starts with valid draft evidence, then withdraws the page or changes image rights/format before release. Each release fails. Another test rejects a wrong content-type declaration and preserves the prior menu publication. This demonstrates stale-evidence rechecking, not a multi-session concurrency benchmark. Transitive destination dependency changes and provider-specific transaction behavior still need rehearsal.

Navigation's validation policy remains disabled while internal URLs and trusted workflow integration are incomplete. Full suite at this milestone: 433 passing; TypeScript passing.

## Fixed relative URLs

`navigation-routes.ts` enumerates the 22 existing fixed public page routes. Tests check every source file and parity with migration 068's deployment-owned SQL inventory. Editor review, public projection and the release trigger now reject unknown relative URLs and private/admin/API paths. Relative links with query strings use their path identity. Unverified fragments/anchors remain blocked. Dynamic content should use published record references rather than a literal route.

The inventory table cannot be edited by ordinary CMS users or anonymous callers. Its publication lookup takes a share lock so a deployment cannot remove the route during that release transaction. Route availability here means an implemented fixed route; it is not a provider health check.

HTTPS URLs currently retain external-link syntax treatment. Absolute same-site URL normalization and anchor inventory are still pending before a trusted navigation publication policy can be enabled. No external link reachability or destination content endorsement is implied. Full suite at this step: 437 passing; TypeScript passing.

## Owned absolute URLs and shared anchor

Migration 069 and the application policy now classify the canonical Safari Crafters domain and www alias as internal. These URLs must resolve to the same fixed-route inventory as relative links. Hostname case, a trailing dot and explicit port 443 are recognized; other owned subdomains and ports remain unavailable. The public site domain is deployment-owned, not an editor setting. Update both application and SQL policy for any future custom domain.

The shared `#main` target is allowed because the root layout renders that ID. Fixed routes may use that fragment after their path/query. Other anchors remain unverified. External HTTPS targets receive URL syntax checks only; neither network reachability nor future redirects are followed.

Tests compare application/database decisions for canonical and deceptive authorities, unknown/admin paths, ports, query strings and anchors. Actual publication tests verify absolute owned URLs cannot bypass the relative-route guard. Full CMS suite: 439 passing; TypeScript passing. Trusted navigation publication remains disabled until queue evidence and policy integration are complete.

## Trusted validation policy

Migration 070 enables the local `navigation-1` database policy and includes exact navigation reference evidence in worker input. Both direct and queued trusted workers run the same complete menu checks. A valid advisory result is not a publication receipt; editor responses retain `publicationAuthorized:false`.

Supported fixed paths, verified main anchors, external HTTPS syntax and supported published record targets can qualify. Unknown routes/anchors, malformed hierarchy, wrong locale, unavailable references and duplicate featured records cannot. Unsupported-language drafts receive invalid findings instead of repeatedly retrying an evidence parse failure.

The existing separate-approval, revision and permission gates now combine with navigation URL/reference release guards. Tests prove that old valid reference evidence cannot publish a menu after its target is withdrawn, and an edited invalid menu cannot reuse a prior revision's receipt. Full suite: 444 passing; TypeScript passing.

The policy has not been applied to a real backend. Client navigation workflow controls, provider execution and concurrent-session/UAT coverage remain outstanding; the public header rollout flag remains false.

## Client workflow controls

The Menus workspace now exposes saved-content validation, trusted-check requests, submit/approve/request changes, publication and withdrawal confirmations, and revision history. Workflow actions use the loaded revision; unsaved edits disable them. Publication confirmation resets when revision, review/publication state, permission or disabled state changes. Restoring history requires confirmation and creates a new draft, leaving the published revision unchanged.

Synthetic desktop/mobile browser checks passed across the full control sequence, including cancellation and unsaved-change locking. The fixture used controlled API responses; it is not real-provider acceptance. Database authorization and release invariants are covered by the separate workflow tests. Menu visibility dates/regions/locales and featured-content editing controls are still incomplete, although existing values are preserved.

## Visibility and featured editing

The menu editor now exposes start/end ISO timestamps, language codes, region IDs and featured content. Date/time values preserve their explicit offsets, and invalid ordering produces inline errors. Empty restriction lists mean unrestricted visibility. Region-based display still requires the website to supply a matching region; the current public header supplies none, so these entries stay hidden.

Featured selections can mix supported journeys, destinations and journal articles. Existing selections resolve through authenticated reference lookups and are preserved if lookup fails. Editors can reorder/remove, add up to six and receive feedback for duplicates. Selecting a draft does not publish it; trusted validation still requires a published deliverable reference.

Synthetic browser verification covered both viewports, timezone/date-range behavior, language/region edits and featured addition/duplicate/removal. Real-provider usage and mixed-type reorder scenarios still require acceptance testing. The complete CMS suite remains 444 passing.
