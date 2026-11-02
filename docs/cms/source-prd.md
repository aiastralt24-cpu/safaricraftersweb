# Product Requirements Document: Complete Website CMS and Administration Backend

**Purpose:** Build a complete website management system that allows authorized teams to create, edit, organize, preview, approve, publish, and restore every business-managed part of the website without depending on a developer for routine changes.

This includes every headline, subheadline, paragraph, image, video, banner, button, menu, product, document, form, SEO field, and reusable website section.

The CMS must provide control over both **what appears on the website** and **how approved components are arranged**, with permissions, validation, and version history to protect the live website.

**Document status:** Proposed requirements for development and vendor evaluation.

**Scope assumption:** A corporate and product website with product categories, applications, projects, resources, enquiries, and multiple content contributors. Modules can be enabled according to the website’s needs.

---

## 1. Product goal

Create a backend through which a nontechnical marketing or business user can independently manage the complete website.

A user should be able to:

- Change any website text.
- Replace any image or video.
- Create pages using approved layouts.
- Add, remove, duplicate, and reorder sections.
- Add products, categories, applications, and projects.
- Update menus, footer links, and contact information.
- Manage downloadable documents.
- Control page URLs, SEO metadata, and structured data.
- Create enquiry forms and manage incoming leads.
- Preview changes before publishing.
- Submit changes for approval.
- Schedule content publication and removal.
- Restore previous versions.
- Understand where content and media are used.
- Monitor content completeness, broken links, and operational errors.

**Core acceptance principle:** Every business-managed element visible on the website must map to a documented CMS field or reusable content record. No such element should remain hardcoded without a documented exception.

---

## 2. What “fully editable” means

The CMS must support four levels of control.

| Level | Required control | Example |
|---|---|---|
| Content | Change text, media, links, and documents | Update a product headline |
| Composition | Add, remove, duplicate, and rearrange approved sections | Move testimonials above the enquiry form |
| Presentation | Adjust approved visual settings | Change section background or image alignment |
| Administration | Manage workflows, access, integrations, and website settings | Give an agency draft-only access |

Editors must be able to change approved components freely within their permissions.

Creating an entirely new component type, changing application logic, or introducing a new integration may require development. These boundaries must be documented before implementation.

---

## 3. Business outcomes and success measures

The following are proposed acceptance targets, to be confirmed during discovery.

| Outcome | Measurement |
|---|---|
| Complete content coverage | 100% of inventoried business-managed elements have CMS controls |
| Less developer dependency | At least 95% of agreed routine content tasks completed without development |
| Faster updates | A trained editor can update a headline and image, preview, and submit within five minutes |
| Reliable publishing | Published revisions appear consistently across affected pages within the agreed delivery SLA |
| Safe editing | Draft changes never appear publicly before publication |
| Traceable changes | Every publish, permission change, and destructive action records an actor and timestamp |
| Recoverable mistakes | An authorized user can restore an earlier content revision through the CMS |
| Reliable enquiries | Every accepted form submission is durably saved before success is shown |

Training tasks, test conditions, and the routine-task list must be agreed before measuring these outcomes.

---

## 4. Users and permissions

Permissions must combine role, website, module, action, and content scope.

### 4.1 Default roles

| Role | Typical access |
|---|---|
| Platform administrator | Users, roles, environments, integrations, and system configuration |
| Website administrator | Full control over assigned websites |
| Marketing manager | Pages, campaigns, navigation, media, SEO, and publishing |
| Content editor | Create and edit assigned content; submit for review |
| Product manager | Product information, specifications, categories, and documents |
| SEO manager | SEO fields, redirects, indexing controls, and SEO reports |
| Reviewer | Review assigned changes, comment, approve, or reject |
| Publisher | Publish approved revisions and manage schedules |
| Sales user | Assigned enquiries, lead notes, and follow-ups |
| Agency contributor | Restricted draft access with optional expiry |
| Analyst | Read-only reporting |
| Auditor | Read-only access to revisions and audit logs |

### 4.2 Permission requirements

**PER-01:** Administrators can create custom roles.

