import fs from 'node:fs/promises';
import { createClient } from '@sanity/client';
import nextEnv from '@next/env';
nextEnv.loadEnvConfig(process.cwd());
const file='content/site-content.json';
const baseline=JSON.parse(await fs.readFile(file,'utf8'));
if(process.env.SAFARI_CONTENT_SOURCE!=='sanity') {
 console.log('Building reviewed, Git-versioned content snapshot. Set SAFARI_CONTENT_SOURCE=sanity to import published CMS content.');
 process.exit(0);
}
const projectId=process.env.NEXT_PUBLIC_SANITY_PROJECT_ID;
if(!projectId)throw new Error('Sanity publishing requested without project configuration.');
const client=createClient({projectId,dataset:process.env.NEXT_PUBLIC_SANITY_DATASET||'production',token:process.env.SANITY_READ_TOKEN,apiVersion:'2026-05-02',useCdn:false,perspective:'published'});
const docs=await client.fetch('*[_type in ["destination","journey","photoExpedition","journalArticle"] && !(_id in path("drafts.**"))]');
const collections={destination:'destinations',journey:'journeys',photoExpedition:'expeditions',journalArticle:'journal'};
for(const [type,key] of Object.entries(collections)) {
 const records=docs.filter(d=>d._type===type);
 if(!records.length)throw new Error(`No published ${type} records. Refusing to publish an empty collection.`);
 const slugs=new Set();
 baseline[key]=records.map(doc=>{
  const {_id,_rev,_type,_createdAt,_updatedAt,...value}=doc;
  const slug=typeof value.slug==='string'?value.slug:value.slug?.current;
  if(!slug||slugs.has(slug)||!value.title||!value.description||!value.image?.src)throw new Error(`Invalid/duplicate ${type}: ${slug}`);
  slugs.add(slug);
  if(!value.image.src.startsWith('/assets/'))throw new Error(`Unsupported image URL for ${slug}; configure/validate remote image delivery before publishing.`);
  const item={...value,slug};
  if(type==='photoExpedition') {
   if(!Array.isArray(item.gallery)||!Array.isArray(item.days)||!Array.isArray(item.highlights))throw new Error(`Incomplete expedition arrays: ${slug}`);
   for(const departure of item.departures||[]) {
    if(!/^\d{4}-\d{2}-\d{2}$/.test(departure.date)||Number.isNaN(Date.parse(departure.date))||!['New','Filling fast','Full','Available'].includes(departure.status)||departure.endDate&&departure.endDate<departure.date)throw new Error(`Invalid departure: ${slug}`);
   }
   if(item.publicationStatus==='published'&&(!item.days.length||!item.price||!item.inclusions?.length||!item.exclusions?.length||!item.mentor||!item.groupSize||/to be confirmed/i.test(item.groupSize)))throw new Error(`Expedition ${slug} needs programme, price guidance, inclusions, exclusions, guide and group size, or must remain a preview.`);
  }
  return item;
 });
}
await fs.writeFile(file+'.tmp',JSON.stringify(baseline,null,2)+'\n');await fs.rename(file+'.tmp',file);
console.log('Published Sanity content validated and imported into immutable build snapshot.');
