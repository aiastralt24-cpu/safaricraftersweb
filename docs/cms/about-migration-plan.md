# About source-preserving migration plan

Status: inventory complete for the current legacy About route; migration not applied and not ready for publication. This is one route within the full CMS PRD, not a reduction of that scope.

## Authoritative captured source

`about-migration-inventory.json` records the rendered legacy copy, heading fragments including emphasis, section labels, profile roles, links, image alternative text and credits. It includes hashes for the route, its hero component, About motion, relevant local CSS and all four source images. Shared global CSS/fonts are not an exhaustive dependency snapshot. Desktop (1440px) and mobile (390px) image measurements were taken after images/fonts loaded, with reduced motion enabled. Measurements document the current design; they are not accepted replacement dimensions or evidence of animated behavior.

Regenerate with `node scripts/cms/snapshot-about-page.mjs` against the local server with About CMS delivery disabled. The script reads the site and local source files and writes only the inventory. It does not upload media, create drafts or publish. Tests fail if the captured source/image bytes change; recapture and review those changes before using the inventory.

## Required representation

| Source area | Captured content | Remaining representation work |
| --- | --- | --- |
| Hero | About label, full title and emphasized “field.”, founding copy, tiger image, alt, archive credit, focal point 50%/58% | Preserve full-width image/overlay layout and responsive dimensions. New optional hero framing can retain the focal point but the current split layout and fixed shapes do not reproduce the original hero. Add heading emphasis and approved hero presentation controls. |
| Our story | Label, H2 with emphasized “intent.”, two paragraphs, Plan a journey link | Add non-hero eyebrow and heading emphasis; preserve two-column relationship and button treatment. |
| Leadership introduction | Label, H2, introduction | Editable eyebrow and introduction grouping with the profiles. |
| Three profiles | Names, H3 roles, two biography paragraphs each, portrait paths and alt | Keep names and roles separate. Preserve paragraph order, portrait layout and independent portrait framing: Kairav 58%/42%, Gaurav 50%/38%, Trikansh 50%/45%. Hero-only framing does not yet cover these portraits. |
| Principles introduction | Label, H2 with emphasized “terms.”, introduction | Editable eyebrow and emphasis, linked to the numbered principles layout. |
| Two principles | Decorative 01/02, labels, H3 titles, one paragraph each, conservation link | Preserve numbering, independent labels and link style; generic cards alone do not represent the original grouping. |
| Motion | Source `app/about/AboutMotion.tsx` | Connect approved animation behavior with reduced-motion support and scoped cleanup, then verify both motion modes. Current About publication rejects non-none animation. |
| SEO | Rendered title and description | Map to page SEO without duplicating the site title suffix; review canonical/indexing/sharing defaults. |

No approved exception currently permits dropping these details or substituting the split hero/cards layout. Content must not be flattened into paragraphs merely to pass existing schemas.

## Migration execution gates

1. Finish the missing authoring, schema and public/preview presentation controls above; validate unsupported data and preserve plain existing payloads.
2. Generate a deterministic candidate from the captured inventory. Preserve all nine headings, three emphasized words, biography paragraphs, labels and links. Match the source hashes and account for every captured field.
3. Prepare all four images through the existing media pipeline. Record source hash → processed asset ID, accessible alt and rights/credit evidence. Local JPEG paths are not public CMS asset IDs, and availability/rights must not be assumed.
4. Show existing-vs-proposed content and desktop/mobile rendering. Resolve design differences explicitly before applying the draft. Include the original hero and portrait crops, not just copy parity.
5. Apply as a draft with exact revision/identity checks, atomic receipt/recovery, and no automatic publication. Current legacy delivery stays enabled until the reviewed replacement is accepted.
6. Run trusted validation, editorial approval and publication checks; verify actual provider reads, media, metadata, sitemap, withdrawal and rollback. Record client acceptance and handover instructions before enabling About rollout.

The local route inventory and tests prove source capture/freshness. They do not prove provider migration, media rights, design parity, animation parity or client acceptance.

## Heading emphasis implementation update