**PER-02:** Permissions must distinguish view, create, edit, delete, approve, publish, export, and configure.

**PER-03:** Users can be restricted by website, brand, language, region, module, or assigned records.

**PER-04:** Editing content must not automatically grant publishing access.

**PER-05:** Lead export, bulk deletion, global replacement, and integration configuration require separate permissions.

**PER-06:** All permissions must be enforced on the server. Hiding controls in the interface is insufficient.

**PER-07:** Revoking access must invalidate relevant sessions and prevent subsequent operations.

**PER-08:** Approver separation must be configurable for sensitive content. Where enabled, authors cannot approve their own changes.

---

## 5. Backend navigation

The proposed administration structure is:

1. Dashboard
2. Pages and Page Builder
3. Products and Categories
4. Applications and Industries
5. Projects and Case Studies
6. Resources and News
7. Media and Documents
8. Navigation and Global Content
9. Forms and Leads
10. SEO and Search
11. Languages and Regions
12. Reviews and Publishing
13. Reports and Content Health
14. Users and Permissions
15. Integrations
16. Settings
17. Audit Logs and Recovery

Modules must be configurable so the backend does not show irrelevant features.

---

## 6. Dashboard

The dashboard must show work that needs attention.

### Required information

- Drafts awaiting completion.
- Content pending review.
- Approved content awaiting publication.
- Scheduled publications and expiries.
- Failed publishing jobs.
- Unassigned leads.
- Overdue follow-ups.
- Broken internal links.
- Missing required SEO fields.
- Images missing accessibility descriptions.
- Documents or certifications nearing expiry.
- Content overdue for review.
- Recent changes and responsible users.
- Integration and delivery failures.

Each item must link directly to the affected record and provide an appropriate next action.

Dashboard widgets must respect the user’s permissions.

---

## 7. Website inventory and editability register

Before development, the implementation team must inspect every existing template and component.

The inventory must include:

| Inventory field | Description |
|---|---|
| Page or template | Where the element appears |
| Section or component | Hero, card, footer, product specification, etc. |
| Visible element | Exact text, image, video, link, or setting |
| CMS field | Where it will be managed |
| Content source | Page-specific, shared, inherited, or externally synchronized |
| Owner | Team responsible for accuracy |
| Permission | Who can change and publish it |
| Validation | Required constraints |
| Migration status | Pending, imported, verified, or excluded |

The inventory must include less obvious elements such as:

- Search placeholders and empty states.
- Form validation and success messages.
- Cookie banner text.
- Breadcrumb labels.
- Image captions.
- Video posters.
- Accordion titles.
- Mobile menu content.
- Error pages.
- Download labels.
- Accessibility labels.
- Social sharing images.
- Sticky enquiry buttons.
- Legal disclaimers.

Every exclusion must state the reason and the process for changing it.

---

## 8. Page management

### 8.1 Page record

Every page must support:

- Internal name.
- Public title.
- Page type and template.
- Parent page.
- URL slug.
- Language and region.
- Content owner.
- Status.
- Section content.
- SEO configuration.
- Social sharing configuration.
- Publication date and expiry.
- Review due date.
- Access or visibility rules.
- Revision history.

Internal names and public titles must be separate fields.

### 8.2 Page actions

Authorized users must be able to:

- Create from a template.
- Duplicate a page.
- Edit and preview.
- Reorder sections.
- Move within the page hierarchy.
- Submit for approval.
- Schedule publication.
- Unpublish.
- Archive.
- Restore a revision.
- Export structured content.

Duplicating a page must create a draft with a new identity and require confirmation of its slug, SEO metadata, and navigation placement.

### 8.3 URL behaviour

- Published URLs must be unique within the applicable website and language.
- Slugs must be validated for invalid characters and reserved routes.
- Changing a published URL must prompt a redirect decision.
- URL changes must show affected internal references.
- Redirects must avoid loops and unnecessary chains.
- Archiving a page must not silently create a broken destination.

---

## 9. Visual page builder

The page builder must allow nontechnical users to assemble pages from an approved component library.

### 9.1 Editing interface

Provide:

