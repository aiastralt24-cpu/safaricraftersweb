# Safari Crafters client CMS — implementation goal

Status: active. Started 22 October 2026. This is the execution plan, not a claim that the CMS is complete.

## Outcome

A client editor can maintain every agreed business-managed element, assemble approved layouts, import structured Word/Excel files, preview changes, submit for review, publish, and restore content without touching code. A new visual component or integration remains developer work and must be documented as an exception.

The original requirements are preserved in `source-prd.md`. This plan adapts them to Safari Crafters without silently dropping the final scope.

## Starting point and migration boundary

- Next.js website with static, dynamic, and bespoke country templates.
- Sanity v6 content models and 142 enriched drafts; those drafts are not yet a production migration.
- Git-backed public content snapshot. Sanity publishing currently needs a validated import and website build.
- Legacy admin uses a shared token and local file storage; production writes are disabled. It is not the new authorization or persistence foundation.
- Existing enquiry persistence and notification outbox can be extended after isolation, identity and retention are reviewed.
- Store transactions and catalogue ownership must remain consistent with the existing Shopify integration.
- Existing website, URLs, Sanity data and enquiry infrastructure remain intact while the replacement is proven. No production migration, account deletion or infrastructure purchase is part of foundation work.

## Architecture decision

Confirmed by the owner on 22 October 2026: independent client CMS with a dedicated administrative application surface inside this Next.js repository, PostgreSQL persistence, individual managed authentication, private object storage, transactional publication and a durable job outbox. Sanity becomes a migration source rather than the required editor. The owner explicitly selected an independent backend that can replace Sanity. Do not implement the new editor as a Sanity-dependent wrapper.

Public delivery reads an immutable published revision/release, never a draft table. Preview has its own authenticated delivery path. Content, identities, leads, audit events and integration jobs are separate entities. All records and relationships are scoped to a website. Permissions must be enforced in database/API operations, not only the interface. Shared-token legacy sessions must never grant access to the new CMS.

## Milestones and acceptance gates

### M0 — Discovery and contracts (in progress)

- [ ] Inventory every public route, composition, global component, empty/error state and business-managed element.
- [ ] Record existing source, proposed CMS field, ownership, permissions, validation, migration status and documented exclusions.
- [ ] Define section registry, page types, template schema versions and migration contracts.
- [ ] Establish role/action/content-scope matrix and revision-bound workflow transitions.
- [ ] Specify Word and Excel templates, import conflict behaviour, limits and approval flow.
- [ ] Resolve hosting, auth, storage, backup, budget, languages and initial client users.
- Gate: no unowned visible element and no undocumented architecture decision; inventory coverage measured against inspected source, not route count alone.

### M1 — Durable foundation

- [ ] Authenticated individual accounts, invitations, website memberships and expiry/revocation.
- [ ] Scoped permissions for edit, review, approve, publish, export, deletion and settings.
- [ ] Stable content identities, immutable revisions, optimistic concurrency and audit history.
- [ ] Private asset quarantine, upload validation, scan/processing jobs, safe delivery variants and usage references.
- [ ] Migration and rollback scripts, separate local/staging/production configuration.
- Gate: cross-website and draft disclosure tests fail closed; stale saves cannot overwrite; revocation is enforced server-side.

### M2 — First complete editing workflow

- [ ] Client dashboard with real saved/draft/publishing states.
- [ ] Homepage and journey editor with approved section list, keyboard reordering and component settings.
- [ ] Header, footer, contact settings and shared CTA editing with impact list.
- [ ] Real responsive draft preview; selected preview elements link to their fields.
- [ ] Publish/restore revision with durable delivery status, retries and cache refresh.
- [ ] Mobile hero asset independent of desktop asset.
- Gate: UAT-01, 02, 03, 04, 08, 13, 14, 17 work end to end using persisted data and real permissions.

### M3 — Structured import and all content modules

