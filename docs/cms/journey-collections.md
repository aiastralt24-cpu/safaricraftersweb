# Journey itinerary and FAQ editing

The journey draft editor now supports adding, editing, reordering and removing itinerary and FAQ entries. Collection changes join the existing explicit Save draft workflow; editing does not publish content.

Entries retain stable item IDs across edits and moves, so later Word or Excel imports target the same entries. New entries receive UUIDs. Reordering produces contiguous positions and preserves unknown entry fields. Malformed existing collections block editing instead of silently discarding content. Removal requires confirmation; unsaved changes use the workspace navigation guard.

Field labels and word guidance come from the import template contract. Guidance does not truncate text. The existing 50,000-character field and 500-entry collection safety limits apply. Revision changes reset editor error state.

## Verification

- Eight workspace tests passed, including four collection tests covering stable IDs, preservation, ordering, malformed inputs and import compatibility after reordering.
- TypeScript checked after integration.
- An isolated synthetic FAQ browser fixture verified adding, moving, editing and live word counts. At 390px the document had no horizontal overflow; no console warnings or errors were captured. The fixture was removed after testing.
- Browser evidence: `/private/tmp/cms-collections-mobile.png`.

Authenticated save/reload against managed staging is still unverified. Media selection and complete page composition remain separate work. These checks do not establish full CMS or client UAT completion.
