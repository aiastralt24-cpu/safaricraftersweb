import {navigationRecordPathAvailable} from './navigation-record-path.ts';
import {navigationUrlStatus,publicNavigationHosts} from './navigation-routes.ts';
import {z} from 'zod';
import {navigationSchema} from './navigation.ts';
import type {ContentFinding,ValidationRecord} from './content-validation.ts';
export const navigationReferenceStatusSchema=z.array(z.object({recordId:z.string().uuid(),available:z.boolean(),type:z.enum(['journey','destination','journalArticle','page']).optional(),locale:z.string().regex(/^[a-z]{2,3}(?:-[A-Z]{2})?$/).optional(),path:z.string().optional(),title:z.string().max(200).optional()}).strict()).max(1400);
export type NavigationReferenceStatus={recordId:string;available:boolean;type?:string;locale?:string;path?:string;title?:string};
export function validateNavigationDraft(record:ValidationRecord,references?:NavigationReferenceStatus[]){
 const findings:ContentFinding[]=[];
 const error=(field:string,code:string,message:string)=>findings.push({field,code,message,severity:'error'});
 const parsed=navigationSchema.safeParse(record.payload);
 if(!parsed.success)for(const issue of parsed.error.issues)error(issue.path.join('.'),'navigation_field',issue.message);
 if(record.path!==null)error('path','navigation_path','A navigation menu cannot own a page URL.');
 if(!/^[a-z]{2,3}(?:-[A-Z]{2})?$/.test(record.locale??''))error('locale','navigation_locale_not_ready','Choose a valid menu language.');
 if(parsed.success){
  const menu=parsed.data;
  if(!menu.items.length)error('items','navigation_empty','Add at least one menu item.');
  const expected=new Set(menu.items.flatMap(item=>[...(item.target.kind==='record'?[item.target.recordId]:[]),...item.featuredContent.map(ref=>ref.recordId)]));
  if(references?.some(ref=>!expected.has(ref.recordId)))error('items','navigation_evidence_mismatch','Reference evidence does not match this menu revision.');
  function check(id:string,path:string,type?:string){
   const matching=references?.filter(ref=>ref.recordId===id),ref=matching?.[0];
   if(matching?.length!==1||!ref?.available||ref.locale!==record.locale||(type&&ref.type!==type)||!ref.path||!navigationRecordPathAvailable(ref.type??'',ref.path)||!ref.title?.trim()||(record.locale!=='en'&&ref.type!=='page'))error(path,'navigation_target_unavailable','Choose a currently available published record of the correct type and language.');
  }
  menu.items.forEach((item,index)=>{
   const path=`items.${index}`;
   if(item.target.kind==='record')check(item.target.recordId,`${path}.target.recordId`,item.target.contentType);
   if(item.target.kind==='url'&&(navigationUrlStatus(item.target.href)!=='available'||(record.locale!=='en'&&localizedInternalUrl(item.target.href))))error(`${path}.target.href`,'navigation_url_verification_required',record.locale==='en'?'Choose a verified public page or a supported published record. Unknown paths and unverified anchors cannot be published.':'For internal destinations, select a published custom-page record in this menu language. External HTTPS links and the main-content anchor are supported.');
   if(item.target.kind==='group'&&!menu.items.some(child=>child.parentId===item.id))error(`${path}.target`,'navigation_empty_group','Add a child item or give this item a link.');
   const seen=new Set<string>();item.featuredContent.forEach((ref,i)=>{if(seen.has(ref.recordId))error(`${path}.featuredContent.${i}`,'navigation_duplicate_feature','Select each featured record only once.');seen.add(ref.recordId);check(ref.recordId,`${path}.featuredContent.${i}.recordId`);});
  });
 }
 return {validatorVersion:'navigation-1',contentChecksPass:!findings.some(f=>f.severity==='error'),findings};
}

function localizedInternalUrl(href:string){
 if(href.startsWith('/'))return true;
 if(href.startsWith('#'))return false;
 try{return (publicNavigationHosts as readonly string[]).includes(new URL(href).hostname.toLowerCase().replace(/\.$/,''));}catch{return true;}
}