- [ ] Downloadable, versioned .xlsx and .docx templates with examples and instructions.
- [ ] Journey Excel workbook first: Pages, Itinerary, FAQs, Media, Instructions; stable IDs join sheets.
- [ ] Parser limits, rejection of macros/unsafe files, structured extraction, source provenance.
- [ ] Per-cell errors/warnings, duplicate detection, explicit create/update intent and expected revision checks.
- [ ] Preview diff, deliberate apply to drafts, atomic or clearly reported processing, safe retries.
- [ ] Word headings/tables/images mapped to the same validated import contract; no automatic factual invention.
- [ ] Destinations, journeys, tours/departures, journal, specialists, testimonials, documents and store editorial content.
- Gate: client creates one complete journey from each format and bulk-updates without duplicating records or publishing accidentally.

### M4 — Whole-site editing and governance

- [ ] Migrate all inventoried marketing and country compositions, menus, labels, error states and approved presentation variants.
- [ ] Rich text, shared content, internal link references, hierarchy, reserved slugs and redirect-impact checks.
- [ ] Revision-specific approvals, author/approver separation, schedules, coordinated releases and rollback.
- [ ] Media rights, contextual alt/decorative setting, document versions, expiry and replacement impact.
- [ ] SEO, canonical/indexing permissions, structured data, search and sitemap delivery consistency.
- [ ] Localization relationships, explicit fallback rules, source revision tracking and review flags.
- Gate: UAT-05 through 10, 15, 16, 18, 19 plus every inventory entry linked to a demonstrated control.

### M5 — Forms, leads, health and operations

- [ ] Versioned form definitions, labels/messages/conditional questions and server-side validation.
- [ ] Durable idempotent submissions, consent version, rate limiting, queued notification retries.
- [ ] Lead assignment, notes, follow-up, stages, export permissions and CRM jobs.
- [ ] Broken links, incomplete content, overdue reviews, failed jobs and analytics freshness reports.
- [ ] Monitoring and alert runbooks; privacy retention/deletion decisions provided by business owner.
- Gate: UAT-11, 12 plus permission checks on exports and lead records; alerts tested by injecting failures.

### M6 — Migration, client acceptance and handover

- [ ] Nonproduction migration of content, assets, relationships, redirects and ownership.
- [ ] Visual comparison and URL/metadata/download parity checks.
- [ ] Late-change reconciliation and cutover/rollback rehearsal.
- [ ] Backup plus measured restore exercises for revisions, assets, deleted records and full environment.
- [ ] Capacity/load, responsive, accessibility and security verification.
- [ ] Editor/admin guides, client-led task trials and infrastructure/account ownership handover.
- [ ] Production switch only after acceptance evidence and operational readiness.
- Gate: all original UAT-01 through UAT-20 pass, client independently completes routine tasks, and unresolved limitations are explicitly accepted.

## Import length policy

Character counts include spaces and Unicode characters. Word counts are guidance for long prose. Title 30–80 characters, summary 25–50 words, introduction 100–250 words, itinerary descriptions 40–150 words, FAQs 30–120 words are warnings, not truncation rules. Button labels over 30 characters are blocking. SEO title 50–60 and description 140–160 are editorial recommendations, not promises about search display or rankings. Technical size caps protect the service separately from copy guidance.

Import never silently shortens text, changes a price/date, sets consent, approves a revision, or publishes. Blank update cells preserve existing values; clearing a field must be explicit. Updates use record IDs and expected revisions, not title matching. Formula cells, macros and external workbook links are rejected, not executed. Media URLs are not fetched until validated against approved sources and upload policy.

## Tracking and honest completion

Each implementation turn records changed files, test evidence and next work in `progress.md`. A checked milestone means demonstrated behaviour, not an interface mockup. Targets such as 60-second delivery, 99.9% availability and recovery time are acceptance targets until measured within agreed infrastructure boundaries.
