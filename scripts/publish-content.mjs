import fs from 'node:fs/promises';
import { createClient } from '@sanity/client';
import nextEnv from '@next/env';
import { collections, createSnapshot } from './cms-snapshot.mjs';
nextEnv.loadEnvConfig(process.cwd());
const includeDrafts = process.argv.includes('--drafts');
const checkOnly = process.argv.includes('--check') || includeDrafts;
const file = 'content/site-content.json';
if (!checkOnly && process.env.SAFARI_CONTENT_SOURCE !== 'sanity') {
  console.log('Building reviewed Git content snapshot. Use npm run cms:check to validate published Sanity content before switching sources.');
  process.exit(0);
}
const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID;
if (!projectId) throw new Error('Sanity import requested without project configuration.');
const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET || 'production';
const client = createClient({projectId, dataset, token:includeDrafts ? process.env.SANITY_WRITE_TOKEN || process.env.SANITY_READ_TOKEN : process.env.SANITY_READ_TOKEN, apiVersion:'2026-05-02', useCdn:false, perspective:includeDrafts ? 'raw' : 'published'});
let documents = await client.fetch('*[_type in $types && ($includeDrafts || !(_id in path("drafts.**"))) && !(_id in path("versions.**"))]', {types:[...Object.keys(collections), 'homepage'], includeDrafts});
if (includeDrafts) {
 const merged = new Map();
 for (const doc of documents.sort((a,b) => Number(a._id.startsWith('drafts.')) - Number(b._id.startsWith('drafts.')))) {const id=doc._id.replace(/^drafts\./,'');merged.set(id,{...doc,_id:id});}
 documents=[...merged.values()];
}
const baseline = JSON.parse(await fs.readFile(file, 'utf8'));
let result;
try { result = createSnapshot(baseline, documents, {projectId,dataset}); }
catch (error) {
  console.error(error.message);
  if (checkOnly) await fs.writeFile('docs/cms-validation.txt', `${includeDrafts ? 'Draft preview' : 'Published content'} validation\n${error.message}\n`);
  process.exit(1);
}
const {snapshot, report} = result;
console.table(report);
if (checkOnly) {
  await fs.writeFile('docs/cms-validation.txt', `${includeDrafts ? 'Draft preview' : 'Published content'} validation passed.\n${report.map(row => `${row.type}: ${row.included} included / ${row.published} records`).join('\n')}\nNo content was published or imported.\n`);
  console.log(`${includeDrafts ? 'Draft preview' : 'Published CMS'} content is valid. No local content or remote documents were changed.`);
} else {
  await fs.writeFile(file + '.tmp', JSON.stringify(snapshot, null, 2) + '\n');
  await fs.rename(file + '.tmp', file);
  console.log('Published CMS content imported. Deploy the rebuilt website to make these changes public.');
}
