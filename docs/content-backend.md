# Safari Crafters content backend

The production editorial backend is Sanity Studio. The older file-backed admin exists only as a local fallback/reference while Sanity credentials are being added.

## What it edits

- Sanity Studio at `/studio` is the production editing surface for homepage, journeys, destinations, photo expeditions, journal articles, specialists, testimonials, and media fields.
- `content/site-content.json` remains the build-safe fallback until Sanity project credentials and seed data are configured.
- `public/assets/cms/` remains available for local media fallback, but final production media should live in Sanity/CDN or approved asset hosting.
- Destination, journey, expedition, journal, specialist and consented guest records accept an optional editorial video. Supply an MP4, a poster image and an accessible title; WebM, caption and transcript are optional. Empty video fields never create a placeholder on the website.

## Admin access

- Open `/studio` while the Next.js app is running.
- Configure `NEXT_PUBLIC_SANITY_PROJECT_ID` and `NEXT_PUBLIC_SANITY_DATASET`.
- To seed current content, set `SANITY_WRITE_TOKEN` and run `npm run sanity:seed`.

## Production note

The previous file-backed admin is not suitable as the production CMS on Vercel/serverless because local file writes are not durable. Sanity is the chosen production CMS and should become the source of truth after seeding and editorial review.

## Enquiry delivery

The enquiry API requires `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`, `ENQUIRY_FROM_EMAIL`, and `ENQUIRY_TO_EMAIL`. Until all five are configured, the API deliberately returns a service-unavailable response instead of appearing to accept an enquiry that cannot be stored or delivered. Copy `.env.example` to the relevant local or hosting environment and use verified sender details.

## Enquiry inbox

- Apply `supabase-enquiries.sql` in Supabase to create or update the enquiry table and indexes.
- Set `ADMIN_TOKEN` to a long, private value in the hosting environment.
- Open `/admin/enquiries`, enter that token, and use the protected inbox to search and review guest briefs.
- The browser receives a 12-hour, HTTP-only admin session cookie containing a one-way digest rather than the admin token itself.
