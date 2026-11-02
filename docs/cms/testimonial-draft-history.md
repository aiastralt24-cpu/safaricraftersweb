# Testimonial draft history

The testimonial editor uses the shared bounded draft-history hook for complete unsaved payload and locale snapshots. Quote, attribution, consent, anonymity, verification and image changes use the same history. New/load/save transitions reset the history scope; permissions and busy state disable history actions. This is in-session recovery, not browser-close persistence or publication rollback.

Production-build Chromium checks with mocked auth/API verified quote, consent, anonymity and locale undo/redo, branching edit invalidation, successful save reset and subsequent edit undo. Mobile rendering was inspected. The first test runs used unsuitable label locators; corrected editor selectors passed with no runtime page errors. Shared history tests, TypeScript and production build pass.

Still pending: browser-close recovery and real provider/client acceptance.

## Save conflict comparison

A 409 save response now fetches the latest record and validates identity, locale, revision, payload and edit permission before comparison. The unsaved testimonial remains intact. Each top-level field is compared against the originally loaded revision; independent changes are retained, overlapping changes require explicit choices, and consent status/evidence remain one indivisible object. Applying choices updates only the local draft, resets session history and binds the next save to the latest revision. Invalid resolutions leave comparison open.

Five targeted conflict tests, TypeScript and production build pass. A production-build browser test with mocked auth/API verified preserved unsaved quote, mandatory overlap choice, retention of an independent remote city edit, no write on apply, and a subsequent save using the latest expected revision. No browser runtime errors occurred. Real provider concurrency remains unverified.

## Opt-in autosave

Existing testimonial drafts can opt into saving after a three-second pause. Invalid schema/locale values, migration work, permission restrictions, conflicts and other active work prevent saving. The timer is bound to the exact draft/revision signature and is cancelled by changes, manual save or unmount. A failed attempt disables autosave and preserves the draft. Revision conflicts disable autosave and open the existing comparison screen. New testimonials require an initial manual save; loading or creating another record resets the opt-in. Autosave never publishes.

The production-build browser test with mocked auth/API passed successful autosave, invalid quote pause, manual-save timer cancellation and conflict stopping repeated attempts. All 1,339 local CMS tests, TypeScript and production build pass. Hosted concurrency and client acceptance remain unverified.
