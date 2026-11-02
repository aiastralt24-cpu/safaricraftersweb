// Local file-only review. No database calls, uploads, draft application or release.
import fs from 'node:fs/promises';
import {z} from 'zod';
import {compareHomepageMigrationRecords} from '../../lib/cms/homepage-migration-records.ts';
import {createHash} from 'node:crypto';
import {homepageMigrationDependencies} from '../../lib/cms/homepage-migration-review.ts';
import {planHomepageMigration} from '../../lib/cms/homepage-migration.ts';
const root=new URL('../../',import.meta.url);
if(process.argv.length>4)throw Error('Usage: node --experimental-strip-types scripts/cms/review-homepage-migration.mjs [mapping-manifest.json [record-evidence.json]]');
const mappings=process.argv[2]?JSON.parse(await fs.readFile(process.argv[2],'utf8')):undefined;
const proof=await Promise.all(homepageMigrationDependencies.map(async source=>({sourcePath:source.sourcePath,sha256:createHash('sha256').update(await fs.readFile(new URL(source.sourcePath,root))).digest('hex')})));
const proposal=planHomepageMigration(proof,mappings);
const evidence=process.argv[3]?z.object({websiteId:z.string().uuid(),records:z.array(z.unknown()).max(1000)}).strict().parse(JSON.parse(await fs.readFile(process.argv[3],'utf8'))):null;
const review={...proposal,recordComparison:evidence?compareHomepageMigrationRecords(proof,mappings,evidence.websiteId,evidence.records):null};
await fs.writeFile(new URL('docs/cms/homepage-migration-review.json',root),JSON.stringify(review,null,2)+'\n');
console.log(JSON.stringify({mode:review.mode,readyToApply:review.readyToApply,sections:review.sectionOrder.length,hasComposition:review.previewPayload!==null,unmappedMedia:review.missingMedia.length,unmappedRecords:review.missingRecords.length,sourceRecordsMatch:review.recordComparison?.sourceMatches??null}));