Optional exact `titleAccent` authoring, validation and rendering now cover hero/text/imageText/cards/CTA headings, including the three captured About emphasis phrases. The table above records the original gap assessment; emphasis is now implemented. All other representation and migration execution gates remain open.

## Section label and portrait control update
Optional non-hero section labels now preserve story/principles labels and profile names independently of role headings. Image/text portrait sections support independent desktop/mobile crop shapes and focal points, including 5:6 mobile framing. These close the authoring-field gaps; matching the original grouped leadership layout, per-profile desktop dimensions, numbered principle layout and motion remains required. No migration candidate has been applied or published.

## Numbered principles implementation update
The approved numbered cards layout now represents the captured principle section's introduction, heading/emphasis, per-item labels, sequential decorative numbers, copy and link. The source-data projection test preserves those fields exactly. The real shared renderer/editor passed desktop/mobile responsive and reordering checks. Final comparison in the complete About layout remains necessary; this does not approve broader layout differences or close migration/provider/client gates.

## Grouped leadership implementation update
The leadership cards variant now represents the section introduction and all three profiles, with name/role separation, preserved biography paragraphs, portrait identity/framing and source-like alternating desktop/stacked mobile layout. Schema and browser checks cover source-field retention, invalid profile rejection and reordering. This closes the grouping and portrait-presentation implementation gap. Final full-page design comparison, hero/motion work and all migration/provider/client gates remain open.

## Overlay hero implementation update
The full-width overlay hero is now an approved selectable presentation, with shared authoring/preview/public rendering and separate desktop/mobile focal points. Source text, emphasis, alt and credit are representable. Desktop/mobile runtime checks passed. Credits remain visible on mobile rather than following the legacy hidden-credit rule; include this behavior in the complete-page review. Motion, overall source comparison and migration/provider/client gates remain open.

## About motion implementation update
About now supports none/fade/reveal with scoped entrance, leadership/portrait and overlay-hero motion, reduced-motion preference updates and cleanup. Desktop/mobile runtime checks passed for focus visibility, preference changes and remounting. This closes the motion connection gap; it does not establish identical legacy timing. Complete-page comparison and all migration/provider/client gates remain open.

## Complete review proposal
`lib/cms/about-migration.ts` deterministically builds a review-only proposal from the bundled inventory. `scripts/cms/plan-about-migration.mjs` checks hashes of all five source dependencies and four original images, then writes `about-migration-review.json`. No database/network write occurs. Run with Node's `--experimental-strip-types` flag.

The proposal includes all four source sections, nine headings, three emphasized phrases, biographies with paragraph boundaries, principle numbering/labels/links, image alt/credit/focal points and SEO title/description. The four unbound images use visibly named `review-only-about-*` placeholders; these are not actual asset IDs. Proposed bindings must match the source path/hash and cannot duplicate source paths or asset IDs or reuse review placeholders. Even complete mappings do not prove provider availability/rights. `readyToApply` remains false, and there is no apply/publish operation in this planner.

Tests reject stale/duplicated source proof and stale/ambiguous media bindings. They compare preserved source fields and the generated artifact, so changes require deliberate review. Full desktop/mobile rendering of the proposal confirmed all captured copy, nine headings, three emphasis phrases, four images and both editorial links, with no horizontal overflow or captured page errors. Original local images were intercepted only for that review. Desktop full-page screenshot inspected. The temporary QA route was removed; it is not a persistent or published CMS page.

Outstanding review findings: story remains stacked instead of the original two-column layout, and its contact link lacks the original button treatment; backend media evidence is missing; final full-page design/motion acceptance and atomic draft application/recovery remain pending. Content presence checks do not establish complete design parity.

## Story implementation update
The split story layout and contact button are now implemented and included in the regenerated complete proposal. Source copy is unchanged. Desktop/mobile rendering checks verify the layout switch and button while retaining all nine headings, four images and captured source content. The earlier `story_layout` finding is resolved. Review-only status remains: media provider verification, final full-page/client review and draft application/recovery are not complete.

