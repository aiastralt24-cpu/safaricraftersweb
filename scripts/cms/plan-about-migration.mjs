// Generates a read-only proposal. No database, media upload or publication writes.
import fs from 'node:fs/promises';import {createHash} from 'node:crypto';
import {aboutMigrationDependencies,planAboutMigration} from '../../lib/cms/about-migration.ts';
const root=new URL('../../',import.meta.url);
const proof=await Promise.all(aboutMigrationDependencies.map(async source=>({sourcePath:source.sourcePath,sha256:createHash('sha256').update(await fs.readFile(new URL(source.sourcePath,root))).digest('hex')})));
const proposal=planAboutMigration(proof);
await fs.writeFile(new URL('docs/cms/about-migration-review.json',root),JSON.stringify(proposal,null,2)+'\n');
console.log(JSON.stringify({mode:proposal.mode,readyToApply:proposal.readyToApply,sections:proposal.previewPayload.composition.sections.length,unmappedImages:proposal.missingMedia.length,findings:proposal.findings.map(f=>f.code)}));
