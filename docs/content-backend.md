# Safari Crafters content backend

The production editorial backend is Sanity Studio. The older file-backed admin exists only as a local fallback/reference while Sanity credentials are being added.

## What it edits

- Sanity Studio at `/studio` is the production editing surface for homepage, journeys, destinations, photo expeditions, journal articles, specialists, testimonials, and media fields.
- `content/site-content.json` remains the build-safe fallback until Sanity project credentials and seed data are configured.
- `public/assets/cms/` remains available for local media fallback, but final production media should live in Sanity/CDN or approved asset hosting.
- Destination, journey, expedition, journal, specialist and consented guest records accept an optional editorial video. Supply an MP4, a poster image and an accessible title; WebM, caption and transcript are optional. Empty video fields never create a placeholder on the website.

## Admin access

- Use Node.js 22.12 or newer and run `npm install` to install Sanity and the website dependencies.
- Open `/studio` while the Next.js app is running.
- Configure `NEXT_PUBLIC_SANITY_PROJECT_ID` and `NEXT_PUBLIC_SANITY_DATASET`.
- For the standalone Studio, run `npm run studio` and open the local URL printed by Sanity. It uses the same public project settings from `.env.local`.
- Sign in with a Sanity account that has access to the configured project. If Sanity requests a CORS origin, add the local origin in the project's API settings with credentials allowed.
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

## Editorial workflow

The Studio now groups each document into **Story**, **Trip planning**, **Images and film**, and **Search and fact checks**. Homepage is a singleton. Lower display-order numbers appear first; existing collection order is retained when no number is set.

- Destinations: geography, traveller fit, access, habitats, wildlife, season, field notes, FAQs, related journeys, gallery and page-hero override.
- Journeys: day labels and itinerary, group size, difficulty, price guidance, accommodation, inclusions/exclusions, related destinations, FAQs and sources.
- Photography tours: programme, departure dates, availability, equipment, pricing, cancellation policy, hero copy, FAQs and sharing metadata. New records remain previews until booking details are confirmed.
- Journal: complete paragraphs, pull quote, reading time, author, date, gallery and search/social metadata.
- Homepage: title, supporting copy, rotating headline lines, image/video and search/social metadata. Existing composition remains the fallback when no homepage snapshot exists.
- Specialists and guest notes now participate in CMS imports. Guest notes must have both verified wording and recorded publication consent; withdrawing either removes the note on the next import. Anonymous notes do not export the guest's name.
- Upload images directly in an image field. Alt text is required. An upload takes precedence over a legacy URL. Sanity CDN images are supported; unrelated remote image hosts fail validation. A hotspot supplies the focal point unless explicitly overridden.

### Review and publish

1. Review draft additions in Studio. `docs/cms-draft-enrichment.md` lists additions from existing website copy; `docs/cms-array-repairs.md` records repaired array keys. These are editorial drafts, not new independent research or confirmation of current travel conditions.
2. Run `npm run cms:check-drafts` to check the combined draft/published preview without changing content. This does not preview the website visually.
3. Confirm factual claims, dates, prices, availability and consent; publish approved documents in Studio.
4. Run `npm run cms:check`. This checks only published documents, reports invalid records and leaves the local website snapshot untouched.
5. After all published content passes, build with `SAFARI_CONTENT_SOURCE=sanity npm run build` and deploy the resulting site through the normal deployment workflow. The import is atomic and rejects missing core collections, duplicate slugs, unsupported images, malformed arrays and incomplete advertised tours.

Publishing a Sanity document alone does **not** update this website. The site deliberately reads a build-time snapshot. This change does not enable automatic deployment or alter that source setting. Drafts are never imported by the production build.

The dedicated country/region compositions, store, legal pages and other bespoke marketing sections still have code-owned copy. This upgrade covers the existing CMS content models and their connected pages; it does not convert every marketing layout into a page builder.

`npm run cms:drafts` is a dry run. `npm run cms:drafts -- --apply` adds missing fields from the website snapshot to drafts, preserves existing field values and uses revision checks when repairing draft array keys. It excludes inferred prices, departures and testimonial permissions. `npm run sanity:seed` now creates only missing documents; it cannot replace existing editorial work.

Checks: `npm run test:cms`, `npm run test:reliability`, `npm run typecheck`, and `npx sanity build /tmp/safari-studio-check`.
