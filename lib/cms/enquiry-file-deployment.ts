import {access,stat} from 'node:fs/promises';
import {constants} from 'node:fs';
import path from 'node:path';
import {stagingPreflight} from './staging-preflight.ts';
type Env=Record<string,string|undefined>;
type PathKind='executable'|'file'|'directory';
type Check={id:string;status:'configured'|'missing'|'invalid'|'unavailable';action:string};
async function probePath(value:string,kind:PathKind){try{const info=await stat(value);if(kind==='directory'?!info.isDirectory():!info.isFile())return false;await access(value,kind==='executable'?constants.X_OK:constants.R_OK);return true;}catch{return false;}}
/** Local read-only preflight. No process execution, network request, policy change
 * or deletion is performed. Environment values and local paths never leave it. */
export async function enquiryFileDeploymentPreflight(env:Env,probe:typeof probePath=probePath){
 const checks:Check[]=stagingPreflight(env).checks.filter(v=>['CMS_SUPABASE_URL','CMS_SUPABASE_ANON_KEY','CMS_SUPABASE_SERVICE_ROLE_KEY','CMS_WEBSITE_ID','CMS_PUBLIC_SITE_ORIGIN'].includes(v.id));
 const add=(id:string,valid:boolean,action:string)=>checks.push({id,status:!env[id]?'missing':valid?'configured':'invalid',action});
 for(const id of ['CMS_ENQUIRY_INGRESS_SECRET','CMS_ENQUIRY_IDENTITY_SECRET','CMS_ENQUIRY_FILE_WORKER_SECRET','CMS_ENQUIRY_FILE_CLEANUP_SECRET'])add(id,/^[-A-Za-z0-9_]{32,256}$/.test(env[id]??''),'Configure a separate random server-side secret.');
 const secretNames=['CMS_ENQUIRY_INGRESS_SECRET','CMS_ENQUIRY_IDENTITY_SECRET','CMS_ENQUIRY_FILE_WORKER_SECRET','CMS_ENQUIRY_FILE_CLEANUP_SECRET'];
 for(const item of checks){if(secretNames.includes(item.id)&&env[item.id]&&secretNames.some(id=>id!==item.id&&env[id]===env[item.id]))item.status='invalid';}
 add('CMS_TURNSTILE_SECRET',Boolean(env.CMS_TURNSTILE_SECRET)&&!/[\r\n]/.test(env.CMS_TURNSTILE_SECRET??''),'Configure the server challenge credential.');
 add('CMS_TURNSTILE_SITE_KEY',Boolean(env.CMS_TURNSTILE_SITE_KEY)&&(env.CMS_TURNSTILE_SITE_KEY?.length??0)<=200,'Configure the public challenge site key.');
 add('CMS_PDF_PARSER_VERSION',/^\d+\.\d+\.\d+$/.test(env.CMS_PDF_PARSER_VERSION??''),'Pin the installed PDF parser version.');
 for(const [id,kind] of [['CMS_CLAMSCAN_PATH','executable'],['CMS_CLAMAV_DATABASE_DIRECTORY','directory'],['CMS_PDF_PYTHON_PATH','executable'],['CMS_PDF_SCRIPT_PATH','file']] as const){
  const value=env[id];checks.push({id,status:!value?'missing':!path.isAbsolute(value)?'invalid':await probe(value,kind)?'configured':'unavailable',action:'Configure and install this local worker dependency; existence alone does not verify operation.'});
 }
 return {configurationReady:checks.every(v=>v.status==='configured'),checks,flags:Object.fromEntries(['CMS_ENQUIRY_ENABLED','CMS_ENQUIRY_FILES_ENABLED','CMS_ENQUIRY_FILE_WORKER_ENABLED','CMS_ENQUIRY_FILE_CLEANUP_ENABLED'].map(id=>[id,env[id]==='true'])),
  verificationRequired:['Confirmed staging project and migrations through attachment cleanup','Real scanner clean/infected controls and fresh signatures','Actual PDF parsing and sanitized image inspection','Private upload, processing, submission, recruiter download and audit workflow','Approved retention periods and synthetic-object cleanup','Authenticated processing/cleanup schedules and failure monitoring'],
  note:'Read-only configuration check. It does not prove runtime health, provider access or readiness to enable public file forms. Keep activation disabled until staged acceptance passes.'};
}
