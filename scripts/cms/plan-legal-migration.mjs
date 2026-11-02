import fs from 'node:fs/promises';import {createHash} from 'node:crypto';
import {planLegalMigration} from '../../lib/cms/legal-migration.ts';
const root=new URL('../../',import.meta.url),inventory=JSON.parse(await fs.readFile(new URL('docs/cms/legal-migration-inventory.json',root),'utf8'));
if(inventory.schemaVersion!==1||inventory.mode!=='legacy-read-only'||inventory.pages.length!==3)throw Error('Unexpected legal migration inventory.');
const pages=[];for(const source of inventory.pages){if(!['/legal/privacy','/legal/terms','/legal/cookies'].includes(source.path))throw Error('Unknown route');const bytes=await fs.readFile(new URL(`app${source.path}/page.tsx`,root));pages.push(planLegalMigration(source,createHash('sha256').update(bytes).digest('hex')));}
await fs.writeFile(new URL('docs/cms/legal-migration-review.json',root),JSON.stringify({schemaVersion:1,mode:'review-only',pages},null,2)+'\n');
console.log(pages.map(page=>`${page.path}: ${page.candidate?'candidate ready for review':`${page.findings.length} migration findings`}`).join('\n'));
