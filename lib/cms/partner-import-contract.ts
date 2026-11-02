import {countCharacters,countWords,type FieldDefinition,type ImportIssue} from './import-contract.ts';
export const PARTNER_TEMPLATE_VERSION='1.0';
const text=(key:string,label:string,max:number,required=false):FieldDefinition=>({key,label,max,required});
const id=text('recordId','Partner import ID',128,true);
const ordered=[id,text('itemId','Stable item ID',128,true),text('position','Display order',6,true)];
const imageFields=[text('assetId','Processed CMS image ID',128),text('alt','Alternative text',500),text('decorative','true or false',5),text('caption','Image caption',2000),text('credit','Image credit',500)];
export const partnerTemplate={version:PARTNER_TEMPLATE_VERSION,type:'partner',sheets:{
 Pages:[id,text('kind','dealer, servicePartner or both',20,true),text('operation','Create or update',10,true),text('expectedRevision','Current revision for updates',36),text('slug','Partner URL slug',100,true),text('title','Partner title',200,true),text('locale','Language code',12,true),text('replaceCollections','Collections to replace or clear',200)],
 Content:[id,text('field','Content field',100,true),text('value','Content text',10000)],
 Blocks:[...ordered,text('kind','paragraph, heading, list, quote, table, link or image',20,true),text('text','Paragraph, heading or quote text',10000),text('level','h2 or h3',2),text('ordered','true or false for lists',5),text('attribution','Quote attribution',200),text('label','Link label',200),text('href','Link destination',2048),...imageFields],
 Tables:[...ordered,text('blockId','Parent table block ID',128,true),text('role','header or row',10,true),...Array.from({length:8},(_,i)=>text(`column${i+1}`,`Column ${i+1} text`,5000))],
 ListItems:[...ordered,text('blockId','Parent list block ID',128,true),text('text','List item text',2000,true)],
 Media:[...ordered,text('role','image or seo.socialImage',30,true),...imageFields],
 Relationships:[...ordered,text('group','applications, products, locations, certifications or documents',20,true),text('targetId','Related CMS record UUID',36,true)],
 Services:[...ordered,text('text','Service offered',200,true)],
 Coverage:[...ordered,text('countryCode','Two-letter uppercase country code',2,true)],
 Regions:[...ordered,text('coverageId','Parent coverage item ID',128,true),text('text','Region name',200,true)],
}} satisfies {version:string;type:string;sheets:Record<string,FieldDefinition[]>};
export type PartnerImportSheet=keyof typeof partnerTemplate.sheets;
export const partnerContentFields:Record<string,{max:number;guidance?:{unit:'words'|'characters';max:number}}>={
 'contact.email':{max:254},'contact.phone':{max:60},'contact.website':{max:2048},status:{max:20},statusNote:{max:2000},
 summary:{max:2000,guidance:{unit:'words',max:80}},internalNotes:{max:2000},
 'seo.title':{max:200,guidance:{unit:'characters',max:60}},'seo.description':{max:1000,guidance:{unit:'characters',max:160}},'seo.canonical':{max:2048},'seo.following':{max:200},'seo.breadcrumbLabel':{max:200},'seo.indexing':{max:200},'seo.sitemap':{max:200},'seo.socialTitle':{max:200},'seo.socialDescription':{max:1000},
};
/** Table-level validation only; does not resolve links, plan changes or authorize writes. */
export function validatePartnerImportTables(input:unknown){
 const issues:ImportIssue[]=[],tables:Partial<Record<PartnerImportSheet,Record<string,string>[]>>={};
 const error=(sheet:string,row:number,field:string,code:string,message:string,severity:'error'|'warning'='error')=>issues.push({sheet,row,field,code,message,severity});
 const object=(value:unknown):value is Record<string,unknown>=>Boolean(value&&typeof value==='object'&&!Array.isArray(value));
 if(!object(input)||input.templateVersion!==PARTNER_TEMPLATE_VERSION||input.pageType!=='partner'||!object(input.sheets))return {valid:false,issues:[{sheet:'Template',row:1,field:'version',severity:'error' as const,code:'template',message:'Use the supported partner template.'}],tables};
 for(const key of Object.keys(input))if(!['templateVersion','pageType','sheets'].includes(key))error('Template',1,key,'unknown_field','Unknown template field.');
 let total=0,characters=0;
 for(const [sheet,rows]of Object.entries(input.sheets)){
  if(!Object.hasOwn(partnerTemplate.sheets,sheet)){error(sheet,1,'sheet','unknown_sheet','Unknown partner sheet.');continue;}
  if(!Array.isArray(rows)){error(sheet,1,'sheet','sheet_shape','Expected table rows.');continue;}
  total+=rows.length;if(total>500){error(sheet,1,'sheet','row_limit','Use at most 500 rows across the workbook.');break;}
  const fields:FieldDefinition[]=partnerTemplate.sheets[sheet as PartnerImportSheet];const result:Record<string,string>[]=[];
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
   if(sheet==='Content'&&normalized.field){const rule=Object.hasOwn(partnerContentFields,normalized.field)?partnerContentFields[normalized.field]:undefined;if(!rule)error(sheet,n,'field','unknown_content_field','Choose a supported scalar content field.');else{const value=normalized.value??'';if(countCharacters(value)>rule.max)error(sheet,n,'value','character_limit',`Maximum ${rule.max} characters for ${normalized.field}.`);if(rule.guidance&&(rule.guidance.unit==='words'?countWords(value):countCharacters(value))>rule.guidance.max)error(sheet,n,'value','editorial_guidance',`Recommended maximum ${rule.guidance.max} ${rule.guidance.unit}.`,'warning');}}
   result.push(normalized);
  });tables[sheet as PartnerImportSheet]=result;
 }
 if(!tables.Pages?.some(row=>Object.keys(row).length))error('Pages',2,'recordId','required','Include at least one partner page.');
 if(characters>2_000_000)error('Template',1,'size','character_limit','Template text exceeds 2 million characters.');
 return {valid:!issues.some(i=>i.severity==='error'),issues,tables};
}
