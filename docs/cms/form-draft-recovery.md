# Form draft recovery

The forms workspace uses bounded session undo/redo for the entire form definition and locale. Field deletion and conditional/consent settings are restored together. New/load/save resets history; permissions, migration and busy state prevent edits. Loading now checks the requested record identity, form type and null path before accepting its payload.

Save conflicts preserve the local draft, validate the newer record and require explicit decisions for overlapping changes. The fields array is indivisible, retaining conditions and consent text/version pairs. Optional success-heading and redirect fields participate even when originally absent. Applying choices only updates the local draft; the next save uses the latest revision. Invalid choices leave comparison open.

Focused tests cover consent version preservation, independent remote fields and rejected identity/access/invalid conditions. TypeScript and production build pass. Production-build Chromium with mocked authentication/API verified field undo/redo, deletion recovery, save reset, required whole-field choice, independent remote title retention and latest-revision resave. No page errors occurred.

Remaining: browser-close recovery and hosted concurrency/client acceptance.

## Opt-in form autosave

Saved forms can enable a three-second debounce bound to the exact draft and revision. Existing schema checks pause invalid fields, conditional dependencies, consent settings and locale values. Migration, conflicts and other active work block autosave. Manual saves and unmount cancel pending timers. Failures disable autosave and retain the draft; conflicts disable it and open comparison. New forms need a manual save first, and loading/creating another form resets the opt-in.

Production-build Chromium with mocked auth/API passed successful autosave, invalid-field pause, manual-save timer cancellation, failed-save preservation, explicit retry and conflict stopping repeated attempts. All 1,343 local CMS tests, TypeScript and production build pass. Hosted acceptance remains unverified.
