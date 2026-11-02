/** Offline review artifact: never connects to a provider or saves a CMS record. */
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {kenyaMigrationDependencies,planKenyaMigration} from '../lib/cms/kenya-migration.ts';
const args=process.argv.slice(2);
if(args.length>1)throw Error('Usage: node --experimental-strip-types scripts/plan-cms-kenya-migration.mjs [media-bindings.json]');
const bindings=args[0]?JSON.parse(await readFile(args[0],'utf8')):[];
const proof=await Promise.all(kenyaMigrationDependencies.map(async source=>({sourcePath:source.sourcePath,sha256:createHash('sha256').update(await readFile(new URL('../'+source.sourcePath,import.meta.url))).digest('hex')})));
process.stdout.write(JSON.stringify(planKenyaMigration(proof,bindings),null,2)+'\n');
