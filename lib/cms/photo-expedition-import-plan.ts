import {z} from 'zod';
import {photoExpeditionSchema,newPhotoExpedition,type PhotoExpeditionDraft} from './photo-expeditions.ts';
import {validateExpeditionImportTables} from './photo-expedition-import-contract.ts';
import type {ImportIssue} from './import-contract.ts';
const id=/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,127}$/;
const groups=['departures','days','highlights','inclusions','exclusions','body','faqs','image','heroImage','mobileHeroImage','gallery','seo.socialImage','specialists','enquiry.form','video','video.poster'] as const;
const single=new Set(['image','heroImage','mobileHeroImage','seo.socialImage','enquiry.form','video','video.poster']);
export type ExistingExpeditionImport={recordId:string;revision:string;locale:string;payload:unknown};
export type ExpeditionImportChange={importId:string;operation:'create'|'update';recordId:string|null;expectedRevision:string|null;locale:string;path:string;payload:PhotoExpeditionDraft;replacedCollections:string[]};
/** Builds complete proposed drafts. Caller must supply permission-scoped existing revisions. No writes. */
export function planExpeditionImport(input:unknown,existing:ExistingExpeditionImport[]=[]){
 const checked=validateExpeditionImportTables(input),issues:ImportIssue[]=[...checked.issues],changes:ExpeditionImportChange[]=[];
 const fail=(sheet:string,row:number,field:string,code:string,message:string)=>issues.push({sheet,row,field,code,message,severity:'error'});
 if(!checked.valid)return {valid:false,issues,changes};
 const pages=checked.tables.Pages!,seen=new Set<string>(),slugs=new Set<string>();
 if(pages.filter(page=>Object.keys(page).length).length>25){fail('Pages',1,'recordId','batch_limit','Import at most 25 expeditions per batch.');return {valid:false,issues,changes};}
 for(const [sheet,rows] of Object.entries(checked.tables))if(sheet!=='Pages')for(const [index,row] of rows.entries())if(Object.keys(row).length&&!pages.some(page=>page.recordId===row.recordId))fail(sheet,index+2,'recordId','orphan_row','This row has no matching expedition in Pages.');
 for(const [pageIndex,page] of pages.entries()){
  if(!Object.keys(page).length)continue;const n=pageIndex+2,start=issues.length;
  if(!id.test(page.recordId)||seen.has(page.recordId))fail('Pages',n,'recordId','identity','Use a unique import ID.');seen.add(page.recordId);
  if(slugs.has(page.slug))fail('Pages',n,'slug','duplicate_slug','Each expedition needs a unique URL.');slugs.add(page.slug);
  if(page.locale!=='en')fail('Pages',n,'locale','locale','Expedition delivery currently supports English only.');
  if(!['create','update'].includes(page.operation))fail('Pages',n,'operation','operation','Choose create or update.');
  const matches=existing.filter(item=>item.recordId===page.recordId);let base=newPhotoExpedition();
  if(page.operation==='update'){
   if(matches.length!==1||!z.string().uuid().safeParse(page.recordId).success||!z.string().uuid().safeParse(page.expectedRevision).success||matches[0]?.revision!==page.expectedRevision)fail('Pages',n,'expectedRevision','revision_conflict','Reload the current expedition revision before updating.');
   else{const parsed=photoExpeditionSchema.safeParse(matches[0].payload);if(!parsed.success)fail('Pages',n,'recordId','migration_required','Existing content needs migration before an import can update it.');else{base=structuredClone(parsed.data);if(base.slug!==page.slug||matches[0].locale!==page.locale)fail('Pages',n,'slug','route_change','Imports cannot change an existing URL or language.');}}
  }else if(page.expectedRevision?.trim()||matches.length)fail('Pages',n,'recordId','create_conflict','Create requires a new import ID and no expected revision.');
  const replacements=(page.replaceCollections??'').split(',').map(value=>value.trim()).filter(Boolean);
  if(new Set(replacements).size!==replacements.length||replacements.some(value=>!groups.includes(value as typeof groups[number])))fail('Pages',n,'replaceCollections','collection_intent','List only unique supported collection or image fields.');
  if(replacements.includes('video')&&replacements.includes('video.poster'))fail('Pages',n,'replaceCollections','collection_intent','Replacing video includes its poster; do not also replace video.poster.');
  const draft=structuredClone(base) as unknown as Record<string,unknown>;
  const assign=(path:string,value:unknown)=>{const parts=path.split('.');let parent=draft;for(const part of parts.slice(0,-1)){if(!parent[part]||typeof parent[part]!=='object')parent[part]={};parent=parent[part] as Record<string,unknown>;}if(value===undefined)delete parent[parts.at(-1)!];else parent[parts.at(-1)!]=value;};
  for(const group of replacements)if(groups.includes(group as typeof groups[number])){if(group==='video.poster'&&!draft.video)continue;assign(group,single.has(group)?undefined:[]);}
  draft.slug=page.slug;draft.title=page.title;
  const scalarSeen=new Set<string>();
  for(const [index,row] of (checked.tables.Content??[]).entries())if(row.recordId===page.recordId){
   if(scalarSeen.has(row.field))fail('Content',index+2,'field','duplicate_field','Use one row per content field.');scalarSeen.add(row.field);
   if(row.field==='booking.button.newWindow'){if(!['true','false'].includes(row.value))fail('Content',index+2,'value','boolean','Use true or false.');assign(row.field,row.value==='true');}else assign(row.field,row.value??'');
  }
  const buckets=new Map<string,{position:number;value:unknown}[]>(),ids=new Set<string>(),positions=new Set<string>();
  const add=(sheet:string,rowNumber:number,row:Record<string,string>,group:string,value:unknown)=>{
   if(!id.test(row.itemId)||ids.has(`${group}:${row.itemId}`))fail(sheet,rowNumber,'itemId','item_identity','Use a unique stable item ID within this collection.');ids.add(`${group}:${row.itemId}`);
   if(!/^[1-9]\d*$/.test(row.position)||!Number.isSafeInteger(Number(row.position))||positions.has(`${group}:${Number(row.position)}`))fail(sheet,rowNumber,'position','position','Use unique positive integer positions within this collection.');positions.add(`${group}:${Number(row.position)}`);
   if(page.operation==='update'&&!replacements.includes(group)&&!(group==='video.poster'&&replacements.includes('video')))fail(sheet,rowNumber,'recordId','replacement_required',`List ${group} in replaceCollections to replace its complete contents.`);
   const bucket=buckets.get(group)??[];bucket.push({position:Number(row.position),value});buckets.set(group,bucket);
  };
  for(const [index,row] of (checked.tables.Departures??[]).entries())if(row.recordId===page.recordId)add('Departures',index+2,row,'departures',{id:row.itemId,date:row.date,...(row.endDate?{endDate:row.endDate}:{}),status:row.status,availability:row.availability??'',...(row.homepageNote?{homepageNote:row.homepageNote}:{})});
  for(const [index,row] of (checked.tables.Days??[]).entries())if(row.recordId===page.recordId)add('Days',index+2,row,'days',{id:row.itemId,label:row.label??'',title:row.title,copy:row.copy,stay:row.stay??''});
  for(const [index,row] of (checked.tables.Lists??[]).entries())if(row.recordId===page.recordId){if(!['highlights','inclusions','exclusions','body'].includes(row.collection)){fail('Lists',index+2,'collection','collection','Choose highlights, inclusions, exclusions or body.');continue;}add('Lists',index+2,row,row.collection,{id:row.itemId,text:row.text});}
  for(const [index,row] of (checked.tables.FAQs??[]).entries())if(row.recordId===page.recordId)add('FAQs',index+2,row,'faqs',{id:row.itemId,question:row.question,answer:row.answer});
  for(const [index,row] of (checked.tables.Films??[]).entries())if(row.recordId===page.recordId)add('Films',index+2,{...row,itemId:'film',position:'1'},'video',{assetId:row.assetId,title:row.title,caption:row.caption??'',transcript:row.transcript??'',...(row.captionsAssetId?{captionsAssetId:row.captionsAssetId}:{})});
  for(const [index,row] of (checked.tables.Media??[]).entries())if(row.recordId===page.recordId){
   if(!['image','heroImage','mobileHeroImage','gallery','video.poster','seo.socialImage'].includes(row.role)){fail('Media',index+2,'role','media_role','Choose a supported image placement.');continue;}
   if(!['true','false'].includes(row.decorative))fail('Media',index+2,'decorative','boolean','Use true or false.');
   const image={assetId:row.assetId,alt:row.alt??'',decorative:row.decorative==='true',...(row.caption!==undefined?{caption:row.caption}:{}),...(row.credit!==undefined?{credit:row.credit}:{})};
   add('Media',index+2,row,row.role,row.role==='gallery'?{id:row.itemId,image}:image);
  }
  for(const [index,row] of (checked.tables.References??[]).entries())if(row.recordId===page.recordId){
   if(!['mentor','guide','enquiryForm'].includes(row.role)){fail('References',index+2,'role','reference_role','Choose mentor, guide or enquiryForm.');continue;}
   add('References',index+2,row,row.role==='enquiryForm'?'enquiry.form':'specialists',row.role==='enquiryForm'?{recordId:row.targetId}:{recordId:row.targetId,role:row.role});
  }
  // Films are inserted before Media so an explicitly supplied poster completes the film.
  for(const [group,rows] of buckets){rows.sort((a,b)=>a.position-b.position);if(single.has(group)){if(rows.length!==1)fail('Pages',n,group,'duplicate_placement',`Use one value for ${group}.`);assign(group,rows[0].value);}else assign(group,rows.map(row=>row.value));}
  const parsed=photoExpeditionSchema.safeParse(draft);if(!parsed.success)for(const issue of parsed.error.issues)fail('Pages',n,issue.path.join('.'),'expedition_field',issue.message);
  if(parsed.success&&!issues.slice(start).some(issue=>issue.severity==='error'))changes.push({importId:page.recordId,operation:page.operation as 'create'|'update',recordId:page.operation==='update'?page.recordId:null,expectedRevision:page.operation==='update'?page.expectedRevision:null,locale:page.locale,path:`/photo-expeditions/${page.slug}`,payload:parsed.data,replacedCollections:replacements});
 }
 const valid=!issues.some(issue=>issue.severity==='error');return {valid,issues,changes:valid?changes:[]};
}
