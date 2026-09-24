# Vercel launch readiness

Implemented locally; production activation is still required. Do not treat a green type check as verified email delivery.

## Enquiries

1. Apply `supabase-enquiries.sql` in the intended Supabase project. This adds submission keys, atomic acceptance plus an email outbox, a rate limit, anonymous funnel events and the booked status. Existing leads remain intact. Back up the database before migration.
2. Set SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, RESEND_API_KEY, ENQUIRY_FROM_EMAIL, ENQUIRY_TO_EMAIL, ADMIN_TOKEN and CRON_SECRET in Vercel. Keep all service keys server-only. Configure and verify the sender domain with Resend. Do not commit credentials.
3. Configure Vercel Firewall rate limiting for POST `/api/enquiry` and `/api/events`. The application limits repeated enquiries per email; this does not replace edge controls against distributed abuse.
4. Schedule GET `/api/cron/enquiries` every five minutes with `Authorization: Bearer <CRON_SECRET>`. Vercel's cron support depends on plan; alternatively use a trusted external scheduler. Do not expose the secret in a URL. Alert on failed scheduled requests and missed runs in the chosen monitoring service.
5. `/admin/operations` shows missing configuration, unsent mail and exhausted retries. Delivery retries have a five-minute lease, exponential backoff and a ten-attempt limit. Investigate exhausted jobs; retry only after reviewing whether the provider already delivered them. Provider idempotency is time-limited; exactly-once email delivery is not promised.
6. With a controlled recipient, send one enquiry, verify one database row, both outbox records and actual inbox delivery. Simulate email failure in staging: enquiry remains saved, UI succeeds, outbox remains pending; restore provider and retry. Simulate database failure: no acknowledgement/confirmation is sent. Replay identical submission/key: same reference, no extra lead. Different payload with the same key: 409.
7. Protect deployment access and complete Supabase/provider access review. Check RLS is enabled and RPCs are service-role only. No anon client should access lead or outbox tables.

## Content publishing

The public site uses an immutable JSON snapshot imported during build. Live file editing/upload is disabled in production. Git revisions and Vercel deployment rollback retain the last reviewed website.

To use Sanity as the durable editorial source:
- Reconcile the existing dataset with the latest local content before enabling import. The existing seed command can overwrite documents; do not run it blindly against production.
- Set SAFARI_CONTENT_SOURCE=sanity, NEXT_PUBLIC_SANITY_PROJECT_ID, NEXT_PUBLIC_SANITY_DATASET and SANITY_READ_TOKEN (only if the published dataset is private).
- Publish in Studio, then deploy a Vercel preview. `npm run build` imports published documents and rejects invalid/empty core collections. Drafts do not ship. Inspect preview before production promotion. A failed build leaves the prior deployment serving.
- Current importer handles destinations, journeys, expeditions and journal; homepage, specialists, testimonials and shared settings remain versioned in Git. Media URLs currently must be validated local `/assets/` URLs; full remote asset support is a separate migration. Do not promise arbitrary Studio media uploads appear on the website.
- Dates/statuses are edited in the departure array. Deprecated free-text `date` is no longer used by listing/detail date logic. Availability is not live inventory: assign an owner, verify weekly and record availabilityReviewedAt.
- Incomplete departures remain previews. Obtain confirmed group size, price guidance, accommodation, guide, inclusions/exclusions and programme before promoting. Confirm the assumed 2027 year for the three newly supplied dates.
- Date filtering runs dynamically, so expired departures leave promotion without a rebuild. Publishing updated availability still requires a deployment.

## Measurement and contact

Funnel collection stores event, pathname, random 30-minute session identifier and timestamp, without form contents, query strings or IP addresses. It respects Do Not Track and fails independently of enquiry submission. `/admin/operations` displays the last 30 days of events (10,000-row cap); this is not a full attribution or cohort dashboard. Contacted/qualified/booked/closed are updated in the enquiry inbox. Source labels stay with each lead.

Schedule deletion of anonymous events older than 90 days, e.g. `delete from public.safari_funnel_events where created_at < now() - interval '90 days';`. Define a separate business-approved retention policy for contact details. Update privacy/cookie disclosures to match the enabled deployment.

The footer email action opens email directly. Until a verified WhatsApp number is supplied, the chat icon is honestly labelled Contact, not WhatsApp. No response-time promise has been invented.

## Regression and monitoring

Run `npm run test:reliability`, `npm run typecheck`, `npm run check:launch`, `npm run audit:media`, and `npm run audit:content`. The legacy content audit currently reports existing destination completeness gaps; resolve these editorially rather than suppressing them. Run the configured responsive browser suite in CI against a production build.

For production monitoring, check homepage, /plan, /contact, /photo-expeditions and each promoted detail route; assert real page headings, not just HTTP 200. Check key images decode. Use deployment logs/error alerts and scheduler heartbeat monitoring. The operations page is visibility, not a substitute for active alerts.

Not yet verified locally: actual Supabase migration/RPC concurrency, real email delivery, Vercel scheduler, production firewall and CMS dataset reconciliation. Local credentials are absent. No external messages were sent during implementation.

Set NEXT_PUBLIC_FUNNEL_ENABLED=true only after the event migration and retention/privacy review. It defaults off, so missing analytics configuration never generates failed requests during normal local use. Rebuild after changing this public flag.

For a Vercel plan supporting five-minute cron, merge `docs/deployment/vercel-cron.example.json` into the root `vercel.json`. It is deliberately not activated without confirming the plan and credentials. Hobby supports only daily cron; use a supported plan or authenticated external scheduler for reliable retries. References: https://vercel.com/docs/cron-jobs/usage-and-pricing, https://nextjs.org/docs/app/api-reference/functions/after, https://resend.com/changelog/idempotency-keys.
