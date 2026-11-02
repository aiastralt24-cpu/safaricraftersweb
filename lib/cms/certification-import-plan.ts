import {z} from 'zod';
import {certificationSchema,newCertification,type CertificationDraft} from './certifications.ts';
import {validateCertificationImportTables,type CertificationImportSheet} from './certification-import-contract.ts';
import type {ImportIssue} from './import-contract.ts';
const id=/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,127}$/;
const groups=['evidence','seo.socialImage','relationships.pages','relationships.locations'] as const;
const single=new Set(['seo.socialImage']);
export type ExistingCertificationImport={recordId:string;revision:string;locale:string;payload:unknown};
export type CertificationImportChange={importId:string;operation:'create'|'update';recordId:string|null;expectedRevision:string|null;locale:string;path:string;payload:CertificationDraft;replacedCollections:string[]};
/** Full proposed snapshots, never writes. Existing records must be caller-scoped server reads. */
export function planCertificationImport(input:unknown,existing:ExistingCertificationImport[]=[]){
 const checked=validateCertificationImportTables(input),issues:ImportIssue[]=[...checked.issues],changes:CertificationImportChange[]=[];
 const fail=(sheet:string,row:number,field:string,code:string,message:string)=>issues.push({sheet,row,field,code,message,severity:'error'});
 if(!checked.valid||issues.some(issue=>issue.severity==='error'))return {valid:false,issues,changes};
 const pages=checked.tables.Pages!;if(pages.filter(page=>Object.keys(page).length).length>25){fail('Pages',1,'recordId','batch_limit','Import at most 25 certifications per batch.');return {valid:false,issues,changes};}const seen=new Set<string>(),slugs=new Set<string>();
 for(const [sheet,rows]of Object.entries(checked.tables))if(sheet!=='Pages')for(const [index,row]of rows.entries())if(Object.keys(row).length&&!pages.some(page=>page.recordId===row.recordId))fail(sheet,index+2,'recordId','orphan_row','This row has no matching certification in Pages.');
 for(const [pageIndex,page]of pages.entries()){
  if(!Object.keys(page).length)continue;
  const rowNumber=pageIndex+2,start=issues.length;
  if(!id.test(page.recordId)||seen.has(page.recordId))fail('Pages',rowNumber,'recordId','identity','Use a unique import ID.');seen.add(page.recordId);
  if(slugs.has(`${page.locale}:${page.slug}`))fail('Pages',rowNumber,'slug','duplicate_slug','Each certification must have a unique URL.');slugs.add(`${page.locale}:${page.slug}`);
  if(!/^([a-z]{2,3})(-[A-Z]{2})?$/.test(page.locale))fail('Pages',rowNumber,'locale','locale','Use a supported language-code format.');
  if(!['create','update'].includes(page.operation))fail('Pages',rowNumber,'operation','operation','Choose create or update.');
  const matches=existing.filter(item=>item.recordId===page.recordId);let base:CertificationDraft=newCertification();
  if(page.operation==='update'){
   if(matches.length!==1||!z.string().uuid().safeParse(page.recordId).success||!z.string().uuid().safeParse(page.expectedRevision).success||matches[0]?.revision!==page.expectedRevision)fail('Pages',rowNumber,'expectedRevision','revision_conflict','Reload the existing certification and its current revision before updating.');
   else{const parsed=certificationSchema.safeParse(matches[0].payload);if(!parsed.success)fail('Pages',rowNumber,'recordId','migration_required','Existing content needs migration before an import can update it.');else{base=structuredClone(parsed.data);if(base.slug!==page.slug||matches[0].locale!==page.locale)fail('Pages',rowNumber,'slug','route_change','Imports cannot change an existing URL or language.');}}
  }else if(page.expectedRevision?.trim()||matches.length)fail('Pages',rowNumber,'recordId','create_conflict','Create requires a new import ID and no expected revision.');
  const replacements=(page.replaceCollections??'').split(',').map(value=>value.trim()).filter(Boolean);
  if(new Set(replacements).size!==replacements.length||replacements.some(value=>!groups.includes(value as typeof groups[number])))fail('Pages',rowNumber,'replaceCollections','collection_intent','List only unique supported collection or image field names.');
  const draft=structuredClone(base) as unknown as Record<string,unknown>;
  const assign=(path:string,value:unknown)=>{const parts=path.split('.');let parent=draft;for(const part of parts.slice(0,-1))parent=parent[part] as Record<string,unknown>;const key=parts.at(-1)!;if(value===undefined)delete parent[key];else parent[key]=value;};
  for(const group of replacements)if(groups.includes(group as typeof groups[number]))assign(group,single.has(group)?undefined:[]);
  draft.slug=page.slug;draft.title=page.title;
  const scalarSeen=new Set<string>();
  for(const [index,row]of (checked.tables.Content??[]).entries())if(row.recordId===page.recordId){if(scalarSeen.has(row.field))fail('Content',index+2,'field','duplicate_field','Use one row per content field.');scalarSeen.add(row.field);assign(row.field,row.value??'');}
  const buckets=new Map<string,{position:number;value:unknown}[]>(),itemIds=new Set<string>(),positions=new Set<string>();
  const checkOrder=(sheet:string,n:number,row:Record<string,string>,group:string)=>{
   const itemKey=`${group}:${row.itemId}`,positionKey=`${group}:${Number(row.position)}`;
   if(!id.test(row.itemId)||itemIds.has(itemKey))fail(sheet,n,'itemId','item_identity','Use a unique stable item ID within this collection.');itemIds.add(itemKey);
   if(!/^[1-9]\d*$/.test(row.position)||!Number.isSafeInteger(Number(row.position))||positions.has(positionKey))fail(sheet,n,'position','position','Use unique positive integer positions within this collection.');positions.add(positionKey);
  };
  const add=(sheet:string,n:number,row:Record<string,string>,group:string,value:unknown)=>{
   checkOrder(sheet,n,row,group);
   if(page.operation==='update'&&!replacements.includes(group))fail(sheet,n,'recordId','replacement_required',`List ${group} in replaceCollections to replace its complete contents.`);
   const bucket=buckets.get(group)??[];bucket.push({position:Number(row.position),value});buckets.set(group,bucket);
  };
  const readImage=(sheet:string,n:number,row:Record<string,string>)=>{
   if(!['true','false'].includes(row.decorative))fail(sheet,n,'decorative','boolean','Use true or false.');
   return {assetId:row.assetId,alt:row.alt??'',decorative:row.decorative==='true',...(row.caption!==undefined?{caption:row.caption}:{}),...(row.credit!==undefined?{credit:row.credit}:{})};
  };
  for(const [index,row]of (checked.tables.Media??[]).entries())if(row.recordId===page.recordId){
   const n=index+2;if(!['seo.socialImage'].includes(row.role)){fail('Media',n,'role','media_role','Choose a supported image placement.');continue;}
   add('Media',n,row,row.role,readImage('Media',n,row));
  }
  for(const [index,row]of (checked.tables.Evidence??[]).entries())if(row.recordId===page.recordId)add('Evidence',index+2,row,'evidence',{recordId:row.targetId});
  for(const [index,row]of (checked.tables.Relationships??[]).entries())if(row.recordId===page.recordId){
   if(!['pages','locations'].includes(row.group)){fail('Relationships',index+2,'group','relationship_group','Choose a supported Certification relationship group.');continue;}
   add('Relationships',index+2,row,`relationships.${row.group}`,{recordId:row.targetId});
  }
  for(const [group,rows]of buckets){rows.sort((a,b)=>a.position-b.position);if(single.has(group)){if(rows.length!==1)fail('Media',rowNumber,'role','duplicate_placement',`Only one image may occupy ${group}.`);assign(group,rows[0].value);}else assign(group,rows.map(row=>row.value));}
  const parsed=certificationSchema.safeParse(draft);if(!parsed.success)for(const issue of parsed.error.issues)fail('Pages',rowNumber,issue.path.join('.'),'certification_field',issue.message);
  if(parsed.success&&issues.slice(start).every(issue=>issue.severity!=='error'))changes.push({importId:page.recordId,operation:page.operation as 'create'|'update',recordId:page.operation==='update'?page.recordId:null,expectedRevision:page.operation==='update'?page.expectedRevision:null,locale:page.locale,path:`/certifications/${page.slug}`,payload:parsed.data,replacedCollections:replacements});
 }
 const valid=!issues.some(issue=>issue.severity==='error');return {valid,issues,changes:valid?changes:[]};
}
