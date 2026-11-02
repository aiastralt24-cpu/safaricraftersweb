import fs from 'node:fs/promises';
import path from 'node:path';
import {planTestimonialMigration} from '../lib/cms/testimonial-migration.ts';
const [sourcePath,outputPath,mappingPath,...extra]=process.argv.slice(2);
if(!sourcePath||!outputPath||extra.length){console.error('Usage: node --experimental-strip-types scripts/plan-testimonial-migration.mjs SOURCE_JSON OUTPUT_JSON [MAPPINGS_JSON]');process.exitCode=1;}
else{
 try{
  if(path.resolve(sourcePath)===path.resolve(outputPath)||mappingPath&&path.resolve(mappingPath)===path.resolve(outputPath))throw Error('Output must not replace an input.');
  const source=JSON.parse(await fs.readFile(sourcePath,'utf8'));
  const records=Array.isArray(source)?source:source.testimonials;
  const mappings=mappingPath?JSON.parse(await fs.readFile(mappingPath,'utf8')):{};
  const plan=planTestimonialMigration(records,mappings);
  // Never overwrite an existing review or source file, including symlinks.
  await fs.writeFile(outputPath,JSON.stringify(plan,null,2)+'\n',{flag:'wx',mode:0o600});
  console.log(JSON.stringify({count:plan.count,readyDrafts:plan.readyDrafts,unusedMappings:plan.unusedMappings.length,output:path.resolve(outputPath),operation:plan.operation}));
 }catch(error){console.error(error instanceof Error?error.message:'Migration planning failed.');process.exitCode=1;}
}
