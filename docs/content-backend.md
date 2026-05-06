# Safari Crafters content backend

The production editorial backend is Sanity Studio. The older file-backed admin exists only as a local fallback/reference while Sanity credentials are being added.

## What it edits

- Sanity Studio at `/studio` is the production editing surface for homepage, journeys, destinations, photo expeditions, journal articles, specialists, testimonials, and media fields.
- `content/site-content.json` remains the build-safe fallback until Sanity project credentials and seed data are configured.
- `public/assets/cms/` remains available for local media fallback, but final production media should live in Sanity/CDN or approved asset hosting.

## Admin access

- Open `/studio` while the Next.js app is running.
- Configure `NEXT_PUBLIC_SANITY_PROJECT_ID` and `NEXT_PUBLIC_SANITY_DATASET`.
- To seed current content, set `SANITY_WRITE_TOKEN` and run `npm run sanity:seed`.

## Production note

The previous file-backed admin is not suitable as the production CMS on Vercel/serverless because local file writes are not durable. Sanity is the chosen production CMS and should become the source of truth after seeding and editorial review.
