import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {createClient} from '@sanity/client';
import nextEnv from '@next/env';
import {collections} from './cms-snapshot.mjs';
nextEnv.loadEnvConfig(process.cwd());
const apply = process.argv.includes('--apply');
const config = {projectId:process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,dataset:process.env.NEXT_PUBLIC_SANITY_DATASET || 'production'};
if (!config.projectId || !process.env.SANITY_WRITE_TOKEN) throw new Error('Project configuration and SANITY_WRITE_TOKEN are required.');
const client = createClient({...config,token:process.env.SANITY_WRITE_TOKEN,apiVersion:'2026-05-02',useCdn:false,perspective:'raw'});
const documents = await client.fetch('*[_type in $types && !(_id in path("versions.**"))]', {types:Object.keys(collections)});
const content = JSON.parse(await fs.readFile('content/site-content.json','utf8'));
function keyed(value, path='root') {
 if (Array.isArray(value)) return value.map((v,i) => v && typeof v === 'object' ? {...keyed(v,`${path}.${i}`),_type:v._type || ({gallery:'imageAsset',days:'dayPlan',sources:'researchSource',pairings:'destinationPairing',faqs:'faqItem',scoop:'fieldNote'}[path.split('.').at(-1)] || 'object'),_key:v._key || createHash('sha256').update(`${path}.${i}`).digest('hex').slice(0,12)} : v);
 if (!value || typeof value !== 'object') return value;
 return Object.fromEntries(Object.entries(value).map(([k,v]) => [k,keyed(v,`${path}.${k}`)]));
}
const plan=[];
for (const [type,key] of Object.entries(collections)) {
 // Consent, verification, testimonial wording and prices must not be inferred.
 if (type==='testimonial') continue;
 for (const [index, source] of content[key].entries()) {
  const matches=documents.filter(d=>d._type===type && (source.slug ? (d.slug?.current || d.slug)===source.slug : d.name===source.name));
  const ids=new Set(matches.map(d=>d._id.replace(/^drafts\./,'')));
  if (ids.size>1) throw new Error(`Ambiguous CMS records for ${type}/${source.slug || source.name}`);
  const existing=matches.find(d=>d._id.startsWith('drafts.')) || matches[0];
  const id=existing?._id.replace(/^drafts\./,'') || `${type}-${source.slug || source.name.toLowerCase().replace(/[^a-z0-9]+/g,'-')}`;
  const additions={};
  const repairs={};
  if (existing) for (const [field,value] of Object.entries(existing)) {
   if (field.startsWith('_')) continue;
   const repaired=keyed(value,field);
   if (JSON.stringify(value)!==JSON.stringify(repaired)) repairs[field]=repaired;
  }
  for (const [field,value] of Object.entries(source)) {
   if (['price','departures','availabilityReviewedAt','publicationStatus','verified','consented'].includes(field)) continue;
   if (existing && Object.hasOwn(existing,field)) continue;
   additions[field]=field==='slug'?{_type:'slug',current:value}:keyed(value,field);
  }
  if (!existing || !Object.hasOwn(existing,'orderRank')) additions.orderRank=index;
  if (!existing && type==='photoExpedition') additions.publicationStatus='preview';
  if (Object.keys(additions).length || Object.keys(repairs).length) plan.push({id, type, existing, additions, repairs});
 }
}
const report = ['# CMS draft enrichment', '', `Project: ${config.projectId}/${config.dataset}. Source: the existing website snapshot.`, '', 'Only missing fields are added. Existing values and drafts are preserved. Prices, availability and testimonial consent are never inferred. New tours remain previews. These are drafts, not published changes.', '', '| Document | Fields added |', '| --- | --- |', ...plan.map(item=>`| ${item.id} | ${[...Object.keys(item.additions), ...Object.keys(item.repairs).map(k=>`${k} (array keys repaired)`)].join(', ')} |`), '', `${plan.length} documents planned.`, ''];
if (plan.length) await fs.writeFile(process.argv.includes('--repair-report') ? 'docs/cms-array-repairs.md' : 'docs/cms-draft-enrichment.md',report.join('\n'));
console.log(`${plan.length} draft enrichments planned; details in docs/cms-draft-enrichment.md.`);
if (apply) {
 // A single transaction is atomic. Revision checks protect existing drafts from concurrent edits.
 let transaction=client.transaction();
 for (const item of plan) {
  const draftId=`drafts.${item.id}`;
  if (item.existing?._id.startsWith('drafts.')) transaction=transaction.patch(draftId,p=>p.ifRevisionId(item.existing._rev).setIfMissing(item.additions).set(item.repairs));
  else {
   const {_rev,_createdAt,_updatedAt,...base}=item.existing || {};
   transaction=transaction.createIfNotExists({...base,...item.additions,...item.repairs,_id:draftId,_type:item.type});
  }
 }
 if (plan.length) await transaction.commit();
 console.log('Draft enrichment complete. No published documents were changed. Review drafts in Studio before publishing.');
} else console.log('Dry run only. Use --apply to create or enrich drafts.');
