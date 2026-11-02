# Contact page CMS migration inventory

Status: source/rendered inventory, strict editorial data contract and source-bound review-only migration proposal are implemented. Two draft sections, editor controls and content preview are implemented; public delivery is not yet connected for this route. Existing visitor forms and data are unchanged.

`contact-migration-inventory.json` captures `/contact` and the shared corporate enquiry section on `/mice`, source hashes, original image hash, headings with emphasis/line breaks, surrounding copy/links, native field requirements, placeholders, options, defaults and consent text. Recapture with `node scripts/cms/inventory-contact.mjs` against the existing local preview. Review source drift before replacing inventory. The script blocks enquiry requests and never submits a form.

## Ownership and field map

| Area | Required client controls | Current owner |
|---|---|---|
| Introduction | Eyebrow, heading lines/emphasis, lead, travel scope | Contact page source |
| Photograph | Processed media, alt text, caption and crop | Contact page/CSS; currently hidden at widths ≤900px |
| Direct contact | Prompt, displayed email, mailto destination | Contact page source |
| Corporate referral | Copy, link label and local destination/anchor | Contact page source |
| Form introduction | Eyebrow, heading/emphasis, explanation, required-fields hint | Contact page source |
| Privacy | Explanation, policy label and local destination | Contact page source |
| Form fields | Labels, help, placeholders, option labels, validation messages, approved requirements and limits | Shared ContactForm; future published CMS form revision |
| Consent | Enquiry-purpose wording and version; acceptance retained with submission | Shared ContactForm; future CMS consent field |
| Submission states | Button, sending, success heading/body, reference label, fallback error | Shared ContactForm and response contract |
| SEO | Title, description, canonical, indexing and sharing defaults | Page metadata plus global defaults |
| Corporate variant | Company/destination/brief hint and placeholder, optional message, note and submit label | Same ContactForm; separate form definition needed |

The corporate inventory covers its enquiry section only, not the whole MICE page. Header, footer and navigation belong to the global inventory.

## Existing submission semantics to preserve

The legacy contact form posts to `/api/enquiry` with an idempotency header. The CMS form posts to `/api/cms/enquiry` using a published form/revision, structured answers, an idempotency key and Turnstile verification. Merely substituting the component would change the data contract.

- Both variants require name, email, phone and enquiry consent. Contact requires a message; corporate deliberately permits an empty brief.
- Contact travel dates become both `months` and `flexibility`; interests affect `types` and are prepended to `notes`. Stay preference becomes `accommodation`.
- Corporate destination becomes `region`; company and budget are combined into notes. The component also reads group size and budget despite no corresponding rendered controls. Preserve existing fallback behavior or explicitly retire it during the mapped migration; do not invent captured fields.
- Legacy server limits include name 120, email 254, phone 60, notes 5000 and flexibility/accommodation 160 characters. Phone accepts 7–15 digits. Several browser controls currently omit corresponding maximum lengths. The contact message requirement exists in the browser, not as a separate server message field.
- Legacy success copy is “Your brief has been received.” followed by “A Safari Crafters specialist will review it and respond with considered next steps.” and the returned enquiry reference. The generic fallback is “We could not send your brief. Please try again.” The CMS now supports a separate optional success heading and message body; the source proposals populate both.
- CMS text/email/phone/message fields now support optional editable placeholders through schema, editor, preview and public renderer. Single-choice default option IDs are now supported through editor, preview and public rendering. Contact/corporate migration still needs to map the captured default labels to stable option IDs.

## Remaining implementation and acceptance

1. Define the contact composition contract and editor controls, preserving explicit heading runs, links, image framing and desktop/mobile layout.
2. Extend or map published CMS forms to preserve placeholders/default choices and success presentation without changing existing form revisions silently.
3. Build separate contact/corporate form proposals with stable field/option IDs, server-side validation, consent versioning and a documented mapping into lead administration/notifications.
4. Connect exact published form revisions and source context, draft preview and trusted release checks. Verify failed/unknown submission, retry, withdrawn form and stale revision behavior.
5. Add source-bound draft migration, then verify managed delivery, spam protection, notifications and client editing before rollout. Existing route stays active until that transition is verified.

