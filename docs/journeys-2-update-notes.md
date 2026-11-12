# Journeys-2 content update

Updated six existing journey records from the supplied Word documents on 2 November 2026. Existing URLs are preserved. All twelve updated journeys are included in the public journey collection.

| Journey | Duration | Itinerary stages | Photographs, including hero |
| --- | --- | --- | --- |
| Desert Dune Lions | 16 days | 5 | 8 |
| Small Cats of India | 21 days | 9 | 5 |
| Terrific Terai | 14 days | 9 | 7 |
| Uttarakhand Circuit | 14 days | 5 | 8 |
| Wildlife of Ladakh | 13 days | 5 | 9 |
| Royal Rajasthan Safari | 8 days | 6 | 6 |

Source: `/Users/bunny/Downloads/Journeys-2/`. The unnamed `Safari Crafters Journey – .docx` contains Royal Rajasthan Safari.

Reimport with the bundled Python runtime and `scripts/import-remaining-journey-docs.py`. The script validates continuous day coverage, nonempty itinerary entries and FAQs, and local image availability before writing. It modifies only these six journey records. `content/journey-photo-selections.json` records selected photos and location coverage; it also contains the short editorial headings used on the pages.

## Naming correction — 12 November 2026

Client feedback corrects the source documents’ swapped names: the 8-day Delhi–Jaipur–Ranthambhore–Agra itinerary is **Palaces and Tigers**, and the 15-day Delhi–Ranthambhore–Jaipur–Jaisalmer–Jodhpur–Jawai–Udaipur itinerary is **Royal Rajasthan Safari**. The existing URL names now serve their matching itineraries. Layouts, stage definitions, photo selections and importer mappings follow the corrected names. Delhi is the first visible chapter on both pages, rather than an arrival accordion after the other chapters. The table above records the original import.

Verified both corrected routes locally at desktop (1440px) and mobile (390px): title, duration, Delhi Day 1 expansion, no horizontal overflow, and no browser errors. TypeScript passed. Both itineraries have continuous day coverage, and all 13 experience layouts include every itinerary entry exactly once. No deployment performed.

## Current photo coverage — 12 November 2026

The current page layouts supplement the original selection manifest with licensed Desert National Park, Kolkata wetlands, Jawai habitat, Pilibhit forest and Pangong Tso images. Their provenance is recorded in `content/journey-photo-sources.json`.

Remaining useful additions are location-confirmed fishing-cat, rusty-spotted-cat and desert-cat photographs for Small Cats; a Chopta-specific photograph for Uttarakhand; and a Hanle Pallas’ cat photograph for Ladakh. Regional photographs retain their documented location captions.

## Editorial normalization

- Corrected the source's “Days 2” to “Day 2” in Terrific Terai.
- Corrected “four contrasting habitats” to “five contrasting habitats” in Desert Dune Lions, matching the five named wildlife stops.
- Royal Rajasthan uses the document's gentle-to-moderate cultural/safari description in place of the contradictory generic trekking difficulty line.
- Preserved source inclusions/exclusions and request-based pricing qualifiers; removed document editing instructions from public copy.
- The importer preserves both source introduction and destination chapters. FAQs with question and answer in one Word paragraph are separated correctly.

## Verification

All six routes returned HTTP 200 with the selected hero and updated title. Every itinerary day is covered exactly once. All chosen assets exist and were visually inspected. TypeScript type checking passed. The expanded journey listing contains all six added links. Ladakh itinerary expansion and gallery lightbox were exercised in the browser.

Local changes only; no deployment performed.
