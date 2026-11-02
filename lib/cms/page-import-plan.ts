import {z} from 'zod';
import {comparePageImport,type PageImportComparison} from './page-import-comparison.ts';
import {validatePageImportTables,type PageImportSheet} from './page-import-contract.ts';
import {validateComposition,type Composition} from './composition.ts';
import {pageSeoSchema,newPageSeo,type PageSeo} from './page-seo.ts';
import {isCustomPagePath} from './custom-page-path.ts';
import type {ImportIssue} from './import-contract.ts';
export type ExistingPageImport={recordId:string;revision:string;path:string;locale:string;payload:Record<string,unknown>};
export type PageImportChange={importId:string;operation:'create'|'update';recordId:string|null;expectedRevision:string|null;path:string;locale:'en';title:string;payload:{composition:Composition;seo:PageSeo};replaceSections:boolean;comparison:PageImportComparison};
const id=/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,127}$/;
type Row={value:Record<string,string>;row:number;sheet:PageImportSheet};
/** Pure proposal builder. Existing records must be caller-scoped server reads.
 * Valid proposals still need trusted media/document evidence and explicit apply. */
export function planPageImport(input:unknown,existing:ExistingPageImport[]=[]){
 const checked=validatePageImportTables(input),issues:ImportIssue[]=[...checked.issues],changes:PageImportChange[]=[];
 const fail=(row:Row,field:string,code:string,message:string)=>issues.push({sheet:row.sheet,row:row.row,field,code,message,severity:'error'});
 if(!checked.valid)return {valid:false,issues,changes};
 const rows=(sheet:PageImportSheet):Row[]=>(checked.tables[sheet]??[]).flatMap((value,index)=>Object.keys(value).length?[{value,row:index+2,sheet}]:[]);
 const pages=rows('Pages'),seen=new Set<string>(),paths=new Set<string>();
 if(pages.length>25){issues.push({sheet:'Pages',row:1,field:'recordId',code:'batch_limit',message:'Import at most 25 pages.',severity:'error'});return {valid:false,issues,changes};}
 const all=(Object.keys(checked.tables) as PageImportSheet[]).flatMap(rows);
 for(const row of all)if(row.sheet!=='Pages'&&!pages.some(page=>page.value.recordId===row.value.recordId))fail(row,'recordId','orphan_row','No page matches this import ID.');
 const boolean=(row:Row,key:string,fallback=false)=>{const value=row.value[key];if(!value)return fallback;if(!['true','false'].includes(value))fail(row,key,'boolean','Use true or false.');return value==='true';};
 const ordered=(values:Row[],key='itemId')=>{const ids=new Set<string>(),positions=new Set<number>();for(const row of values){const value=row.value,n=Number(value.position);if(!id.test(value[key]??'')||ids.has(value[key]))fail(row,key,'identity','Use a unique stable ID.');ids.add(value[key]);if(!/^[1-9]\d*$/.test(value.position??'')||!Number.isSafeInteger(n)||positions.has(n))fail(row,'position','position','Use unique positive integer positions.');positions.add(n);}return [...values].sort((a,b)=>Number(a.value.position)-Number(b.value.position));};
 for(const pageRow of pages){
  const page=pageRow.value,start=issues.length;
  if(!id.test(page.recordId)||seen.has(page.recordId))fail(pageRow,'recordId','identity','Use a unique page import ID.');seen.add(page.recordId);
  if(!isCustomPagePath(page.path)||paths.has(page.path))fail(pageRow,'path','path','Choose a unique custom URL outside reserved website routes.');paths.add(page.path);
  if(page.locale!=='en')fail(pageRow,'locale','locale','Only English editorial pages are connected.');
  if(!['create','update'].includes(page.operation))fail(pageRow,'operation','operation','Choose create or update.');
  let previous:{composition:Composition;seo:PageSeo}|null=null;
  let composition:Composition={schemaVersion:1,title:page.title,sections:[]},seo=newPageSeo();const matches=existing.filter(value=>value.recordId===page.recordId);
  if(page.operation==='update'){
   if(matches.length!==1||!z.string().uuid().safeParse(page.recordId).success||!z.string().uuid().safeParse(page.expectedRevision).success||matches[0]?.revision!==page.expectedRevision)fail(pageRow,'expectedRevision','revision_conflict','Reload the current accessible page revision.');
   else{const source=matches[0],parsed=validateComposition(source.payload.composition),parsedSeo=pageSeoSchema.safeParse(source.payload.seo??newPageSeo());if(Object.keys(source.payload).some(key=>!['composition','seo'].includes(key))||!parsed.valid||!parsed.page||!parsedSeo.success)fail(pageRow,'recordId','migration_required','Repair existing content before importing; unknown content cannot be discarded.');else{composition=structuredClone(parsed.page);seo=structuredClone(parsedSeo.data);previous={composition:structuredClone(composition),seo:structuredClone(seo)};}if(source.path!==page.path||source.locale!==page.locale)fail(pageRow,'path','route_change','Imports cannot change an existing URL or language.');}
  }else if(page.expectedRevision?.trim()||matches.length)fail(pageRow,'recordId','create_conflict','Create requires a new import ID and no expected revision.');
  const related=all.filter(row=>row.sheet!=='Pages'&&row.value.recordId===page.recordId),sections=ordered(related.filter(row=>row.sheet==='Sections'),'sectionId');
  const replace=boolean(pageRow,'replaceSections');
  if(page.operation==='update'&&related.some(row=>row.sheet!=='SEO')&&!replace)fail(pageRow,'replaceSections','replacement_required','Set replaceSections to true to replace the complete section list.');
  const seenSeo=new Set<string>();for(const row of related.filter(row=>row.sheet==='SEO')){if(seenSeo.has(row.value.field))fail(row,'field','duplicate_field','Use one row per SEO field.');seenSeo.add(row.value.field);(seo as unknown as Record<string,unknown>)[row.value.field]=row.value.value??'';}
  for(const row of related)if(!['Sections','SEO'].includes(row.sheet)&&!sections.some(section=>section.value.sectionId===row.value.sectionId))fail(row,'sectionId','orphan_section','No section matches this ID in the imported section list.');
  const output:unknown[]=[];
  for(const section of sections){
   const value=section.value,kind=value.kind,children=related.filter(row=>row.value.sectionId===value.sectionId&&!['Sections','SEO'].includes(row.sheet));
   const allowed:Record<string,string[]>={hero:['SectionContent','Images','Buttons'],text:['SectionContent','Blocks','ListItems'],imageText:['SectionContent','Blocks','ListItems','Images','Buttons'],cards:['SectionContent','Cards','Images'],cta:['SectionContent','Buttons'],downloads:['SectionContent','Downloads']};
   if(!allowed[kind]){fail(section,'kind','section_kind','Choose an approved editorial section type.');continue;}
   for(const row of children)if(!allowed[kind].includes(row.sheet))fail(row,'sectionId','section_relationship',`${row.sheet} rows do not belong to ${kind} sections.`);
   const data:Record<string,unknown>={},controls:Record<string,unknown>={};for(const [key,item]of Object.entries(value))if(!['recordId','sectionId','position','kind','visible'].includes(key)&&item!=='')controls[key]=item;controls.visible=boolean(section,'visible',true);
   const scalarSeen=new Set<string>();for(const row of children.filter(row=>row.sheet==='SectionContent')){if(scalarSeen.has(row.value.field))fail(row,'field','duplicate_field','Use one row per section field.');scalarSeen.add(row.value.field);data[row.value.field]=row.value.field==='columns'?Number(row.value.value):row.value.value??'';}
   const select=(sheet:PageImportSheet)=>children.filter(row=>row.sheet===sheet);
   const unused=(row:Row,keys:string[])=>{for(const [key,item]of Object.entries(row.value))if(item!==''&&!['recordId','sectionId','itemId','position',...keys].includes(key))fail(row,key,'unused_field','This field does not apply to this item; remove it rather than lose content.');};
   const blocks=ordered(select('Blocks')).map(row=>{const b=row.value;if(b.kind==='paragraph'){unused(row,['kind','text']);return {kind:'paragraph',text:b.text??''};}if(b.kind==='link'){unused(row,['kind','label','href','style']);return {kind:'link',label:b.label,href:b.href,...(b.style?{style:b.style}:{})};}if(b.kind==='list'){unused(row,['kind','ordered']);return {kind:'list',ordered:boolean(row,'ordered'),items:ordered(select('ListItems').filter(item=>item.value.blockId===b.itemId)).map(item=>item.value.text)};}fail(row,'kind','block_kind','Choose paragraph, list or link.');return {};});
   for(const row of select('ListItems'))if(!select('Blocks').some(block=>block.value.itemId===row.value.blockId&&block.value.kind==='list'))fail(row,'blockId','orphan_list','Choose a list block in the same section.');
   const buttons=ordered(select('Buttons')).map(row=>({label:row.value.label,href:row.value.href,newWindow:boolean(row,'newWindow')}));
   const cards=ordered(select('Cards')).map(row=>{const c=row.value;if(Boolean(c.label)!==Boolean(c.href))fail(row,'href','incomplete_link','Provide both a card label and destination.');return {id:c.itemId,title:c.title,copy:c.copy??'',...(c.eyebrow?{eyebrow:c.eyebrow}:{}),...(c.href?{link:{label:c.label,href:c.href,newWindow:false}}:{})} as Record<string,unknown>;});
   if(kind==='text'||kind==='imageText')data.body=blocks;
   if(kind==='hero'||kind==='cta')data.buttons=buttons;
   if(kind==='imageText'){if(buttons.length>1)fail(section,'kind','button_limit','Image/text sections support one button.');if(buttons[0])data.button=buttons[0];}
   if(kind==='cards'){data.items=cards;data.columns=data.columns??3;}
   if(kind==='downloads')data.items=ordered(select('Downloads')).map(row=>({id:row.value.itemId,label:row.value.label,document:{recordId:row.value.documentId},versionId:row.value.versionId}));
   const imageKeys=new Set<string>();for(const row of select('Images')){const image=row.value,key=image.target+':'+(image.itemId??'');if(imageKeys.has(key))fail(row,'target','duplicate_image','Use one image per target.');imageKeys.add(key);const imageValue={assetId:image.assetId,alt:image.alt??'',decorative:boolean(row,'decorative'),...(image.caption?{caption:image.caption}:{}),...(image.credit?{credit:image.credit}:{})};
    if(kind==='hero'&&['desktop','mobile'].includes(image.target)&&!image.itemId||kind==='imageText'&&image.target==='image'&&!image.itemId)data[image.target]=imageValue;
    else if(kind==='cards'&&image.target==='card'){const card=cards.find(card=>card.id===image.itemId);if(card)card.image=imageValue;else fail(row,'itemId','orphan_card','Choose an existing card ID in this section.');}
    else fail(row,'target','image_target','Choose an image target supported by this section.');
   }
   output.push({id:value.sectionId,kind,controls,data});
  }
  if(page.operation==='create'||replace)composition={schemaVersion:1,title:page.title,sections:output as Composition['sections']};else composition.title=page.title;
  const parsed=validateComposition(composition),parsedSeo=pageSeoSchema.safeParse(seo);
  for(const issue of parsed.issues){const index=/^sections\.(\d+)/.exec(issue.path);const source=index?sections[Number(index[1])]:undefined;fail(source??pageRow,issue.path,'composition_field',issue.message);}
  if(!parsedSeo.success)for(const issue of parsedSeo.error.issues)fail(pageRow,`seo.${issue.path.join('.')}`,'seo_field',issue.message);
  if(parsed.valid&&parsed.page&&parsedSeo.success&&!issues.slice(start).some(issue=>issue.severity==='error'))changes.push({importId:page.recordId,operation:page.operation as 'create'|'update',recordId:page.operation==='update'?page.recordId:null,expectedRevision:page.operation==='update'?page.expectedRevision:null,path:page.path,locale:'en',title:page.title,payload:{composition:parsed.page,seo:parsedSeo.data},replaceSections:replace,comparison:comparePageImport(previous,{composition:parsed.page,seo:parsedSeo.data})});
 }
 const valid=!issues.some(issue=>issue.severity==='error');return {valid,issues,changes:valid?changes:[]};
}
