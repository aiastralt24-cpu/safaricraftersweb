# Destination migration review

`planDestinationMigration` converts legacy snapshots into review candidates without performing writes or downloading images. Each candidate retains its complete original object, source index and deterministic digest. The report digest covers the full input list. This is not publication authorization or proof that a mapped asset/record exists.

Mappings are keyed by `snapshot:<source digest>` and then by source field path. `images` maps paths such as `image`, `gallery.0` and `seo.socialImage` to full CMS image descriptors; `references` maps paths such as `journeys.0` and `pairings.0` to explicit record UUIDs. Nothing guesses record identity from a title or slug. Missing or unused mappings block draft readiness. Apply integration must independently verify website, record type and asset availability.

Known scalar and collection fields retain their values without coercion. Partial editorial and field-intelligence objects receive schema defaults, while unknown nested properties are caught by strict validation. Legacy SEO review dates remain in the source snapshot with a warning; they do not imply CMS approval. No hero is inferred from legacy runtime overrides. Video and specialized country/atlas content need separate migration contracts. Duplicate URLs block every affected candidate.

The checked-in inventory contains the current 102 source records and their review issues, with 17 specialized-country candidates. No records are ready without mapping review. Full originals remain in `content/site-content.json` and in planner results; the inventory stores digests and issues rather than duplicating all content. Regenerate the inventory after source changes and review the changed digest before applying anything.

TypeScript and all 306 CMS tests passed at this milestone. Review UI, authenticated atomic apply, media transfer/inspection, relationship resolution and structured destination Word/Excel imports remain pending. No migration has been applied remotely.

## Authenticated review endpoint

POST `/api/cms/migrations/destinations` accepts `action: review`, a website UUID, locale, up to 25 source records and digest-keyed mappings. It uses the caller's token to obtain evidence through migration 050's `review_destination_migration_links`. The database requires destination-create permission; all mapped assets and references are bounded to 500 per request. Inaccessible or wrong-type references return only unavailable identity descriptors.

The API requires processed WebP media with current inspection/rights, visible typed records in the selected website and matching locale, and exact response identity/order. Review results include a digest binding the site, locale, plan and current evidence. These are observations at review time, not write authorization. The response explicitly sets `applyAvailable: false`; unsupported apply requests are rejected. No service-role credential or media download is used.

TypeScript and all 309 CMS tests pass. Atomic apply must recheck these conditions in its transaction and retain the reviewed source snapshot. Review UI and structured Word/Excel destination imports remain pending. No remote migration has been applied.

## Atomic draft apply

Migration 051 adds `apply_destination_migration` and actor/site-scoped batch history. The transaction requires destination-create permission, records the full reviewed source/payload manifest, creates new drafts only and reserves each source identity. It locks and rechecks mapped image approval/inspection/format and related record type/language/visibility before saving. Existing URL/source conflicts roll back the full batch; existing content is never replaced. Drafts require the normal validation/review/publication workflow afterward.

The endpoint now accepts `action: apply` with the review digest and UUID request key. It recomputes the plan and current evidence, rejects any changed digest or unresolved issue, validates the destination payloads and calls the transaction with the user's token. Identical database retries return the stored result; changing a manifest under the same request key is rejected. If evidence changes after a successful request but before an API retry, the API requires a fresh review rather than returning the earlier result automatically; batch-history recovery UI is still needed. Retry must never invent a new request key after an uncertain outcome.

TypeScript and all 311 CMS tests pass, covering original retention, draft-only state, replay, changed-request rejection, batch rollback and image/reference denial. Review/apply UI and managed-provider concurrency testing remain pending. No remote migration or content application occurred.

## Administrator review panel

The destination workspace now includes an import panel accepting JSON arrays or snapshots containing `destinations`, with up to 25 records per batch. An administrator enters digest-keyed mappings, requests review, examines original and proposed content and acknowledges the issues before draft creation. This technical migration panel is separate from the planned client Word/Excel templates.

Changing locale or mappings invalidates the displayed review. The client checks source/index correspondence and complete, unique receipt identities. Once apply starts, it retains the source, mappings, digest and request key for retry and locks editing. Do not close the page after an uncertain response: persistent request recovery is not implemented yet. Pending migration state participates in workspace navigation protection.

All 313 CMS tests and production build passed; TypeScript also passed after browser fixture removal. Synthetic browser verification covered loading a local snapshot, expanding source/proposal details, required acknowledgement and creation receipt handling. No real backend was used in that browser flow. Visual asset/reference mapping controls, provider integration and persistent recovery remain pending.

## Saved result recovery

Migration 052 exposes an owner-scoped completed-result lookup requiring current destination-create permission. The API accepts `action: status`, website and request key. A completed response includes validated receipt identities and digests, without source/manifest content. A missing response is `unconfirmed`: an in-flight transaction may not yet be visible, so absence does not prove failure.

Before apply, the panel persists only the website, request key, review digest and per-record source digests in local browser storage. After reload it restores a locked recovery state and can retrieve the original result even if media availability has changed. Recovery verifies request/review identity and every receipt source key before clearing the tracker. Original uploads and mappings are not persisted. An unconfirmed outcome remains locked and may require operator investigation; do not discard the request ID or create another import to guess the outcome.

TypeScript and all 316 CMS tests pass, covering owner/website access, response identity validation and recovery metadata boundaries. Browser testing of reload recovery and managed-provider verification remain pending. Migration 052 has not been applied remotely.

Reload recovery has now been browser-verified with a synthetic status-only provider. Pending identifiers restored the locked state after reload; an unconfirmed result kept it locked; a matching completed receipt cleared the tracker without calling apply. A further reload confirmed the unlocked state and absent tracker. The fixture, synthetic storage entry and tab were removed. TypeScript passed after cleanup. Real-provider integration and operator handling of permanently unconfirmed outcomes remain outstanding.
