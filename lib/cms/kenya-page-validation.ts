import {z} from 'zod';
import {validateComposition,sectionIsVisible} from './composition.ts';
import {projectKenyaPage} from './kenya-page.ts';
import {navigationUrlStatus} from './navigation-routes.ts';
import {pageSeoFindings} from './page-seo.ts';
import type {ContentFinding,ValidationRecord} from './content-validation.ts';
const uuid=z.string().uuid();
const identity={site:uuid,record:uuid,revision:uuid};
export const kenyaPublicationEvidenceSchema=z.object({...identity,
 media:z.array(z.object({assetId:z.string().min(1).max(128),available:z.boolean()}).strict()).max(1000),
 publishedPaths:z.array(z.string().max(500).regex(/^\/[a-z0-9/-]*$/).refine(s=>!s.includes('//'))).max(10000),
}).strict();
export type KenyaPublicationEvidence=z.infer<typeof kenyaPublicationEvidenceSchema>;
/** Validate local destinations without treating a published page as proof of its anchors. */
export function kenyaLinkAvailable(href:string,anchors:ReadonlySet<string>,published:ReadonlySet<string>){
 // Keep query strings intact for the renderer. Only the pathname establishes
 // route availability; query values never supply another trusted destination.
 if(href.length>2048||/[\s\\\x00-\x1f]/.test(href)||href.includes('//'))return false;
 const match=/^(\/[a-z0-9/-]*)(?:\?([^#]*))?(?:#([a-z][a-z0-9-]*))?$/.exec(href);
 if(!match)return false;
 const [,path,,anchor]=match;
 if(path==='/destinations/kenya')return anchor===undefined||anchors.has(anchor);
 if(anchor!==undefined)return false;
 return navigationUrlStatus(path)==='available'||published.has(path);
}
/** Pure content validation. Evidence must be gathered by the trusted worker from
 * the same saved revision. This function cannot grant publication or write receipts;
 * SQL must recheck changing dependencies at publication/delivery time. */
export function validateKenyaPublication(record:ValidationRecord&{site:string;record:string;revision:string},input:unknown,now=new Date()){
 const findings:ContentFinding[]=[],seen=new Set<string>();
 const error=(field:string,code:string,message:string)=>{const key=`${field}:${code}`;if(!seen.has(key)){seen.add(key);findings.push({field,code,message,severity:'error'});}};
 const finish=()=>({validatorVersion:'kenya-1' as const,contentChecksPass:!findings.some(f=>f.severity==='error'),findings});
 if(!z.object(identity).safeParse(record).success||record.type!=='page'||record.path!=='/destinations/kenya'||record.locale!=='en'){
  error('path','kenya_identity','Kenya publication requires a saved English page at /destinations/kenya.');return finish();
 }

 try{projectKenyaPage({recordId:record.record,revisionId:record.revision,type:record.type,payload:record.payload},{locale:record.locale,now});}
 catch(reason){error('composition','kenya_structure',reason instanceof Error&&!('issues'in reason)?reason.message:'Complete the Kenya composition and SEO fields.');}
 if(record.payload.seo!==undefined)findings.push(...pageSeoFindings(record.payload.seo));
 const parsed=validateComposition(record.payload.composition);if(!parsed.page||!Number.isFinite(now.getTime()))return finish();
 const checked=kenyaPublicationEvidenceSchema.safeParse(input);
 if(!checked.success||checked.data.site!==record.site||checked.data.record!==record.record||checked.data.revision!==record.revision){error('composition','kenya_evidence_mismatch','Request a trusted check for this website and saved revision.');return finish();}
 const evidence=checked.data,sections=parsed.page.sections;
 const mediaRefs=new Map<string,string[]>();
 const images=(node:unknown,field:string):void=>{if(Array.isArray(node)){node.forEach((v,i)=>images(v,`${field}.${i}`));return;}if(!node||typeof node!=='object')return;for(const [key,value]of Object.entries(node)){if(key==='assetId'&&typeof value==='string')mediaRefs.set(value,[...(mediaRefs.get(value)??[]),`${field}.${key}`]);else images(value,`${field}.${key}`);}};
 // Include stored hidden images too, matching the shared page validation policy.
 images(record.payload,'payload');
 const actualMedia=evidence.media.map(row=>row.assetId);
 if(new Set(actualMedia).size!==actualMedia.length||actualMedia.length!==mediaRefs.size||actualMedia.some(id=>!mediaRefs.has(id)))error('composition','kenya_media_evidence_mismatch','Image evidence must match the saved page exactly.');
 else for(const row of evidence.media)if(!row.available)for(const field of mediaRefs.get(row.assetId)??[])error(field,'asset_verification_required','Select an inspected image with current approved rights for this website.');
 const times=new Set([now.getTime()]),published=new Set(evidence.publishedPaths);
 for(const section of sections)if(section.controls.visible)for(const stamp of [section.controls.visibleFrom,section.controls.visibleUntil])if(stamp&&Date.parse(stamp)>now.getTime())times.add(Date.parse(stamp));
 for(const time of times){
  const visible=sections.filter(s=>sectionIsVisible(s,{locale:'en',now:new Date(time)})),anchors=new Set(visible.map(s=>s.controls.anchor).filter((v):v is string=>Boolean(v)));
  const links=(node:unknown,field:string):void=>{if(Array.isArray(node)){node.forEach((v,i)=>links(v,`${field}.${i}`));return;}if(!node||typeof node!=='object')return;for(const [key,value]of Object.entries(node)){if(key==='href'&&typeof value==='string'&&!kenyaLinkAvailable(value,anchors,published))error(`${field}.href`,'kenya_link_unverified','Choose a public page or a section anchor available throughout this schedule.');else links(value,`${field}.${key}`);}};
  for(const section of visible)links(section.data,`composition.sections.${sections.findIndex(s=>s.id===section.id)}.data`);
 }
 return finish();
}
