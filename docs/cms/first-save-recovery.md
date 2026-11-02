# Recovering an ambiguous first save

## Atomic server contract

Migration `204-idempotent-draft-creation.sql` adds `cms.create_draft_once`. The first revision and an immutable request receipt commit in the same transaction. The receipt binds website, authenticated actor and request UUID to the exact content type, path, title, locale and JSON payload. An exact replay returns the original record/revision IDs without creating another record, revision or publication. Later edits do not change that historical result. Changed input with the same request UUID is rejected.

Creation permission is checked on every call. Receipt replay additionally requires current editing access to the created record. A different actor cannot recover another actor's result. Receipt rows are not directly readable or writable by authenticated/anonymous callers. Existing `save_draft` guards and triggers still enforce creation behavior. A failed creation rolls back the receipt too, allowing the identity to be retried after a known non-committing rejection.

The editor API accepts an optional `requestKey` only for `save` commands with null record and expected revision. Keyed responses include the website and request UUID alongside the record/revision result. It validates content normally and routes keyed creates to `create_draft_once`. Existing updates and unkeyed saves keep their current behavior. Imports are unchanged.

## Verified locally

The full 1,362-test CMS suite, TypeScript and production build pass. Local PostgreSQL-compatible database tests cover exact retries, unchanged historical results after later edits, changed-input rejection, actor binding, permission denial, direct-table denial and atomic rollback after a duplicate URL failure. API tests cover forwarding authenticated caller identity and rejecting request keys on updates. The offline migration planner includes migration 204; no provider migration was executed.

The shared workspace transport now supplies persisted request keys for new-record saves. Multi-connection hosted concurrency remains unverified; local transaction tests do not prove that deployment property.

## Client workflow

Before sending a new-record save, the workspace persists an account/site/type-scoped immutable request UUID and full request snapshot, under a browser lock. The client does not silently replace that snapshot after an ambiguous response. Recovery retries the same identity and snapshot, validates the result, and loads that record. The workspace retains a confirmed result until a matching record load is received, so a failed follow-up reload cannot turn another Save into a new creation. An independent save attempt must not bypass an unresolved request in another tab.

Known rejection and ambiguous transport outcomes require separate handling. Browser recovery copies remain optional content checkpoints; they are not durable save-request receipts. The shared API covers primary editor creation paths, including initial settings. Primary editor acceptance now passes locally; hosted migration/concurrency checks remain before handover.

## Persisted client transport contract

`draft-creation-recovery.ts` implements browser-locked submission and exact-request retry. Before transport, it confirms storage of a strict account/site/type-scoped request snapshot with a UUID and creation timestamp. JSON object-key order does not change request identity; array order does. Another draft cannot replace an unresolved snapshot, including from a waiting tab. Retry sends stored content, not the current editor state. Confirmation must bind website, request UUID and valid record/revision UUIDs before exact pending-state comparison and removal. Invalid, mismatched or missing receipts preserve the pending request. Tokens are never stored.

Twenty-two focused transport/API tests, TypeScript and production build pass. Tests cover a lost response after a simulated commit, reload retry, changed-content refusal, missing Web Locks, unconfirmed storage, scope isolation, mismatched confirmations, serialized competing tabs and retaining a pending request after a permission rejection. The API response binding is tested directly. These are local contract tests, not browser integration or hosted evidence.

Save buttons now use the shared transport. A workspace panel exposes retry and server-backed resolution/cancellation and explains temporary private browser snapshots before saving. Clearing a pending request solely because a retry gets a 403 is unsafe: the earlier attempt might have committed before permissions changed. Cancellation must serialize against creation, return an existing committed result or leave a cancellation tombstone, and only then permit local clearing. Pending snapshots contain private draft content; the UI must explain this temporary local storage before first saves.

## Safe cancellation contract

