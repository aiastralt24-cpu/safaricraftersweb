# Private rendered previews

`/cms/preview/[id]` is a signed-in viewer for the recipient-bound, revision-pinned preview service. The route contains a preview identifier, never a bearer token. It restores the existing CMS login session, requests the private no-store preview endpoint, validates the response identity and expiry, and renders page/homepage composition through the existing preview renderer. Other content types explicitly report that rendering is not yet implemented.

Local migration 022 adds website identity to the existing authorized response so private media requests can use the correct site. It retains recipient, creator membership, current record permission, expiry and revocation checks. Image access still requires current media-library permission; a preview does not grant that permission.

The browser rechecks access every 30 seconds, on returning to the tab, and when Refresh is selected. It removes the document when its expiry timer fires or a request fails. Revocation is enforced by the database on the next read; already displayed content is not remotely erased instantaneously. No system can withdraw information already viewed or captured by a recipient.

The page declares noindex/nofollow and no-referrer. Unsupported section families remain explicit placeholders. Regional visibility currently has no region selector; sections requiring a region are not displayed. The renderer is not a final branded public-page renderer.

Validation: 48 PGlite database tests passed, including recipient isolation, revision pinning, expiry, revocation, creator membership removal and scoped website identity. Two response-contract tests passed, including exact expiry boundary and malformed response rejection. TypeScript passed. Browser verification confirmed the real route's unconfigured setup state. Signed-in provider/browser end-to-end behavior is still unverified because staging configuration is absent.

Remaining: editor controls to issue/copy/revoke previews, additional content-type renderers, regional controls, deployed migration and authenticated staging UAT. No preview was issued externally and no remote migration was run.

## Editor preview management

The Pages workspace now offers reviewer search, expiry duration (1–1,440 minutes), creation for the current saved revision, links, refresh and revocation. Unsaved changes disable creation. Links are shown for manual sharing; the CMS sends no email. Local migration 023 provides bounded recipient search (50 per cursor page) and the author's latest 100 active previews for the record. Search returns only member IDs/emails with current record view permission, and requires the caller's current record view permission. Creation independently rechecks recipient authority. Session lists are author-scoped; previously created previews remain pinned when a newer draft is saved.

Validation: 49 database tests and two management API tests passed; TypeScript passed. A temporary synthetic browser fixture exercised reviewer choice, creation, visible saved-revision link and revocation, with no mobile overflow or console errors. The fixture was removed. This is not authenticated provider E2E evidence. Migration 023 and the rest of the backend remain local; no recipients were contacted.