## Authenticated media review foundation
Local database migration 109 adds `review_about_migration_media`, a read-only function requiring document-view permission for the selected website. Evidence binds each asset ID to its original upload hash and ready image-1 processing record, expected delivery object key, processed WebP catalog entry, current inspection/rights/archive/expiry state and media revision. It returns only requested identities, hashes, booleans and revision; no storage keys or private rights evidence. Wrong source hashes, missing objects, unavailable rights or tenant access fail closed. This evidence is a point-in-time catalog check, not a transactional apply lock or independent download of current storage bytes.

`POST /api/cms/migrations/about` accepts review only. It uses the caller JWT, rejects foreign origins and arbitrary commands/payloads, validates exact source mappings against the bundled inventory, and checks create permission or the selected `/about` English page's edit permission/current revision. It calls the media RPC and rejects missing, reordered, malformed or contradictory evidence. The review digest binds website/target/revision, source-derived proposal and current media evidence. Existing target content is included for comparison. Rights/revision changes alter the digest. `applyAvailable` remains false; no draft or publication mutation is called.

Verification: local PGlite checks cover source provenance, permission/site isolation, duplicate mappings, missing media, revoked and expired rights. Transport tests cover exact caller identity, unauthorized/stale/wrong-route targets, apply rejection, foreign origin, bad mappings, missing evidence and changed evidence digests. Full CMS suite: 709 passed; TypeScript passed. No remote SQL, original upload, real rights approval or public delivery changed.

Pending: client review/mapping UI, atomic About draft application with locked rechecks, request receipts/status recovery, real-provider migration/storage evidence and client acceptance. Migration 109 has only been applied to the local test database.

## Transactional draft application foundation
Local migration 110 adds an RLS-protected About migration receipt table and permission-checking apply/status RPCs. A single transaction validates create/edit authority and `/about` English identity, locks the target record, reserves the actor/site/request receipt, checks the expected revision, and locks upload/media rows in deterministic order. Every referenced asset must match the four reviewed bindings. Source provenance, processed WebP, inspection, archive and current rights/expiry state are recomputed under those locks; exact media revision/hash evidence must match the reviewed evidence.

Only `save_draft` is called. No publication pointer is changed. Any failed check rolls back both draft work and the provisional receipt. An exact completed retry returns the saved result after current authority/read checks, even if the draft has subsequently advanced; it does not write over newer work. Reusing the same request key with changed source/review/manifest fails. Receipts are scoped to website and original actor and require current record-view permission.

Local database acceptance covers changed evidence, revoked rights, stale target revision, unmatched payload assets, rollback of receipt/draft, exact replay, altered-manifest rejection, replay after a later edit, one audit event, other-actor receipt isolation, revoked membership and unchanged publication. Full CMS suite: 710 tests passed. These are sequential PGlite tests; independent PostgreSQL connections, deadlock/retry behavior and real-provider acceptance remain unproven.

The HTTP endpoint still accepts review only and returns `applyAvailable: false`. Next work must connect apply/status to this transaction with verified exact receipts, safe response-loss recovery and the client review/mapping flow. Migration 110 has not been applied remotely.

## HTTP apply and recovery integration
The About endpoint now accepts `review`, `apply` and `status`. Review returns the source/review digests and exact media evidence; `applyAvailable` is true only when every image passes verification. Apply accepts the original target, mappings, request key, digest and reviewed evidence. It reconstructs the proposal from deployment-owned source, checks evidence identity/consistency and the digest, and passes an exact manifest to migration 110. It does not accept browser-supplied page payloads.

For new work, the API rechecks current target authority/revision and media evidence before invoking the locked database transaction. For a completed retry, it first verifies the stored receipt's source/review/target identity, calls the same transaction with the original manifest to recheck current authority, and requires the returned result to match the receipt exactly. It does not use a newly changed draft/media snapshot to manufacture a different retry. Missing status is explicitly unconfirmed because an in-flight request may still complete. Malformed/mismatched results return a recovery error rather than claiming success.

Local acceptance exercised the HTTP handler against actual PGlite RPCs: media changes after review were rejected, a response lost after commit was recovered through status, and an exact replay after a later draft edit returned the original result without replacing that later revision. Publication remained unchanged. Transport checks cover changed evidence, wrong-target results and malformed/wrong-request status receipts. Sequential local tests do not prove real-provider concurrency or network/storage reliability.

