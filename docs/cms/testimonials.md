# Testimonials

The independent workspace now includes a Testimonials collection with paginated reads, locale-aware creation, optimistic revision saves, restore-as-draft history, private preview sharing and image selection. Fields cover quote, name, role, organization, city, trip, guest type, travel date description, route, arrangements, anonymity, wording verification and publication consent evidence. Existing records that do not match the versioned schema remain preserved and require migration rather than being silently rewritten.

Drafts may have pending or withdrawn consent and unverified wording. Granted consent requires a nonblank internal evidence reference. This is an editorial recording control, not a legal determination. Quote length is capped at 10,000 characters. Saves enforce complete schema and null page path at the user-token API. Database permission/revision rules continue to apply; a complete SQL testimonial schema trigger is not present.

The display projection excludes consent evidence and verification internals. Anonymous display also removes name, role, organization, city and image. Editors must review quote and trip text for identifying details. Draft previews explicitly show consent and verification status; they do not claim the quote is approved for public use.

Page-composition testimonial sections resolve each selected record through the viewer's existing content API permissions, preserving order and showing an unavailable message for invalid, missing or inaccessible records. They use latest saved drafts independently of the page revision. Private testimonial shares render their pinned payload. A shared page does not automatically grant access to linked testimonial drafts.

Live testimonial publication policy, immediate consent withdrawal effects on public delivery, migration of existing Sanity/Git testimonials, video evidence/media support and dependency pinning remain unfinished. The current public website has not been switched to these records.

## Migration review planner

Run `node --experimental-strip-types scripts/plan-testimonial-migration.mjs SOURCE_JSON OUTPUT_JSON [MAPPINGS_JSON]` against a local snapshot or testimonial array. The command exclusively creates a new private output file and refuses to overwrite inputs, existing output files or symlinks. It has no database/network/apply operation.

Every candidate carries its complete original source, canonical SHA-256 digest, source position, proposed payload, unmapped field names and review issues. Snapshot identities are content digests, not guessed matches on guest name. Duplicate source content blocks all matching candidates pending an explicit identity decision. Changing any source content invalidates previous mappings; unused mappings are reported. A future apply step must still bind target identities, expected revisions and review receipts—this planner is not an importer.

Optional mappings are keyed by `snapshot:<source digest>` and can supply `consentEvidence` and an inspected CMS `image` reference. Consent is granted in a proposed draft only when the source explicitly says `consented: true` and a nonblank evidence reference is supplied. Missing/false source consent remains pending; source wording verification is retained only when explicitly true. Media mapping is a proposal, not proof of ownership or usage rights. Legacy images, videos and unsupported relationships remain preserved in the source with review warnings.

The 2026-10-22 local snapshot review found three schema-valid draft candidates. All three lacked explicit wording verification and publication consent, and all retained an unmapped `destination` field. No source, live site, database record or Sanity document was changed. The local snapshot is not evidence of current remote Sanity completeness; a separate reconciled export is still required before cutover.

## Reviewed draft application

Local migration 032 and `/api/cms/migrations/testimonials` provide a create-only application path. POST JSON with `action: review`, the website UUID, locale, original source array (up to 100) and optional mappings. The response includes the plan and review digest. Apply requires the same inputs plus `action: apply`, a fresh request UUID and that digest. The server rebuilds the manifest from source and binds its digest to the website, locale, mappings and proposed draft fields. Invalid candidates and unused mappings block application. Warnings remain explicit review items.

The user-token database function checks testimonial-create permission and creates the entire batch transactionally. Full original source and proposed payloads are retained in the actor-scoped migration batch. Imported source keys are unique per website. A repeated request with identical inputs returns the original receipt without changing records, even if a client edited an imported draft afterward. Different content under the same request key fails. A new request attempting an already-imported source fails; no name-based merge or overwrite occurs. This is deliberately create-only: changed source records need explicit identity/update review in a future update workflow rather than guessing matches.

The migration creates drafts only and cannot approve or publish. The API validates the complete testimonial schema; the SQL boundary validates basic shape, scope, size and permissions but does not duplicate every application schema rule. The original source is recoverable from the migration batch. Local tests prove rollback of an earlier item if a later item conflicts, permission rejection, exact retries, preservation of client edits and unpublished state. No real snapshot has been applied, and the client review/upload interface and staging deployment remain pending.

## Client migration screen

Testimonials now includes Import existing testimonials. It accepts a JSON array or a site snapshot with a `testimonials` collection, up to 1 MB and 100 records. The screen shows original content, proposed payloads and individual warnings/errors. Users must acknowledge the reviewed drafts and warnings before Create reviewed drafts is available. This initial screen does not include advanced mapping-file editing; missing consent/media mappings remain visible follow-up work.

An uncertain apply response locks the source/locale and retains the request UUID for retry. A receipt must match every reviewed source key and contain valid record/revision UUIDs before success is shown. Refreshing the list after success is separate from confirming the transaction. The workspace unsaved-change guard also covers a loaded migration. Pending state is in memory only; a forced close/reload loses it, so the UI explicitly asks users to retain the screen until confirmation. Durable receipt recovery across sessions remains outstanding.

Client parsing/receipt tests and API review binding checks pass. Browser upload interaction, accessibility review of the full import flow and real staging execution remain required before client handover.

The synthetic browser upload/review/retry flow has now been exercised successfully, including acknowledgement gating and identical retry payloads. The test fixture did not write database records and was removed. This does not replace real staging import or full accessibility testing. Discard import review clears a local review before application; it is unavailable while an application result is uncertain.
