# Structured News imports

Status: contract, Office parsers, proposal planner, database evidence review, atomic draft application and browser upload/review/recovery are implemented and tested locally. Downloadable Word and Excel templates are available in the News import panel. Nothing is published by imports.

News uses template version `1.0`, page type `news`, and the Word metadata marker `CMSNews`. Excel uses the same explicit version/type metadata. Other content families are not inferred. The shared Office parser rejects formulas, external workbook references and tracked changes.

The tables are Pages, Content, Blocks, Tables, ListItems, Media and Relationships. Pages identifies create/update operations, title, slug, language, expected revision and explicit collection replacements. Blocks supports paragraphs, headings, lists, quotes, tables, links and images. Media supports listing/hero/gallery/social images. Relationships supports pages, projects, journal articles, destinations and documents.

Key character limits are title 200, slug 100, summary 2,000, author 200, topic 120, dateline 200 and internal notes 2,000. Dates use YYYY-MM-DD. Summary guidance recommends 80 words; exceeding guidance warns without truncation. Hard limits reject the proposal. SEO and rich-block limits also remain enforced by the News schema.

Imports are bounded to 25 records, 500 rows and 2 million text characters. Blank row placeholders preserve source row numbering. Unknown sheets/fields, duplicate IDs/positions, orphan rows, unsafe links and unused block fields produce errors rather than dropping content. Exact whitespace, paragraph/list formatting and ordered table cells are preserved; unsupported formatting is rejected.

Updates require an exact current revision and retain their URL and language. Omitted scalar fields, private notes and collections remain unchanged. Replacing or clearing body, media or relationship collections requires listing the complete field in `replaceCollections`, such as `body` or `relationships.pages`. A single invalid row prevents the entire proposal from producing changes. These are proposal safeguards, not proof of permissions or publication readiness; server evidence and atomic application are still required.

Verification: 209 import regression tests pass, including synthetic Word/Excel parity, strict template identity, unsafe Office features, structured text, partial-update preservation, relationship replacement and revision conflicts. TypeScript passes. Evidence: `/private/tmp/cms-news-import-contract-regression-final.log` and `/private/tmp/cms-news-import-contract-types.log`. This batch does not include downloadable News templates or a browser upload flow.

## Scoped evidence review

Migration 328 adds `review_news_import_links`, callable by authenticated users under their own permissions. It requires create permission for new records and view/edit permission for every existing News target. Inputs are bounded and duplicate-free. The response preserves the requested image/reference order; hidden, wrong-type or missing references expose no revision. Images require current approved processed-image evidence and media visibility. This checks draft eligibility, not publication readiness.

`news-import-evidence.ts` collects unique asset IDs and typed relationships from proposed snapshots. It rejects malformed, reordered, extra or incomplete evidence and contradictory availability/revision results. Unavailable selections become blocking import findings. Reference types remain distinct even when the same UUID is supplied under two types. The HTTP review endpoint and atomic application still need connection.

Evidence-review verification: all 1,858 CMS tests, TypeScript and the offline 328-migration plan pass. Database tests cover scoped updates, hidden references, cross-site access, duplicate inputs, create-only access and anonymous rejection; pure tests cover exact response coverage and unavailable findings. Evidence: `/private/tmp/cms-news-import-review-{full,types,migrations}.log`. No hosted migration or import write was performed.

## Atomic application and recovery

`POST /api/cms/import/news` accepts original Word/Excel bytes for review and application. It resolves existing records through the caller token, rebuilds the proposed snapshots, and binds the source hash, exact revisions, comparisons and availability evidence into the review digest. It rejects foreign-origin writes, inaccessible websites, invalid inputs and mismatched receipts. Apply re-parses and rechecks rather than trusting a client manifest. Status returns an explicit unconfirmed state when no receipt is visible.

Migrations 329–330 add actor/site/request-bound batch receipts and cancellation. Apply locks targets/references deterministically, locks media and compares current evidence before writing. One invalid or stale item rolls back the whole batch. Exact retry returns the original receipt without replaying writes over later drafts; reusing a key with different content is rejected. Cancellation shares the request lock with application, fences delayed requests and returns a completed result if saving already won. Private receipts remain scoped to their actor and current website membership. Imports create drafts only; trusted validation, approval and publication remain separate.

Downloadable Word and Excel templates are available in the News import panel. Hosted provider application and concurrent-request acceptance remain required.

Save/recovery verification: all 1,869 CMS tests, production build, TypeScript and the offline 330-migration plan pass. Database tests cover batch rollback, stale updates, changed references/media rights, duplicate keys, actor isolation, cancellation fencing and receipt recovery; an actual HTTP-handler-to-database fixture completes file review, draft application and retry/status recovery without publishing. Evidence: `/private/tmp/cms-news-import-save-{full,build,types,migrations,api}.log`. No hosted import was performed.

## Browser review and recovery

The News workspace accepts structured Word/Excel uploads, displays validation findings, before/after field comparisons and page previews, and requires acknowledgement before saving drafts. Browser recovery metadata is scoped to the actor and website; original uploaded documents are not stored there. Cross-tab locking prevents overlapping application. Pending receipts survive interrupted responses and remain until the resulting editor and list refresh successfully. Cancellation resolves against server state rather than assuming a failed response means nothing was saved.

Verification: 25 focused import tests, production build and TypeScript pass. Desktop (1280px) and mobile (390px) browser checks cover review, preview, acknowledgement, cross-tab locking, lost responses, invalid receipts, failed refresh, cancellation and recovery. Existing News authoring checks pass at both widths. Evidence: `/private/tmp/cms-news-import-ui-{tests-final,build,types,browser,authoring}.log`. These checks use local fixtures, not a hosted provider or client acceptance session.

## Downloadable templates

The News import panel links to /cms/templates/news-v1.docx and /cms/templates/news-v1.xlsx. Both contain the exact version/type identity, every supported table, field limits, and guidance for creating, updating, preserving and deliberately replacing content. Excel includes dropdowns and column-length warning rules for the first 100 data rows. The CMS remains authoritative for field-specific limits and permissions. Word uses editable vertical record forms; clients copy the complete table to add records. Dates are entered as ISO text because this is the import contract.

Matching filled Word/Excel fixtures produce identical press-release drafts, including the editorial date, paragraph line breaks, heading and list. Blank files are rejected until completed; an oversized title rejects the proposal without saving or truncating it. All 26 focused import tests and TypeScript pass. Every blank Word page and each Excel sheet were rendered and visually inspected; the title warning was exercised and exported dropdown ranges checked. Evidence: /private/tmp/cms-news-template-{tests,types,excel,word-render}.log. Native Microsoft Office interaction and hosted client acceptance are not claimed.
