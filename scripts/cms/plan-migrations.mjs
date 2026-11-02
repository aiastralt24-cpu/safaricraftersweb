import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {planCmsMigrations} from '../../lib/cms/migration-plan.ts';
const root=fileURLToPath(new URL('../../',import.meta.url));
try{
 const args=process.argv.slice(2);
 if(args.length!==2||args[0]!=='--ledger')throw Error('Usage: npm run cms:plan-migrations -- --ledger /path/to/applied-migrations.json. Supply an explicit JSON array of {file,sha256}; use [] only after independently confirming a new empty target.');
 const ledger=JSON.parse(await fs.readFile(path.resolve(args[1]),'utf8'));
 const directory=path.join(root,'database/cms'),names=(await fs.readdir(directory)).filter(name=>name.endsWith('.sql'));
 const entries=await Promise.all(names.map(async file=>({file,sha256:createHash('sha256').update(await fs.readFile(path.join(directory,file))).digest('hex')})));
 const report=planCmsMigrations(entries,ledger);console.log(JSON.stringify(report,null,2));process.exitCode=report.valid?0:1;
}catch(error){console.error(error instanceof Error?error.message:'Unable to prepare migration plan.');process.exitCode=1;}
