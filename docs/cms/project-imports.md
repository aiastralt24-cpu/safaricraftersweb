# Project Word/Excel imports

Status: parser, proposed-change planner, Word/Excel templates, authenticated review/apply/status endpoints, atomic save/recovery transactions and client import panel are connected locally. Native Microsoft Office round trips, hosted verification and client acceptance remain pending.

The version 1.0 project contract uses pageType `project` and Word marker `CMSProject`. Excel uses the existing Instructions metadata cells. The shared Office decoder retains its file/ZIP/XML limits, external-reference/formula rejection, tracked-edit rejection and supported paragraph/list formatting. Existing import families retain their own markers.

| Table | Content |
|---|---|
| Pages | Import identity, create/update, expected revision, title, slug, locale and explicit replacement list |
| Content | Kind, summary, client, industry, location, completion date and scalar SEO fields |
| Blocks | Ordered paragraph/list/quote/table/link blocks in body, challenge, approach or outcomes |
| Tables / ListItems | Ordered child rows for a uniquely identified table/list block |
| Media | Listing image, gallery and social image, using processed CMS asset references |
| Relationships | Project, product, destination and document record references |
| Claims / Evidence | Claim UUID, statement, intended contact, review date and supporting document UUIDs |

Limits are declared in `project-import-contract.ts`: at most 25 project rows, 500 total rows and 2 million text characters, with field-specific hard limits and summary/SEO guidance. No truncation occurs. Project schema validation remains authoritative after conversion. Invalid files produce no proposed changes.

Updates require the exact current revision and preserve the existing URL/language. Omitted scalar fields and collections retain their old values; supplied blank scalar values clear the field subject to schema validation. Replacing or clearing a collection requires its explicit name in replaceCollections. Supported groups include all four body sections, images/gallery, each relationship group and claims. Evidence rows must have a claim row in the same import, and duplicate evidence targets are rejected. Imported evidence/contact names never create reviewer assignments or claim-approval receipts.

The planner is pure: it accepts caller-scoped existing snapshots and returns proposed full drafts. It does not authorize writes, resolve current media/record eligibility, assign owners or publish content.

## Remaining delivery work

1. Completed locally: Word and Excel blank templates, equivalent filled fixtures, word/character guidance and visual QA.
2. Completed locally: authenticated review endpoint, source/review digest generation and current media/reference evidence.
3. Completed locally: atomic create/update transactions with permission/revision checks, source/review digest enforcement, actor-scoped request receipts and lost-response recovery.
4. Connected locally: template downloads, proposed-content preview, replacement summaries, before/after field comparisons, explicit review, save, recovery and server-fenced cancellation controls.
5. Local browser, API/database and regression checks pass. Native Office round trips, hosted storage/permissions/concurrency and client acceptance remain pending.

Local checks cover equivalent Word horizontal/vertical tables and Excel proposals, literal whitespace/list structure, Office provenance, wrong markers, formulas/external links/tracked edits, grouped project content, tables, formatting, media/SEO, claims/evidence, preservation/replacement rules, stale updates and route/language changes. Native Office and hosted acceptance have not been performed.

Template batch verification: all **8 project import tests pass**, including parsing the actual distributed files, rejecting empty forms as draft input, and comparing the filled Word and Excel proposals. Workbook renders cover every sheet and a 201-character title warning; the 11-page blank Word form and filled example were rendered for layout review. QA artifacts are under `/private/tmp/cms-project-template-qa`; test log `/private/tmp/cms-project-template-tests.log`. No server import, native Microsoft Office acceptance or hosted writes occurred. Previous integration baseline remains 1,749 CMS tests plus production build/TypeScript passing; the full suite was not repeated for this template-only batch.

## Rebuilding templates