- A page tree or section list.
- A preview canvas.
- A settings panel for the selected component.
- Desktop, tablet, and mobile preview.
- Clear save and publication status.
- Undo and redo within the editing session.
- Drag-and-drop ordering with keyboard alternatives.
- Field-level validation.
- A visible distinction between shared and page-specific content.

Selecting an element in the preview should open its corresponding settings.

### 9.2 Component library

The initial library should include:

| Component | Main editable elements |
|---|---|
| Hero | Eyebrow, headline, subheadline, image/video, buttons |
| Text section | Headings, paragraphs, lists, links |
| Image and text | Media, copy, alignment, CTA |
| Image gallery | Images, captions, ordering |
| Video section | Video, poster, transcript, captions |
| Card grid | Cards, icons, copy, links, layout |
| Product listing | Source, filters, ordering, featured items |
| Product comparison | Products and comparison attributes |
| Statistics | Value, label, unit, source, disclaimer |
| Testimonials | Quote, person, role, organization, media |
| Projects | Selected projects and display settings |
| Timeline | Dates, titles, descriptions, media |
| Accordion/FAQ | Questions, answers, ordering |
| Tabs | Labels, content, default tab |
| Downloads | Documents, labels, versions |
| CTA banner | Headline, copy, buttons, background |
| Form | Form reference, introduction, success behaviour |
| Logo strip | Logos, labels, links |
| Map/location | Locations, display mode, contact details |
| Related content | Selection rules or manual records |

### 9.3 Common section controls

Where applicable, every section must support:

- Internal label.
- Visibility.
- Anchor ID.
- Approved background style.
- Content width.
- Spacing preset.
- Text alignment.
- Media alignment.
- Mobile stacking order.
- Accessible heading level.
- Link targets.
- Approved animation preset.
- Scheduled visibility.
- Region or language scope.

Presentation controls must use design-system tokens and approved variants. Ordinary editors must not need arbitrary CSS or scripts.

### 9.4 Component boundaries

The CMS must clearly distinguish:

- A page-specific component instance.
- A shared component referenced by multiple pages.
- A synchronized listing generated from structured records.
- An inherited value from a global setting.

Before changing shared content, the interface must show the affected locations.

---

## 10. Text and rich content editing

### 10.1 Editable text

All visible content must be editable, including:

- Headlines and subheadlines.
- Eyebrow text.
- Paragraphs and lists.
- Button labels.
- Navigation labels.
- Specifications and table headings.
- Captions and footnotes.
- Tooltips.
- Form labels and help text.
- Validation and confirmation messages.
- Search messages.
- Legal and consent text.

### 10.2 Rich text controls

Support approved:

- Heading levels.
- Bold and italic formatting.
- Lists.
- Links.
- Quotes.
- Tables.
- Superscript and subscript.
- Special characters.

Pasted content must be cleaned to remove unwanted formatting and unsafe markup.

### 10.3 Validation

- Required fields must be explicit.
- Field guidance must explain the expected content.
- Length recommendations must distinguish warnings from hard limits.
- Links must be validated.
- Heading hierarchy problems must be flagged.
- Unsupported HTML and scripts must be rejected or sanitized.
- Long titles must wrap safely without breaking layouts.

A visually hidden heading must not be used simply to conceal poor content structure.

---

## 11. Media library

### 11.1 Image management

Each image asset must support:

- Original filename.
- Internal title.
- Description.
- Default alternative text.
- Caption.
- Tags and folders.
- Brand and usage scope.
- Creator or owner.
- Rights and consent information.
- Expiry date where applicable.
- Dimensions, format, and file size.
- Focal point.
- Approved crops.
- Version history.
- Usage references.

Alternative text must also support a contextual override because the same image can serve different purposes on different pages.

Decorative images must be explicitly marked decorative.

### 11.2 Image operations

Users must be able to:

- Upload individual images or batches.
- Search and filter assets.
- Crop and set focal points.
- Select separate mobile and desktop assets.
- Replace an asset in one location.
- Replace an asset globally with impact confirmation.
- View every published and draft usage.
- Archive unused assets.
- Restore previous asset versions.

The system must retain originals and create optimized delivery variants.

### 11.3 Video management