## Local evidence

Read-only Playwright capture at 1280px and 390px verified both form variants render and their selects change value. No page exceptions or horizontal overflow were observed. Screenshots are in `/private/tmp/cms-contact-inventory-{contact,mice}-{1280,390}.png`; mobile screenshots were inspected. Browser plugin was unavailable, so repository Playwright was used. No enquiry was sent; backend delivery and success/failure interactions are not proven by this capture.

## Editorial contract and review proposal

`lib/cms/contact-content.ts` defines bounded introduction and enquiry-panel copy, explicit heading lines/emphasis, accessible processed media, focal point/mobile image visibility, plain email contact and local referral/privacy links. The contract preserves source whitespace. Link rules reject external destinations, encoded separators, dot traversal and query-string redirects. Unknown fields and missing meaningful alt text are rejected.

`planContactMigration` checks the complete captured source/image fingerprints before constructing a proposal. An optional source-matched media ID replaces the review placeholder but grants no rights or availability claim. The output retains contact/corporate field definitions separately, preserves the rendered title/description, and always remains review-only with form mapping and delivery findings. It constructs a validated preview composition but does not create a form, save a draft, issue a receipt or publish. Canonical, robots, Open Graph and Twitter tags are now captured. Their inherited defaults and cross-network differences require review before a complete SEO migration.

Five tests cover current disk fingerprints, source copy/heading/framing preservation, both forms' different message requirements, stale/tampered evidence and unsafe content. TypeScript passes. The current website and active configuration are unchanged.

## Contact draft editor and preview

Pages now offers an empty Contact page draft and a route-specific palette with Contact introduction and Contact enquiry introduction. Controls cover all editorial contract fields, including explicit heading runs, media/alt/caption/credit, focal point/mobile visibility, email and referral/privacy links. New introduction sections intentionally require a real image and contact email before validation. Duplicated sections retain the existing hidden-by-default behavior.

The content preview shows copy, links and authenticated image previews, with explicit framing/mobile-visibility annotations. It does not reproduce final website layout or connect visitor form fields. No public contact route or release policy was enabled. Existing unsupported-route validation still blocks contact publication.

Browser checks at 1280px and 390px exercised copy/email/link edits, mobile-image toggle, adding a section, preview updates and disabled/read-only controls. A temporary isolated fixture used unavailable-media feedback; no real asset selection, authenticated draft save or visitor submission was exercised. Its shared website header can overlap the scrolled fixture screenshot, so these screenshots are interaction evidence, not final-layout acceptance. The fixture was removed. Full suite: 1,036 tests passed, zero skips.

## Captured SEO and sharing dependencies

The capture now includes all rendered canonical, robots/googlebot, Open Graph and Twitter tags, plus root-layout and metadata-provider source hashes. It verifies both the contact photograph and a distinct inherited tiger-family sharing image. A comparison against the earlier inventory confirmed unchanged business copy, headings, form definitions, links and image fingerprints.

The current contact route inherits `https://safaricrafters.com/` as canonical and the homepage Open Graph URL. Open Graph and Twitter descriptions differ. These are captured facts, not approved migration choices. The planner preserves the canonical in its review proposal and emits explicit canonical, network-metadata and indexing findings; it does not silently substitute `/contact` or claim exact cross-network parity. Raw Twitter/Open Graph tags stay attached to source evidence.

The proposal includes a validated composition/SEO payload with the captured absolute title, description, canonical and Open Graph title/description/image/alt. A separate optional third planner argument maps the sharing image by original source hash. It rejects swapped/stale mappings and reuse of one asset ID for different source files. Both image mappings remain subject to trusted processing/rights checks. The planner always returns review-only. Current page SEO has one shared social title/description and does not represent all captured network-specific tags; reconcile or extend this before public delivery.

## Contact and corporate form proposals

`planContactFormMigration` validates the captured dependency proof and returns separate review-only FormDefinitions for contact and corporate enquiries. Field names become stable field IDs; option IDs are stable within this source snapshot and carry explicit legacy-value mappings. Existing order, labels, help, placeholders, required flags, option labels/defaults and consent wording are retained. Consent is enquiry-only with a source-version identifier, never preselected. Contact requires a message; corporate does not. Company stays at 160 characters and the corporate brief at 4000.