The client review/mapping and persistent recovery UI is still pending. No real content was imported, no remote migration applied and no rollout enabled. The standalone generated planner artifact remains review-only; this API integration supersedes earlier notes that the HTTP endpoint only accepted review.

## Browser review/recovery contracts
`about-migration-client.ts` reconstructs the source-owned proposal and verifies browser-native source/review hashes before a review can be accepted. It checks target presence, exact proposed content, binding order/identity, media evidence and the consistency of availability flags. The API now returns the request key on direct apply/replay responses, allowing the browser to bind a result to the exact pending request as well as source/review digests and target record.

Pending recovery data is strict, bounded to 20 KB and scoped to website/account. It stores the original target, request key, source/review digests, source-image mapping and reviewed media evidence; it stores no page copy, credentials or before/proposed content. Recovery parsing intentionally does not require today's bundled source to match yesterday's proposal: a completed old request must remain recoverable through its receipt after deployment changes. Exact apply commands can be reconstructed without inventing a new key. Unconfirmed status returns no completed result and must remain pending.

Tests verify server/browser digest agreement, content/target/evidence tampering rejection, cross-account/corrupt/oversized storage rejection, absence of page content/credentials, exact apply reconstruction and request/source/review/target receipt mismatches. These helpers are not yet wired to the client panel; browser interaction, persistent-storage failure handling and competing page-operation guards remain to be exercised with that panel. No user storage or production backend was modified in these tests.

## Client panel integration
Pages now includes an About migration panel. It maps each of the four named source images through the existing private media picker, chooses a new page or selected `/about` draft, requests a verified review and displays before/proposed composition and SEO. An explicit review acknowledgement gates application. Duplicate/missing mappings cannot be submitted. Changing destination, mappings or selected record/revision invalidates the review; request generations prevent a stale review response from becoming current.

The original request/evidence is persisted before apply. Browser storage failure prevents the mutation call. Unknown outcomes retain the pending request; reload restores status/same-request retry controls. Only verified exact receipts clear recovery data. There is no automatic abandon/new-key action for unconfirmed requests. Corrupt/unreadable recovery data blocks new migration work and asks for administrative recovery. Page copy is not stored in localStorage.

Pages combines legal and About pending states to block ordinary edits/navigation and starting another migration. Each panel's existing recovery controls remain usable when another migration is pending, avoiding a mutual recovery lock. Dirty page drafts and external busy operations still block migration commands.

Browser acceptance used the actual panel, browser-native verification and real HTTP handler with a synthetic RPC/storage adapter at 1280px/390px. It exercised all four image mappings, proposal preview, acknowledgement, storage-write failure before mutation, a response lost after commit, reload/status recovery, exact receipt validation, one apply call and pending-data cleanup. No page errors were captured; the mobile screenshot was inspected. This isolated fixture uses the public shell and does not certify final authenticated CMS styling or real-provider behavior. The temporary route was removed. Selected-existing-page mode and competing migration recovery should still receive integrated client UAT, in addition to existing API/transaction tests.

Remaining: real processed-image upload/mapping/rights evidence, provider migrations and concurrency checks, complete client visual acceptance, then controlled draft application and publication/rollback acceptance. The broader CMS PRD and other routes remain in scope.

## Integrated Pages recovery check
Desktop/mobile checks now exercised the actual PagesWorkspace with both legal and About recovery entries restored together. New-page and record-selection actions remained blocked while either entry was pending. Both status controls remained usable. Completing About recovery left page operations blocked until legal recovery also completed, then normal page editing resumed. Selecting an existing `/about` draft enabled the replacement destination; unsaved page changes disabled migration destination and media selection. No page errors occurred.

The initial selected-target check used an overly strict label locator that included neither the select's option text nor its actual label match; inspecting the rendered control showed no application error. Correcting that test locator allowed the complete checks to pass at 1280px and 390px. The temporary workspace fixture was removed. This covers integrated state guards, not live-provider or final authenticated-admin visual acceptance.
