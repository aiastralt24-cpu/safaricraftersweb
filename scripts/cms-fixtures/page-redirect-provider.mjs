/** Local HTTP integration fixture. Never load in a deployment. */
import fs from 'node:fs/promises';
if(process.env.CMS_REDIRECT_LOCAL_FIXTURE!=='true'||!process.env.CMS_REDIRECT_FIXTURE_STATE?.startsWith('/private/tmp/'))throw Error('Explicit local fixture and temporary state required.');
const example=await fs.readFile(new URL('../../.env.example',import.meta.url),'utf8');
for(const match of example.matchAll(/^(CMS_[A-Z_]+_ENABLED)=/gm))process.env[match[1]]='false';
const site='00000000-0000-4000-8000-000000000001';
Object.assign(process.env,{CMS_PAGE_REDIRECTS_ENABLED:process.env.CMS_REDIRECT_TEST_DISABLED==='true'?'false':'true',CMS_LOCALIZED_PAGES_ENABLED:process.env.CMS_REDIRECT_TEST_LOCALIZED==='true'?'true':'false',CMS_CUSTOM_PAGES_ENABLED:'true',CMS_PUBLIC_DELIVERY_ENABLED:'true',CMS_WEBSITE_ID:site,CMS_SUPABASE_URL:'https://redirect-fixture.test',CMS_SUPABASE_ANON_KEY:'anon-fixture'});
const original=globalThis.fetch;
globalThis.fetch=async(input,options={})=>{
 const url=new URL(typeof input==='string'||input instanceof URL?input:input.url);
 if(url.hostname!=='redirect-fixture.test'){if(['localhost','127.0.0.1','[::1]'].includes(url.hostname))return original(input,options);throw Error('External requests are disabled in this fixture.');}
 const file=process.env.CMS_REDIRECT_FIXTURE_STATE,{mode='ready'}=JSON.parse(await fs.readFile(file,'utf8'));
 const args=JSON.parse(options.body??'{}'),name=url.pathname.split('/').at(-1);
 if(options.method!=='POST'||options.cache!=='no-store'||args.p_site!==site||!['en','fr','fr-CA','de'].includes(args.p_locale))throw Error('Invalid fixture request scope.');
 await fs.appendFile(file+'.calls',JSON.stringify({name,args})+'\n');
 if(['get_public_settings','get_public_navigation','get_public_seo_settings'].includes(name))return Response.json(null);
 if(name==='get_public_page')return Response.json(null);
 if(name!=='get_public_page_redirect')throw Error('Unexpected RPC; writes prohibited.');
 if(mode==='failure')return new Response('Private provider error',{status:500});
 if(mode==='timeout')return await new Promise((_,reject)=>{if(options.signal?.aborted)reject(options.signal.reason);else options.signal?.addEventListener('abort',()=>reject(options.signal.reason),{once:true});});
 if(mode==='withdrawn'||args.p_path==='/missing-page'||args.p_locale==='de')return Response.json(null);
 const value={from:args.p_path,to:'/current-page',status:308};
 if(mode==='external')value.to='https://outside.test/';
 if(mode==='mismatch')value.from='/different-page';
 if(mode==='cycle')value.to=args.p_path;
 return Response.json(value);
};
