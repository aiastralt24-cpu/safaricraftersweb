# Event Office imports

Status: template table contract, Office file decoding, pure change planner and evidence verifier implemented locally. Database evidence/review/apply/cancellation are implemented locally. The HTTP import API is connected locally; client upload/review/preview is connected locally; downloadable Word/Excel templates are connected locally. No hosted import writes or deployment have occurred; the client upload flow still requires hosted acceptance.

Version 1.0 uses pageType `event` and seven tables: Pages, Content, Blocks, Tables, ListItems, Media and Relationships. Pages identifies create/update, stable import ID, current revision for updates, slug, title, locale and explicitly replaced collections. Content provides one row per scalar field, including event status, category, organizer, timing mode/start/end, venue, attendance, online URL, registration, summary, private notes and SEO. Rich content, table cells, list items, images and relationships use ordered rows with stable IDs.

Hard limits: 25 events, 500 total rows and 2 million text characters per plan. Field limits match the event contract: title/organizer 200, category 120, summary/status note/private notes 2,000, venue address 1,000, other venue fields 200 and URLs 2,048 characters. Summary guidance recommends 80 words; SEO title/description guidance recommends 60/160 characters. Warnings preserve exact text; hard-limit failures reject the plan without truncation.

Updates require caller-scoped existing snapshots with exact current revision, unchanged language and unchanged URL. Omitted values remain unchanged. Body, image placements, gallery and relationship groups require explicit replaceCollections intent to replace or clear. Duplicate fields, unknown columns, orphan rows and incompatible content are rejected atomically; an invalid batch produces no proposed changes.

Registration enabled accepts exactly `true` or `false`; blank/yes/1 are not silently interpreted. Timed values require explicit offsets and compare actual instants. All-day dates retain inclusive civil end dates. Changing timing mode without compatible replacement dates fails. Draft imports can remain editorially incomplete: trusted readiness, review and release checks still apply later.

Verification: 16 contract/planner tests and TypeScript pass. Tests cover structured content and formatting, preservation/replacement, revision/route isolation, unsafe links, limits, private notes, registration parsing, offset changes, leap days and partial event updates. Evidence: `/private/tmp/cms-events-import-contract-{tests,types}.log`.

## Office decoding and evidence checks

Dedicated event parsers require version 1.0/pageType event and the CMSEvent Word metadata table. Excel worksheets and horizontal/vertical Word record tables feed the same planner. They reuse the shared archive/XML limits and reject formulas, external workbook references, tracked edits, unexpected tables and template identity mismatches. Parsed source hashes, byte sizes and Word table provenance are retained.

The event evidence verifier deduplicates selected images, retains typed related-record identities and requires exact ordered evidence coverage, including matching revision availability. Missing, malformed or extra evidence cannot authorize a plan. Unavailable images or relationships produce blocking findings. Database evidence acquisition and atomic draft application are covered by the later database milestone below.

Verification: 80 event and shared Office regression tests plus TypeScript pass. Equivalent Word/Excel proposals preserve paragraph whitespace, lists, leap-day all-day dates, explicit false registration values and row provenance. Evidence: `/private/tmp/cms-events-office-{tests,regression,types}.log`. No client downloads, import API or server writes were added in this batch.

## Database review, atomic saves and recovery

Migrations 337–339 add caller-scoped link review, atomic event draft application and durable cancellation. Review requires create permission or view/edit permission on every update target; references expose only visible same-site records and current revisions. Image evidence requires approved, processed, unarchived media with current rights.

Application locks updated and related records deterministically, locks media, recomputes exact evidence, checks revision/route/language identity and writes the batch transactionally. An invalid item rolls back every draft in the batch. Receipts bind website, actor, request key, file digest, review digest and manifest; retries recover the original result even after later edits. Receipt reads remain private to the actor and active website membership.

Cancellation serializes against application using the same request identity. Cancelling before application blocks a delayed save; cancelling after completion returns the existing result. The internal pre-cancellation function is inaccessible to browser roles. Imports save drafts only and do not approve or publish them. HTTP transport and client review are covered below.

Database verification: all 1,928 CMS tests and offline 339-migration planning pass. Focused integration tests cover scoped evidence/hidden references, all-or-nothing drafts, stale revisions, changed rights, request replay, private receipts, cancellation fencing and no publication. Evidence: `/private/tmp/cms-events-import-db-{focused,full,migrations}.log`. No hosted migration was applied.

## Authenticated upload API

The Node endpoint `/api/cms/import/event` now supports review, apply, status and cancel with private no-store responses and caller JWTs. It enforces same-origin requests, file/body limits, site membership and bounded caller-scoped update reads. Apply rebuilds the plan from the uploaded bytes, recomputes current evidence and binds the review digest to the website, source hash, proposed snapshots, existing comparisons and evidence. It accepts no client-authored save manifest.

Completed requests recover through exact private receipts; a missing receipt is explicitly unconfirmed. Reused request IDs, changed review content/evidence and cancelled imports cannot silently save another version. Save responses must match all proposed source identities and update targets. The endpoint never approves or publishes imported drafts. Client upload/review controls are covered below.

API verification: eight API tests, a real local database Office review/apply/recovery integration test, production build and TypeScript pass. Tests cover authentication/origin boundaries, stale server snapshots, exact evidence, review identity, verified save receipts, replay/status and cancellation. Evidence: `/private/tmp/cms-events-import-api-{tests,db,build,types}.log`. No hosted writes or deployment occurred.

## Client upload and review

Events now includes an Office import panel with explicit review, per-field before/after comparison, proposed-content preview and acknowledgement before saving drafts. Selected files and unresolved imports lock conflicting workspace actions and participate in unsaved-navigation guards. Only recovery identities are retained in local storage, not uploaded file content. Web Locks and storage change handling coordinate tabs.

Recovery validates actor/site/request/source/review identity and exact result targets. The tracker is retained until both the affected record and library refresh succeed. Interrupted saves can recover committed receipts; cancellation can fence a delayed write or recover an already completed import. Unknown outcomes remain unresolved until verified. The panel links to the verified blank Word and Excel templates.

Client verification: four focused comparison/recovery tests, production build and TypeScript pass. Desktop/mobile import fixtures exercise actual Office review code with synthetic persistence failures: comparison, preview, acknowledgement, cross-tab locking, lost responses, invalid receipts, failed refresh recovery and cancellation. Existing desktop/mobile event authoring/publishing checks also pass. Evidence: `/private/tmp/cms-events-import-ui-{tests,build,types,browser,authoring}.log`. No hosted provider writes occurred; local preview stopped.

## Downloadable templates

`public/cms/templates/event-v1.xlsx` and `event-v1.docx` provide blank version 1.0 templates linked from the Events import panel. Excel includes instructions, column limits, dropdowns and visible length warnings. Word uses labeled record forms with field guidance. Both explain event dates, explicit registration booleans and collection replacement. Filled synthetic examples are retained under `tests/fixtures`.

Verification: all 28 targeted event import contract/file tests pass, including imports of the actual generated files, equivalent proposals across both formats, blank-template rejection, oversized-title rejection and preservation of paragraph whitespace, headings, lists, all-day dates and false registration values. All nine Word pages and every Excel sheet were visually checked. Exported workbook XML retains dropdowns and length-warning rules without formulas in import cells. Evidence: `/private/tmp/cms-events-templates-tests.log` and `/private/tmp/cms-event-artifacts/`. Production build and TypeScript also pass (`/private/tmp/cms-events-templates-{build,types}.log`). Hosted acceptance remains pending.