The proposals expose all deviations instead of claiming compatibility: standalone text limits are proposed for previously unbounded browser fields; email/phone length and digit limits now match legacy intake, while syntax/whitespace semantics still differ; new form/consent labels need presentation review; the corporate note still needs page integration; no notification routes are inferred. Success strings are preserved from the hashed shared component and verified by a source test. The definitions now populate successHeading and successMessage separately, and the public renderer displays a heading followed by body copy after confirmed intake. Final page styling remains unverified.

No forms are saved, published or linked to pages. Source-to-lead and combined-notes mapping, verified notification configuration, exact revision binding, trusted publication and recoverable migration application remain required. Tests verify source defaults, every field's copied presentation, required/optional differences, exact consent, stale proof rejection and output isolation.

## Lead inbox readiness

The generic lead inbox now resolves dropdown/multiselect answers using the submitted form revision's option labels (migration 164), preserving unknown IDs as fallback. This closes the presentation gap for source-generated stable option IDs, but does not itself connect the contact/corporate form proposals to intake or migrate existing legacy enquiries.

## Linked form selection and draft testing

The contact enquiry section now accepts an optional strict `{recordId}` form reference. Its editor uses the existing permission-aware form record picker, limited to one form, and supports removing/replacing the selection. Empty selection remains a valid incomplete draft; it is not publication-ready. No caller-supplied published/revision claims are accepted in the reference.

Contact content preview uses ReferencedFormPreview and the workspace's authorized record loader. It validates form identity/definition, identifies the latest saved draft revision as separate from the page revision, supports refresh, and exposes local-only Try this form validation. A shared page preview with no linked-record loader grants no extra draft access. Denied/malformed loads show unavailable feedback and no input fields. Public rendering and trusted release must still resolve and pin the eligible published form revision.

Desktop/mobile synthetic browser checks selected a form, verified preserved placeholders/defaults, exercised required-field validation, simulated access denial with refresh and removed the selection. No enquiry was sent. Screenshot inspected as draft-content evidence only; final website styling is not represented by the isolated fixture. Schema tests reject malformed IDs and extra publication/revision claims, while contact publication remains unsupported.

## Published contact structure and schedule checks

`projectContactPage` validates an exact page revision envelope, supported composition/SEO roots and English context. Each current/future schedule boundary must retain one introduction and one enquiry panel, with the introduction providing the only H1. Configured unsupported section kinds, region targeting, missing form references, schedule gaps and duplicate headings fail. Hidden draft sections remain stored but are excluded from delivery. The output preserves order/content/SEO and identifies the current form ID plus all configured form dependencies for later trusted resolution.

`readPublishedContactPage` requests only the configured site, `/contact` and English. Missing published content returns null; provider errors propagate. It does not substitute a draft or another route. These helpers are structural prerequisites, not a public runtime: they do not prove form publication, form/page compatibility, media rights or release authorization. The current public contact route is not wired to them.

Contact-specific advisory findings now appear in stored-content checks for malformed structure or missing form references. A separate warning describes the remaining form delivery gate. Contact stays outside the supported-publication route list, so successful structural validation cannot produce publication-ready content. Tests cover scheduled form replacement, boundary gaps, malformed context, unsupported data, explicit read arguments and withdrawal/error distinctions.

## Published form resolution and gated loader

`resolveContactForms` reads each configured form dependency through a server-supplied published-form reader, including scheduled future panels. It validates same-site/form identity, English locale, full form schema and current form-publication delivery restrictions. Missing forms, malformed definitions, unsupported attachments and unverified notification routes fail without partial results. Only record/revision/locale identities leave the resolver; full definitions and notification configuration are not returned.

`loadContactRoute` connects this to anonymous published-page/SEO RPCs and the existing server-only published-form RPC. It requires exact contact/public flags and valid enquiry intake configuration before network access. Missing pages return null without loading forms/settings. Invalid content or unavailable forms/settings fail without draft/legacy fallback. Reads are uncached. `.env.example` documents the contact flag as false; no active settings were changed.

