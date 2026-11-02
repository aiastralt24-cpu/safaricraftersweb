# Menu draft recovery

Menu editing now uses shared bounded undo/redo snapshots for the complete navigation tree, title and locale. Subtree deletion is reversible as a whole. New/load/save resets history. Busy state and editing permissions prevent history changes.

A save conflict fetches and validates the newer menu identity, locale, revision, payload and edit access. The local tree stays intact. Concurrent item changes require an explicit whole-tree choice; independent title changes can be retained. Applying choices only changes the local draft and adopts the latest expected revision. A subsequent explicit save creates the new draft; publication remains separate. Invalid reconciliation leaves comparison open.

Targeted history/conflict tests, TypeScript and production build pass. The production-build Chromium fixture verified nested deletion undo/redo, save reset, required whole-tree choice, independent remote-title retention and saving against the latest revision. Authentication and APIs were mocked; no runtime page errors occurred.

Browser recovery controls are now connected; see browser-draft-recovery.md. Hosted concurrent edits and client acceptance remain pending.

## Opt-in menu autosave

Saved menus can opt into a three-second debounce using the exact draft/revision signature. Invalid item structures or locale values pause saving. Manual saves, changes and unmount cancel pending timers. Failures disable autosave and preserve the tree; conflicts disable it and open comparison. New menus need one manual save, and loading/creating a different menu resets the opt-in. Successful autosave creates a draft only.

Production-build Chromium checks with mocked auth/API passed successful autosave, an empty-label pause, manual-save timer cancellation, unavailable-save preservation, explicit retry and conflict stopping repeated attempts. All 1,341 local CMS tests, TypeScript and production build pass. No hosted acceptance is claimed.
