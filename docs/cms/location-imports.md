# Business location imports

## Current status

The version 1.0 table contract, proposed-draft planner, Word/Excel readers and authenticated review/apply/recovery/cancellation API are implemented locally. Migrations 370–372 supply scoped evidence checks, atomic draft batches and cancellation fencing. Imports save drafts only; normal independent review and publication remain separate. The client upload/review/preview/save controls and downloadable Word/Excel templates are connected locally.

## Format

Use `pageType: location`, `templateVersion: 1.0`; Word metadata marker is `CMSLocation`. Sheets are Pages, Content, Blocks, Tables, ListItems, Media, Relationships, AddressLines, Hours and Coordinates. Rich blocks use the existing Office reader's paragraph/list formatting and table preservation rules. Claims are unsupported and rejected.

Pages identifies each record, create/update operation, location kind, title, slug, language and explicit collection replacement intent. Updates require an exact current revision and preserve URL/language; location kind may change. Duplicate URLs within a language are rejected even across different location kinds.

Content supports summary, private notes, address locality/region/postal code/country code, contact email/phone/website, time zone, visitor policy, accessibility notes and scalar SEO fields. Postal codes remain text. Editorial recommendations produce warnings; hard character limits reject the batch.

AddressLines uses ordered stable items, up to four nonempty lines. Hours uses stable item IDs, unique positive positions, weekday 1 (Monday) through 7 (Sunday), explicit `closed` true/false, and opening/closing times. Multiple intervals per day are supported, sorted by opening time. A closed day has one row without times; omitted days are unspecified. Duplicate closed days, mixed closed/open days, overlapping shifts and overnight intervals are rejected; split overnight hours across days. Closing at 24:00 is allowed. Drafts may omit required publication details; normal publication validation still applies.

Coordinates contains one complete decimal latitude/longitude pair per record. Zero is valid. Missing coordinates on updates preserve the existing pair. Explicitly list `coordinates` in replaceCollections with no coordinate row to clear it. No geocoding is performed.

Updates must explicitly list every replaced collection: body, address.lines, hours, coordinates, image, seo.socialImage or the relevant relationships group. Omitted collections remain intact; named collections without rows are cleared. Rows cannot silently overwrite existing collections. Invalid batches yield no proposed changes. Limits: 25 records, 500 table rows, 2 million text characters, plus shared Office file limits.

## Verification and remaining work

Eight focused tests cover preserved values, schedules, coordinate bounds, revision/route conflicts, replacement intent, duplicate/orphan/unknown rows, hard limits and editorial guidance. Synthetic Word (horizontal and vertical) and Excel files produce equivalent drafts; source hashes and row provenance are retained. Formula cells, external references, tracked edits and wrong metadata are rejected. TypeScript and all 2,124 CMS tests pass. Full regression evidence: `/private/tmp/cms-location-import-full.log`. Evidence: `/private/tmp/cms-location-import-focused.log` and `/private/tmp/cms-location-import-types.log`.

Next: native Office and hosted/client acceptance. These parser tests are not native Office or production verification.

## Authenticated backend

`/api/cms/import/location` checks the bearer token, website membership and same-origin writes. Review reads requested update UUIDs using the caller’s permissions, verifies type/path/revision, preserves omitted data and binds the source bytes, proposed snapshots, saved comparisons and current media/reference evidence into the review digest. Apply rebuilds that review from the original file before saving. Unknown, duplicate or missing evidence is rejected. Draft availability checks do not imply publication eligibility.

Database apply locks updated and referenced records in deterministic order, rechecks permissions, reference revisions and image rights, then saves the whole batch transactionally. Actor/site/request-scoped receipts recover lost responses without creating duplicate records or overwriting later edits. Cancellation shares an advisory lock with apply; it either returns an existing completed receipt or fences delayed saves. The internal pre-cancellation writer is not callable by clients.

Five local database tests cover permission isolation, reference evidence, atomic rollback, stale revisions, revoked media, idempotency, cancellation, HTTP lost-response recovery and complete location details including kind changes without URL changes. Eighteen focused import/API tests pass, including exact evidence coverage and before/after differences. Evidence: `/private/tmp/cms-location-import-backend-{api,db}.log`. These are local checks, not managed-host concurrency or client acceptance.

Backend integration verification: all 2,139 CMS tests pass; production build includes `/api/cms/import/location`; TypeScript and offline migration planning through 372 pass. Evidence: `/private/tmp/cms-location-import-backend-{full,build,types,migrations}.log`. No hosted migrations were applied.

## Client workflow

The business location workspace accepts structured Word/Excel files and displays complete saved/proposed field differences, replacement intent, findings and a private location preview. Kind changes are allowed while the saved revision and URL remain bound. The editor is locked while a file or unresolved import is active; the panel is disabled during unsaved editor work or uncertain publication outcomes. Acknowledgement is required before saving.

Recovery stores only request, source/review digests and target identities in actor/site-scoped browser storage, never the uploaded file or content. Web Locks prevent simultaneous import work across tabs. After an uncertain save, users can check the receipt, retry the same reviewed file or explicitly cancel; clearing recovery waits for both a verified receipt and a successful editor/library refresh. The panel links to the checked blank Word and Excel templates.

Client verification: 36 focused location tests, production build and TypeScript pass. Playwright at 1280px and 390px exercised upload → comparison → private preview → acknowledgement → lost save response → reload → receipt recovery, plus unconfirmed outcome and confirmed/dismissed cancellation. One write was made across the lost-response recovery. The editor stayed locked while pending and unlocked after cancellation. No page exceptions or horizontal document overflow were observed; both screenshots were inspected. The synthetic provider omits the unrelated MFA-policy endpoint, so its unavailable warning is expected. Evidence: `/private/tmp/cms-location-import-ui-{tests,build,types,browser}.log`, `/private/tmp/cms-location-import-{1280,390}.png`. Hosted authentication/storage and native Office acceptance remain unverified.

## Downloadable templates

`public/cms/templates/location-v1.xlsx` provides an Instructions sheet and ten content sheets, text-preserving input cells, location-kind/boolean/relationship dropdowns, frozen headings and character-limit conditional formatting. `public/cms/templates/location-v1.docx` provides a 12-page guide and copyable field/value records. Both explain explicit replacement, opening-hour rules, coordinate pairs, allowed visitor policies and individual field limits. Blank templates contain no importable sample records. Synthetic filled examples are test fixtures, not client content.

All 12 Word pages and all workbook sheet views were rendered and visually inspected; the Excel over-limit warning was inspected. Equivalent filled files preserve address lines, postal-code leading zeros, a zero latitude, appointments and closed-versus-open weekdays. Invalid title lengths are rejected without truncation. Native Microsoft Office editing/resaving has not been verified.

Template integration verification: 22 focused import tests and all 2,143 CMS tests pass, as do production build and TypeScript. Desktop/mobile browser checks verified both download URLs return the exact generated files, followed by comparison, preview, lost-response recovery and cancellation. Evidence: `/private/tmp/cms-location-template-{tests,full,build,types,browser}.log`; artifact views in `/private/tmp/location-template-word-final` and `/private/tmp/location-template-xlsx-qa`.
