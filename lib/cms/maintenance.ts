import {readPublishedSettings,settingsReader} from './public-settings.ts';
import {globalSettingsSchema} from './global-settings.ts';
const exempt=['/api','/cms','/studio','/admin','/portal','/preview','/_next','/assets','/fonts'];
export function maintenanceApplies(path:string,method:string){
 return ['GET','HEAD'].includes(method)&&!exempt.some(prefix=>path===prefix||path.startsWith(`${prefix}/`))&&!['/robots.txt','/favicon.ico'].includes(path);
}
export async function readMaintenanceMessage(env:Record<string,string|undefined>=process.env,fetcher:typeof fetch=fetch,locale='en'){
 if(env.CMS_MAINTENANCE_ENABLED!=='true')return undefined;
 try{
  const bounded:typeof fetch=(url,init)=>fetcher(url,{...init,signal:AbortSignal.any([...(init?.signal?[init.signal]:[]),AbortSignal.timeout(1500)])});
  const settings=await readPublishedSettings(env.CMS_WEBSITE_ID!,locale,settingsReader(env,bounded));
  const message=settings?.payload.errors.maintenance;
  return message?.enabled&&message.title.trim()&&message.body.trim()?message:undefined;
 }catch{return undefined;}
}
const escape=(value:string)=>value.replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]!));
export function maintenanceResponse(input:unknown,method='GET',locale='en'){
 if(!/^[a-z]{2,3}(?:-[A-Z]{2})?$/.test(locale))throw Error('Invalid maintenance language.');
 const message=globalSettingsSchema.shape.errors.shape.maintenance.parse(input);
 if(!message.enabled||!message.title.trim()||!message.body.trim())throw Error('Maintenance message is not enabled.');
 const button=message.button;
 const html=`<!doctype html><html lang="${locale}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escape(message.title)}</title><style>body{margin:0;background:#f3eee4;color:#253329;font-family:Georgia,serif}main{max-width:760px;margin:0 auto;padding:16vh 24px;text-align:center;overflow-wrap:anywhere}small{font:14px system-ui;letter-spacing:.15em}h1{font-weight:400;font-size:clamp(36px,7vw,68px);line-height:1.1}p{font-size:22px;line-height:1.6;white-space:pre-wrap}a{display:inline-block;margin-top:20px;padding:15px 24px;background:#253329;color:#fff;font:16px system-ui;text-decoration:none}a:focus-visible{outline:3px solid #ad803a;outline-offset:4px}</style></head><body><main>${locale==='en'?'<small>PLEASE CHECK BACK SOON</small>':''}<h1>${escape(message.title)}</h1><p>${escape(message.body)}</p>${button?`<a href="${escape(button.href)}"${button.newWindow?' target="_blank" rel="noopener noreferrer"':''}>${escape(button.label)}</a>`:''}</main></body></html>`;
 return new Response(method==='HEAD'?null:html,{status:503,headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','Retry-After':'300','X-Robots-Tag':'noindex, nofollow','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'",'Referrer-Policy':'no-referrer'}});
}