Video records must support:

- Uploaded file or approved external provider.
- Title and description.
- Poster image.
- Captions and language.
- Transcript.
- Duration.
- Playback controls.
- Loop and muted settings.
- Approved autoplay behaviour.
- Mobile fallback.
- Rights and expiry information.

A video must not publish while required processing is incomplete or its delivery source is unavailable.

### 11.4 Asset safety

- Validate file extension, MIME type, and file signature.
- Apply configurable size and format limits.
- Scan uploaded files.
- Quarantine failed uploads.
- Restrict or sanitize active formats such as SVG.
- Prevent deletion of referenced assets without resolution.
- Show clear upload, processing, failure, and retry states.

---

## 12. Document and download management

Support brochures, catalogues, technical data sheets, safety documents, certificates, manuals, and other resources.

### Document fields

- Title.
- Document type.
- Product or category relationships.
- Language.
- Region.
- Version.
- Effective date.
- Expiry or review date.
- File.
- Public download label.
- Access level.
- Approval status.
- Owner.

### Required behaviour

- Stable download references must be independent of original filenames.
- Replacements must preserve document history.
- Superseded technical documents must be identifiable.
- Users must see all locations using a document.
- Expired documents must follow a configured policy: warn, block publication, or remove availability.
- Downloads can be measured where analytics consent permits.
- Gated documents must validate authorization server-side.

---

## 13. Product information management

### 13.1 Product fields

Support:

- Product name and code.
- Brand.
- Category and subcategory.
- Short and detailed descriptions.
- Benefits.
- Features.
- Applications.
- Suitable and unsuitable uses.
- Images and videos.
- Specifications.
- Sizes and variants.
- Packaging.
- Colours and finishes.
- Installation instructions.
- Precautions.
- Warranty information.
- Certifications.
- Technical documents.
- FAQs.
- Related products.
- Accessories.
- Enquiry CTA.
- Availability scope.
- SEO fields.
- Lifecycle status.

### 13.2 Category-specific attributes

Administrators must be able to define attribute groups by product category.

For example:

| Category | Illustrative attributes |
|---|---|
| Pipes | Material, diameter, pressure class, length |
| Adhesives | Substrate, application method, curing time, pack size |
| Paints | Finish, coverage, coats, surface preparation |
| Bathware | Dimensions, finish, mounting type, compatibility |

These are data-model examples. Actual values and claims require product-team approval.

### 13.3 Structured specifications

Specifications must be stored as structured fields rather than embedded only in paragraphs.

Each specification can define:

- Label.
- Value type.
- Unit.
- Allowed values.
- Required status.
- Display order.
- Filter eligibility.
- Comparison eligibility.
- Regional applicability.

Zero, blank, unknown, and not applicable must remain distinct values.

### 13.4 Product relationships

Support relationships among:

- Products and categories.
- Products and applications.
- Products and documents.
- Products and projects.
- Products and accessories.
- Products and compatible systems.

Discontinuing a product must support replacement recommendations and preserve relevant historical URLs.

---

## 14. Additional structured content

Provide configurable modules for:

- Applications and industries.
- Projects and case studies.
- Articles and insights.
- News and press releases.
- Events.
- Leadership profiles.
- Locations.
- Careers.
- FAQs.
- Testimonials.
- Certifications.
- Dealers or service partners.

Every module must support reusable content records, relationships, search, filters, ownership, revision history, SEO where relevant, and publishing workflows.

For claims such as certifications, warranties, and performance benefits, support evidence attachments, approval ownership, and review dates.

---

## 15. Global website settings

### Header and navigation

Manage:

- Logos.
- Main and utility menus.
- Mega menus.
- Featured menu content.
- Navigation CTAs.
- Mobile navigation.
- Language selector.
- Contact links.
- Sticky and approved header variants.

Menu records must support internal references, external URLs, nesting, ordering, and visibility rules.

### Footer

Manage:

- Link groups.
- Addresses.
- Contact details.
- Social profiles.
- Legal links.
- Copyright text.
- Disclaimers.
- Certifications or partner marks.

### Other global elements

Manage:

