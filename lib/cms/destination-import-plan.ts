import {z} from 'zod';
import {destinationSchema,newDestination,type DestinationDraft} from './destinations.ts';
import {reservedDestinationSlugs} from './destination-route-ownership.ts';
import {validateDestinationImportTables,type DestinationImportSheet} from './destination-import-contract.ts';
import type {ImportIssue} from './import-contract.ts';
const id=/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,127}$/;
const groups=['bestFor','highlights','image','heroImage','gallery','seo.socialImage','journeys','expeditions','pairings','faqs','sources','editorial.scoop'] as const;
const single=new Set(['image','heroImage','seo.socialImage']);
export type ExistingDestinationImport={recordId:string;revision:string;locale:string;payload:unknown};
export type DestinationImportChange={importId:string;operation:'create'|'update';recordId:string|null;expectedRevision:string|null;locale:string;path:string;payload:DestinationDraft;replacedCollections:string[]};
/** Full proposed snapshots, never writes. Existing records must be caller-scoped server reads. */
export function planDestinationImport(input:unknown,existing:ExistingDestinationImport[]=[]){
 const checked=validateDestinationImportTables(input),issues:ImportIssue[]=[...checked.issues],changes:DestinationImportChange[]=[];
 const fail=(sheet:string,row:number,field:string,code:string,message:string)=>issues.push({sheet,row,field,code,message,severity:'error'});
 if(!checked.valid)return {valid:false,issues,changes};
 const pages=checked.tables.Pages!,seen=new Set<string>(),slugs=new Set<string>();
 for(const [sheet,rows]of Object.entries(checked.tables))if(sheet!=='Pages')for(const [index,row]of rows.entries())if(Object.keys(row).length&&!pages.some(page=>page.recordId===row.recordId))fail(sheet,index+2,'recordId','orphan_row','This row has no matching destination in Pages.');
 for(const [pageIndex,page]of pages.entries()){
  if(!Object.keys(page).length)continue;
  const rowNumber=pageIndex+2,start=issues.length;
  if(!id.test(page.recordId)||seen.has(page.recordId))fail('Pages',rowNumber,'recordId','identity','Use a unique import ID.');seen.add(page.recordId);
  if(slugs.has(page.slug))fail('Pages',rowNumber,'slug','duplicate_slug','Each destination must have a unique URL.');slugs.add(page.slug);
  if(reservedDestinationSlugs.includes(page.slug))fail('Pages',rowNumber,'slug','reserved_route','This URL belongs to a specialized country or atlas page.');
  if(!/^([a-z]{2,3})(-[A-Z]{2})?$/.test(page.locale))fail('Pages',rowNumber,'locale','locale','Use a supported language-code format.');
  if(!['create','update'].includes(page.operation))fail('Pages',rowNumber,'operation','operation','Choose create or update.');
  const matches=existing.filter(item=>item.recordId===page.recordId);let base:DestinationDraft=newDestination();
  if(page.operation==='update'){
   if(matches.length!==1||!z.string().uuid().safeParse(page.recordId).success||!z.string().uuid().safeParse(page.expectedRevision).success||matches[0]?.revision!==page.expectedRevision)fail('Pages',rowNumber,'expectedRevision','revision_conflict','Reload the existing destination and its current revision before updating.');
   else{const parsed=destinationSchema.safeParse(matches[0].payload);if(!parsed.success)fail('Pages',rowNumber,'recordId','migration_required','Existing content needs migration before an import can update it.');else{base=structuredClone(parsed.data);if(base.slug!==page.slug||matches[0].locale!==page.locale)fail('Pages',rowNumber,'slug','route_change','Imports cannot change an existing URL or language.');}}
  }else if(page.expectedRevision?.trim()||matches.length)fail('Pages',rowNumber,'recordId','create_conflict','Create requires a new import ID and no expected revision.');
  const replacements=(page.replaceCollections??'').split(',').map(value=>value.trim()).filter(Boolean);
  if(new Set(replacements).size!==replacements.length||replacements.some(value=>!groups.includes(value as typeof groups[number])))fail('Pages',rowNumber,'replaceCollections','collection_intent','List only unique supported collection or image field names.');
  const draft=structuredClone(base) as unknown as Record<string,unknown>;
  const assign=(path:string,value:unknown)=>{const parts=path.split('.');if(parts.length===1){if(value===undefined)delete draft[path];else draft[path]=value;}else{const parent=draft[parts[0]] as Record<string,unknown>;if(value===undefined)delete parent[parts[1]];else parent[parts[1]]=value;}};
  for(const group of replacements)if(groups.includes(group as typeof groups[number]))assign(group,single.has(group)?undefined:[]);
  draft.slug=page.slug;draft.title=page.title;
  const scalarSeen=new Set<string>();
  for(const [index,row]of (checked.tables.Content??[]).entries())if(row.recordId===page.recordId){if(scalarSeen.has(row.field))fail('Content',index+2,'field','duplicate_field','Use one row per content field.');scalarSeen.add(row.field);assign(row.field,row.value??'');}
  const buckets=new Map<string,{position:number;value:unknown}[]>(),itemIds=new Set<string>(),positions=new Set<string>();
  for(const sheet of ['Lists','Media','Related','FAQs','Sources','Notes'] as DestinationImportSheet[])for(const [index,row]of (checked.tables[sheet]??[]).entries()){
   if(row.recordId!==page.recordId)continue;const n=index+2;
   let group:string='';let value:unknown;
   if(sheet==='Lists'){group=row.field;value=row.text;if(!['bestFor','highlights'].includes(group)){fail(sheet,n,'field','list_field','Choose bestFor or highlights.');continue;}}
   if(sheet==='Media'){group=row.role;if(!['image','heroImage','gallery','seo.socialImage'].includes(group)){fail(sheet,n,'role','media_role','Choose a supported image placement.');continue;}if(!['true','false'].includes(row.decorative))fail(sheet,n,'decorative','boolean','Use true or false.');value={assetId:row.assetId,alt:row.alt??'',decorative:row.decorative==='true',...(row.caption!==undefined?{caption:row.caption}:{}),...(row.credit!==undefined?{credit:row.credit}:{})};}
   if(sheet==='Related'){group=row.type==='journey'?'journeys':row.type==='photoExpedition'?'expeditions':row.type==='destination'?'pairings':'';if(!group){fail(sheet,n,'type','reference_type','Choose journey, photoExpedition or destination.');continue;}value={recordId:row.targetId,...(group==='pairings'?{title:row.title??'',reason:row.reason??''}:{})};if(group!=='pairings'&&(row.title||row.reason))fail(sheet,n,'title','unused_pairing_copy','Pairing copy applies only to destination relationships.');}
   if(sheet==='FAQs'){group='faqs';value={question:row.question,answer:row.answer};}
   if(sheet==='Sources'){group='sources';value={title:row.title,url:row.url,publisher:row.publisher??'',accessedAt:row.accessedAt};}
   if(sheet==='Notes'){group='editorial.scoop';value={title:row.title,blurb:row.blurb??'',body:row.body??''};}
   if(page.operation==='update'&&!replacements.includes(group))fail(sheet,n,'recordId','replacement_required',`List ${group} in replaceCollections to replace its complete contents.`);
   const itemKey=`${group}:${row.itemId}`,positionKey=`${group}:${row.position}`;
   if(!id.test(row.itemId)||itemIds.has(itemKey))fail(sheet,n,'itemId','item_identity','Use a unique item ID within this collection.');itemIds.add(itemKey);
   if(!/^[1-9]\d*$/.test(row.position)||!Number.isSafeInteger(Number(row.position))||positions.has(positionKey))fail(sheet,n,'position','position','Use unique positive integer positions within this collection.');positions.add(positionKey);
   const list=buckets.get(group)??[];list.push({position:Number(row.position),value});buckets.set(group,list);
  }
  for(const [group,rows]of buckets){rows.sort((a,b)=>a.position-b.position);if(single.has(group)){if(rows.length!==1)fail('Media',rowNumber,'role','duplicate_placement',`Only one image may occupy ${group}.`);assign(group,rows[0].value);}else assign(group,rows.map(row=>row.value));}
  const parsed=destinationSchema.safeParse(draft);if(!parsed.success)for(const issue of parsed.error.issues)fail('Pages',rowNumber,issue.path.join('.'),'destination_field',issue.message);
  if(parsed.success&&issues.slice(start).every(issue=>issue.severity!=='error'))changes.push({importId:page.recordId,operation:page.operation as 'create'|'update',recordId:page.operation==='update'?page.recordId:null,expectedRevision:page.operation==='update'?page.expectedRevision:null,locale:page.locale,path:`/destinations/${page.slug}`,payload:parsed.data,replacedCollections:replacements});
 }
 const valid=!issues.some(issue=>issue.severity==='error');return {valid,issues,changes:valid?changes:[]};
}
