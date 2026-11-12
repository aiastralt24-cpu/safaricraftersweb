import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read = path => JSON.parse(fs.readFileSync(new URL(path, import.meta.url), 'utf8'));
const content = read('../content/site-content.json');
const layouts = read('../content/journey-experience-layouts.json');
const corrections = read('../content/journey-editorial-corrections.json');

test('numbered journeys cover each advertised day exactly once', () => {
  for (const journey of content.journeys) {
    if (journey.itineraryKind === 'stages') {
      assert.ok(journey.days.every(day => day.label.startsWith('Stage ')));
      continue;
    }
    const duration = Number(journey.duration.match(/^\d+/)?.[0]);
    assert.ok(duration, journey.title);
    const days = journey.days.flatMap(day => {
      const numbers = day.label.match(/\d+/g).map(Number);
      return Array.from({length: numbers.at(-1) - numbers[0] + 1}, (_, i) => numbers[0] + i);
    });
    assert.deepEqual(days, Array.from({length: duration}, (_, i) => i + 1), journey.title);
  }
});

test('experience chapters start with arrival and cover every entry in order', () => {
  for (const [slug, layout] of Object.entries(layouts)) {
    const journey = content.journeys.find(j => j.slug === slug);
    const indexes = [...layout.chapters.flatMap(c => c.indexes), ...layout.bookends];
    assert.deepEqual(indexes, journey.days.map((_, i) => i), slug);
    for (const photo of [layout.hero, ...layout.chapters.flatMap(c => c.photos)]) {
      assert.ok(fs.existsSync(new URL('../public' + photo.src, import.meta.url)), photo.src);
    }
  }
});

test('reviewed editorial fields cannot silently drift from importer corrections', () => {
  for (const journey of content.journeys) {
    for (const [field, value] of Object.entries(corrections[journey.slug] || {})) {
      assert.deepEqual(journey[field], value, `${journey.slug}: ${field}`);
    }
    assert.ok(journey.inclusions.length && journey.exclusions.length && journey.faqs.length, journey.title);
    assert.ok(!JSON.stringify(journey).includes('company-owned'), journey.title);
  }
  assert.match(content.journeys.find(j => j.slug === 'royal-rajasthan-safari').duration, /^15 days/);
  assert.match(content.journeys.find(j => j.slug === 'palaces-and-tigers').duration, /^8 days/);
});

test('Pantanal booking details match the supplied 11-day expedition terms', () => {
  const expedition = content.expeditions.find(e => e.slug === 'the-pantanal-wetlands');
  assert.equal(expedition.price, '$6950 per person, double sharing');
  assert.equal(expedition.duration, '11 days / 10 nights');
  assert.equal(expedition.days.length, 8);
  assert.ok(expedition.days.every(day => day.stay && day.meals));
  assert.equal(expedition.days[3].meals, 'Breakfast and Lunch only');
  assert.equal(expedition.days.at(-1).meals, 'Breakfast');
  assert.match(expedition.days.at(-1).copy, /after 6 pm/);
  assert.match(expedition.paymentTerms, /30%.*non-refundable/s);
  assert.match(expedition.paymentTerms, /70%.*75 days/s);
  assert.match(expedition.cancellationPolicy, /61 to 75 days.*30%.*70%/s);
  assert.match(expedition.cancellationPolicy, /60 days or less.*100%/s);
  assert.ok(expedition.exclusions.some(x => x.includes('Campo Grande to Cuiabá')));
});