Export the authoritative contract and synthetic samples with `node --experimental-strip-types scripts/export-cms-project-template-schema.mjs /private/tmp/project-template-schema.json`. Run `scripts/build-cms-project-excel-template.mjs` using bundled Node/artifact-tool with repository, schema JSON and QA directory arguments. Run `scripts/build-cms-project-word-template.py` using bundled Python with repository and schema JSON arguments. Blank files live at `public/cms/templates/project-v1.xlsx` and `.docx`; filled examples stay under `tests/fixtures` and contain invented document UUIDs, not resolved or approved evidence.

The workbook uses text cells, dropdown choices, frozen headers and column-length warnings. The CMS remains authoritative for scalar limits and word guidance. The Word form has one vertical record table per section; users duplicate whole tables to add records. Template downloads are available in the project workspace import panel.

## Authenticated review

`POST /api/cms/import/projects` accepts original Word/Excel bytes, a bearer token, `X-CMS-Site`, `X-CMS-Format` and `X-CMS-Action: review`. It checks website membership before decoding, fetches requested update records using the user's token, verifies identity/type/path/revision, and reconstructs the proposed draft. Responses are private/no-store. Valid reviewed plans return `applyAvailable: true`.

Migration 306 checks project create permission or per-record view/edit permission, processed image eligibility and current same-site viewable record references. Claims and ordinary relationships share deduplicated document evidence. Inaccessible, missing and wrong-type references return unavailable with no revision or metadata. Reference revisions are bound into the review digest along with original file hash, site, proposed changes and media availability. The endpoint refuses malformed, incomplete, reordered or inconsistent evidence. These are draft eligibility checks: they do not grant claim approval, prove evidence truth, or bypass independent publication validation.

Limits: 25 projects, 500 distinct image IDs, 500 distinct typed record references, 5 MB of fetched update snapshots and a 1 MB proposed manifest. Existing unmentioned media/references are checked as part of the complete proposed snapshot. A review digest alone is not authorization.

## Atomic apply and recovery

Apply requires the original bytes, `X-CMS-Action: apply`, `X-CMS-Review` and UUID `Idempotency-Key`. The API rebuilds the plan and evidence and rejects a changed digest before saving. Migration 307 derives references and media from proposed payloads, locks target/reference records in UUID order and media in ID order, then rechecks permissions, current reference revisions, image eligibility and update revisions. Every draft, import identity, audit event and receipt is committed in one transaction. A later failure rolls back the entire batch. Imports never approve claims or publish records.

Receipts are scoped to website, actor and request ID with active membership required. Reusing a request ID with different source/review/manifest fails; repeating an already completed request returns its original result, even after later draft edits. `X-CMS-Action: status` with the request ID recovers that result without uploading bytes. An absent receipt is explicitly unconfirmed, not proof that a pending request failed. A different request cannot recreate a previously used create-source identity. The API checks returned record/revision/source identities and directs callers to recovery if a save response cannot be verified.

Local database tests cover later-item rollback, retry, changed keys, duplicate create identity, stale updates, changed reference revisions, revoked media rights/reference visibility, actor-isolated recovery and unpublished results. A real Office upload exercises API review, database apply, replay and status together. Hosted concurrent transactions remain pending.

Apply batch verification: **1,761 CMS tests pass, zero failures/skips**; production build and post-build TypeScript pass. Logs: `/private/tmp/cms-project-apply-{api,sql,full,build,types,migrations}.log`. Offline planning covers 307 migrations; no hosted migration or client content was changed. Overall score remains 51/100 while broader module, hosted and client gates remain incomplete.

## Client import panel

Projects now expose template downloads and a bounded file selector. Review checks the file hash/size/format and server readiness before enabling an explicit confirmation checkbox. The panel shows each proposed project, replacement groups, a nonpublishing content preview and complete proposed payload. Project editing and navigation dirtiness include the active import so its state cannot silently compete with editor saves.

