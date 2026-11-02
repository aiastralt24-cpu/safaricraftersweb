# Client password recovery

The CMS sign-in form links to `/cms/recover`. The page uses the existing public provider configuration; missing configuration shows an unavailable state. It requests a recovery email through Supabase Auth, gives the same success message whether an account exists, and never displays raw provider errors.

The callback is fixed to the current origin at `/cms/recover`; there is no user-controlled return URL. HTTPS is required except for local fixture hosts. The provider must allowlist this exact staging/production URL. Keep the provider's standard recovery email link configured to respect the requested redirect. Provider rate limits, email deliverability and any configured Auth CAPTCHA must be exercised on staging before client release; CAPTCHA-enabled projects need their challenge integration connected first.

The dedicated client uses PKCE with a separate storage key. Only its code verifier persists locally. Recovery access/refresh tokens remain in memory and do not overwrite the CMS editor session. Open the newest email in the same browser and device that requested it. Starting another recovery request replaces the prior verifier. Reloading after exchanging the one-use code loses the recovery session and requires a fresh link; this is explained by the request path rather than restoring a persistent privileged session.

The callback strips query/fragment data from browser history before exchange and rejects extra parameters, duplicate/malformed codes and implicit-token fragments. The password form appears only after a successful code exchange and the provider SDK's PASSWORD_RECOVERY event. Link failures reveal no provider details. Passwords must match exactly and contain 12–128 characters, subject to additional provider policy. Inputs clear after an update attempt; successful updates return the user to ordinary CMS sign-in. Recovery changes no CMS membership, roles, content or publication permissions.

## Local verification and rollout

`node --experimental-strip-types --test tests/cms-password-recovery.test.mjs tests/cms-browser-config.test.mjs` checks bounded callback parsing, origins, password matching and token-storage isolation.

For browser acceptance, start the production build locally with `CMS_SUPABASE_URL=https://cms-fixture.test CMS_SUPABASE_ANON_KEY=sb_publishable_fixtureonly000000 npm run start -- --port 3002 --hostname localhost`, then run `node scripts/check-cms-password-recovery.mjs`. The script intercepts Auth requests and sends no real email. It exercises request → PKCE exchange → password confirmation → rejected update → successful update → reload, plus expired links and rejected redirect parameters, at 1280px and 390px.

These tests do not prove real provider email delivery, redirect configuration, rate limiting, account recovery or session revocation. Record those results with real approved test accounts on staging. Invitations and privileged MFA remain separate unfinished R24 requirements.

Implementation references: [Supabase recovery API](https://supabase.com/docs/reference/javascript/auth-resetpasswordforemail) and [PKCE flow](https://supabase.com/docs/guides/auth/sessions/pkce-flow), checked 28 October 2026, plus the installed Auth SDK source.

Local result, 28 October 2026: all 1,427 CMS tests passed without skips; production build passed. Chromium fixture passed at both widths, including real navigation from the sign-in link. Browser plugin unavailable; regular Playwright used. Screenshots: `/private/tmp/cms-password-recovery-1280.png` and `/private/tmp/cms-password-recovery-390.png`. No hosted acceptance or real email delivery is claimed.