The public `/contact` route is still legacy. This loader alone does not guarantee a dependency remains published between requests, bind visitor submissions to a page revision or supply a trusted database release policy. Next steps are coordinated release/reference locks, a renderer using the resolved form revision, gated public route wiring and end-to-end provider verification. Tests here use controlled transport; managed publication and delivery remain unverified.

## CMS contact renderer and pinned form loading

CmsContactPage renders the projected introduction/enquiry panels with the existing contact layout stylesheet and scoped styles for generic CMS form fields. It preserves heading runs, copy, links, photograph focal point, caption/credit and the source mobile-photo setting. The selected published form binding is passed as an expected revision/locale to PublicEnquiryForm. A later/different form identity, revision or locale is rejected with unavailable feedback rather than silently replacing fields. Legacy unpinned form consumers remain supported.

An isolated route at 1280px/390px used original local imagery, controlled published-form responses and a challenge script fixture. It verified one H1, desktop image/mobile hiding, defaults, field editing, no horizontal overflow/page exceptions and refusal of a changed form revision. Initial form-loading wait timed out; a diagnostic rerun passed at both sizes without an implementation change, so the transient cause was not established. Screenshots inspected; temporary route removed and no visitor enquiry sent.

Remaining presentation differences include the generic form title, explicit consent label, challenge/refresh controls, submit typography and generic section presentation controls beyond the preserved contact layout. The source image's show-on-mobile override needs additional state coverage. This is not final layout acceptance or real challenge/provider delivery. Public /contact and rollout settings remain unchanged; release/reference locks and route wiring still precede migration.

## Trusted form dependency evidence

Migration 165 adds a service-only contact form status reader and includes its snapshot in get_validation_input for the contact page. It inspects configured enquiry references, including future panels, resolves same-site published form pointers, and reports revision/locale/availability without exposing form payloads. Current SQL availability excludes unsupported files and notification routes. Full form schema validation still occurs in form publication and the route resolver; this evidence is not a substitute for those checks.

The trusted worker accepts the strict evidence schema. Contact findings require the complete expected set with no duplicates/extras, and report unavailable or wrong-language forms at their section fields. Editors cannot supply this evidence through ordinary page data or call the privileged reader. Contact remains outside supported publication routes, and no existing validation receipt authorizes contact release.

Local PGlite checks exercised service-only access, unpublished/published/withdrawn pointers, cross-site lookup, get_validation_input integration and a real trusted-worker result that remains publication-not-ready. A root-set form publication pointer is an evidence fixture, not proof of form release policy. Managed migration was not applied. Release-time dependency locks/rechecks and publication authorization are still pending.

## Contact publication policy (local implementation)

This milestone supersedes the earlier notes that contact is outside the supported publication list. Contact now requires a revision-bound trusted validation receipt, complete eligible form evidence, verified media and the existing independent review/publish permissions. Migration 166 exempts the exact reserved contact route from the generic custom-page guard and installs its dedicated release guard.

The guard locks all configured form records in deterministic ID order, including scheduled panels, then checks their current published eligibility directly. It does not rely on the old parent route being visible during a BEFORE trigger. Wrong type/locale, missing publication, unsupported attachments or notification routes block release. Unsupported configured page sections/regions and moving a published contact route are also rejected. Full structure and visibility schedules remain trusted-validator responsibilities; media rights are rechecked by existing release triggers.

The local database lifecycle test publishes a form through trusted validation and independent review, validates a complete contact draft, withdraws the form and verifies that the otherwise-approved page cannot publish. Republishing the form permits release. Further checks cover media-rights changes after validation, retaining the existing published revision when a replacement fails, unsupported sections despite a forged service receipt, route mutation and withdrawal.

Forms remain independently published resources: this policy checks their current eligibility at page release, not equality with the earlier validation snapshot. The renderer pins the resolved revision for each request. Withdrawing a form later does not cascade-unpublish the page; the route resolver must refuse unavailable dependencies. The public `/contact` wrapper is still legacy and rollout flags remain unchanged. Managed migration application, route/sitemap integration, source-bound migration, real delivery checks and client acceptance remain pending.

## Gated public route and sitemap

