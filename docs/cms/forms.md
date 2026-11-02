# Forms and enquiry validation

The first form module defines versioned structured form records and validates answers against a stored form revision. Approved field types include name, organization, city/state/pincode, message/text, email, phone, choice/product-interest/enquiry-type, multiselect, consent and file reference. Configuration includes labels, help text, required state, validation messages, success message, local redirect path and notification-route IDs. No arbitrary scripts, regex programs or external redirect destinations are accepted.

Fields and options use stable unique IDs. Conditional fields select an option from an earlier choice field, which prevents forward references and cycles. Hidden answers are rejected, and hidden fields do not trigger required validation. Marketing consent cannot be mandatory and remains separate from enquiry consent. Validation emits exact consent text and text-version identifiers alongside the accepted boolean for visible consent fields. A future persistence service must also bind the stored form revision and submission timestamp.

The validator accepts the form definition and file evidence from trusted server inputs only. A public endpoint must never accept either from the submitter. File answers are upload IDs, not URLs or paths, and require independently authorized inspected evidence with allowed MIME type and size. The existing CMS image uploader is not yet a public enquiry attachment pipeline; PDF file handling and public upload lifecycle remain unimplemented.

The editor API now validates form definitions and null page paths before draft saves. Other payload types retain their existing behavior. Direct database saves do not yet enforce this full form contract, and form publication is not enabled.

Validation: 19 form/editor tests passed, covering optional marketing consent, consent version capture, conditional/hidden answers, required text/length/email/choices, unknown fields, unsafe redirects, duplicate IDs, file evidence and draft API rejection. TypeScript passed.

Remaining PRD work: visual form builder and preview, published form lookup, public submission endpoint, rate limiting/spam controls, idempotent durable lead storage, file inspection and attachment ownership, source attribution, notification routing/outbox/retry administration, lead lifecycle/RLS/audit/export/CRM integration, retention, migration and staged end-to-end UAT. There is no public submit route yet and no enquiries have been sent or saved.

## Visual form workspace

The CMS Forms navigation now lists form records and supports new drafts, locale selection, editing and optimistic revision saves. The builder offers approved field types, labels/help/required/error text, text limits, choice options, condition selection, consent purpose/text versions, file limits, ordering/removal, submit/success wording and local redirect path. Stable IDs are retained through edits; deleting a choice or moving a source after its dependent question produces a validation issue requiring correction before save. Malformed existing definitions remain preserved for migration.

Marketing required controls are disabled and switching to marketing clears required state. Editing consent text/purpose creates a new text-version identifier. File configuration describes intended limits only; no public attachment upload is available. Existing notification route IDs are preserved but routing configuration is not yet exposed.

Six form tests and TypeScript passed. A temporary synthetic FormsWorkspace fixture verified create, add consent, choose optional marketing, save and reload with the required checkbox disabled. Mobile width was 390px without horizontal overflow or console warnings/errors; fixture removed. Real provider persistence, all conditional editing flows, interactive public preview, revision restore UI and publication/UAT remain outstanding.

## Interactive draft form preview

The form workspace now has a Try this form panel using the same field validator as intake. Text, email, phone, choices, multiselects and consent are interactive with field-associated errors. Conditional questions are evaluated in schema order; hiding a source prunes descendant answers so they are not silently reused when shown again. Editing the definition resets preview answers. Reset is also available explicitly.

The preview performs no network submission, lead write, notification or redirect. Its success state explicitly describes validation only and shows the configured success message/path. File inputs remain disabled until upload authorization/inspection is connected; required file fields cannot pass validation in this preview. This is not a real challenge/rate-limit/provider test or published renderer.

Eight form/visibility tests and TypeScript passed. Synthetic browser checks verified required feedback, conditional reveal, hidden-answer clearing and successful validation; mobile 390px had no horizontal overflow or console warnings/errors. Temporary fixture removed.

## Published form lookup

`GET /api/cms/forms/[id]` now reads only the configured website's published form revision through service-only SQL migration 029 and projects a visitor contract: form/revision identity, locale, title, approved field definitions, submit label and public Turnstile site key/action. Internal notification route IDs, full stored payload, success configuration and redirect path are omitted. Unknown/malformed stored definitions, mismatched identities, drafts, withdrawn forms and attachment forms fail closed. Attachment forms remain unavailable until public upload authorization is implemented.