- Announcement bars.
- Sticky CTAs.
- Cookie banner content.
- Default sharing images.
- Fallback images.
- Site search settings.
- Default SEO templates.
- Error pages.
- Maintenance messages.

A global change must show its impact before publication.

---

## 16. SEO management

### 16.1 Page-level controls

Every indexable content type must support:

- SEO title.
- Meta description.
- Canonical configuration.
- Indexing directive.
- Social title and description.
- Social image.
- Breadcrumb label.
- Structured data configuration.
- Sitemap inclusion.
- Language relationships.

Defaults must show their source and allow authorized overrides.

### 16.2 Technical controls

Provide controlled management of:

- Redirects.
- Robots directives.
- XML sitemap rules.
- Canonicals.
- Hreflang relationships.
- Pagination behaviour.
- Faceted URL rules.
- Removed-page responses.
- Structured data templates.

Sensitive settings such as site-wide indexing changes require elevated permissions and explicit impact confirmation.

### 16.3 SEO checker

The checker should identify:

- Missing or duplicated titles.
- Missing descriptions.
- Heading structure issues.
- Broken internal links.
- Invalid canonicals.
- Accidental indexing blocks.
- Redirect loops or chains.
- Missing image descriptions.
- Orphan pages.
- Invalid structured data.
- Inconsistent language references.

Each finding must include severity, affected location, explanation, and an action.

Scores must disclose their rules. Passing a checker must not be presented as a ranking guarantee.

### 16.4 AEO and answer clarity

Provide editorial checks for:

- Clear answers to relevant questions.
- Consistent product and organization naming.
- Supported claims.
- Clear definitions and specifications.
- Relevant FAQs.
- Author or reviewer attribution where useful.
- Review dates.
- Structured data matching visible content.

These are content-quality checks. They must not claim to guarantee inclusion in AI-generated answers.

---

## 17. Forms and enquiry capture

### 17.1 Form builder

Support approved fields:

- Name.
- Phone.
- Email.
- Organization.
- City, state, and pincode.
- Product interest.
- Enquiry type.
- Message.
- Dropdowns and multiselects.
- File upload.
- Consent checkboxes.

Allow configuration of:

- Labels and help text.
- Required fields.
- Conditional questions.
- Validation messages.
- Submission success message.
- Redirect destination.
- Notification routing.
- Spam protection.

### 17.2 Submission requirements

- Validate submissions server-side.
- Apply rate limits and spam controls.
- Save the enquiry before displaying success.
- Prevent duplicate records caused by retries.
- Capture permitted source attribution.
- Store the form version and relevant consent text version.
- Keep enquiries separate from marketing opt-in.
- Queue notification delivery.
- Retry failed notifications.
- Show delivery failures in the backend.

Notification failure must not cause a saved enquiry to disappear.

---

## 18. Lead management

Provide a practical lead workspace linked to website forms.

### Lead record

Include:

- Contact details.
- Enquiry content.
- Product and category interest.
- Location.
- Source page.
- Permitted campaign attribution.
- Submission time.
- Assigned owner.
- Status.
- Priority.
- Notes.
- Activities.
- Next follow-up.
- Outcome.
- Consent records.
- External CRM reference.

### Workflow

Support configurable stages such as:

New → Assigned → Contacted → Qualified → In progress → Won / Lost / Invalid

Required features:

- Assignment by product, location, brand, or enquiry type.
- Manual reassignment.
- Follow-up reminders.
- Overdue queues.
- Duplicate detection and controlled merging.
- Assignment history.
- Role-based exports.
- CRM synchronization where configured.

Lead lifecycle data must not be mixed with website content revisions.

---

## 19. Editorial workflow

### 19.1 Content states

Support:

Draft → In review → Changes requested → Approved → Scheduled → Published → Archived

The CMS must distinguish the current published revision from an unpublished working revision.

### 19.2 Review behaviour

- Assign reviewers.
- Add comments.
- Compare submitted and published versions.
- Approve or reject with feedback.
- Notify responsible users.
- Require additional review for selected content types.

Approval must bind to a specific revision. Editing approved content must invalidate its approval where the change requires review.

