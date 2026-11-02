// Run after starting the local CMS fixture server. No real provider writes.
await import('./cms-recovery-fixtures/cms-new-pages-journey-ui.mjs');
await import('./cms-recovery-fixtures/cms-initial-settings-recovery-ui.mjs');
await import('./cms-recovery-fixtures/cms-new-document-recovery-ui.mjs');
await import('./cms-recovery-fixtures/cms-new-routed-recovery-ui.mjs');
await import('./cms-recovery-fixtures/cms-new-profile-menu-recovery-ui.mjs');
