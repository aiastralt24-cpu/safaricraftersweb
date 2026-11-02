import nextEnv from '@next/env';
import {enquiryFileDeploymentPreflight} from '../../lib/cms/enquiry-file-deployment.ts';
let failed=false;nextEnv.loadEnvConfig(process.cwd(),process.env.NODE_ENV!=='production',{info(){},error(){failed=true;}});
if(failed){console.error('Environment loading failed; inspect configuration locally. Values are not printed.');process.exitCode=1;}
else{const report=await enquiryFileDeploymentPreflight(process.env);console.log(JSON.stringify(report,null,2));process.exitCode=report.configurationReady?0:1;}
