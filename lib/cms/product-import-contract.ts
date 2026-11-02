import {countCharacters,countWords,type FieldDefinition,type ImportIssue} from './import-contract.ts';
import {partnerTemplate} from './partner-import-contract.ts';
export const PRODUCT_TEMPLATE_VERSION='1.0';
const text=(key:string,label:string,max:number,required=false):FieldDefinition=>({key,label,max,required});
const id=text('recordId','Product import ID',128,true);
const ordered=[id,text('itemId','Stable item ID',128,true),text('position','Display order',3,true)];
const section=text('section','body, installation, precautions or warranty',20,true);
/** Transport contract only. Definitions, permissions and publication evidence come from the server. */
export const productTemplate={version:PRODUCT_TEMPLATE_VERSION,type:'product',sheets:{
 Pages:[id,text('operation','create or update',10,true),text('expectedRevision','Current revision for updates',36),text('slug','Product URL slug',100,true),text('title','Product title',200,true),text('locale','Language code',12,true),text('replaceCollections','Explicit collections to replace or clear',1000)],
 Content:[id,text('field','Content field',100,true),text('value','Content text',10000)],
 Blocks:[...partnerTemplate.sheets.Blocks,section],
 Tables:[...partnerTemplate.sheets.Tables,section],
 ListItems:[...partnerTemplate.sheets.ListItems,section],
 Labels:[...ordered,text('group','benefits, features, suitableUses, unsuitableUses, colours or finishes',20,true),text('text','Entry text',500,true)],
 Media:[...ordered,text('role','gallery or seo.socialImage',30,true),...partnerTemplate.sheets.Media.filter(f=>!['recordId','itemId','position','role'].includes(f.key))],
 Videos:[...ordered,text('title','Video title',200,true),text('url','HTTPS video URL',2048,true),text('transcript','Video transcript',50000)],
 Variants:[...ordered,text('title','Variant title',200,true),text('code','Variant code (text)',120),text('size','Size',200),text('colour','Colour',200),text('finish','Finish',200),text('packaging','Packaging',2000)],
 Specifications:[...ordered,text('variantId','Blank for base; otherwise variant item ID',64),text('attributeId','Pinned category attribute ID',64,true),text('countryCode','Blank for global; otherwise uppercase country code',2),text('region','Region name',200),text('state','known, blank, unknown or notApplicable',20,true),text('valueType','text, number, boolean or choice for known values',10),text('value','Exact typed value',2000),text('reason','Reason when not applicable',1000)],
 Availability:[...ordered,text('countryCode','Uppercase country code',2,true),text('region','Region name',200)],
 Relationships:[...ordered,text('group','Relationship collection',30,true),text('targetId','Related CMS record UUID',36,true)],
 CommerceVariants:[...ordered,text('variantId','Editorial variant item ID',64,true),text('shopifyVariantId','Shopify variant GID',200,true)],
}} satisfies {version:string;type:string;sheets:Record<string,FieldDefinition[]>};
export type ProductImportSheet=keyof typeof productTemplate.sheets;
export const productContentFields:Record<string,{max:number;guidance?:{unit:'words'|'characters';max:number}}>={
 code:{max:120},brand:{max:200},summary:{max:2000,guidance:{unit:'words',max:80}},packaging:{max:2000},lifecycle:{max:20},lifecycleNote:{max:2000},internalNotes:{max:2000},
 'category.recordId':{max:36},'category.revisionId':{max:36},'subcategory.recordId':{max:36},'subcategory.revisionId':{max:36},
 'enquiry.label':{max:200},'enquiry.href':{max:2048},'commerce.provider':{max:10},'commerce.productId':{max:200},
 'seo.title':{max:200,guidance:{unit:'characters',max:60}},'seo.description':{max:1000,guidance:{unit:'characters',max:160}},'seo.canonical':{max:2048},'seo.following':{max:200},'seo.breadcrumbLabel':{max:200},'seo.indexing':{max:200},'seo.sitemap':{max:200},'seo.socialTitle':{max:200},'seo.socialDescription':{max:1000},
};
/** Table-level validation only; does not resolve links, plan changes or authorize writes. */
export function validateProductImportTables(input:unknown){
 const issues:ImportIssue[]=[],tables:Partial<Record<ProductImportSheet,Record<string,string>[]>>={};
 const error=(sheet:string,row:number,field:string,code:string,message:string,severity:'error'|'warning'='error')=>issues.push({sheet,row,field,code,message,severity});
 const object=(value:unknown):value is Record<string,unknown>=>Boolean(value&&typeof value==='object'&&!Array.isArray(value));
 if(!object(input)||input.templateVersion!==PRODUCT_TEMPLATE_VERSION||input.pageType!=='product'||!object(input.sheets))return {valid:false,issues:[{sheet:'Template',row:1,field:'version',severity:'error' as const,code:'template',message:'Use the supported product template.'}],tables};
 for(const key of Object.keys(input))if(!['templateVersion','pageType','sheets'].includes(key))error('Template',1,key,'unknown_field','Unknown template field.');
 let total=0,characters=0;
 for(const [sheet,rows]of Object.entries(input.sheets)){
  if(!Object.hasOwn(productTemplate.sheets,sheet)){error(sheet,1,'sheet','unknown_sheet','Unknown product sheet.');continue;}
  if(!Array.isArray(rows)){error(sheet,1,'sheet','sheet_shape','Expected table rows.');continue;}
  total+=rows.length;if(total>500){error(sheet,1,'sheet','row_limit','Use at most 500 rows across the workbook.');break;}
  const fields:FieldDefinition[]=productTemplate.sheets[sheet as ProductImportSheet];const result:Record<string,string>[]=[];
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
   if(sheet==='Content'&&normalized.field){const rule=Object.hasOwn(productContentFields,normalized.field)?productContentFields[normalized.field]:undefined;if(!rule)error(sheet,n,'field','unknown_content_field','Choose a supported scalar content field.');else{const value=normalized.value??'';if(countCharacters(value)>rule.max)error(sheet,n,'value','character_limit',`Maximum ${rule.max} characters for ${normalized.field}.`);if(rule.guidance&&(rule.guidance.unit==='words'?countWords(value):countCharacters(value))>rule.guidance.max)error(sheet,n,'value','editorial_guidance',`Recommended maximum ${rule.guidance.max} ${rule.guidance.unit}.`,'warning');}}
   result.push(normalized);
  });tables[sheet as ProductImportSheet]=result;
 }
 if(!tables.Pages?.some(row=>Object.keys(row).length))error('Pages',2,'recordId','required','Include at least one product page.');
 if(characters>2_000_000)error('Template',1,'size','character_limit','Template text exceeds 2 million characters.');
 return {valid:!issues.some(i=>i.severity==='error'),issues,tables};
}
