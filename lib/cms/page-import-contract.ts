import {countCharacters,type FieldDefinition,type ImportIssue} from './import-contract.ts';
export const PAGE_TEMPLATE_VERSION='1.0';
const text=(key:string,label:string,max:number,required=false):FieldDefinition=>({key,label,max,required});
const record=text('recordId','Page import ID',128,true),section=text('sectionId','Section ID',128,true),item=text('itemId','Item ID',128,true),position=text('position','Display order',6,true);
export const pageImportTemplate={version:PAGE_TEMPLATE_VERSION,type:'page',sheets:{
 Pages:[record,text('operation','create or update',10,true),text('expectedRevision','Current revision for update',36),text('path','Custom page URL',500,true),text('title','Page title',200,true),text('locale','Language',12,true),text('replaceSections','true to replace all sections on update',5)],
 Sections:[record,section,position,text('kind','hero, text, imageText, cards, cta or downloads',20,true),text('label','Editor label',200,true),text('headingLevel','h1, h2 or h3',2,true),text('visible','true or false',5),text('anchor','Section anchor',80),text('background','Approved background',30),text('width','Approved width',30),text('spacing','Approved spacing',30),text('textAlign','start or center',20),text('mediaAlign','start or end',20),text('mobileOrder','textFirst or mediaFirst',20),text('animation','none, fade or reveal',20),text('visibleFrom','ISO timestamp',40),text('visibleUntil','ISO timestamp',40)],
 SectionContent:[record,section,text('field','Section content field',60,true),text('value','Section copy',10000)],
 Blocks:[record,section,item,position,text('kind','paragraph, list or link',20,true),text('text','Paragraph text',10000),text('ordered','true or false for list',5),text('label','Link label',200),text('href','Link destination',2048),text('style','text or button',20)],
 ListItems:[record,section,text('blockId','List block ID',128,true),item,position,text('text','List item',2000,true)],
 Cards:[record,section,item,position,text('eyebrow','Card role or eyebrow',200),text('title','Card heading',200,true),text('copy','Card copy',10000),text('label','Card link label',30),text('href','Card destination',2048)],
 Images:[record,section,text('target','desktop, mobile, image or card',20,true),text('itemId','Card ID for card image',128),text('assetId','Processed CMS image ID',128,true),text('alt','Alternative text',500),text('decorative','true or false',5),text('caption','Caption',2000),text('credit','Credit',500)],
 Buttons:[record,section,item,position,text('label','Button label',30,true),text('href','Button destination',2048,true),text('newWindow','true or false',5)],
 Downloads:[record,section,item,position,text('label','Download label',200,true),text('documentId','Published document UUID',36,true),text('versionId','Reviewed document revision UUID',36,true)],
 SEO:[record,text('field','SEO field',60,true),text('value','SEO value',2048)],
}} satisfies {version:string;type:string;sheets:Record<string,FieldDefinition[]>};
export type PageImportSheet=keyof typeof pageImportTemplate.sheets;
export const pageSectionContentFields:Record<string,{max:number;recommended?:number}>={title:{max:200,recommended:80},titleAccent:{max:200},eyebrow:{max:200},copy:{max:10000},introduction:{max:10000},columns:{max:1},layout:{max:30}};
export const pageImportSeoFields:Record<string,{max:number;recommended?:number}>={title:{max:200,recommended:60},description:{max:1000,recommended:160},canonical:{max:2048},indexing:{max:20},following:{max:20},socialTitle:{max:200},socialDescription:{max:1000},breadcrumbLabel:{max:200},sitemap:{max:20}};
/** Cell validation only. Relationship/section semantics, authorization and apply
 * belong to planning and server review. Never truncates or silently drops data. */
export function validatePageImportTables(input:unknown){
 const issues:ImportIssue[]=[],tables:Partial<Record<PageImportSheet,Record<string,string>[]>>={};
 const add=(sheet:string,row:number,field:string,code:string,message:string,severity:'error'|'warning'='error')=>issues.push({sheet,row,field,code,message,severity});
 const object=(value:unknown):value is Record<string,unknown>=>Boolean(value&&typeof value==='object'&&!Array.isArray(value));
 if(!object(input)||input.templateVersion!==PAGE_TEMPLATE_VERSION||input.pageType!=='page'||!object(input.sheets))return {valid:false,issues:[{sheet:'Template',row:1,field:'version',severity:'error' as const,code:'template',message:'Use the supported editorial page template.'}],tables};
 for(const key of Object.keys(input))if(!['templateVersion','pageType','sheets'].includes(key))add('Template',1,key,'unknown_field','Unknown template field.');
 let total=0,characters=0;
 for(const [sheet,rows]of Object.entries(input.sheets)){
  if(!Object.hasOwn(pageImportTemplate.sheets,sheet)){add(sheet,1,'sheet','unknown_sheet','Unknown sheet; content was not discarded.');continue;}
  if(!Array.isArray(rows)){add(sheet,1,'sheet','sheet_shape','Expected rows.');continue;}total+=rows.length;if(total>500){add(sheet,1,'sheet','row_limit','Use at most 500 rows across the template.');break;}
  const fields:FieldDefinition[]=pageImportTemplate.sheets[sheet as PageImportSheet],result:Record<string,string>[]=[];
  rows.forEach((row,index)=>{const number=index+2;if(!object(row)){add(sheet,number,'row','row_shape','Expected a content row.');return;}
   if(Object.keys(row).every(key=>fields.some(field=>field.key===key))&&Object.values(row).every(value=>value==null||typeof value==='string'&&!value.trim())){result.push({});return;}
   const normalized:Record<string,string>={};for(const key of Object.keys(row))if(!fields.some(field=>field.key===key))add(sheet,number,key,'unknown_field','Unknown column; content was not discarded.');
   for(const field of fields){const raw=row[field.key];if(raw==null){if(field.required)add(sheet,number,field.key,'required','This field is required.');continue;}
    if(typeof raw!=='string'&&!(field.key==='position'&&typeof raw==='number'&&Number.isSafeInteger(raw))){add(sheet,number,field.key,'cell_type','Use text; only display order accepts numbers.');continue;}
    const value=String(raw);normalized[field.key]=value;characters+=value.length;if(field.required&&!value.trim())add(sheet,number,field.key,'required','This field is required.');if(field.max&&countCharacters(value)>field.max)add(sheet,number,field.key,'character_limit',`Maximum ${field.max} characters.`);
   }
   if((sheet==='SectionContent'||sheet==='SEO')&&normalized.field){const definitions=sheet==='SEO'?pageImportSeoFields:pageSectionContentFields,rule=Object.hasOwn(definitions,normalized.field)?definitions[normalized.field]:undefined;if(!rule)add(sheet,number,'field','unknown_content_field','Choose a supported content field.');else{const length=countCharacters(normalized.value??'');if(length>rule.max)add(sheet,number,'value','character_limit',`Maximum ${rule.max} characters.`);if(rule.recommended&&length>rule.recommended)add(sheet,number,'value','editorial_guidance',`Recommended maximum ${rule.recommended} characters.`,'warning');}}
   result.push(normalized);
  });tables[sheet as PageImportSheet]=result;
 }
 if(!tables.Pages?.some(row=>Object.keys(row).length))add('Pages',2,'recordId','required','Include at least one page.');
 if(characters>2_000_000)add('Template',1,'size','character_limit','Template text exceeds 2 million characters.');
 return {valid:!issues.some(issue=>issue.severity==='error'),issues,tables};
}
