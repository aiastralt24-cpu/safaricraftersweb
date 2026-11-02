# Reusable FAQ Office imports

## Implemented

FAQ template v1.0 has its own `faq` type and `CMSFaq` Word marker. The shared bounded Office decoder accepts Excel and Word tables while rejecting formulas, external references and tracked changes. The authenticated review endpoint resolves current records and reference permissions. Draft application, durable receipts and cancellation are connected. The FAQ workspace now connects upload, comparison, preview, explicit draft saving and recovery.

Tables: Pages (question, create/update, language and expected revision), Content (topic/review date/internal notes), Blocks (paragraph/list/quote/table/link), Tables, ListItems, Relationships and Keywords. Limits are 25 FAQ records, 500 total rows and two million text characters, with field-level limits. Question limit is 200 characters; keyword limit is 80. Answers retain paragraphs, whitespace, inline formatting, lists and table cells. Imported references use CMS UUIDs; authenticated review resolves their current revisions and availability before any future apply.

Updates require the current revision and unchanged language. Omitted fields retain saved content. Collection changes require explicit `replaceCollections`: `answer`, `keywords`, `relationships.pages`, `relationships.products`, `relationships.destinations`, `relationships.documents`. Listing a collection with no rows clears it. Unknown fields, duplicate identities/positions, orphan rows, invalid content and data that would be dropped produce errors and no proposed changes. Creation/import never grants approval or publishes.

## Remaining

- Native Office, hosted concurrency and client acceptance.

Implementation: `lib/cms/faq-import-contract.ts`, `lib/cms/faq-import-plan.ts`, FAQ decoders in `lib/cms/import-file.ts`. Focused checks cover equivalent Word/Excel proposals, formatting, table preservation, revision conflicts, replacement intent and unsafe Office constructs. The synthetic parser fixtures do not establish native Word/Excel usability.

Verification: 25 focused parser/planner regression tests and the complete 1,799-test CMS suite pass, with no failures/skips. TypeScript passes. Logs `/private/tmp/cms-faq-import-{regression,full-final,types}.log`. No provider writes, UI checks or production build are claimed for this parsing-only batch.

## Downloadable templates

`public/cms/templates/faq-v1.xlsx` and `faq-v1.docx` are linked from the FAQ workspace. Both include field limits and replacement instructions. Their introductory wording says to upload when FAQ imports are available; the FAQ workspace now provides that workflow. Excel highlights excess text; the server planner rejects it without truncation. All nine Word pages and all Excel sheets were rendered and visually checked, including the 201-character question warning. Matching filled fixtures produce identical valid proposals; blank templates cannot accidentally create drafts. Eight FAQ import tests pass. Native Microsoft Office acceptance remains pending. QA evidence: `/private/tmp/cms-faq-template-build/`.

## Authenticated review

`POST /api/cms/import/faqs` accepts `X-CMS-Action: review`, website and format headers, a bearer token and the original bounded Office bytes. Updates are rebuilt from caller-scoped saved records; wrong identities, types and standalone URLs are rejected. Migration 316 checks create/edit/view permission and resolves ordered, same-website reference revisions without leaking inaccessible record metadata. Missing reference evidence fails closed. The review digest binds original bytes, current content, proposed changes and reference revisions. The response includes before snapshots and marks valid proposals eligible for explicit draft saving. Review does not publish or save. Internal link and publication checks remain part of the separate trusted validation workflow.

Review verification: 14 focused FAQ import tests and the full 1,807-test CMS suite pass with zero failures/skips. TypeScript passes. The offline empty-ledger plan validates all 316 migrations. Evidence: `/private/tmp/cms-faq-review-{focused,full,types,migrations}.log`. No hosted verification, browser upload flow or draft application is claimed.

## Atomic draft application and recovery

The endpoint also accepts `apply`, `status` and `cancel`. Apply reparses the exact Office bytes, rereads current drafts and references, and compares the review digest before saving. Migrations 317–318 lock targets and referenced records in deterministic order, check current reference evidence and revisions, and save the entire batch in one transaction. Failed batches leave no records or receipts. Saved FAQs remain drafts with no standalone path; import does not approve or publish.

Receipts are scoped to website, actor and request ID. The same request returns its original result even after later edits. Reusing a request for different content fails, and permanent source keys prevent a new request from duplicating an already imported create. Cancellation shares the apply lock: it either returns a completed receipt or fences delayed saves. An unconfirmed status is never treated as proof of failure. The client stores only recovery identifiers and holds a per-actor, per-website Web Lock during import requests. Hosted concurrency is not established by the local database tests.

Apply verification: all 1,813 CMS tests pass with zero failures/skips, including database rollback, stale revisions, reference changes, permission revocation, receipt isolation, cancellation and the Office → API → database save/recovery workflow. Production build passes. The offline plan validates 318 migrations. Logs: `/private/tmp/cms-faq-apply-{focused,full-final,build,migrations}.log`.

## Client workflow

Open Import Word or Excel content in the FAQ workspace. Selecting a file temporarily locks normal editing; unsaved editor content blocks imports. Review shows field-level changes, explicit collection replacements and a visitor-style answer preview. Internal notes remain visible only in the administrative comparison. Saving requires acknowledgement. Reloading preserves unresolved request identifiers without storing the uploaded content. Invalid receipts and failed editor/list refreshes retain recovery; cancellation or a verified completed receipt clears it. Storage changes invalidate stale reviews across tabs, and Web Locks prevent simultaneous requests using the same browser scope.

Client verification: 21 focused import tests and all 1,817 CMS tests pass; production build and TypeScript pass. The synthetic browser workflow passes at 1280px and 390px using real Office parsing and API review with simulated persistence. It covers comparison, preview, acknowledgement, lock contention, lost save/cancel responses, invalid receipts, failed refresh and recovery. Logs `/private/tmp/cms-faq-ui-{focused,full,build,types-final,browser}.log`. Hosted-provider and native-Office acceptance remain pending.
