# Document draft recovery

Documents use bounded session undo/redo for metadata and selected file references, plus the exact regions textarea input. This preserves unfinished whitespace/newlines independently of normalized region values. History does not upload, delete or alter file rights. Undo/redo controls are disabled while file-rights edits are pending; selection still uses the existing eligibility checks. New/load/save resets history.

Production-build Chromium with mocked auth/API verified metadata/date undo, exact regions text recovery, redo invalidation, normalized region save and history reset. The initial region-label locator was replaced with the editor textarea selector; the same state assertions passed. Shared history tests, TypeScript and production build pass. No runtime page errors occurred.

Remaining: browser-close recovery, provider-backed file selection/rights and client acceptance.

## Document conflict comparison

A conflicting save fetches and validates the newer record while preserving the local metadata. Identity, locale, payload language, revision and editing permission must match. File reference and download filename are one choice; optional dates participate even when absent in the original. Independent metadata changes are retained. Applying choices validates the combined dates/settings, updates the expected revision and normalizes the displayed region list without saving or publishing. File eligibility remains a separate existing check.

Focused tests verify whole-file decisions and rejected identities/languages/access. TypeScript and production build pass. Production-build Chromium with mocked auth/API verifies preserved local title, required overlap choice, independent remote description, no write on apply and latest-revision resave. No runtime page errors occurred. Real provider file and concurrency acceptance remain unverified.

## Opt-in document autosave

Saved documents can enable a three-second debounce bound to the exact metadata/revision and regions text. Invalid schema, language mismatch, pending file-rights changes, conflicts or other active operations pause saving. Manual save and unmount cancel the timer. Failures disable autosave while retaining the draft; conflicts open comparison. New documents need an initial manual save, and loading/creating another document resets the opt-in. Saving does not upload a file, change file rights or publish.

Production-build Chromium with mocked auth/API verified successful autosave, invalid metadata pause, manual-save cancellation, failed-save preservation, explicit restart and conflict stopping repeated attempts. All 1,347 local CMS tests, TypeScript and production build pass. Live file-rights integration and provider acceptance remain unverified.
