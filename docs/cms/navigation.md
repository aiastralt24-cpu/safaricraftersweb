# Reusable navigation contract

Navigation version 1 stores a flat, ordered collection of stable item IDs with explicit parent IDs. Sibling order is the item order in the array. Each item has a label/description, group/URL/internal-record target, standard/mega presentation, featured record references and visibility rules for dates/locales/regions. Internal targets carry an expected content type; arbitrary scripts/unsafe URLs are not accepted.

Validation limits a menu to 200 items and four levels, rejects duplicate IDs, missing parents and cycles, and requires end dates after start dates. Pure insert/move/remove operations preserve identity and input immutability; removing a parent deliberately removes its entire subtree. The future UI must make that consequence explicit. Moving a parent under its descendant is rejected. Visibility propagates through ancestors and uses an exclusive end time.

The generic editor API validates navigation trees and requires a null page path. Local migration 021 extends existing reference search/resolution to navigation records under caller RLS so global main/utility/mobile settings can select menus. This does not enable menu publication or resolve internal targets for public delivery.

Verification: 48 database, 13 editor API and three navigation tests passed; TypeScript passed. Coverage includes invalid trees/URLs, sibling order, immutable moves, subtree removal, ancestor visibility and navigation reference permission filtering. No remote migration has run. Visual menu editing, header settings wiring, target dependency verification, mobile/mega-menu rendering and staging integration remain outstanding.

The Menus workspace now supports list/new/load/save, locale on creation, labels/descriptions, group/URL/record targets, same/new-window behavior, hierarchy changes, sibling reorder, hidden ancestors and standard/mega presentation. Internal record selection uses the existing permission-filtered picker. Removing an item explicitly warns that all descendants are removed. Local structural edits permit incomplete destination fields while retaining cycle/depth/identity checks; full save validation remains strict.

Settings now includes separate main, utility and mobile menu assignments through the navigation picker. Assignment changes invalidate settings impact review and use the settings draft workflow. These are references only; no live header cutover occurs.

A synthetic in-memory browser fixture created Main navigation, added Explore and nested Journeys, set /journeys and saved/reloaded the draft successfully. Mobile 390px overflow and console checks passed. Screenshot: /private/tmp/cms-menu-editor-mobile.png. Fixture removed. Menu assignment browser coverage, schedule/audience/featured-content forms, revision restoration UI, live menu rendering and managed staging remain outstanding.
