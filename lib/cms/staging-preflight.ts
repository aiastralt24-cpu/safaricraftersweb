import {z} from 'zod';
import {publicCmsConfig} from './browser-config.ts';

type Environment=Record<string,string|undefined>;
type Check={id:string;status:'configured'|'missing'|'invalid';action:string};
// Configuration shape checks only. Never return environment values or exceptions.
export function stagingPreflight(env:Environment){
 const checks:Check[]=[];
 const check=(id:string,valid:boolean,action:string)=>checks.push({id,status:!env[id]?'missing':valid?'configured':'invalid',action});
 const origin=(value:string|undefined)=>{
  try{const url=new URL(value||'');return url.protocol==='https:'&&!url.username&&!url.password&&url.pathname==='/'&&!url.search&&!url.hash;}catch{return false;}
 };
 check('CMS_SUPABASE_URL',origin(env.CMS_SUPABASE_URL),'Set the dedicated CMS project HTTPS origin.');
 check('CMS_SUPABASE_ANON_KEY',!!publicCmsConfig('https://configuration.invalid',env.CMS_SUPABASE_ANON_KEY),'Use a public publishable/anon key; never a privileged key.');
 check('CMS_WEBSITE_ID',z.string().uuid().safeParse(env.CMS_WEBSITE_ID).success,'Set the website UUID created in the staging CMS database.');
 const service=env.CMS_SUPABASE_SERVICE_ROLE_KEY||'';
 let privileged=/^sb_secret_[A-Za-z0-9_-]{10,}$/.test(service);
 try{const parts=service.split('.');if(parts.length===3)privileged=JSON.parse(Buffer.from(parts[1],'base64url').toString('utf8')).role==='service_role';}catch{/* Invalid credentials remain invalid. */}
 check('CMS_SUPABASE_SERVICE_ROLE_KEY',privileged,'Set the server-only service credential in the deployment secret store.');
 check('CMS_PUBLIC_SITE_ORIGIN',origin(env.CMS_PUBLIC_SITE_ORIGIN),'Set the intended staging website HTTPS origin.');
 for(const worker of ['VALIDATION','DELIVERY']){
  check(`CMS_${worker}_WORKER_ENABLED`,env[`CMS_${worker}_WORKER_ENABLED`]==='true','Enable only on the prepared staging deployment.');
  check(`CMS_${worker}_WORKER_SECRET`,/^[-A-Za-z0-9_]{32,256}$/.test(env[`CMS_${worker}_WORKER_SECRET`]||''),'Set a 32–256 character random worker secret; configure the scheduler separately.');
 }
 return {configurationReady:checks.every(item=>item.status==='configured'),checks,
  verificationRequired:['Provider credentials and project identity','Database migrations, exposed CMS schema and least-privilege membership','Private storage and media processing','Authenticated worker scheduler and retry handling','Real edit/import, preview, review, publish, restore and withdrawal workflow'],
  note:'Configuration checks do not verify connectivity, deployment, permissions, scheduler execution or client acceptance.'};
}
