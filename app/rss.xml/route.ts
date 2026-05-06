import { journal } from "@/lib/data";

export function GET() {
  const items = journal
    .map(
      (article) => `<item>
  <title><![CDATA[${article.title}]]></title>
  <link>https://safaricrafters.com/journal/${article.slug}</link>
  <description><![CDATA[${article.description}]]></description>
</item>`
    )
    .join("");

  return new Response(
    `<?xml version="1.0" encoding="UTF-8" ?>
<rss version="2.0">
<channel>
  <title>Safari Crafters Journal</title>
  <link>https://safaricrafters.com/journal</link>
  <description>Field notes, photography and conservation from Safari Crafters.</description>
  ${items}
</channel>
</rss>`,
    { headers: { "Content-Type": "application/rss+xml" } }
  );
}
