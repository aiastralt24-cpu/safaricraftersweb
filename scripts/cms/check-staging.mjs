import nextEnv from '@next/env';
import {stagingPreflight} from '../../lib/cms/staging-preflight.ts';
// Match Next environment precedence without printing loader output or secrets.
let loadFailed=false;
nextEnv.loadEnvConfig(process.cwd(),process.env.NODE_ENV!=='production',{info(){},error(){loadFailed=true;}});
if(loadFailed){console.error('Unable to load environment files. Inspect them locally; values are not printed.');process.exitCode=1;}
else{
 const report=stagingPreflight(process.env);
 if(process.argv.includes('--json'))console.log(JSON.stringify(report,null,2));
 else{
  console.log('CMS staging configuration preflight');
  for(const check of report.checks)console.log(`${check.status.toUpperCase()}: ${check.id}${check.status==='configured'?'':` — ${check.action}`}`);
  console.log(report.note);
  console.log('Still requires verification:');
  for(const item of report.verificationRequired)console.log(`- ${item}`);
 }
 process.exitCode=report.configurationReady?0:1;
}