### 19.3 Autosave and concurrent editing

- Autosave drafts.
- Display saving, saved, and failed states.
- Warn before leaving unsaved work.
- Detect conflicting edits.
- Prevent silent overwrites.
- Offer recovery or comparison when a conflict occurs.

Autosave must never publish content.

---

## 20. Preview, publishing, and scheduling

### Preview

Preview must show the actual draft composition, including:

- Draft text and media.
- Navigation changes.
- Product relationships.
- Language and region.
- Responsive layouts.
- Scheduled content conditions.

Preview links must be authenticated or signed with expiry. Preview content must not be publicly discoverable or indexable.

### Publishing

Before publication, validate:

- Required fields.
- Permissions and approvals.
- Referenced content availability.
- Media processing status.
- Route uniqueness.
- Applicable legal and consent fields.
- Critical accessibility and SEO requirements.

### Reliable release behaviour

A release containing multiple dependent records must become visible consistently.

For example, publishing a product page must not expose a new product while its required document or category remains unavailable.

Publication must include:

- Revision identity.
- Release identity where applicable.
- Actor.
- Timestamp.
- Delivery status.
- Cache refresh status.
- Failure reason and retry action.

### Scheduling

- Store scheduled instants consistently.
- Display the selected timezone clearly.
- Support publish and unpublish schedules.
- Detect conflicting schedules.
- Cancel schedules when their target revision becomes invalid.
- Record execution attempts.
- Support safe retries without duplicate publication.

### Rollback

Rollback must restore the relevant published content revision and refresh delivery caches. It must preserve the audit trail.

Rollback is separate from restoring the entire database.

---

## 21. Localization and regional content

Support:

- Multiple languages.
- Regional overrides.
- Translation status.
- Language-specific metadata.
- Local documents.
- Regional contacts.
- Region-specific product availability.
- Explicit fallback rules.

A translation must record the source revision it was based on.

When the source changes, affected translations must be marked for review.

The system must not silently publish a mixture of languages. Where fallback is permitted, the behaviour must be explicit and previewable.

---

## 22. Search and content discovery

### Backend search

Search across:

- Pages.
- Products.
- Media.
- Documents.
- Drafts.
- Archived records.
- Revision metadata.

Search results must respect permissions.

### Public search

Support:

- Products and resources.
- Relevant filters.
- Synonyms.
- Featured results.
- Zero-result messages.
- Search analytics.

Only eligible published content may enter the public search index.

Unpublishing or restricting content must remove it from public search within the agreed SLA.

---

## 23. Content health and reporting

Provide reports for:

- Published, draft, and archived content.
- Content ownership.
- Overdue reviews.
- Missing required fields.
- Broken links.
- Orphan pages.
- Unused assets.
- Expired documents.
- Translation completeness.
- Failed publications.
- Form conversion and lead counts.
- Lead assignment and response times.
- User and publishing activity.

Operational CMS metrics and external analytics must be clearly distinguished.

If an analytics integration fails, show its freshness and failure state.

---

## 24. Data model

The implementation must define stable identifiers and explicit relationships.

| Entity | Purpose |
|---|---|
| Websites | Website configuration and scope |
| Users and memberships | Access to websites and roles |
| Roles and permissions | Authorization rules |
| Content records | Stable identity and ownership |
| Content revisions | Versioned content snapshots |
| Pages | Routes, hierarchy, templates |
| Component instances | Page composition and settings |
| Shared components | Reusable content blocks |
| Products and variants | Structured catalogue |
| Categories and attributes | Taxonomy and specifications |
| Assets and asset versions | Media and documents |
| Asset usages | Dependency tracking |
| Navigation trees | Menus and hierarchy |
| SEO records | Metadata and indexing configuration |
| Redirects | Route changes |
| Forms and versions | Form definitions |
| Submissions and leads | Enquiries and sales work |
| Approvals | Revision-specific decisions |
| Releases | Coordinated publication |
| Scheduled jobs | Future operations |
| Audit events | Security and administrative history |
| Integration jobs | Delivery and synchronization |

Content revisions, audit events, and operational logs must have separate purposes and retention rules.