The lookup requires the independent intake configuration to be enabled and complete, plus `CMS_TURNSTILE_SITE_KEY`. Responses are no-store and do not permit query-string website/revision overrides. Browser/anonymous database roles cannot execute the full stored-form input procedure. No secrets or real provider configuration were added.

Validation: 56 database tests, two public projection/API tests and TypeScript passed. Tests verify unpublished denial, published revision pinning while a newer draft exists, withdrawal, service-only input access and exclusion of routing configuration. SQL tests use root fixture publication and do not enable the form publication policy. The visitor renderer/widget, complete form publication validator, attachments, runtime setup and staging remain outstanding.

### Visitor renderer checkpoint

`/enquire/[formId]` now renders published form definitions through the public projection API. Invalid UUIDs return not-found; unconfigured/unavailable forms show a reload state. The route is noindex. Shared fields preserve required/conditional validation and explicit consent. Turnstile loads via the official explicit-render script, refreshes after each attempt and reports load failures. No provider credentials or real challenge have been exercised.

An uncertain submission retains its request UUID and answers in memory, locks editing, and retries the same payload with a fresh token. A validation failure on a retry does not discard the pending identity, since an earlier attempt may have persisted. Success requires a validated server receipt; optional redirect is a Continue link. A beforeunload guard protects pending requests where the browser supports it. This is not durable offline recovery: forced closure/reload can lose the pending identity. Synthetic browser testing verified validation, locked answers, identical retry payloads, confirmation and 390px overflow behavior. The fixture was removed.

The route remains dependent on form publication, database/ingress/Turnstile configuration and staged end-to-end validation. Existing website enquiry links have not been switched to it. Public file attachments remain unavailable.

### Review and publication policy

Local migration 030 registers `form-1` as the trusted form validator policy and enforces null form paths. Complete stored definitions are checked, including conditions, consent rules and limits. Unsupported file fields and unverified notification routes block publication; empty notification routes produce an explicit inbox-only warning. Inbox-only intake persists the lead and received event without scheduling a notification job. Existing notification jobs are preserved.

The Forms workspace now exposes saved-content checks, submit/review decisions, approved publication, withdrawal, a published form link and the latest 20 revision entries with restore-as-draft. Permission checks and separate-author approval remain database enforced. Publication requires an unexpired trusted check for the current approved revision. The browser check does not mint that receipt; deployment still needs the trusted worker wired and operated.

Local PGlite tests exercise the actual review/validation/publish functions: self-approval and client-minted receipts are rejected, missing trusted validation prevents publication, valid publication appears in the service lookup, subsequent draft edits leave the published revision stable, and withdrawal removes it. These tests do not establish managed staging readiness. Public ingress/challenge configuration, deployed worker operation, attachments and notification routing remain outstanding.

### Page-linked and shared form previews

The local page composition preview can now resolve a linked form through the viewer’s existing user-token content API. It verifies the returned record ID, content type, revision and complete form schema before rendering the simulation. Missing or inaccessible records show an explicit unavailable state. Refresh reloads the linked draft and resets test answers. This is the linked form’s latest saved draft, not a dependency pinned to the page revision; that distinction is displayed.

The Forms workspace also exposes the existing recipient-bound, expiring preview-sharing controls. Secure form previews render the pinned form payload after the existing access/expiry checks. Shared page previews do not automatically fetch linked form drafts or expand the recipient’s access. These simulation views never post enquiries or send notifications. A live page form renderer and revision/dependency publication policy are still required before composed pages can publish.

## Editable text placeholders

Text-based fields (name, organization, city, state, postal code, message, short text, email and phone) now accept an optional single-line `placeholder` of at most 500 characters. The editor exposes it beside help text; clearing the control removes the property. Existing definitions without it retain their exact parsed structure. Consent, file and choice fields reject placeholder properties because those controls do not use native text placeholders.

The shared FormFields renderer applies the value to text inputs and textareas in both draft preview and the published form body. Public form projection retains the value from the selected revision. Labels remain present and answers remain empty until the visitor enters them; a placeholder never satisfies required validation. No default answer, consent choice or notification behavior changes. This additive display property retains form-1 validation; old validators reject the previously unknown property rather than silently accepting it.

