# Authenticator setup and verification

Signed-in clients can open **Account security** from the CMS rail. Navigation respects the existing unsaved-content guard. `/cms/security` restores the ordinary editor session using the existing Auth storage key; it does not accept session tokens from URL parameters. Without a session it offers the ordinary sign-in path.

The panel lists provider factors and current assurance level, adds a named TOTP authenticator, shows the provider QR image and manual setup key, and verifies a six-digit code. Setup keys remain in component memory and disappear on success, account changes or navigation. No raw SVG is inserted into the DOM; the QR is an image data URL. The provider remains responsible for challenge validation, attempt limits and authentication. Each action checks the current user before issuing a request, serializes local actions and ignores results belonging to an earlier account.

Removal requires a separate confirmation. Verified-factor removal is available only when the session reports AAL2, with the provider independently enforcing its own rules. The panel refreshes the session after removal to refresh the displayed assurance level. Removing a last factor warns about losing access wherever MFA is required. Pending enrollments can be reloaded and explicitly removed after an uncertain outcome. No factor is silently removed on page unload.

## Evidence

Production build and all 1,427 CMS tests pass. `scripts/check-cms-account-security.mjs` runs against a local production server with mocked Auth traffic. At 1280px and 390px it verifies anonymous gating, enrollment, actual QR image loading, setup-secret nonpersistence, invalid code handling, successful verification, secret clearing, cancelled/confirmed removal and refreshed assurance. Screenshots are `/private/tmp/cms-account-setup-{1280,390}.png` and `/private/tmp/cms-account-security-{1280,390}.png`. Browser plugin unavailable; regular Playwright used. These are UI/provider-contract tests, not real authenticator or managed-provider acceptance.

## Still required for enforced MFA

This panel is not an authorization gate. Current CMS permissions remain unchanged. Complete all of the following before claiming privileged MFA:

- Define and implement the website policy for privileged actions, including content approval/publication, access administration, configuration, exports/deletion and lead-specific permissions.
- Require trusted provider AAL evidence in applicable database/API paths; never treat browser display or a client-supplied flag as authorization. Audit direct permission helpers as well as generic `cms.can`.
- Connect the post-password challenge and initial enrollment path so ordinary users can satisfy the policy before a privileged action.
- Preserve scheduled execution using an explicit trusted-worker authorization boundary. Do not impersonate a human AAL2 session for background work or accidentally block all scheduled jobs through a generic permission change.
- Cover role changes, factor removal, stale tokens, recovery, missing/unavailable factors and account revocation, then verify with the actual provider and approved test accounts.
- Establish operator-assisted lost-device recovery and client instructions. Invitations remain separate work.

Reference: [Supabase MFA guide](https://supabase.com/docs/guides/auth/auth-mfa), checked 28 October 2026, and installed Auth SDK enrollment/verification implementation.

## Privileged database policy — migration 219

The backend policy is now implemented locally; the activation and post-sign-in client controls remain unfinished. No provider policy is enabled by this migration. `get_mfa_policy` is available only to active website members. `set_mfa_policy` requires both an AAL2 session and explicit access-administration permission, including when disabling the policy. Expected-version checks prevent stale updates; changes are audited. Browser roles cannot modify the policy table or invoke its private helper directly.

When enabled, the generic permission helper requires MFA for approve, publish, configure, export and delete. Access administration uses the same configure gate independently of generic content permissions. Lead-specific permissions require MFA for every action except view. Ordinary content draft creation/editing/submission retain their existing role permissions. AAL2 never grants a permission or membership that the user lacks. Claims must come from the authenticated provider gateway; the gate also binds the AAL claim to the current subject and fails closed for missing/malformed claims.

Background publication uses the real database `service_role`, not a caller-provided JWT role label, as its narrow MFA exception. Existing scheduled-publication and group-release functions still verify the lease, current actor membership/permissions, approved revision, validation and publication dependencies. No synthetic human AAL2 claim is introduced. Enabling the policy blocks pending/running schedules created before activation, clearing their leases so old workers cannot execute them. Editors must review and schedule them again under the new policy. Schedule creation takes the website lock used by policy activation to serialize that boundary. Delivery of already-published content is unchanged.

Local SQL tests verify AAL1 denial and AAL2 acceptance, access/lead guards, unchanged ordinary editor access, missing/foreign identity, malformed claims, stale policy updates, unauthorized disabling/direct table/helper access, forged service-role claims, invalidated leases, new single/group schedule execution and revoked publisher rejection. The full suite passed 1,430 tests with no skips; the final helper-grant restriction is additionally checked by the database suite. Offline migration planning includes 219 files against a synthetic empty ledger only.

Remaining: authenticated policy-status/activation UI with explicit impact review, post-sign-in challenge/enrollment guidance, actual provider JWT/RLS behavior, managed concurrency, factor-removal/stale-token semantics, lost-device recovery and client acceptance. Provider-issued tokens may retain their prior AAL until refresh/expiry; this is not instantaneous factor-revocation enforcement. The panel refreshes after removal, but hosted acceptance must establish and document the actual revocation boundary. Do not enable the policy for clients before they have a working MFA and recovery path.

## Workspace policy controls — migration 220

The workspace now reads the selected website's policy using the caller's token. Migration 220 includes the current access-management capability in that read. The client validates site identity and the complete response; the server validates exact version/required-state changes and never trusts caller-supplied assurance or permission fields. The endpoint rejects extra fields, cross-origin calls, unexpected query parameters and malformed/contradictory provider results. Responses are private/no-store.

For a required policy without a verified second factor, the workspace explains which actions require verification and links to Account security through the existing unsaved-change guard. This is guidance for privileged work, not a blanket prohibition on ordinary draft editing. Verified access administrators get an explicit enable/disable review and confirmation. Enabling explains schedule invalidation and the need for working authenticators/recovery. Unconfirmed or stale saves prevent another change until a fresh policy read reconciles the state. Actor, website and token changes remount the panel so earlier reads cannot supply a new session's state.

Local verification: all 1,433 CMS tests and production build pass. `scripts/check-cms-mfa-policy.mjs` verifies review/cancel, lost-response reconciliation without duplicate writes, stale-version refusal, explicit disable, permission-aware controls and navigation to verification at 1280px and 390px using mocked Auth/API responses. No real policy is changed by these tests. Offline planning includes migration 220; no provider migration has run.

Remaining: actual provider activation and approved-account tests, privileged operations after verification and factor removal, cross-tab/provider concurrency, lost-device recovery, enrollment guidance for new invitees and client acceptance. The local policy controls and database tests are not hosted MFA certification.