A website or brand identifier must be enforced consistently where multiple sites share infrastructure.

---

## 25. Architecture requirements

The architecture must separate:

1. Administrative editing.
2. Content storage and validation.
3. Published content delivery.
4. Background processing.
5. External integrations.

Required properties:

- Draft content cannot leak through public endpoints.
- Public delivery exposes only approved published data.
- Media processing runs asynchronously.
- Publication jobs can retry safely.
- Integrations cannot block core content saving.
- Secrets remain server-side.
- Content exports remain usable without the original CMS interface.
- Schema and component changes include migration procedures.

The PRD does not mandate a particular technology stack. The implementation proposal must explain database, authentication, storage, rendering, hosting, queueing, caching, and monitoring choices.

---

## 26. Security and privacy

Required controls include:

- Secure authentication.
- Multifactor authentication for privileged users.
- Server-side authorization.
- Session expiry and revocation.
- Secure preview access.
- Upload validation and scanning.
- Sanitized rich text.
- Protection against unauthorized cross-site access.
- Rate limits on public forms.
- Secret management.
- Encrypted transport.
- Controlled export access.
- Audit logs for sensitive actions.
- Data retention and deletion controls.

Third-party tracking scripts must use an approved integration mechanism. Ordinary content editors must not be able to insert arbitrary executable code.

Privacy notices, consent requirements, retention periods, and applicable legal obligations must be confirmed by the responsible business and legal owners before launch.

---

## 27. Nonfunctional requirements

These are proposed targets for estimation and acceptance planning.

| Area | Proposed requirement |
|---|---|
| Accessibility | Admin and supported components target WCAG 2.2 AA |
| Save performance | 95th percentile standard save within two seconds under agreed test load, excluding asset transfer |
| Public delivery | Published content available within 60 seconds after successful release under normal operation |
| Availability | Proposed 99.9% monthly service target, with measurement boundaries agreed |
| Reliability | No silent loss of saved content or accepted submissions |
| Recovery | Proposed recovery point of one hour and recovery time of four hours, subject to business approval |
| Browser support | Agreed current desktop browsers for administration |
| Responsive content | Approved components verified at agreed mobile, tablet, and desktop widths |
| Observability | Alerts for failed publication, queue backlog, form failure, and integration failure |
| Portability | Structured exports of content, assets, relationships, and redirects |

Capacity assumptions must be documented before load testing, including pages, products, assets, administrators, traffic peaks, submissions, and publication frequency.

---

## 28. Backup and recovery

The backup plan must cover:

- Database.
- Media originals.
- Published asset versions.
- Configuration.
- Redirects.
- Role definitions.
- Integration configuration references.

Required recovery scenarios:

- Restore a single page revision.
- Restore a deleted record.
- Restore an asset version.
- Recover from an incorrect bulk update.
- Restore a complete environment.

A successful backup job is insufficient evidence of recoverability. A restore exercise must be completed before launch and repeated at an agreed interval.

---

## 29. Bulk import, export, and updates

Support structured import for products, locations, redirects, metadata, and other agreed modules.

The workflow must provide:

1. Upload.
2. Column mapping.
3. Validation.
4. Preview of changes.
5. Confirmation.
6. Processing status.
7. Error report.

Requirements:

- Define whether each row creates or updates.
- Use stable identifiers.
- Detect duplicate keys.
- Validate relationships.
- Make partial-success behaviour explicit.
- Support retry without duplicate creation.
- Record import actor and file.
- Preserve the previous values needed for recovery.

Bulk changes must show the number and type of affected records before execution.

---

## 30. Migration requirements

Migration must include:

- Existing page content.
- Products and categories.
- Media and documents.
- Navigation.
- SEO metadata.
- Existing URLs.
- Redirects.
- Language relationships.
- Relevant ownership and review information.

### Migration sequence

1. Inventory existing content.
2. Map it to CMS schemas.
3. Identify missing or conflicting data.
4. Import into a nonproduction environment.
5. Compare representative pages visually.
6. Validate routes, links, downloads, and metadata.
7. Complete owner review.
8. Freeze or reconcile late changes.
9. Perform final migration.
10. Run launch checks.

