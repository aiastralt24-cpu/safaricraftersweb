import fs from 'node:fs/promises';
import {planJournalMigration} from '../lib/cms/journal-migration.ts';
const snapshot=JSON.parse(await fs.readFile(new URL('../content/site-content.json',import.meta.url),'utf8'));
const plan=planJournalMigration(snapshot.journal);
const report={version:1,source:'content/site-content.json#journal',operation:plan.operation,sourceDigest:plan.sourceDigest,count:plan.count,readyDrafts:plan.readyDrafts,articles:plan.candidates.map(c=>({slug:c.source.slug,sourceKey:c.sourceKey,paragraphs:Array.isArray(c.source.body)?c.source.body.length:0,originalDate:c.source.date,proposedDate:c.payload.date,heroSourcePath:c.heroSourcePath,retainedGalleryPaths:c.retainedGalleryPaths,issues:c.issues}))};
await fs.writeFile(new URL('../docs/cms/journal-migration-inventory.json',import.meta.url),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({articles:report.count,readyDrafts:report.readyDrafts,issues:report.articles.reduce((n,a)=>n+a.issues.length,0)}));
