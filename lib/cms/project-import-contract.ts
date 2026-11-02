import {countCharacters,countWords,type FieldDefinition,type ImportIssue} from './import-contract.ts';
export const PROJECT_TEMPLATE_VERSION='1.0';
const text=(key:string,label:string,max:number,required=false):FieldDefinition=>({key,label,max,required});
const id=text('recordId','Project import ID',128,true);
const ordered=[id,text('itemId','Stable item ID',128,true),text('position','Display order',6,true)];
const imageFields=[text('assetId','Processed CMS image ID',128),text('alt','Alternative text',500),text('decorative','true or false',5),text('caption','Image caption',2000),text('credit','Image credit',500)];
export const projectTemplate={version:PROJECT_TEMPLATE_VERSION,type:'project',sheets:{
 Pages:[id,text('operation','Create or update',10,true),text('expectedRevision','Current revision for updates',36),text('slug','Project URL slug',100,true),text('title','Project title',200,true),text('locale','Language code',12,true),text('replaceCollections','Collections to replace or clear',200)],
 Content:[id,text('field','Content field',100,true),text('value','Content text',10000)],
 Blocks:[...ordered,text('section','body, challenge, approach or outcomes',20,true),text('kind','paragraph, list, quote, table or link',20,true),text('text','Paragraph or quote text',10000),text('ordered','true or false for lists',5),text('attribution','Quote attribution',200),text('label','Link label',200),text('href','Link destination',2048),text('caption','Table caption',500)],
 Tables:[...ordered,text('blockId','Parent table block ID',128,true),text('role','header or row',10,true),...Array.from({length:8},(_,i)=>text(`column${i+1}`,`Column ${i+1} text`,5000))],
 ListItems:[...ordered,text('blockId','Parent list block ID',128,true),text('text','List item text',2000,true)],
 Media:[...ordered,text('role','image, gallery or seo.socialImage',30,true),...imageFields],
 Relationships:[...ordered,text('group','projects, products, destinations or documents',20,true),text('targetId','Related CMS record UUID',36,true)],
 Claims:[id,text('itemId','Claim UUID',36,true),text('position','Display order',6,true),text('statement','Claim statement',2000,true),text('approvalContact','Intended approval contact',200),text('reviewOn','Review date YYYY-MM-DD',10)],
 Evidence:[...ordered,text('claimId','Parent claim UUID',36,true),text('targetId','Supporting document UUID',36,true)],
}} satisfies {version:string;type:string;sheets:Record<string,FieldDefinition[]>};
export type ProjectImportSheet=keyof typeof projectTemplate.sheets;
export const projectContentFields:Record<string,{max:number;guidance?:{unit:'words'|'characters';max:number}}>={
 kind:{max:20},summary:{max:2000,guidance:{unit:'words',max:80}},client:{max:200},industry:{max:120},location:{max:200},completedOn:{max:10},
 'seo.title':{max:200,guidance:{unit:'characters',max:60}},'seo.description':{max:1000,guidance:{unit:'characters',max:160}},'seo.canonical':{max:2048},'seo.following':{max:200},'seo.breadcrumbLabel':{max:200},'seo.indexing':{max:200},'seo.sitemap':{max:200},'seo.socialTitle':{max:200},'seo.socialDescription':{max:1000},
};
/** Table-level validation only; does not resolve links, plan changes or authorize writes. */
export function validateProjectImportTables(input:unknown){
 const issues:ImportIssue[]=[],tables:Partial<Record<ProjectImportSheet,Record<string,string>[]>>={};
 const error=(sheet:string,row:number,field:string,code:string,message:string,severity:'error'|'warning'='error')=>issues.push({sheet,row,field,code,message,severity});
 const object=(value:unknown):value is Record<string,unknown>=>Boolean(value&&typeof value==='object'&&!Array.isArray(value));
 if(!object(input)||input.templateVersion!==PROJECT_TEMPLATE_VERSION||input.pageType!=='project'||!object(input.sheets))return {valid:false,issues:[{sheet:'Template',row:1,field:'version',severity:'error' as const,code:'template',message:'Use the supported project template.'}],tables};
 for(const key of Object.keys(input))if(!['templateVersion','pageType','sheets'].includes(key))error('Template',1,key,'unknown_field','Unknown template field.');
 let total=0,characters=0;
 for(const [sheet,rows]of Object.entries(input.sheets)){
  if(!Object.hasOwn(projectTemplate.sheets,sheet)){error(sheet,1,'sheet','unknown_sheet','Unknown project sheet.');continue;}
  if(!Array.isArray(rows)){error(sheet,1,'sheet','sheet_shape','Expected table rows.');continue;}
  total+=rows.length;if(total>500){error(sheet,1,'sheet','row_limit','Use at most 500 rows across the workbook.');break;}
  const fields:FieldDefinition[]=projectTemplate.sheets[sheet as ProjectImportSheet];const result:Record<string,string>[]=[];
  rows.forEach((row,index)=>{
   const n=index+2;if(!object(row)){error(sheet,n,'row','row_shape','Expected a content row.');return;}
   // Keep empty row placeholders so later findings retain their Office row numbers.
   if(Object.keys(row).every(key=>fields.some(f=>f.key===key))&&Object.values(row).every(value=>value===undefined||value===null||typeof value==='string'&&!value.trim())){result.push({});return;}
   const normalized:Record<string,string>={};
   for(const key of Object.keys(row))if(!fields.some(f=>f.key===key))error(sheet,n,key,'unknown_field','Unknown column; content was not discarded.');
   for(const field of fields){const raw=row[field.key];if(raw===undefined||raw===null){if(field.required)error(sheet,n,field.key,'required','This field is required.');continue;}
    if(typeof raw!=='string'&&!(field.key==='position'&&typeof raw==='number'&&Number.isSafeInteger(raw))){error(sheet,n,field.key,'cell_type','Use text values; only display order accepts numbers.');continue;}
    const value=String(raw);normalized[field.key]=value;characters+=value.length;
    if(field.required&&!value.trim())error(sheet,n,field.key,'required','This field is required.');
    if(field.max&&countCharacters(value)>field.max)error(sheet,n,field.key,'character_limit',`Maximum ${field.max} characters.`);
    if(field.guidance&&(field.guidance.unit==='words'?countWords(value):countCharacters(value))>field.guidance.max)error(sheet,n,field.key,'editorial_guidance',`Recommended maximum ${field.guidance.max} ${field.guidance.unit}.`,'warning');
   }
   if(sheet==='Content'&&normalized.field){const rule=Object.hasOwn(projectContentFields,normalized.field)?projectContentFields[normalized.field]:undefined;if(!rule)error(sheet,n,'field','unknown_content_field','Choose a supported scalar content field.');else{const value=normalized.value??'';if(countCharacters(value)>rule.max)error(sheet,n,'value','character_limit',`Maximum ${rule.max} characters for ${normalized.field}.`);if(rule.guidance&&(rule.guidance.unit==='words'?countWords(value):countCharacters(value))>rule.guidance.max)error(sheet,n,'value','editorial_guidance',`Recommended maximum ${rule.guidance.max} ${rule.guidance.unit}.`,'warning');}}
   result.push(normalized);
  });tables[sheet as ProjectImportSheet]=result;
 }
 if(!tables.Pages?.some(row=>Object.keys(row).length))error('Pages',2,'recordId','required','Include at least one project page.');
 if(characters>2_000_000)error('Template',1,'size','character_limit','Template text exceeds 2 million characters.');
 return {valid:!issues.some(i=>i.severity==='error'),issues,tables};
}
