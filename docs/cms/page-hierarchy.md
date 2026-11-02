# Page hierarchy

## Implemented backend

Migration 214 stores parent-page relationships independently from content revisions and public URLs. Ordinary page records can move under another page or homepage in the same website/language, or return to the top level. The homepage cannot itself be moved. Existing routes, approval state, public pointers and content revisions remain unchanged by organization moves. URL/slug changes and redirects are a separate unfinished workflow.

Moves require current view/edit access to the page and its old/new parents. Same-site serialized moves reject cycles and branches exceeding 100 levels, including existing descendant depth. The selected content revision and hierarchy version must still match. Successful changes emit `page.moved` audit events. Caller/site-bound request receipts recover an exact retry without repeating the move or overwriting a later organization change; a reused request key with a different manifest is rejected. Historical receipt results are not the current tree: clients must refresh after confirmation.

Authenticated reads return the selected revision and hierarchy version. An inaccessible parent is represented by `parentRestricted`, without exposing its identity or title. Tables are inaccessible directly to browser roles; the authenticated API uses the caller's token, strict bounded commands, origin checks and private/no-store responses. No elevated browser credentials are introduced.

## Verification

All 1,416 CMS tests pass, zero skipped. Local database cases cover URL/revision preservation, moving to root, direct and indirect cycles, branch depth, stale content/hierarchy versions, exact retry after later moves, changed request manifests, non-page and foreign/other-language parents, inaccessible parents, publisher-only and anonymous access, and audit counts. API checks cover exact command binding and rejected invalid/cross-origin/unauthenticated requests. Production build including TypeScript passes. Offline planning validates the 214-file sequence against a synthetic empty ledger; no provider SQL was executed.

## Remaining

Parent selection, move review and durable exact retry are now connected as described below. Real provider concurrency tests and the full URL-change/redirect/affected-reference workflow remain. Define sibling ordering through the client workflow rather than silently inferring it from URLs. Hierarchy metadata is not yet consumed by public breadcrumbs or menus. This backend does not complete PRD section 8 or R16.

## Parent selector and exact retry

Migration 215 provides paginated eligible parents: same website/language, page/homepage types, saved revisions and current view/edit authority. The selected page and its descendants are excluded. The Pages workspace loads current hierarchy and candidate parents, reviews the old/new parent and retained URL, then requires explicit confirmation. Moves require a saved, editable page.

Before dispatch, the client stores an account/site/page-bound request with exact content revision, hierarchy version, parent and request key. Web Locks serialize same-page requests across tabs. A newly discovered request from another tab requires an explicit recovery action. While a request is unresolved, ordinary workspace writes and migration actions are disabled. Exact receipt verification and a successful fresh hierarchy read precede recovery removal. No content or credentials are stored in this recovery item. Unknown outcomes cannot be discarded locally; server-backed cancellation is now available as described below.

Chromium with mocked APIs verifies load/select/review/cancel-before-dispatch, lost response after one recorded move, reload recovery, a failed post-confirmation refresh, and subsequent exact retry with one move total and unchanged URL/content save count. Local database tests verify descendant/language/access filtering; API and recovery contracts are tested. All 1,418 CMS tests and production build including TypeScript pass. Offline planning validates 215 migrations against a synthetic empty ledger. No hosted migrations or client acceptance occurred.

## Safe cancellation and conflict recovery

Migration 216 adds actor/site/request-bound cancellation under the same site lock as move execution. An unexecuted request receives a permanent cancellation receipt and an audit event. Its delayed move/retry cannot execute. If the request already completed, cancellation reports the original result and does not undo it. Reused request keys with different manifests are rejected. Current page view/edit authority is required; no access to a newly unavailable proposed parent is needed to cancel an unexecuted request.

The pending-move panel offers explicit cancellation confirmation. Cancellation intent is durably stored before the request, and reload shows **Retry page move cancellation**. A verified cancellation/completed result plus fresh hierarchy read is required before removing recovery and unlocking the workspace. A rejected/stale move can therefore be cancelled before a fresh review with a new request identity.

Local database coverage verifies cancellation before execution, blocked delayed execution, exact replay, changed-manifest rejection, authorization, and completed-result preservation. The Chromium fixture covers a rejected move, a lost cancellation response, reload/cancellation retry, workspace unlock, and cancellation of an already committed move without undoing it. All 1,419 CMS tests and production build including TypeScript pass. Offline planning validates 216 migrations using a synthetic empty ledger. Hosted concurrency and client acceptance remain pending; no provider migration was executed.

## Two-tab browser coordination

