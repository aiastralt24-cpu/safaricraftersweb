import {navigationLinkForLocale,type LocalizedRouteResolver} from './localized-navigation-link.ts';
import {navigationRecordPathAvailable} from './navigation-record-path.ts';
import {navigationUrlStatus} from './navigation-routes.ts';
import {z} from 'zod';
import {navigationSchema,visibleNavigationItems} from './navigation.ts';
import {cmsRpc} from './gateway.ts';
const uuid=z.string().uuid(),language=z.string().regex(/^[a-z]{2,3}(?:-[A-Z]{2})?$/);
const available=z.object({recordId:uuid,available:z.literal(true),title:z.string().trim().min(1).max(200),type:z.enum(['journey','destination','journalArticle','page']),path:z.string().regex(/^\/[a-z0-9/-]+$/),locale:language}).strict();
const unavailable=z.object({recordId:uuid,available:z.literal(false)}).strict();
const envelope=z.object({websiteId:uuid,recordId:uuid,revisionId:uuid,locale:language,payload:navigationSchema,references:z.array(z.discriminatedUnion('available',[available,unavailable])).max(1400)}).strict();
/** Resolve only public evidence attached to the published menu. A missing target
 * suppresses its subtree; nothing is replaced with an editor or legacy URL. */
export function projectPublishedNavigation(input:unknown,identity:{site:string;record:string;locale:string},context:{now:Date;region?:string;requireAvailableReferences?:boolean;resolveLocalizedRoute?:LocalizedRouteResolver}){
 const value=envelope.parse(input);
 if(identity.locale!=='en'&&!context.resolveLocalizedRoute)throw Error('Localized navigation requires verified route resolution.');
 if(value.websiteId!==identity.site||value.recordId!==identity.record||value.locale!==identity.locale)throw Error('Published navigation identity mismatch.');
 const expected=new Set(value.payload.items.flatMap(item=>[...(item.target.kind==='record'?[item.target.recordId]:[]),...item.featuredContent.map(ref=>ref.recordId)]));
 const refs=new Map(value.references.map(ref=>[ref.recordId,ref]));
 if(refs.size!==value.references.length||refs.size!==expected.size||[...expected].some(id=>!refs.has(id)))throw Error('Published navigation reference mismatch.');
 for(const ref of refs.values())if(ref.available){
  if(ref.locale!==identity.locale||!navigationRecordPathAvailable(ref.type,ref.path))throw Error('Published navigation target path mismatch.');
 }
 if(context.requireAvailableReferences&&value.references.some(ref=>!ref.available))throw Error('Published navigation dependencies are unavailable.');
 const menu=structuredClone(value.payload);
 for(const item of menu.items)if(item.target.kind==='url'){
  if(navigationUrlStatus(item.target.href)!=='available')item.visibility.visible=false;
 }else if(item.target.kind==='record'){
  const ref=refs.get(item.target.recordId)!;
  if(!ref.available||ref.type!==item.target.contentType)item.visibility.visible=false;
 }
 let items=visibleNavigationItems(menu,{...context,locale:value.locale});
 // Empty grouping headings have no useful navigation behavior. Repeat for nested groups.
 for(let pass=0;pass<4;pass++)items=items.filter(item=>item.target.kind!=='group'||items.some(child=>child.parentId===item.id));
 return {recordId:value.recordId,revisionId:value.revisionId,locale:value.locale,title:value.payload.title,items:items.map(item=>({
  id:item.id,parentId:item.parentId,label:item.label,description:item.description,presentation:item.presentation,
  link:item.target.kind==='group'?null:{href:navigationLinkForLocale(item.target.kind==='url'?item.target.href:(refs.get(item.target.recordId) as z.infer<typeof available>).path,identity.locale,context.resolveLocalizedRoute),newWindow:item.target.newWindow},
  featuredContent:item.featuredContent.flatMap(ref=>{const result=refs.get(ref.recordId)!;return result.available?[{recordId:result.recordId,type:result.type,title:result.title,href:navigationLinkForLocale(result.path,identity.locale,context.resolveLocalizedRoute)}]:[];}),
 }))};
}
export function navigationReader(env:Record<string,string|undefined>=process.env,fetcher:typeof fetch=fetch){
 if(env.CMS_PUBLIC_DELIVERY_ENABLED!=='true'||!uuid.safeParse(env.CMS_WEBSITE_ID).success||!env.CMS_SUPABASE_URL||!env.CMS_SUPABASE_ANON_KEY)throw Error('Published navigation is not configured.');
 const config={url:env.CMS_SUPABASE_URL,key:env.CMS_SUPABASE_ANON_KEY};
 return async(record:string,context:{now:Date;region?:string;locale?:string;resolveLocalizedRoute?:LocalizedRouteResolver})=>{
  uuid.parse(record);const locale=language.parse(context.locale??'en');
  if(locale!=='en'&&!context.resolveLocalizedRoute)throw Error('Localized navigation requires verified route resolution.');
  const result=await cmsRpc(config,config.key,'get_public_navigation',{p_site:env.CMS_WEBSITE_ID,p_record:record,p_locale:locale},fetcher);
  return result===null?null:projectPublishedNavigation(result,{site:env.CMS_WEBSITE_ID!,record,locale},context);
 };
}

export type PublishedNavigation=ReturnType<typeof projectPublishedNavigation>;
