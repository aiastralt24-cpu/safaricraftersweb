import {newDestination} from './destinations.ts';
import {countCharacters,countWords,type FieldDefinition,type ImportIssue} from './import-contract.ts';
export const DESTINATION_TEMPLATE_VERSION='1.0';
const id:FieldDefinition={key:'recordId',label:'Destination import ID',required:true,max:128};
const ordered:FieldDefinition[]=[id,{key:'itemId',label:'Stable import item ID',required:true,max:128},{key:'position',label:'Display order',required:true,max:6}];
const text=(key:string,label:string,max:number,required=false):FieldDefinition=>({key,label,max,required});
/** Portable table contract shared by future Word and Excel generators/parsers. */
export const destinationTemplate={version:DESTINATION_TEMPLATE_VERSION,type:'destination',sheets:{
 Pages:[id,text('operation','Create or update',10,true),text('expectedRevision','Current revision for updates',36),text('slug','Page URL slug',100,true),text('title','Destination title',200,true),text('locale','Language code',12,true),text('replaceCollections','Collections to replace or clear (comma-separated)',300)],
 Content:[id,text('field','Content field',100,true),text('value','Content text',10000)],
 Lists:[...ordered,text('field','bestFor or highlights',20,true),text('text','List text',1000,true)],
 Media:[...ordered,text('role','image, heroImage, gallery or seo.socialImage',30,true),text('assetId','Processed CMS image ID',128,true),text('alt','Alternative text',500),text('decorative','true or false',5,true),text('caption','Caption',2000),text('credit','Credit',500)],
 Related:[...ordered,text('type','journey, photoExpedition or destination',20,true),text('targetId','CMS record UUID',36,true),text('title','Destination pairing title',200),text('reason','Destination pairing reason',10000)],
 FAQs:[...ordered,text('question','Question',500,true),{...text('answer','Answer',10000,true),guidance:{unit:'words',max:120}}],
 Sources:[...ordered,text('title','Source title',200,true),text('url','HTTPS source URL',2048,true),text('publisher','Publisher',200),text('accessedAt','Access date YYYY-MM-DD',10,true)],
 Notes:[...ordered,text('title','Editorial note title',200,true),text('blurb','Short introduction',1000),text('body','Editorial note body',10000)],
}} satisfies {version:string;type:string;sheets:Record<string,FieldDefinition[]>};
export type DestinationImportSheet=keyof typeof destinationTemplate.sheets;
/** Scalar paths only. Collections and images have explicit separate tables. */
export const destinationContentFields:Record<string,{max:number;guidance?:{unit:'words'|'characters';max:number}}>={};
const shortFields=new Set(['category','continent','country','parentRegion','status','region','bestMonths','homepageMeta','idealStay','gateway']);
const defaults=newDestination();
for(const [key,value]of Object.entries(defaults))if(typeof value==='string'&&!['slug','title'].includes(key))destinationContentFields[key]={max:shortFields.has(key)?200:key==='description'?2000:key==='homepageCaption'?1000:10000};
for(const [key,value]of Object.entries(defaults.editorial))if(typeof value==='string')destinationContentFields[`editorial.${key}`]={max:['landscapeCopy','wildlifeCopy','relatedIntro','plannerCopy'].includes(key)?10000:200};
for(const [key]of Object.entries(defaults.fieldIntelligence))destinationContentFields[`fieldIntelligence.${key}`]={max:['airport','idealStay'].includes(key)?200:10000};
for(const [key,value]of Object.entries(defaults.seo))if(typeof value==='string')destinationContentFields[`seo.${key}`]={max:key==='canonical'?2048:['description','socialDescription'].includes(key)?1000:200};
destinationContentFields.description.guidance={unit:'words',max:50};destinationContentFields.intro.guidance={unit:'words',max:250};destinationContentFields['seo.title'].guidance={unit:'characters',max:60};destinationContentFields['seo.description'].guidance={unit:'characters',max:160};
/** Table-level validation only; does not resolve links, plan changes or authorize writes. */
export function validateDestinationImportTables(input:unknown){
 const issues:ImportIssue[]=[],tables:Partial<Record<DestinationImportSheet,Record<string,string>[]>>={};
 const error=(sheet:string,row:number,field:string,code:string,message:string,severity:'error'|'warning'='error')=>issues.push({sheet,row,field,code,message,severity});
 const object=(value:unknown):value is Record<string,unknown>=>Boolean(value&&typeof value==='object'&&!Array.isArray(value));
 if(!object(input)||input.templateVersion!==DESTINATION_TEMPLATE_VERSION||input.pageType!=='destination'||!object(input.sheets))return {valid:false,issues:[{sheet:'Template',row:1,field:'version',severity:'error' as const,code:'template',message:'Use the supported destination template.'}],tables};
 for(const key of Object.keys(input))if(!['templateVersion','pageType','sheets'].includes(key))error('Template',1,key,'unknown_field','Unknown template field.');
 let total=0,characters=0;
 for(const [sheet,rows]of Object.entries(input.sheets)){
  if(!Object.hasOwn(destinationTemplate.sheets,sheet)){error(sheet,1,'sheet','unknown_sheet','Unknown destination sheet.');continue;}
  if(!Array.isArray(rows)){error(sheet,1,'sheet','sheet_shape','Expected table rows.');continue;}
  total+=rows.length;if(total>500){error(sheet,1,'sheet','row_limit','Use at most 500 rows across the workbook.');break;}
  const fields:FieldDefinition[]=destinationTemplate.sheets[sheet as DestinationImportSheet];const result:Record<string,string>[]=[];
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
   if(sheet==='Content'&&normalized.field){const rule=Object.hasOwn(destinationContentFields,normalized.field)?destinationContentFields[normalized.field]:undefined;if(!rule)error(sheet,n,'field','unknown_content_field','Choose a supported scalar content field.');else{const value=normalized.value??'';if(countCharacters(value)>rule.max)error(sheet,n,'value','character_limit',`Maximum ${rule.max} characters for ${normalized.field}.`);if(rule.guidance&&(rule.guidance.unit==='words'?countWords(value):countCharacters(value))>rule.guidance.max)error(sheet,n,'value','editorial_guidance',`Recommended maximum ${rule.guidance.max} ${rule.guidance.unit}.`,'warning');}}
   result.push(normalized);
  });tables[sheet as DestinationImportSheet]=result;
 }
 if(!tables.Pages?.some(row=>Object.keys(row).length))error('Pages',2,'recordId','required','Include at least one destination page.');
 if(characters>2_000_000)error('Template',1,'size','character_limit','Template text exceeds 2 million characters.');
 return {valid:!issues.some(i=>i.severity==='error'),issues,tables};
}
