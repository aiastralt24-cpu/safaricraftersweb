# Client workspace implementation checkpoint

The independent workspace lives at `/cms`. It uses the CMS API and Supabase authentication; it does not use Sanity. The existing public website has not been switched to this backend.

## Implemented interface

- Email/password sign-in and session restoration through the Supabase browser SDK.
- Accessible website selection and paginated journey records.
- Journey scalar editing with preservation of structured fields not yet exposed by the form, plus unsaved-change prompts.
- Draft save, submission, approval, change requests, publication, unpublication and revision restoration commands through the permission-enforcing API.
- Word/Excel downloads, file review, validation messages, proposed changes and reviewed draft import with stable retry keys.
- An explicit setup state when CMS configuration is absent. No fake records are presented as client content.
- Image uploads screen with private transfer, processing status, recent own-upload history and reservation cancellation. Processing and rights approval remain separate. Migration 012 supplies the owner-scoped latest-50 list.
- Media library with searchable metadata, rights management for authorized accounts, usage lookup and archive/restore controls. Private detail-image previews are connected in code; live storage verification, grid thumbnails and selection into page fields remain pending.

Configure `CMS_SUPABASE_URL` and `CMS_SUPABASE_ANON_KEY` after preparing staging according to the database and API documentation. Only a public publishable key or legacy anonymous key is serialized to the browser; service credentials are rejected by the configuration filter. Database authorization still governs every operation.

## Design verification

Accepted implementation reference: `design/workspace-concept.png`. Captured setup states: `design/workspace-setup-desktop.png` at 1440 × 1000 and `design/workspace-setup-mobile.png` at 390 × 844.

The setup state was inspected in the browser for the white/forest palette, readable type, sidebar hierarchy, spacing and mobile stacking. The mobile document had no horizontal overflow. These captures do not verify the authenticated three-column editor against the concept. Full visual fidelity and authenticated interaction testing remain pending staging access; no numerical fidelity score is claimed.

## Verification and limits

`npm run test:cms-workspace` checks public-key filtering and preservation of unseen structured content during scalar edits. TypeScript and whitespace checks pass. Existing database/API tests cover their respective contracts, but they are not a substitute for browser tests against managed authentication and deployed PostgREST.

This is the first journey workspace, not the completed PRD. Remaining work includes other collections, structured child editing, the section composer, rendered preview, full media-library management, invitations/account recovery, site settings, leads, deployment adapters, content migration and client acceptance testing. Published changes do not yet propagate to the current public website. The upload screen's file selection/transfer/status/reset behavior was browser-tested using synthetic responses, including mobile layout; authenticated real-provider testing is still pending.

## Journey editing history

The main journey editor now uses shared bounded in-memory undo/redo for its text fields, new URL slug and itinerary/FAQ/media changes. Each snapshot retains the complete editable field set and collection overrides, so undoing an entry change does not erase unrelated edits or retained source fields. Undo marks the draft dirty; new/load/save/restore boundaries clear history. History is scoped by account, website, active view and load epoch, and disabled when busy, signed out or without edit access.

Verification: 11 targeted journey/history tests passed. A browser run through the actual CmsWorkspace with local mocked authentication and API responses verified field/collection ordering, deletion recovery, redo, save reset, new-record isolation and new-URL undo. No page runtime errors occurred. The temporary route was removed. Real authentication/persistence and journey autosave/conflict recovery remain separate work.

## Journey save-conflict recovery

A conflicting save now fetches the latest caller-scoped journey and compares it with the loaded baseline and proposed payload. Identity, type, language, route, edit permission and a changed revision must agree. Comparison uses the union of payload keys, so remote additions/removals and structured fields outside the text form remain visible. Concurrent account/site/view changes prevent a delayed save/conflict response from replacing the active context.

Overlapping changes require explicit choices; collections and nested objects are selected whole. Applying choices updates only local state and the expected revision, clears local undo history and requires a separate save. A retained structured value is kept as the base for later form edits rather than converted to an empty string. Unknown remote fields remain intact. Cancel preserves unsaved work. Auth/site resets clear the comparison; active comparison locks ordinary editing/navigation.

Verification: 10 targeted journey/conflict tests passed. A browser run through CmsWorkspace with local mocked authentication/API verified required choices, preserved local title, retained structured introduction and remote unseen field, latest-revision resaving and cancellation. The temporary test route was removed. Journey autosave and real-provider concurrency remain pending.

## Journey autosave

Existing journeys can opt into a three-second idle autosave through the ordinary revision-checked draft save. The title and URL must be valid; incomplete editorial content remains a draft and still requires publication validation. New journeys need a manual first save. The pending timer is tied to account/site/view, record/revision, local-history epoch, field/collection edits and reconciled payload. Manual saves, newer edits and context changes cancel stale pending work. Account/site/view changes, new drafts and ordinary record loads reset the setting.

During autosave, editing/navigation locks and browser-close protection remains active. Success keeps autosave enabled and resets undo history; failures stop it without retry loops and leave the unsaved draft open. Conflicts stop it and open the existing comparison flow. Autosave preserves structured content and cannot publish, approve or submit revisions.

Verification: 14 targeted journey/history/conflict tests and TypeScript passed. Browser checks through CmsWorkspace with mocked local auth/API verified debounce, structured-content preservation, invalid-title waiting, cancellation by manual save, offline failure/no retry loop, re-enabling, conflict pause and new-record exclusion. The temporary route was removed. Provider persistence/concurrency and independent client acceptance are still required.