The retained authoring browser script now runs two real Chromium tabs in one authenticated browser context. It holds a move request open while the second tab confirms a proposal: the actual Web Lock prevents a second request. Once the first response is lost, the second tab discovers the persisted request and requires explicit recovery before sending anything. The first tab then cancels. A stale second-tab retry retains the exact original request key, receives the cancellation rejection, and performs no move. Cancelling/reconciling from the stale tab unlocks its workspace without creating another move or audit operation in the fixture.

The full browser authoring/review/recovery scenario passes, with zero page errors and unchanged draft-write count. Production code was unchanged in this verification batch, so the previously passed build and 1,419-test suite were not needlessly repeated. API behavior is mocked in this browser test; real local SQL cancellation/fencing is covered separately. This proves browser locking/recovery behavior, not hosted database concurrency or cross-device delivery.

## Page-tree browsing

Migration 217 adds a permission-filtered branch reader with stable ID pagination (50 records per response). It lists page/homepage records for the requested locale, reports whether accessible children exist and rejects inaccessible parent-branch queries. Children of an inaccessible parent remain discoverable at the root with a restricted-parent indicator; parent identities/titles and hidden child counts are not exposed.

The Pages sidebar now provides a collapsible page tree, branch expansion, refresh, pagination and opening ordinary pages in the existing editor. Homepage nodes remain organizational parents with guidance to use the Homepage tab for editing. Pending moves disable tree actions; confirming/cancelling a move refreshes the tree. Stale requests are aborted on branch removal or refresh. This is an accessible disclosure list, not an ARIA tree requiring a separate arrow-key navigation model.

Local SQL tests cover 51-child pagination, source/parent visibility, restricted-parent discovery, hidden-child indicators, locale isolation, another website and anonymous access. Client parsing validates branch identity/order/cursors. Chromium verifies expand → open → collapse without draft writes and re-runs the full authoring/recovery flow. All 1,421 CMS tests pass with zero skipped after verified source recapture, and the production build passes. Offline planning validates the 217-file sequence against a synthetic ledger; no provider SQL was executed. Hosted verification, sibling ordering and URL/redirect workflows remain pending.

## Sibling order persistence and API

Migration 222 adds private branch-order metadata and actor/site-bound retry receipts. `POST /api/cms/page-order` reads or saves an order for a site, locale and actual parent (null means root). A branch read returns every eligible sibling, up to 500, with a snapshot bound to ordering version, current revision and hierarchy version. New or moved-in pages absent from saved order follow saved entries in UUID order; moved-out pages are excluded. Saved entries do not alter paths, content, published revisions or public menus.

An editor must have current view and edit access to the parent and every sibling. Partial access rejects the operation without returning hidden sibling identities. Expired/revoked/nonmember and anonymous callers are denied. A save must provide every current sibling exactly once and the reviewed snapshot. It shares the website lock with hierarchy moves, rejects changed branches/stale order versions and writes metadata, audit and receipt atomically. Exact retries recover their original result without overwriting later orders; changed payloads cannot reuse the request key. API response validation rejects scope/identity/order mismatches.

Local SQL tests cover ordering, stale reviews, replay after a newer order, duplicate/foreign/missing members, moved branches, permissions, private-table denial, audit count and unchanged paths. Four API/client-contract tests cover exact caller/scoped forwarding, malformed input and response identity. Migration 223 connects saved ordering to the page-tree browse RPC. Pagination binds the visible ordered branch to a snapshot; changed order, hierarchy, revisions or visible membership reject continuation and require a fresh branch read. The older UUID-only RPC remains for compatibility. No provider migration or live navigation change has occurred. Multi-connection concurrency and client acceptance remain required.


## Ordering controls and ordered browsing

Each visible branch offers Arrange pages in this branch. A successful complete-branch read enables accessible Up/Down controls, a review step and explicit Save page order. Read failures expose no partial editable list. A failed or uncertain save disables further changes until Refresh saved order retrieves current state. Saved order refreshes the branch immediately. Closing ordering discards only the local arrangement. Website menus retain their separate editor.

Browser verification at 1280 and 390 pixels covers review/back without writes, a committed save with lost response, refresh recovery, stale-save rejection and successful save followed by ordered tree display. Screenshots were inspected. Transport is mocked, so this is UI behavior evidence, not real-provider concurrency proof. SQL checks exercise 51 siblings across two pages in saved reverse order, stale cursor rejection after reordering, invalid cursors and restricted-parent discovery without identity leakage. All 1,452 CMS tests pass without skips and the production build passes. Offline planning includes 223 migrations; none were applied to a provider. Evidence: /private/tmp/cms-ordered-tree-full.log, /private/tmp/cms-ordered-tree-build.log and /private/tmp/cms-page-order-browser.log.
