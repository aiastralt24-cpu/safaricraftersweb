import { destinations, journeys, specialists } from "@/lib/data";

export function GET() {
  const destinationLinks = destinations.map((item) => `- [${item.title}](https://safaricrafters.com/destinations/${item.slug}): ${item.country}; ${item.bestMonths}; ${item.wildlife}`).join("\n");
  const journeyLinks = journeys.map((item) => `- [${item.title}](https://safaricrafters.com/journeys/${item.slug}): ${item.duration}; ${item.region}; ${item.bestMonths}`).join("\n");
  const specialistLines = specialists.map((item) => `- ${item.name}, ${item.role}: ${item.expertise}`).join("\n");

  return new Response(
    `# Safari Crafters

> Safari Crafters creates private, photography-led safari journeys across India, Africa and selected wild places. Routes are shaped by named specialists around season, access, ethical wildlife viewing, guest pace and lodge character.

## Canonical sections
- [Private journey blueprints](https://safaricrafters.com/journeys)
- [Safari destination atlas](https://safaricrafters.com/destinations)
- [Guest notes](https://safaricrafters.com/reviews)
- [Photo expeditions](https://safaricrafters.com/photo-expeditions)
- [Conservation commitment](https://safaricrafters.com/conservation-commitment)
- [Begin a private brief](https://safaricrafters.com/plan)

## Specialists
${specialistLines}

## Destinations
${destinationLinks}

## Journey blueprints
${journeyLinks}

## Editorial policy
Wildlife sightings are never guaranteed. Seasonal, access and transfer information is planning guidance and should be reconfirmed for a specific departure. Guest notes are published only with consent; the site does not publish fabricated ratings or aggregate scores.
`,
    { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=3600" } }
  );
}
