import {z} from 'zod';
import {officeFormattingSchema} from './office-inline-formatting.ts';
import {locationSchema,newLocation,locationPath,type LocationDraft} from './locations.ts';
import {validateLocationImportTables} from './location-import-contract.ts';
import type {ImportIssue} from './import-contract.ts';
const id=/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,127}$/;
const groups=['body','address.lines','hours','coordinates','image','seo.socialImage','relationships.applications','relationships.products','relationships.projects','relationships.articles','relationships.documents'] as const;
const single=new Set(['coordinates','image','seo.socialImage']);
export type ExistingLocationImport={recordId:string;revision:string;locale:string;payload:unknown};
export type LocationImportChange={importId:string;operation:'create'|'update';recordId:string|null;expectedRevision:string|null;locale:string;path:string;payload:LocationDraft;replacedCollections:string[]};
/** Full proposed snapshots, never writes. Existing records must be caller-scoped server reads. */
export function planLocationImport(input:unknown,existing:ExistingLocationImport[]=[]){
 const raw=input&&typeof input==='object'&&!Array.isArray(input)?input as Record<string,unknown>:{};
 const {formatting,...plain}=raw,parsedFormatting=officeFormattingSchema.safeParse(formatting===undefined?[]:formatting);
 const checked=validateLocationImportTables(formatting===undefined?input:plain),issues:ImportIssue[]=[...checked.issues],changes:LocationImportChange[]=[];
 const spansByCell=new Map<string,z.infer<typeof officeFormattingSchema>[number]['spans']>();
 if(!parsedFormatting.success)issues.push({sheet:'Template',row:1,field:'formatting',code:'formatting',message:'Invalid Office text formatting.',severity:'error'});
 else for(const cell of parsedFormatting.data){const key=`${cell.sheet}:${cell.row}`,row=checked.tables[cell.sheet]?.[cell.row-2];
  if(spansByCell.has(key)||!row||cell.sheet==='Blocks'&&row.kind!=='paragraph'||cell.spans.map(span=>span.text).join('')!==row.text)issues.push({sheet:cell.sheet,row:cell.row,field:'text',code:'formatting',message:'Office formatting must match exactly one paragraph or list-item cell.',severity:'error'});
  spansByCell.set(key,cell.spans);
 }

 const fail=(sheet:string,row:number,field:string,code:string,message:string)=>issues.push({sheet,row,field,code,message,severity:'error'});
 if(!checked.valid||issues.some(issue=>issue.severity==='error'))return {valid:false,issues,changes};
 const pages=checked.tables.Pages!;if(pages.filter(page=>Object.keys(page).length).length>25){fail('Pages',1,'recordId','batch_limit','Import at most 25 locations per batch.');return {valid:false,issues,changes};}const seen=new Set<string>(),slugs=new Set<string>();
 for(const [sheet,rows]of Object.entries(checked.tables))if(sheet!=='Pages')for(const [index,row]of rows.entries())if(Object.keys(row).length&&!pages.some(page=>page.recordId===row.recordId))fail(sheet,index+2,'recordId','orphan_row','This row has no matching location in Pages.');
 for(const [pageIndex,page]of pages.entries()){
  if(!Object.keys(page).length)continue;
  const rowNumber=pageIndex+2,start=issues.length;
  if(!id.test(page.recordId)||seen.has(page.recordId))fail('Pages',rowNumber,'recordId','identity','Use a unique import ID.');seen.add(page.recordId);
  const routeKey=`${page.locale}:${page.slug}`;if(slugs.has(routeKey))fail('Pages',rowNumber,'slug','duplicate_slug','Each location must have a unique URL.');slugs.add(routeKey);
  if(!/^([a-z]{2,3})(-[A-Z]{2})?$/.test(page.locale))fail('Pages',rowNumber,'locale','locale','Use a supported language-code format.');
  if(!['create','update'].includes(page.operation))fail('Pages',rowNumber,'operation','operation','Choose create or update.');
  if(!['office','showroom','serviceCentre','warehouse','other'].includes(page.kind))fail('Pages',rowNumber,'kind','classification','Choose a supported location kind.');
  const matches=existing.filter(item=>item.recordId===page.recordId);let base:LocationDraft=newLocation();
  if(page.operation==='update'){
   if(matches.length!==1||!z.string().uuid().safeParse(page.recordId).success||!z.string().uuid().safeParse(page.expectedRevision).success||matches[0]?.revision!==page.expectedRevision)fail('Pages',rowNumber,'expectedRevision','revision_conflict','Reload the existing location and its current revision before updating.');
   else{const parsed=locationSchema.safeParse(matches[0].payload);if(!parsed.success)fail('Pages',rowNumber,'recordId','migration_required','Existing content needs migration before an import can update it.');else{base=structuredClone(parsed.data);if(base.slug!==page.slug||matches[0].locale!==page.locale)fail('Pages',rowNumber,'slug','route_change','Imports cannot change an existing URL or language.');}}
  }else if(page.expectedRevision?.trim()||matches.length)fail('Pages',rowNumber,'recordId','create_conflict','Create requires a new import ID and no expected revision.');
  const replacements=(page.replaceCollections??'').split(',').map(value=>value.trim()).filter(Boolean);
  if(new Set(replacements).size!==replacements.length||replacements.some(value=>!groups.includes(value as typeof groups[number])))fail('Pages',rowNumber,'replaceCollections','collection_intent','List only unique supported collection or image field names.');
  const draft=structuredClone(base) as unknown as Record<string,unknown>;
  const assign=(path:string,value:unknown)=>{const parts=path.split('.');let parent=draft;for(const part of parts.slice(0,-1))parent=parent[part] as Record<string,unknown>;const key=parts.at(-1)!;if(value===undefined)delete parent[key];else parent[key]=value;};
  for(const group of replacements)if(groups.includes(group as typeof groups[number]))assign(group,single.has(group)?undefined:[]);
  draft.slug=page.slug;draft.title=page.title;draft.kind=page.kind;
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
  const blockRows=(checked.tables.Blocks??[]).filter(row=>row.recordId===page.recordId);
  const listItems=new Map<string,{position:number;text:string;spans?:z.infer<typeof officeFormattingSchema>[number]['spans']}[]>();
  for(const [index,row] of (checked.tables.ListItems??[]).entries())if(row.recordId===page.recordId){
   const n=index+2,parents=blockRows.filter(block=>block.itemId===row.blockId&&block.kind==='list');
   if(parents.length!==1)fail('ListItems',n,'blockId','list_parent','Each list item must reference exactly one list block in this import.');
   checkOrder('ListItems',n,row,`list:${row.blockId}`);
   const list=listItems.get(row.blockId)??[];list.push({position:Number(row.position),text:row.text,spans:spansByCell.get(`ListItems:${n}`)});listItems.set(row.blockId,list);
  }
  const tableRows=new Map<string,{role:string;position:number;cells:string[];sourceRow:number}[]>();
  for(const [index,row]of (checked.tables.Tables??[]).entries())if(row.recordId===page.recordId){
   const n=index+2;
   if(blockRows.filter(block=>block.itemId===row.blockId&&block.kind==='table').length!==1)fail('Tables',n,'blockId','table_parent','Reference exactly one table block in Blocks.');
   if(!['header','row'].includes(row.role))fail('Tables',n,'role','table_role','Choose header or row.');
   checkOrder('Tables',n,row,`table:${row.blockId}:${row.role}`);
   const rows=tableRows.get(row.blockId)??[];rows.push({role:row.role,position:Number(row.position),cells:Array.from({length:8},(_,i)=>row[`column${i+1}`]??''),sourceRow:n});tableRows.set(row.blockId,rows);
  }
  const fieldsByKind:Record<string,string[]>={paragraph:['text'],heading:['text','level'],list:['ordered'],quote:['text','attribution'],table:['caption'],link:['label','href'],image:['assetId','alt','decorative','caption','credit']};
  for(const [index,row]of (checked.tables.Blocks??[]).entries())if(row.recordId===page.recordId){
   const n=index+2,allowed=fieldsByKind[row.kind];
   if(!Object.hasOwn(fieldsByKind,row.kind)){fail('Blocks',n,'kind','block_kind','Choose paragraph, heading, list, quote, table, link or image.');continue;}
   for(const [key,value]of Object.entries(row))if(!['recordId','itemId','position','kind',...allowed].includes(key)&&value!=='')fail('Blocks',n,key,'unused_block_field','This field does not belong to the chosen block type; content was not discarded.');
   let value:Record<string,unknown>={id:row.itemId,kind:row.kind};
   if(row.kind==='paragraph'){value.text=row.text??'';const spans=spansByCell.get(`Blocks:${n}`);if(spans)value.spans=spans;}
   if(row.kind==='heading')value={...value,level:row.level,text:row.text??''};
   if(row.kind==='quote')value={...value,text:row.text??'',attribution:row.attribution??''};
   if(row.kind==='link')value={...value,label:row.label??'',href:row.href??''};
   if(row.kind==='image')value.image=readImage('Blocks',n,row);
   if(row.kind==='table'){
    const parts=tableRows.get(row.itemId)??[],headers=parts.filter(part=>part.role==='header');
    if(headers.length!==1){fail('Blocks',n,'itemId','table_header','Each table needs exactly one header record in Tables.');continue;}
    const columns=headers[0].cells.findLastIndex(cell=>Boolean(cell.trim()))+1;
    const rows=parts.filter(part=>part.role==='row').sort((a,b)=>a.position-b.position);
    for(const part of rows)if(part.cells.slice(columns).some(cell=>cell!==''))fail('Tables',part.sourceRow,'column1','table_extra_cell','Cells beyond the last heading cannot be discarded. Add their headings.');
    value={...value,caption:row.caption??'',headers:headers[0].cells.slice(0,columns),rows:rows.map(part=>part.cells.slice(0,columns))};
   }

   if(row.kind==='list'){if(!['true','false'].includes(row.ordered))fail('Blocks',n,'ordered','boolean','Use true or false.');const items=(listItems.get(row.itemId)??[]).sort((a,b)=>a.position-b.position);value={...value,ordered:row.ordered==='true',items:items.map(item=>item.text),...(items.some(item=>item.spans)?{itemSpans:items.map(item=>item.spans??null)}:{})};}
   add('Blocks',n,row,'body',value);
  }
  for(const [index,row]of (checked.tables.Media??[]).entries())if(row.recordId===page.recordId){
   const n=index+2;if(!['image','seo.socialImage'].includes(row.role)){fail('Media',n,'role','media_role','Choose a supported image placement.');continue;}
   add('Media',n,row,row.role,readImage('Media',n,row));
  }
  for(const [index,row]of (checked.tables.Relationships??[]).entries())if(row.recordId===page.recordId){
   if(!['applications','products','projects','articles','documents'].includes(row.group)){fail('Relationships',index+2,'group','relationship_group','Choose a supported Location relationship group.');continue;}
   add('Relationships',index+2,row,`relationships.${row.group}`,{recordId:row.targetId});
  }
  for(const [index,row]of (checked.tables.AddressLines??[]).entries())if(row.recordId===page.recordId)add('AddressLines',index+2,row,'address.lines',row.text);
  const hourDays=new Map<number,{closed:boolean;intervals:{opens:string;closes:string}[]}>();
  for(const [index,row]of (checked.tables.Hours??[]).entries())if(row.recordId===page.recordId){
   const n=index+2;checkOrder('Hours',n,row,'hours');
   if(page.operation==='update'&&!replacements.includes('hours'))fail('Hours',n,'recordId','replacement_required','List hours in replaceCollections.');
   if(!/^[1-7]$/.test(row.day)||!['true','false'].includes(row.closed)){fail('Hours',n,'day','hours_day','Use weekday 1–7 and true or false for closed.');continue;}
   const day=Number(row.day),closed=row.closed==='true',prior=hourDays.get(day);
   if(closed&&((row.opens??'')!==''||(row.closes??'')!==''))fail('Hours',n,'opens','closed_hours','Closed days cannot contain opening times.');
   if(prior&&(prior.closed||closed))fail('Hours',n,'closed','duplicate_closed_day','A closed day must have exactly one row and no opening intervals.');
   const value=prior??{closed,intervals:[]};if(!closed)value.intervals.push({opens:row.opens??'',closes:row.closes??''});hourDays.set(day,value);
  }
  if(hourDays.size)assign('hours',[...hourDays].sort(([a],[b])=>a-b).map(([day,value])=>({day,intervals:value.intervals.sort((a,b)=>a.opens.localeCompare(b.opens))})));
  const coords=(checked.tables.Coordinates??[]).map((row,index)=>({row,sourceRow:index+2})).filter(entry=>entry.row.recordId===page.recordId);
  if(coords.length){
   const {row,sourceRow}=coords[0];
   if(coords.length!==1)fail('Coordinates',sourceRow,'recordId','duplicate_coordinates','Use one coordinate pair per location.');
   if(page.operation==='update'&&!replacements.includes('coordinates'))fail('Coordinates',sourceRow,'recordId','replacement_required','List coordinates in replaceCollections.');
   const decimal=/^-?(?:0|[1-9]\d*)(?:\.\d+)?$/;
   if(!decimal.test(row.latitude)||!decimal.test(row.longitude))fail('Coordinates',sourceRow,'latitude','coordinate_number','Use decimal degrees without spaces, symbols or exponents.');
   assign('coordinates',{latitude:Number(row.latitude),longitude:Number(row.longitude)});
  }
  for(const [group,rows]of buckets){rows.sort((a,b)=>a.position-b.position);if(single.has(group)){if(rows.length!==1)fail('Media',rowNumber,'role','duplicate_placement',`Only one image may occupy ${group}.`);assign(group,rows[0].value);}else assign(group,rows.map(row=>row.value));}
  const parsed=locationSchema.safeParse(draft);if(!parsed.success)for(const issue of parsed.error.issues)fail('Pages',rowNumber,issue.path.join('.'),'location_field',issue.message);
  if(parsed.success&&issues.slice(start).every(issue=>issue.severity!=='error'))changes.push({importId:page.recordId,operation:page.operation as 'create'|'update',recordId:page.operation==='update'?page.recordId:null,expectedRevision:page.operation==='update'?page.expectedRevision:null,locale:page.locale,path:locationPath(page.slug),payload:parsed.data,replacedCollections:replacements});
 }
 const valid=!issues.some(issue=>issue.severity==='error');return {valid,issues,changes:valid?changes:[]};
}
