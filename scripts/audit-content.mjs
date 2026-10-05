import content from "../content/site-content.json" with { type: "json" };

const errors = [];
const seen = new Set();
const uniqueValues = new Map();

function requireUniqueValue(kind, slug, field, value) {
  if (!value) {
    errors.push(`${kind}/${slug}: missing ${field}`);
    return;
  }
  const key = `${kind}:${field}:${value.trim().toLowerCase()}`;
  const previous = uniqueValues.get(key);
  if (previous) errors.push(`${kind}/${slug}: duplicate ${field} also used by ${previous}`);
  uniqueValues.set(key, `${kind}/${slug}`);
}

function requireUnique(items, kind) {
  for (const item of items) {
    const key = `${kind}:${item.slug}`;
    if (!item.slug || seen.has(key)) errors.push(`${kind}: missing or duplicate slug ${item.slug || "(empty)"}`);
    seen.add(key);
    for (const field of ["title", "description", "image"]) {
      if (!item[field]) errors.push(`${kind}/${item.slug}: missing ${field}`);
    }
    if (!item.image?.alt) errors.push(`${kind}/${item.slug}: missing image alt text`);
  }
}

requireUnique(content.destinations, "destination");
requireUnique(content.journeys, "journey");

for (const destination of content.destinations) {
  if (destination.status !== "rich") errors.push(`destination/${destination.slug}: must be a researched rich guide`);
  for (const field of ["country", "continent", "region", "bestMonths", "wildlife", "photography", "planningNote", "bestFor"]) {
    if (!destination[field] || (Array.isArray(destination[field]) && !destination[field].length)) {
      errors.push(`destination/${destination.slug}: missing ${field}`);
    }
  }
  for (const field of ["habitat", "idealStay", "gateway", "access", "safariRhythm", "faqs", "sources"]) {
    if (!destination[field] || (Array.isArray(destination[field]) && !destination[field].length)) {
      errors.push(`destination/${destination.slug}: rich guide missing ${field}`);
    }
  }
  if (destination.faqs?.length < 5) errors.push(`destination/${destination.slug}: needs at least 5 visible questions`);
  for (const source of destination.sources || []) {
    if (!source.url?.startsWith("https://") || !source.publisher || !source.accessedAt) {
      errors.push(`destination/${destination.slug}: incomplete research source`);
    }
  }
  if (!destination.seo?.reviewedAt) errors.push(`destination/${destination.slug}: missing SEO review date`);
  requireUniqueValue("destination", destination.slug, "description", destination.description);
  requireUniqueValue("destination", destination.slug, "SEO title", destination.seo?.title);
  requireUniqueValue("destination", destination.slug, "SEO description", destination.seo?.description);
}

for (const journey of content.journeys) {
  for (const field of ["category", "region", "duration", "bestMonths", "destinations", "specialist"]) {
    if (!journey[field] || (Array.isArray(journey[field]) && !journey[field].length)) {
      errors.push(`journey/${journey.slug}: missing ${field}`);
    }
  }
}

if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}

console.log(`Content audit passed: ${content.destinations.length} destinations, ${content.journeys.length} journeys, ${content.testimonials.length} guest notes.`);
