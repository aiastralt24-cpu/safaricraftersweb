// Pure conversion shared by the publish command and its regression tests.
export const collections = { destination: 'destinations', journey: 'journeys', photoExpedition: 'expeditions', journalArticle: 'journal', specialist: 'specialists', testimonial: 'testimonials' };
const text = value => typeof value === 'string' && value.trim().length > 0;
const fail = (path, message) => { throw new Error(`${path}: ${message}`); };
const stringArrays = new Set(['highlights','bestFor','journeys','expeditions','destinations','locations','statesOrRegions','inclusions','exclusions','proof','atelier']);
export function normalizeRecord(value, config, path = 'document') {
  if (Array.isArray(value)) return value.map((v, i) => normalizeRecord(v, config, `${path}[${i}]`));
  if (!value || typeof value !== 'object') return value;
  const result = Object.fromEntries(Object.entries(value).filter(([k]) => !k.startsWith('_') && k !== 'upload').map(([k,v]) => [k, normalizeRecord(v, config, `${path}.${k}`)]));
  if (value.upload?.asset?._ref) {
    const match = /^image-([a-zA-Z0-9]+)-(\d+x\d+)-(jpg|jpeg|png|webp|gif|avif)$/.exec(value.upload.asset._ref);
    if (!match) fail(path, 'invalid Sanity image asset');
    result.src = `https://cdn.sanity.io/images/${config.projectId}/${config.dataset}/${match[1]}-${match[2]}.${match[3]}`;
    if (!result.focalPoint && value.upload.hotspot) result.focalPoint = `${value.upload.hotspot.x * 100}% ${value.upload.hotspot.y * 100}%`;
  }
  if ('src' in result || value.upload || /(?:^|\.)(?:image|heroImage|posterImage|mobilePosterImage|socialImage|poster)$/.test(path) || /\.gallery\[\d+\]$/.test(path)) {
    let allowed = typeof result.src === 'string' && /^\/assets\/[\w./%-]+$/.test(result.src) && !result.src.includes('..');
    try { const url = new URL(result.src); allowed ||= url.protocol === 'https:' && url.hostname === 'cdn.sanity.io' && url.pathname.startsWith(`/images/${config.projectId}/${config.dataset}/`); } catch {}
    if (!allowed) fail(path, 'use a local /assets/ image or an image uploaded to this Sanity project');
    if (!text(result.alt)) fail(path, 'image alt text is required');
    result.credit ||= '';
  }
  for (const [key, val] of Object.entries(result)) {
    if (stringArrays.has(key) && (!Array.isArray(val) || val.some(v => !text(v)))) fail(`${path}.${key}`, 'must be an array of non-empty text values');
    if (['gallery','days','faqs','departures','sources','pairings','heroLines'].includes(key) && !Array.isArray(val)) fail(`${path}.${key}`, 'must be an array');
  }
  for (const faq of result.faqs || []) if (!text(faq.question) || !text(faq.answer)) fail(path, 'each FAQ needs a question and answer');
  for (const day of result.days || []) if (!text(day.title) || !text(day.copy)) fail(path, 'each itinerary day needs a title and copy');
  for (const line of result.heroLines || []) if (!text(line.lead) || !text(line.accent)) fail(path, 'each hero headline needs a lead and accent');
  if (result.heroLines && !result.heroLines.length) delete result.heroLines;
  return result;
}
const required = {
  destination: ['title','description','intro','country','continent','region','bestMonths','wildlife','photography'],
  journey: ['title','description','intro','category','region','duration','groupSize','bestMonths','difficulty','price','specialist'],
  photoExpedition: ['title','description','intro','category','mentor'],
  journalArticle: ['title','description','category','author','date','readTime'],
  specialist: ['name','role','bio'], testimonial: ['name','trip','quote'], homepage: ['title','copy']
};
export function createSnapshot(baseline, documents, config) {
  const next = structuredClone(baseline);
  const published = documents.filter(doc => !doc._id?.startsWith('drafts.') && !doc._id?.startsWith('versions.'));
  const report = [];
  const errors = [];
  for (const [type, key] of Object.entries(collections)) {
    const records = published.filter(d => d._type === type);
    if (!records.length && type !== 'testimonial') errors.push(`${type}: no published records; refusing to replace a collection with nothing`);
    const seen = new Set();
    const previousOrder = new Map((baseline[key] || []).map((item, index) => [item.slug || item.name, index]));
    next[key] = records.map(doc => {
      try {
      const item = normalizeRecord(doc, config, doc._id);
      if (type !== 'specialist' && type !== 'testimonial') {
        item.slug = typeof item.slug === 'string' ? item.slug : item.slug?.current;
        if (!text(item.slug) || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(item.slug) || seen.has(item.slug)) fail(doc._id, 'missing, invalid or duplicate slug');
        seen.add(item.slug);
      }
      if (item.body !== undefined && (!Array.isArray(item.body) || item.body.some(v => !text(v)))) fail(doc._id, 'body must be an array of text');
      for (const field of required[type]) if (!text(item[field])) fail(doc._id, `${field} is required`);
      if (type !== 'testimonial' && !item.image?.src) fail(doc._id, 'image is required');
      for (const field of ['gallery','highlights','days','body','bestFor','journeys','expeditions','destinations']) {
        if (['gallery','highlights','days','body'].includes(field) || type === 'destination' && ['bestFor','journeys','expeditions'].includes(field) || type === 'journey' && field === 'destinations') item[field] ??= [];
      }
      if (type === 'destination' && !['India','Africa','Americas','Arctic'].includes(item.continent)) fail(doc._id, 'invalid continent');
      if (type === 'journalArticle' && Number.isNaN(Date.parse(item.date))) fail(doc._id, 'invalid publication date');
      if (type === 'journalArticle' && !item.body.length) fail(doc._id, 'article body is empty');
      for (const departure of item.departures || []) {
        const validDate = d => typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d) && !Number.isNaN(Date.parse(d)) && new Date(d).toISOString().slice(0,10) === d;
        if (!validDate(departure.date) || !['New','Filling fast','Full','Available'].includes(departure.status) || departure.endDate && (!validDate(departure.endDate) || departure.endDate < departure.date)) fail(doc._id, 'invalid departure dates or status');
      }
      if (type === 'photoExpedition' && item.publicationStatus === 'published' && (!item.days.length || !text(item.price) || !item.inclusions?.length || !item.exclusions?.length || !text(item.groupSize) || /to be confirmed/i.test(item.groupSize))) fail(doc._id, 'published tour needs itinerary, price guidance, inclusions, exclusions and confirmed group size');
      return item;
      } catch (error) { errors.push(error.message); return null; }
    }).filter(Boolean).sort((a,b) => (a.orderRank ?? previousOrder.get(a.slug || a.name) ?? 9999) - (b.orderRank ?? previousOrder.get(b.slug || b.name) ?? 9999) || (a.slug || a.name).localeCompare(b.slug || b.name));
    if (type === 'testimonial') next[key] = next[key].filter(item => item.verified === true && item.consented === true).map(item => item.anonymous ? {...item, name:'Anonymous guest'} : item);
    report.push({type, published:records.length, included:next[key].length});
  }
  const homes = published.filter(d => d._type === 'homepage');
  if (homes.length > 1) fail('homepage', 'multiple homepages; keep one canonical homepage document');
  if (homes.length) {
    next.homepage = normalizeRecord(homes[0], config, 'homepage');
    for (const key of required.homepage) if (!text(next.homepage[key])) fail('homepage', `${key} is required`);
    if (next.homepage.heroMedia?.posterImage?.src) next.heroImage = next.homepage.heroMedia.posterImage;
  }
  if (errors.length) throw new Error(`CMS validation failed (${errors.length} records):\n${errors.join('\n')}`);
  next.contentSource = 'sanity';
  return {snapshot:next, report};
}