Local browser checks at 1280px/390px exercised editor changes reflected in both preview and public body, entered values, clearing placeholders and read-only controls. The synthetic fixture had no active challenge or submission and was removed after verification. These checks cover field behavior, not final contact-page styling or managed form publication. Full CMS suite: 1,040 tests passed, zero skips.

## Default dropdown choices

Single-choice dropdowns (`select`, `productInterest`, `enquiryType`) accept an optional `defaultOptionId` referring to an existing option. The editor offers No default or a configured option. Stable IDs survive label changes; removing the selected option makes the definition invalid until its default is corrected. Multiselect, consent and other field types reject this property. Existing forms without defaults retain empty initial answers.

Preview and public form bodies initialize visible defaults in schema order. Newly revealed conditional dropdowns also get their configured default, allowing dependent questions to become visible consistently. Hiding a branch discards its answers. Revealing it again applies its default, never restores discarded personal text. Explicitly clearing a visible choice remains cleared through other edits. Preview reset returns to configured defaults. Defaults are browser selections included in answers; server validation never fills omitted answers from configuration.

Local browser checks at 1280px/390px covered selecting/removing a default in the editor, initial values in preview/public body, visitor changes and clearing, preview reset and disabled controls. No real submission or challenge was performed. Conditional defaults and pruning are covered by unit tests. Schema/public-projection tests reject dangling defaults and consent defaults.

## Source form proposals

Contact and corporate legacy forms now have a pure source-bound proposal builder in `contact-form-migration.ts`. See `contact-page.md` for preserved fields and explicit compatibility gaps. This creates in-memory definitions only; it does not migrate saved forms or visitor enquiries.

## Separate confirmation heading and body

Forms accept an optional `successHeading` (1–200 characters, visible text) alongside the existing successMessage. The editor can set or clear it, and Try this form displays both after local validation. Existing forms without a heading keep their old response/display shape. Contact/corporate source proposals now use their original success heading and body separately.

Intake returns the optional heading from the server-read form revision only after receiving a valid persistence receipt, including replay. Visitors cannot supply it in the submission. Uncertain saves return no heading or success. The public receipt schema and renderer support the optional field, rendering an H3 then paragraph; without a heading the legacy message-as-heading display remains. Public form lookup still does not expose success configuration. Deploy the response producer and matching public client together before publishing a form using this field; older strict clients do not recognize the added receipt field.

Desktop/mobile browser tests used mocked success receipts to verify editing, heading/body/reference display and clearing back to legacy behavior. They did not submit a real enquiry. Intake tests cover confirmed save/replay, visitor injection rejection and uncertain-save failure.

## Historical choice labels in the lead inbox

Migration 164 extends the authorized `get_lead_form_labels` reader with option-label maps from the lead's exact stored form revision. It never reads the current draft or published pointer as a replacement. The same lead-view permission and site scope apply; revoked or unrelated users receive no metadata. Existing field-label/title output remains compatible.

The lead inbox resolves single/multiple choice IDs to these historical labels. Unmapped IDs remain visible, booleans retain Yes/No, and raw saved answers are unchanged. Missing option maps from an older database keep the previous raw-ID display, allowing the application to run before migration deployment. The migration has only been exercised locally, not applied to a managed provider.

PGlite tests verify label pinning after a form edit, site/role isolation and permission revocation. Synthetic desktop/mobile inbox checks verify labels, multiple choices, unknown-ID fallback, read-only controls and reload. This is not a real migrated enquiry, notification or deployment test.

## Email and phone input limits

Email fields accept optional maxLength (3–320). Phone fields accept optional maxLength (7–80) and maxDigits (7–80). Existing fields without these properties retain the prior 320/80 character behavior and no upper digit count. All phone fields still require at least seven digits. The editor exposes the limits, input maxlength reflects the configured character bound, and shared server/preview validation checks character and digit bounds. Digits count separately from formatting punctuation.

Contact and corporate proposals now set email 254, phone 60 characters and phone 15 digits, matching their captured legacy intake limits. This does not claim identical syntax acceptance or whitespace semantics: CMS email syntax and phone punctuation validation remain different, and combined legacy notes are not yet mapped. These differences remain explicit proposal findings.

Boundary tests cover exact limits, one-character/one-digit excess, formatted phone length, invalid configuration and absent-property compatibility. Desktop/mobile preview checks exercised editing, maxlength attributes, rejection of 16 digits, acceptance of 15 and read-only controls. No actual submission was performed.