Migration must not silently invent missing specifications, claims, or metadata.

---

## 31. Required acceptance scenarios

| ID | Scenario | Passing condition |
|---|---|---|
| UAT-01 | Edit homepage headline | Draft preview updates; live page stays unchanged until publication |
| UAT-02 | Replace mobile hero image | Mobile uses the selected image; desktop retains its configured image |
| UAT-03 | Reorder sections | Saved order matches preview and publication |
| UAT-04 | Edit shared CTA | CMS lists affected pages before publishing |
| UAT-05 | Change published slug | Redirect is created as configured; internal references remain valid |
| UAT-06 | Create product | Approved template renders structured information correctly |
| UAT-07 | Replace technical document | New version is delivered; previous version remains traceable |
| UAT-08 | Concurrent editing | Second save cannot silently overwrite a newer revision |
| UAT-09 | Edit approved content | Relevant approval becomes invalid and review is required again |
| UAT-10 | Schedule release | Intended revision publishes once at the displayed time |
| UAT-11 | Fail notification delivery | Lead remains saved and notification is retryable |
| UAT-12 | Submit form twice through retry | One logical submission is recorded |
| UAT-13 | Restore earlier page | Previous content returns and delivery caches refresh |
| UAT-14 | Restricted agency user | Cannot publish or access unauthorized modules through UI or API |
| UAT-15 | Unpublish content | Removed from page delivery, listings, sitemap, and public search as applicable |
| UAT-16 | Invalid media upload | Rejected or quarantined without public exposure |
| UAT-17 | Expired preview link | Draft content is inaccessible |
| UAT-18 | Global indexing change | Requires elevated permission and clear impact confirmation |
| UAT-19 | Source translation changes | Related translations become visibly due for review |
| UAT-20 | Restore backup | Agreed recovery procedure succeeds within measured limits |

Testing must cover both interface behaviour and server-side enforcement.

---

## 32. Delivery phases

Phasing organizes implementation. It does not remove requirements from the agreed final scope.

| Phase | Deliverables |
|---|---|
| 1. Discovery | Inventory, content model, permissions, migration map, approved scope |
| 2. Foundation | Authentication, roles, audit logs, media, revisions, environments |
| 3. Core editing | Pages, component library, global content, preview, publishing |
| 4. Structured modules | Products, documents, projects, resources, forms, leads |
| 5. Governance | Approvals, schedules, localization, SEO checks, reports |
| 6. Migration and launch | Data migration, testing, training, recovery exercise, launch |
| 7. Operational handover | Documentation, monitoring, support, ownership transfer |

Each phase must have demonstrable acceptance criteria and a reviewable working environment.

---

## 33. Vendor and developer deliverables

The implementation team must provide:

- Complete editability register.
- Approved content and component schemas.
- Role and permission matrix.
- Backend UX designs.
- Working administration interface.
- Frontend integration.
- API documentation.
- Migration scripts and reports.
- Redirect inventory.
- Test results.
- Security and permission validation.
- Backup and recovery procedure.
- Deployment and rollback guide.
- Administrator guide.
- Editor training material.
- Source code and configuration handover.
- Infrastructure ownership details.
- Third-party dependencies and recurring costs.
- Support and maintenance terms.

No required module should depend on an undocumented account controlled only by the vendor.

---

## 34. Definition of done

The CMS is complete when:

- Every agreed website element has an operational editing control.
- Pages and structured content can be managed without routine developer intervention.
- All approved component variants work responsively.
- Draft, approval, publication, scheduling, and rollback operate correctly.
- SEO controls affect the actual delivered website.
- Images, videos, and documents have working lifecycle management.
- Forms save enquiries reliably.
- Permissions work through both the interface and APIs.
- Migration preserves agreed content and URL behaviour.
- Search, sitemap, listings, and caches reflect publication changes.
- Backup restoration has been demonstrated.
- Business users complete the agreed tasks independently.
- Documentation, source access, and operational ownership are handed over.

**Final product requirement:** The backend must give the business team practical control over the complete website, with every routine change editable, previewable, accountable, publishable, and recoverable.