The `/contact` wrapper now selects the CMS renderer only when CMS_CONTACT_PAGE_ENABLED is exactly true. It uses a request-cached loader for metadata and content, requires published page/form/SEO data and configured intake, returns 404 for a missing published page, and propagates dependency failures without substituting legacy content. The renderer receives the current resolved form revision. With the flag off, the unchanged original component remains in LegacyContactPage.tsx. Inventory source paths were relocated to that byte-identical file; captured hashes and source content were preserved.

The sitemap removes the static contact entry when CMS delivery is selected and derives its entry from the same published loader and SEO policy. Withdrawn, noindex, excluded or noncanonical pages do not gain a synthetic entry or modification date. An unavailable dependency fails the sitemap request rather than advertising unchecked content.

Verification: 1,069 CMS tests passed with zero skips; TypeScript and production build passed. A temporary production server with synthetic published RPC responses verified actual HTTP rendering/metadata, exactly one contact sitemap entry, withdrawal returning 404/removing the entry, and an unavailable form returning 500 without legacy fallback. The existing local preview still serves the legacy form. This is controlled transport evidence, not a real provider/challenge/enquiry delivery test. No active rollout flags or managed data were changed.

Remaining: source-bound migration review/application for contact and forms; client decisions on canonical/social metadata, consent/lead mapping and field limits; layout acceptance; managed migrations, source media verification and real provider/UAT checks before enabling the route.

## Recoverable contact page migration backend

Migration 167 and `/api/cms/migrations/contact` implement authenticated review, draft application and receipt lookup. Review requires create permission or edit access to the exact English `/contact` target and expected revision. Both inventoried images must map to distinct processed assets with matching original upload hashes, current inspection, rights and media revision evidence. The server builds the proposal from captured source content; arbitrary caller content is not accepted by the HTTP endpoint.

Apply locks the target and media/upload dependencies, compares reviewed evidence and rejects stale drafts, changed media, unavailable rights or unmapped asset references. It saves only a page draft and records an actor/site-scoped immutable receipt and audit event. Identical retries return the original result, including after later edits, without overwriting those edits. Status reports unconfirmed work distinctly from a completed receipt. Authority is checked again for recovery.

Review also returns the separate contact/corporate form proposals and their field/consent/notification findings. These forms are **not** created or linked by page apply; the resulting source page proposal deliberately remains incomplete until a reviewed form is selected. The client must review inherited canonical/social metadata and the full draft replacement before applying. Automatic form provisioning and the migration UI are still pending, as are managed migration execution and real provider verification.

Local PGlite and HTTP-adapter tests cover source mapping validation, authorization/tenant boundaries, stale revisions, rights/evidence changes, rollback, request-key mismatch, actor-private receipts, revoked permissions and lost-response recovery after a subsequent client edit. No actual managed content was migrated.

## Contact migration screen and recovery

The Pages workspace now includes Import existing Contact content. Editors select the two source-matched processed images and choose a new page or the selected contact draft, inspect current/proposed content and SEO, and acknowledge replacement before applying. Separate contact/corporate form definitions and findings are shown as review material; applying the page does not create forms. The panel verifies server proposal/source/review hashes, exact media evidence and the form proposals against the captured source before enabling apply.

Pending requests persist only account/site-bound identifiers, mappings and evidence in browser storage, never page copy or credentials. Reload offers status/retry for the same request. Unconfirmed results stay pending; mismatched receipts cannot clear recovery. Reviews and pending requests lock competing page imports/migrations and participate in the workspace unsaved-work guard. Contact also now exposes its supported validation/editorial workflow controls.

Synthetic desktop (1280px) and mobile (390px) browser checks covered both image selections, proposal/form review, required acknowledgement, competing-edit lock, simulated lost response, reload/status recovery and clearing the matching stored request. There were no page exceptions or horizontal overflow. The initial isolated fixture lacked spacing below the shared website header; correcting fixture spacing allowed the same flow to pass. The fixture was removed. The screenshot covers the recovered state, not final visual acceptance of the entire authenticated workspace. Media previews were unavailable test doubles and no provider write occurred.