Before/after comparisons use the server-fetched saved project snapshot and exact expected revision. They cover every content field, including optional-image removals, cleared collections, claims, related records and SEO; unchanged fields are omitted. Create proposals explicitly have no saved baseline. The review digest includes comparison snapshots (`project-office-review-2`) and the client refuses missing/duplicate comparisons, wrong revision bindings, mismatched slugs or update proposals without saved content. Existing completed receipts remain recoverable through status; older incomplete reviews must be reviewed again.

Before applying, the panel persists only account/site-scoped request IDs, digests and expected target identities, never file bytes or content. Web Locks serialize work across tabs; storage events invalidate stale reviews. Status recovery verifies the full receipt and refreshes the editor/list before removing the tracker. Failed refreshes and invalid receipts retain recovery. Unknown outcomes keep new imports disabled until status or cancellation confirms the outcome; manually deleting recovery storage is not an endorsed workaround.

Panel verification: **1,764 CMS tests pass, zero failures/skips**. Desktop 1280px and mobile 390px browser fixtures use the actual Office review handler with simulated persistence failures. They verify preview, required confirmation, cross-tab lock exclusion, lost response, reload recovery, malformed receipts, failed list refresh and one-write recovery. Existing project authoring/browser checks pass at both sizes. Logs `/private/tmp/cms-project-panel-{tests,full,browser,authoring}.log`; screenshots `/private/tmp/cms-project-import-{1280,390}.png`. Browser fixtures do not prove hosted storage/Auth/database behavior.

Comparison batch verification: **1,765 CMS tests pass, zero failures/skips**; production build and TypeScript pass. Browser checks at both sizes additionally verify an actual update file shows the saved and proposed title while preserving unchanged content and performing no write during review. Logs `/private/tmp/cms-project-diff-{tests,client,full,browser,build,types}.log`. Overall score remains 51/100; hosted and client acceptance gates remain open.

## Cancellation

Migration 308 adds actor/site/request-scoped cancellation tombstones. Apply and cancellation acquire the same transaction advisory lock; the old apply implementation is no longer callable by authenticated, anonymous or service roles. If apply commits first, cancellation returns the immutable completed receipt. If cancellation commits first, every delayed apply for that request fails before any write. Duplicate cancellation is idempotent; changed source/review digests are rejected. Cancellation does not undo any saved draft and does not consume the imported source identity for a future fresh request.

The API accepts `X-CMS-Action: cancel`, request ID, review digest and `X-CMS-Source` without file bytes. Status can return a verified cancelled outcome. The UI explicitly confirms cancellation, validates request/source/review identity, then clears recovery only after a definitive cancelled outcome or successful recovery/refresh of an already completed save. A lost cancellation response retains the tracker; subsequent status resolves it. No deadline or missing receipt is treated as proof of cancellation.

Local SQL tests cover cancel-before-apply, apply-before-cancel, retry, changed digests, actor isolation and denial of direct calls to the unfenced implementation. Real managed PostgreSQL lock contention between independent sessions is still a hosted verification requirement.

Cancellation batch verification: **1,767 CMS tests pass, zero failures/skips**; production build and post-build TypeScript pass. Desktop/mobile browser tests cover cancellation of an already saved request, preserved recovery after failed refresh, cancellation of an unsaved request, lost cancellation response and status-based cleanup without another save. Logs `/private/tmp/cms-project-cancel-{api,client,sql,full,build,types-final,browser,migrations}.log`. Offline inventory now includes 308 migrations; no hosted changes were made.

Review batch verification: **1,757 CMS tests pass, zero failures/skips**; production build and post-build TypeScript pass. Targeted API checks cover actual filled files, preserved server content, stale revisions, digest changes, malformed evidence, authentication/origin/membership and rejected apply requests. Local PostgreSQL-compatible tests cover permission gates, hidden/wrong-type references, current revision changes and malformed bounded inputs. Logs: `/private/tmp/cms-project-review-{tests,sql,full,build,types-final,migrations}.log`. Migration planning sees 306 local migrations; none were applied to a hosted provider. Score remains 51/100 because the broader module and hosted/client gates remain open.
