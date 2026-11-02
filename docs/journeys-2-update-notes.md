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

## Photo coverage still to source

- Small Cats: verified imagery currently covers Velavadar. Obtain location-confirmed fishing cat photographs from Kolkata, rusty-spotted cat photographs from Jawai and desert cat photographs from Desert National Park.
- Desert Dune Lions: obtain verified Desert National Park photographs. Current images cover the other named wildlife stops.
- Terrific Terai: obtain verified Pilibhit photographs. Its previous destination fallback used a Ranthambhore photograph, which was excluded from this journey.
- Uttarakhand: obtain verified Chopta photographs. Corbett, Rajaji and Sattal/Pangot are represented.
- Ladakh: obtain a verified Hanle Pallas’ cat photograph. Existing Ladakh landscape photographs retain regional captions instead of unverified lake/valley names.
- Royal Rajasthan: Jaipur, Ranthambhore and Agra are represented.

No generated images or geographically unrelated substitutes were added. No unrelated destination records were changed to fill photo gaps.

## Editorial normalization

- Corrected the source's “Days 2” to “Day 2” in Terrific Terai.
- Corrected “four contrasting habitats” to “five contrasting habitats” in Desert Dune Lions, matching the five named wildlife stops.
- Royal Rajasthan uses the document's gentle-to-moderate cultural/safari description in place of the contradictory generic trekking difficulty line.
- Preserved source inclusions/exclusions and request-based pricing qualifiers; removed document editing instructions from public copy.
- The importer preserves both source introduction and destination chapters. FAQs with question and answer in one Word paragraph are separated correctly.

## Verification

All six routes returned HTTP 200 with the selected hero and updated title. Every itinerary day is covered exactly once. All chosen assets exist and were visually inspected. TypeScript type checking passed. The expanded journey listing contains all six added links. Ladakh itinerary expansion and gallery lightbox were exercised in the browser.

Local changes only; no deployment performed.