Migration `205-draft-creation-cancellation.sql` adds cancellation tombstones and `cms.cancel_draft_creation`. Cancellation and creation share the same receipt row lock. Cancellation before creation permanently rejects later attempts with that request UUID. Cancellation after creation returns the original record/revision IDs without deleting content or adding revisions. Cancellation is actor/type bound and checks current creation permission; returning a created record also requires current editing permission.

The strict `cancel_create` API command echoes website/request identity. The browser cancellation helper clears pending data only after a matching server confirmation and unchanged local snapshot. Lost responses, mismatched identities and changed local snapshots preserve recovery data. Repeating cancellation is safe. No local-only discard is provided.

Local database, API and transport tests cover cancellation before creation, repeated cancellation, delayed retry rejection, preservation of a committed record, actor/type binding, permission denial, lost responses and stale local state. Multi-connection hosted races remain unverified. No migration has been applied to a provider.

After cancellation changes, all 1,371 CMS tests pass with the configured PDF runtime, TypeScript passes, and the production build passes. The offline migration planner includes migration 205. These results do not constitute staging or client acceptance.

## Workspace integration evidence

The shared workspace intercepts new `save` commands only; updates keep their existing optimistic revision behavior. It obtains fresh authentication after acquiring the browser lock and refuses a changed account. Confirmed results remain stored until a matching record load, including the settings endpoint. The recovery panel discovers pending requests on mount, browser focus, storage events and local save events. Retry uses the original payload. Resolution returns an existing record or confirms cancellation; it never deletes a created record. Reload is explicit and warns about unsaved editor changes.

All 1,373 CMS tests, TypeScript and the production build pass. The retained Chromium script `scripts/check-cms-new-draft-recovery.mjs` passes a real browser restart after a simulated committed save loses its response, a subsequent failed record reload, and an exact-request retry that loads the existing unpublished form and clears the pending receipt. Every retry is asserted to send the same request UUID and payload. Existing new-draft-copy restart, removal and two-tab stale-copy deletion checks also pass. Auth and CMS APIs are mocked; these checks do not prove provider concurrency or every editor's full workflow.

## Stale tabs and cancellation acceptance

A tab remembers request snapshots it has attempted until that tab loads the resulting record or confirms cancellation. If another tab acknowledges and clears shared storage, a stale tab recreates the same pending request identity before retrying, rather than generating a new identity. Changed content or an intervening different request is refused; the user must resolve the earlier save or reload. This memory is local to the tab and contains no tokens.

`scripts/check-cms-first-save-tabs.mjs` passes in two real Chromium tabs with mocked APIs: a first save commits but loses its response; another tab saves and loads the same draft; the first tab retries using the original request UUID, yielding only one record. The script also loses a cancellation response, verifies that pending data remains, repeats cancellation successfully, and saves a replacement draft using a new identity. No record is published. A focused transport test additionally checks changed-content refusal and intentional next-draft creation after local acknowledgement. All 1,373 CMS tests, TypeScript and production build pass. Hosted multi-connection concurrency and client acceptance remain outstanding.

## Primary editor acceptance

Run `node --experimental-strip-types scripts/check-cms-editor-first-saves.mjs` against a local fixture server configured with the mock Supabase URL/key described by the recovery browser setup. The runner retains five scenario files under `scripts/cms-recovery-fixtures/` and rejects non-local target hosts.

All 12 scenarios pass: journey, page, homepage, duplicated page, initial settings, document, destination, journal article, photography expedition, menu, testimonial and specialist. Each restores a browser copy, simulates a committed first save whose response is lost, retries with exactly the same request UUID and payload, loads the saved record and checks that the pending receipt is cleared. Saved content stays unpublished. Settings use their dedicated load endpoint and preserve impact-review requirements. Duplicate pages preserve their SEO/navigation review requirements. Homepage and settings recovery also reject an intervening existing record; settings recovery rejects revoked creation access. These are browser integration checks with mocked APIs, not provider transaction or deployment evidence.
