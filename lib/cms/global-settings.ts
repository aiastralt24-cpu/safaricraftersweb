import {interfaceTextSchema} from './interface-text.ts';
import {z} from 'zod';
import {image,link} from './composition.ts';
const text=z.string().max(50000),short=z.string().max(200),id=z.string().regex(/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,127}$/);
const reference=z.object({recordId:z.string().uuid()}).strict();
const optionalEmail=z.union([z.literal(''),z.string().email().max(320)]);
const https=z.string().max(2048).refine(value=>{try{const url=new URL(value);return url.protocol==='https:'&&!url.username&&!url.password&&!/[\s\\]/.test(value);}catch{return false;}},'Use an HTTPS address without credentials.');
const links=z.array(z.object({id,link}).strict()).max(50);
const message=z.object({enabled:z.boolean(),title:short,body:text,button:link.optional()}).strict();
const unique=(items:{id:string}[])=>new Set(items.map(item=>item.id)).size===items.length;
export const globalSettingsSchema=z.object({
 schemaVersion:z.literal(1),
 interfaceText:interfaceTextSchema.optional(),
 brand:z.object({name:z.string().trim().min(1).max(200),tagline:short,logo:image.optional(),mobileLogo:image.optional(),favicon:image.optional()}).strict(),
 contact:z.object({email:optionalEmail,phone:z.string().max(80),addresses:z.array(z.object({id,label:short,address:text}).strict()).max(20).refine(unique,'Address IDs must be unique.')}).strict(),
 header:z.object({variant:z.enum(['standard','transparent','compact']),sticky:z.boolean(),languageSelector:z.boolean(),languageSelectorLabel:z.string().trim().max(200).optional(),mainMenu:reference.optional(),utilityMenu:reference.optional(),mobileMenu:reference.optional(),featuredContent:z.array(reference).max(12),cta:link.optional()}).strict(),
 footer:z.object({cta:message.optional(),groups:z.array(z.object({id,title:short,links:links.refine(unique,'Link IDs must be unique.')}).strict()).max(12).refine(unique,'Group IDs must be unique.'),legalLinks:links.refine(unique,'Link IDs must be unique.'),copyright:text,disclaimer:text,marks:z.array(z.object({id,label:short,image}).strict()).max(30).refine(unique,'Mark IDs must be unique.')}).strict(),
 social:z.array(z.object({id,label:z.string().min(1).max(100),url:https}).strict()).max(20).refine(unique,'Social profile IDs must be unique.'),
 announcement:message,stickyCta:z.object({enabled:z.boolean(),button:link.optional()}).strict().refine(v=>!v.enabled||Boolean(v.button),'An enabled sticky CTA needs a button.'),
 cookies:z.object({title:short,description:text,acceptLabel:z.string().max(30),rejectLabel:z.string().max(30),preferencesLabel:z.string().max(30),policy:link.optional()}).strict(),
 seo:z.object({titleTemplate:z.string().min(1).max(300).refine(v=>v.includes('%s'),'Include %s for the page title.'),description:z.string().max(1000),socialImage:image.optional(),indexing:z.enum(['index','noindex'])}).strict(),
 fallbackImage:image.optional(),
 search:z.object({enabled:z.boolean(),placeholder:short,emptyMessage:text,contentTypes:z.array(z.enum(['page','destination','journey','photoExpedition','journalArticle','product','project','news','event','leadership','application','location','career','certification','partner','productCategory'])).max(16).refine(v=>new Set(v).size===v.length,'Search content types must be unique.')}).strict(),
 errors:z.object({notFound:message,serverError:message,maintenance:message}).strict(),
}).strict();
export type GlobalSettings=z.infer<typeof globalSettingsSchema>;
export function newGlobalSettings():GlobalSettings{
 const blank=()=>({enabled:false,title:'',body:''});
 return {schemaVersion:1,brand:{name:'Safari Crafters',tagline:''},contact:{email:'',phone:'',addresses:[]},header:{variant:'standard',sticky:true,languageSelector:false,featuredContent:[]},footer:{groups:[],legalLinks:[],copyright:'',disclaimer:'',marks:[]},social:[],announcement:blank(),stickyCta:{enabled:false},cookies:{title:'',description:'',acceptLabel:'Accept',rejectLabel:'Reject',preferencesLabel:'Preferences'},seo:{titleTemplate:'%s | Safari Crafters',description:'',indexing:'index'},search:{enabled:true,placeholder:'Search',emptyMessage:'No results found.',contentTypes:['page','journey','destination','journalArticle']},errors:{notFound:blank(),serverError:blank(),maintenance:blank()}};
}
export type SettingsImpact={field:string;scope:'sitewide'|'header'|'footer'|'search';requiresElevatedApproval:boolean;message:string};
/** Compare schema-validated settings. This describes potential impact, not a live usage inventory. */
export function globalSettingsImpact(before:unknown,after:unknown):SettingsImpact[]{
 const old=before==null?null:globalSettingsSchema.parse(before),next=globalSettingsSchema.parse(after),result:SettingsImpact[]=[];
 const stable=(value:unknown):string=>JSON.stringify(value,(_key,item)=>item&&typeof item==='object'&&!Array.isArray(item)?Object.fromEntries(Object.keys(item).sort().map(key=>[key,item[key]])):item);
 for(const key of Object.keys(next) as (keyof GlobalSettings)[]){
  if(key==='schemaVersion'||(old&&stable(old[key])===stable(next[key])))continue;
  result.push({field:key,scope:key==='header'?'header':key==='footer'?'footer':key==='search'?'search':'sitewide',requiresElevatedApproval:key==='seo'&&(old?.seo.indexing??'index')!==next.seo.indexing,message:key==='seo'?'Changes default page titles, descriptions, sharing or indexing. Pages with overrides may differ.':key==='header'?'Changes shared header or navigation references.':key==='footer'?'Changes shared footer content.':key==='search'?'Changes site search behavior and wording.':`Changes shared ${key} settings across the website.`});
 }
 if((old?.seo.indexing??'index')!==next.seo.indexing)result.push({field:'seo.indexing',scope:'sitewide',requiresElevatedApproval:true,message:next.seo.indexing==='noindex'?'Requests search engines not to index the website.':'Allows indexing, subject to page-level directives and crawler behavior.'});
 if((old?.errors.maintenance.enabled??false)!==next.errors.maintenance.enabled)result.push({field:'errors.maintenance.enabled',scope:'sitewide',requiresElevatedApproval:true,message:next.errors.maintenance.enabled?'Enables the shared maintenance message; production routing behavior needs deployment review.':'Disables the shared maintenance message.'});
 return result;
}
