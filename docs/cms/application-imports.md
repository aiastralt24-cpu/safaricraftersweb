# Application and industry Office imports

The version 1.0 import contract, Word/Excel readers, draft planner, snapshot comparison and evidence verifier are implemented locally. Authenticated review/apply APIs and permission-scoped database evidence, atomic draft transactions, retry receipts and cancellation are now implemented locally. Client upload, comparison, preview, acknowledgement and recovery controls are connected locally. Downloadable Word/Excel templates are now available in the client import panel.

## Template contract

Excel identifies `templateVersion: 1.0` and `pageType: application`. Word identifies `CMSApplication`, `1.0`, `application` in its metadata table; horizontal tables and vertical record forms are supported. Both formats use the same sections:

| Section | Contents |
| --- | --- |
| Pages | Import ID, application/industry classification, create/update, expected revision, slug, title, locale and explicit collection replacements |
| Content | Summary, internal notes and scalar SEO fields |
| Blocks | Ordered paragraph, heading, list, quote, table, link and image blocks with stable IDs |
| Tables / ListItems | Ordered child rows bound to imported parent blocks |
| Media | Main image or SEO social image using processed CMS asset IDs |
| Relationships | Application, product, project, article and document record references |
| Claims / Evidence | Claim UUID, statement, intended contact, review date and supporting document UUIDs |

A batch accepts at most 25 records and 500 table rows. The contract enforces field limits (including title 200, slug 100 and summary 2,000 characters); the resulting content must also satisfy the ordinary application schema. Summary guidance is 80 words; SEO title/description guidance is 60/160 characters. Guidance produces warnings, not silent truncation. Internal notes remain private draft content.

Classification is required in Pages and cannot change on update. Application URLs use `/applications/<slug>`; industry URLs use `/industries/<slug>`. Duplicate target routes in the same language are rejected; different classifications or languages can use the same slug. Updates require the exact existing revision, URL, classification and locale. Omitted fields remain unchanged. Replacing or clearing body, images, relationships or claims requires listing that collection explicitly in `replaceCollections`.

Draft proposals preserve supported inline formatting and whitespace. Invalid parents, duplicate positions, unsupported fields, unsafe links and cells beyond table headings reject the batch. No partial proposals are returned after any error. Shared file parsing rejects formulas, external references, tracked edits and mismatched metadata.

The evidence verifier requires exact ordered coverage of all selected media and typed references, including claim documents. Missing, mismatched or unavailable evidence is rejected. It consumes trusted evidence; it does not fetch evidence or establish authorization. Importing a contact or supporting document does not grant claim approval. Product references remain subject to the unresolved product-delivery boundary.

## Verification and remaining work

82 affected import/Office parser tests pass, including equivalent application proposals from Excel and both Word table formats, classification and immutable-update checks, explicit replacement, private-field preservation, claims, evidence coverage, rich blocks, limits and malformed files. TypeScript and production build pass. Logs: `/private/tmp/cms-application-import-{types,tests,regression,build}.log`.

Blank Word/Excel templates and matching filled fixtures are implemented. Native Office trials and hosted/client acceptance remain mandatory before handover.

## Authenticated saving and recovery

Migrations 361–363 add scoped application import evidence, atomic draft batches with actor-scoped receipts, and cancellation fencing. The `/api/cms/import/application` adapter rereads update records under the caller's token, parses the original uploaded bytes, and binds proposed snapshots, before-state comparisons and current media/reference evidence into the review digest. Apply reconstructs that review; changed content or evidence requires review again.

The database derives dependencies from payloads, including claim documents, and locks referenced/updated records and media in deterministic order. It rechecks current permissions, evidence, revisions, language, classification and URLs. A rejected batch rolls back all draft writes and its receipt. Imported claims retain their evidence but receive no approval. Saved records remain unpublished.

Retries recover the original result without rereading or overwriting later edits. Cancellation shares a request-specific transaction lock with apply; it either recovers an already completed batch or fences later saves. Receipts are visible only to the requesting actor while their website membership remains active. Anonymous callers cannot invoke import operations. These local checks do not establish hosted concurrent-writer behavior.

Eight authenticated-adapter tests and five focused database tests pass, covering review access, preserved server fields, evidence/digest drift, atomic rollback, immutable updates, classification, claim-document changes, cancelled requests, actor isolation and lost-response HTTP recovery. Build and TypeScript verification logs use `/private/tmp/cms-application-import-backend-*`. Offline planning includes 363 migrations; none were applied to a hosted provider in this milestone.

Full CMS regression passes after restoring four pre-existing test fixtures accidentally altered during test adaptation. Evidence: `/private/tmp/cms-application-import-backend-full.log`. Production build, TypeScript and offline migration planning pass. This verifies local integration; hosted migrations and concurrent-provider execution remain unverified.

## Client workflow

The application workspace now offers upload → review → before/after comparison → private preview → explicit acknowledgement → save drafts. Client verification binds the returned review to the original file hash, byte size and format, and validates complete before-state comparison coverage, classification/route identity and save eligibility. Draft previews exclude internal notes and claims; editors can inspect all proposed content separately.

Pending import metadata is scoped to actor and website, contains identifiers/digests rather than uploaded content, and survives reload. Web Locks coordinate tabs. A lost save response retains recovery until the receipt and affected list/editor refresh are verified. Cancellation can recover an already saved result or confirm that the request was fenced. Unsaved editing, unresolved imports and translation operations disable conflicting actions.

Twenty focused application import tests, production build and TypeScript pass. Desktop/mobile synthetic browser checks at 1280px and 390px pass mixed application-update/industry-create review, before/after comparison, private preview, acknowledgement, lost-response recovery without a second save, unconfirmed status, cancelled/confirmed cancellation and editor locking. Evidence: `/private/tmp/cms-application-import-client-{tests,build,types,browser}.log`. Real database import behavior is covered separately above; hosted/client acceptance remains pending.

Existing application authoring/recovery, claim review, release, scheduling and translation browser scenarios also pass at both viewports after import integration. Evidence: `/private/tmp/cms-application-import-client-regression.log`. Local preview stopped afterward.

Template verification: 21 focused application import tests pass. Blank files reject empty submissions; filled Word and Excel files produce identical industry drafts, and titles over 200 characters are rejected. All 11 Word pages and every Excel worksheet preview were visually inspected, including the red over-limit warning. Workbook formula-error inspection returned zero errors. Files: `public/cms/templates/application-v1.xlsx` and `application-v1.docx`.

Download integration verification: production build and TypeScript pass. Chromium at 1280px and 390px confirms both download links return HTTP 200 with bytes matching the checked template files; import comparison, preview, acknowledgement, recovery, cancellation and editor locks still pass. Evidence: `/private/tmp/cms-application-templates-{tests,build,types,browser}.log`. Local preview server stopped after verification. These checks use synthetic local authentication, not hosted client acceptance.
