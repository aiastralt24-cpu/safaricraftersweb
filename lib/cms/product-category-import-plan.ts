import {z} from 'zod';
import {productCategorySchema,newProductCategory,productCategoryPath,type ProductCategoryDraft} from './products.ts';
import {validateProductCategoryImportTables,type ProductCategoryImportSheet} from './product-category-import-contract.ts';
import type {ImportIssue} from './import-contract.ts';
export type ExistingProductCategoryImport={recordId:string;revision:string;locale:string;payload:unknown};
export type ProductCategoryImportChange={importId:string;operation:'create'|'update';recordId:string|null;expectedRevision:string|null;locale:string;path:string;payload:ProductCategoryDraft;replacedCollections:string[]};
/** Pure planning only. Existing records must be scoped reads; parent/media eligibility is checked during server review. */
export function planProductCategoryImport(input:unknown,existing:ExistingProductCategoryImport[]=[]){
 const checked=validateProductCategoryImportTables(input),issues:ImportIssue[]=[...checked.issues],changes:ProductCategoryImportChange[]=[];
 const fail=(sheet:string,row:number,field:string,code:string,message:string)=>issues.push({sheet,row,field,code,message,severity:'error'});
 if(!checked.valid)return {valid:false,issues,changes};
 const pages=checked.tables.Pages!,present=(row:Record<string,string>)=>Object.keys(row).length>0;
 if(pages.filter(present).length>25){fail('Pages',1,'recordId','batch_limit','Import at most 25 categories per batch.');return {valid:false,issues,changes};}
 const seen=new Set<string>(),routes=new Set<string>();
 for(const [sheet,rows]of Object.entries(checked.tables))if(sheet!=='Pages')for(const [i,row]of rows.entries())if(present(row)&&!pages.some(p=>p.recordId===row.recordId))fail(sheet,i+2,'recordId','orphan_row','No matching category in Pages.');
 for(const [i,page]of pages.entries()){
  if(!present(page))continue;const n=i+2,start=issues.length;
  if(!/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,127}$/.test(page.recordId)||seen.has(page.recordId))fail('Pages',n,'recordId','identity','Use a unique import ID.');seen.add(page.recordId);
  const route=`${page.locale}:${page.slug}`;if(routes.has(route))fail('Pages',n,'slug','duplicate_slug','Each category needs a unique URL.');routes.add(route);
  if(!/^([a-z]{2,3})(-[A-Z]{2})?$/.test(page.locale))fail('Pages',n,'locale','locale','Use a supported language code format.');
  if(!['create','update'].includes(page.operation))fail('Pages',n,'operation','operation','Choose create or update.');
  let draft=newProductCategory();const matches=existing.filter(e=>e.recordId===page.recordId);
  if(page.operation==='update'){
   if(matches.length!==1||!z.string().uuid().safeParse(page.recordId).success||!z.string().uuid().safeParse(page.expectedRevision).success||matches[0]?.revision!==page.expectedRevision)fail('Pages',n,'expectedRevision','revision_conflict','Reload the current category revision before updating.');
   else{const parsed=productCategorySchema.safeParse(matches[0].payload);if(!parsed.success)fail('Pages',n,'recordId','migration_required','Existing category needs migration before import.');else{draft=structuredClone(parsed.data);if(draft.slug!==page.slug||matches[0].locale!==page.locale)fail('Pages',n,'slug','route_change','Imports cannot change an existing URL or language.');}}
  }else if(page.expectedRevision?.trim()||matches.length)fail('Pages',n,'recordId','create_conflict','Create requires a new import ID and no expected revision.');
  const replacedCollections=(page.replaceCollections??'').split(',').map(s=>s.trim()).filter(Boolean);
  if(new Set(replacedCollections).size!==replacedCollections.length||replacedCollections.some(s=>!['attributeGroups','seo.socialImage'].includes(s)))fail('Pages',n,'replaceCollections','collection_intent','Use unique supported collection names.');
  if(replacedCollections.includes('attributeGroups'))draft.attributeGroups=[];
  if(replacedCollections.includes('seo.socialImage'))delete draft.seo.socialImage;
  draft.title=page.title;draft.slug=page.slug;
  const rows=(sheet:ProductCategoryImportSheet)=>(checked.tables[sheet]??[]).map((row,index)=>({row,n:index+2})).filter(({row})=>row.recordId===page.recordId);
  const fields=new Set<string>();
  for(const {row,n}of rows('Content')){
   if(fields.has(row.field))fail('Content',n,'field','duplicate_field','Use one row per content field.');fields.add(row.field);
   if(row.field==='parent.recordId')draft.parent=row.value?{recordId:row.value}:null;
   else if(row.field.startsWith('seo.'))(draft.seo as unknown as Record<string,unknown>)[row.field.slice(4)]=row.value??'';
   else (draft as unknown as Record<string,unknown>)[row.field]=row.value??'';
  }
  const ids=new Set<string>(),positions=new Set<string>();
  const order=(sheet:string,n:number,row:Record<string,string>,scope:string)=>{
   if(!/^[a-z][a-z0-9_-]{0,63}$/.test(row.itemId)||ids.has(`${scope}:${row.itemId}`))fail(sheet,n,'itemId','item_identity','Use a unique stable lowercase item ID.');ids.add(`${scope}:${row.itemId}`);
   if(!/^\d{1,3}$/.test(row.position)||positions.has(`${scope}:${Number(row.position)}`))fail(sheet,n,'position','position','Use distinct integer positions from 0 to 999.');positions.add(`${scope}:${Number(row.position)}`);
  };
  const bool=(sheet:string,n:number,row:Record<string,string>,key:string)=>{if(!['true','false'].includes(row[key]))fail(sheet,n,key,'boolean','Use exactly true or false.');return row[key]==='true';};
  const groups=rows('Groups'),attributes=rows('Attributes');
  const hasDefinitions=['Groups','Attributes','Choices','Regions'].some(s=>rows(s as ProductCategoryImportSheet).length);
  if(hasDefinitions&&page.operation==='update'&&!replacedCollections.includes('attributeGroups'))fail('Pages',n,'replaceCollections','replacement_required','Explicitly replace the complete attributeGroups collection.');
  for(const {row,n}of groups)order('Groups',n,row,'groups');
  for(const {row,n}of attributes){order('Attributes',n,row,`attributes:${row.groupId}`);if(groups.filter(g=>g.row.itemId===row.groupId).length!==1)fail('Attributes',n,'groupId','orphan_attribute','Reference exactly one group in this import.');}
  for(const sheet of ['Choices','Regions'] as const)for(const {row,n}of rows(sheet)){
   order(sheet,n,row,`${sheet}:${row.attributeId}`);const parents=attributes.filter(a=>a.row.itemId===row.attributeId);
   if(parents.length!==1)fail(sheet,n,'attributeId','orphan_attribute','Reference exactly one attribute in this import.');
   if(sheet==='Choices'&&parents[0]?.row.valueType!=='choice')fail(sheet,n,'attributeId','choice_type','Allowed choices belong only to choice attributes.');
  }
  const ordered=<T extends {row:Record<string,string>}>(values:T[])=>[...values].sort((a,b)=>Number(a.row.position)-Number(b.row.position));
  if(hasDefinitions)draft.attributeGroups=ordered(groups).map(({row:g})=>({id:g.itemId,title:g.title,position:Number(g.position),attributes:ordered(attributes.filter(a=>a.row.groupId===g.itemId)).map(({row:a,n})=>({id:a.itemId,label:a.label,position:Number(a.position),valueType:a.valueType as 'text'|'number'|'boolean'|'choice',unit:a.unit??'',required:bool('Attributes',n,a,'required'),allowNotApplicable:bool('Attributes',n,a,'allowNotApplicable'),filterEligible:bool('Attributes',n,a,'filterEligible'),comparisonEligible:bool('Attributes',n,a,'comparisonEligible'),allowedValues:ordered(rows('Choices').filter(r=>r.row.attributeId===a.itemId)).map(r=>r.row.value),regions:ordered(rows('Regions').filter(r=>r.row.attributeId===a.itemId)).map(r=>({countryCode:r.row.countryCode,region:r.row.region??''}))}))}));
  const media=rows('Media');if(media.length>1)fail('Media',media[1].n,'recordId','duplicate_image','Use one sharing image per category.');
  for(const {row,n}of media){if(page.operation==='update'&&!replacedCollections.includes('seo.socialImage'))fail('Media',n,'recordId','replacement_required','Explicitly replace seo.socialImage.');draft.seo.socialImage={assetId:row.assetId,alt:row.alt??'',decorative:bool('Media',n,row,'decorative'),...(row.caption!==undefined?{caption:row.caption}:{}),...(row.credit!==undefined?{credit:row.credit}:{})};}
  const parsed=productCategorySchema.safeParse(draft);if(!parsed.success)for(const issue of parsed.error.issues)fail('Pages',n,issue.path.join('.'),'category_field',issue.message);
  if(page.operation==='update'&&draft.parent?.recordId.toLowerCase()===page.recordId.toLowerCase())fail('Content',n,'parent.recordId','self_parent','A category cannot be its own parent.');
  if(parsed.success&&issues.slice(start).every(issue=>issue.severity!=='error'))changes.push({importId:page.recordId,operation:page.operation as 'create'|'update',recordId:page.operation==='update'?page.recordId:null,expectedRevision:page.operation==='update'?page.expectedRevision:null,locale:page.locale,path:productCategoryPath(page.slug),payload:parsed.data,replacedCollections});
 }
 const valid=!issues.some(issue=>issue.severity==='error');return {valid,issues,changes:valid?changes:[]};
}
