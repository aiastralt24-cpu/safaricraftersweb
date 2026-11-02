# Settings draft recovery

Global settings now reuse bounded session undo/redo for complete unsaved settings snapshots, including structured and message editors. Each history change marks the draft dirty and invalidates impact review and acknowledgement. Loading another locale/revision or saving clears history. History actions respect current edit and busy state.

Production-build Chromium with mocked auth/API verified undo/redo, removal of an acknowledged save action after undo, no restoration of approval after redo, a fresh required impact review/acknowledgement, and save history reset. Shared draft-history tests, TypeScript and production build pass. No runtime page errors occurred.

Remaining: recovery across browser close and hosted acceptance. Any settings autosave must preserve the existing explicit impact review/acknowledgement requirement.

## Settings conflict recovery

Both impact-review and save revision conflicts now open comparison without discarding unsaved settings. Latest identity, locale, edit access, revision and schema are checked. Whole top-level groups are compared; independent remote groups are retained and overlapping groups require an explicit decision. Applying choices adopts the latest revision and configuration permission, resets history and requires a new impact review/acknowledgement. Cancel also invalidates old impact approval. No automatic save or publication occurs.

Local production-build browser checks with mocked auth/API cover conflicts during both review and save, explicit brand-group choice, independent remote contact changes, mandatory renewed impact acknowledgement and saving against the latest revision. All 1,345 CMS tests, TypeScript and production build pass. Real provider concurrency remains unverified.