All 1,078 CMS tests passed with zero skips and TypeScript passed. Automatic reviewed form creation/linking, managed migration application, real media/provider verification and client acceptance remain pending.

## Reviewed contact/corporate form creation backend

Migration 168 and `/api/cms/migrations/contact-forms` provide review/apply/status for the two source-derived forms. Targets may be new forms or explicitly selected English form revisions. Duplicate targets, changed target identities, stale revisions and unauthorized replacements are rejected. The HTTP endpoint builds both definitions from the captured source; callers cannot submit arbitrary proposal content. Review includes the current definitions, proposed limits/defaults/consent and unresolved delivery findings.

Apply checks current permissions, locks replacement targets in deterministic order, saves both drafts atomically and records an actor/site-scoped immutable receipt. If either replacement is stale, neither change nor the batch receipt persists. Retries with the same identity recover the original result without replacing later edits; conflicting identities and revoked access are rejected. Status is private to the initiating actor. Existing forms, histories and published pointers are preserved; new forms have no published revision. No page reference or live route is changed.

Database and HTTP-adapter tests verify exact source-derived payloads, two-form draft creation, atomic rollback when the second target is stale, lost-response recovery after a later client edit, receipt isolation, conflicting request reuse and permission revocation. API tests cover strict target shape, cross-origin refusal, inaccessible/wrong-type/wrong-locale forms, stale revisions, altered review digests and unconfirmed/malformed status. The editor controls for this backend and subsequent reviewed page linking remain pending. Managed migration and end-to-end enquiry delivery remain unverified.

## Form import controls

The Forms workspace now provides Import existing enquiry forms. Each destination can be a new form or a loaded English form selected for explicit draft replacement. Review shows both proposals, required/optional fields, character/digit limits, consent/delivery findings and local-only test forms. Existing valid definitions can also be previewed. Both-form acknowledgement is required before applying. Successful creation/recovery refreshes the form list and opens the contact draft; publishing and the page's existing form picker remain separate review steps.

Browser verification binds the exact source-derived proposals, target identities and server digests. Pending storage contains bounded actor/site/request/target identities only, never form copy, answers or credentials. A lost response survives reload with check/retry controls; unconfirmed/malformed/foreign results cannot clear recovery. Pending review/recovery locks competing form edits and participates in the workspace navigation guard. New account/website instances use separate recovery keys.

Synthetic desktop/mobile tests exercised review, acknowledgement, local required-field validation, editing lock, lost-response reload recovery and matching storage cleanup with no enquiry submission. Initial test selectors were corrected to use the actual submit label and scope the two name fields; the recovery assertion waits for the asynchronous busy state to clear. The isolated fixture was removed. Screenshots verify the fixture's content/recovery flow, not final authenticated workspace styling or provider integration. Automatic cross-page linking is not performed: after independent form review/publication, select the contact form through the page editor. Managed application and real delivery/client acceptance remain pending.

## Contact section presentation controls

The public renderer now applies section background, spacing, width and text alignment. Dark themes set readable muted/link/accent colors while form inputs retain dark text on light surfaces. The introduction photograph respects media alignment when narrower than its section, and mobile media-first order when the photo is enabled. Enquiry heading styling supports the configured heading level. Contact migration now explicitly proposes a white enquiry background to retain the captured light-panel presentation; the original legacy component and source hashes remain unchanged.

Fade/reveal are scoped CSS entrance effects, active only without reduced-motion preference. Keyboard focus cancels the entrance immediately; without animation support the content remains visible. These are page-load entrances, not scroll-triggered effects. Form fields retain start alignment for readability even when panel headings are centered.

An isolated production-component browser fixture exercised 1280px/390px and reduced/no-preference motion settings. It checked legacy-default mobile photo hiding, enabled photo visibility and media-first order, focal point, forest/ink backgrounds, compact padding, reading width, centered headings, input colors, no overflow/page exceptions and focus cancellation. Screenshots were inspected. Controlled form/media/challenge responses were used and no enquiry was submitted. The fixture was removed. This proves selected control behavior, not final client design acceptance or real provider delivery.

All 1,084 CMS tests passed with zero skips and TypeScript passed after these changes. Managed rollout remains off.
