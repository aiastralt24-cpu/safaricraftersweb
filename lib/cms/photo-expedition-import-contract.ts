import {countCharacters,countWords,type FieldDefinition,type ImportIssue} from './import-contract.ts';
export const EXPEDITION_TEMPLATE_VERSION='1.0';
const text=(key:string,label:string,max:number,required=false):FieldDefinition=>({key,label,max,required});
const id=text('recordId','Expedition import ID',128,true);
const ordered=[id,text('itemId','Stable item ID',128,true),text('position','Display order',6,true)];
const imageFields=[text('assetId','Processed CMS image ID',128,true),text('alt','Alternative text',500),text('decorative','true or false',5,true),text('caption','Image caption',2000),text('credit','Image credit',500)];
export const expeditionTemplate={version:EXPEDITION_TEMPLATE_VERSION,type:'photoExpedition',sheets:{
 Pages:[id,text('operation','Create or update',10,true),text('expectedRevision','Current revision for updates',36),text('slug','Expedition URL slug',100,true),text('title','Expedition title',200,true),text('locale','Language code: en',12,true),text('replaceCollections','Collections to replace or clear',300)],
 Content:[id,text('field','Content field',100,true),text('value','Content text',50000)],
 Departures:[...ordered,text('date','Start date YYYY-MM-DD',10,true),text('endDate','End date YYYY-MM-DD',10),text('status','New, Filling fast, Full or Available',20,true),text('availability','Availability wording',200),text('homepageNote','Homepage booking note',200)],
 Days:[...ordered,text('label','Day label',200),text('title','Day title',200,true),text('copy','Day description',10000,true),text('stay','Accommodation wording',200)],
 Lists:[...ordered,text('collection','highlights, inclusions, exclusions or body',20,true),text('text','Content text',10000,true)],
 FAQs:[...ordered,text('question','Question',500,true),text('answer','Answer',10000,true)],
 Media:[...ordered,text('role','image, heroImage, mobileHeroImage, gallery, video.poster or seo.socialImage',30,true),...imageFields],
 References:[...ordered,text('role','mentor, guide or enquiryForm',20,true),text('targetId','CMS record ID',36,true)],
 Films:[id,text('assetId','Processed CMS video ID',128,true),text('title','Film title',200,true),text('caption','Film caption',2000),text('transcript','Film transcript',50000),text('captionsAssetId','Processed captions asset ID',128,true)],
}} satisfies {version:string;type:string;sheets:Record<string,FieldDefinition[]>};
export type ExpeditionImportSheet=keyof typeof expeditionTemplate.sheets;
export const expeditionContentFields:Record<string,{max:number;guidance?:{unit:'words'|'characters';max:number}}>={};
for(const field of ['geography','programmeStatus','category','skill','groupSize','duration','bestMonths','mentor','guide','dateLabel','price','route','heroTitle'])expeditionContentFields[field]={max:200};
for(const field of ['species','equipment'])expeditionContentFields[field]={max:10000};
expeditionContentFields.availabilityReviewedAt={max:10};expeditionContentFields.description={max:2000,guidance:{unit:'words',max:50}};expeditionContentFields.heroCopy={max:2000};expeditionContentFields.intro={max:50000};
for(const field of ['heroEyebrow','introductionHeading','highlightsHeading','itineraryHeading','inclusionsHeading','exclusionsHeading','duration','route','skill','groupSize','season','species','price','equipment','departuresHeading','departureAction','galleryEyebrow','galleryHeading','galleryLabel','faqEyebrow','faqHeading'])expeditionContentFields[`labels.${field}`]={max:200};
for(const field of ['emptyDepartures','previewNote','galleryCopy','faqCopy'])expeditionContentFields[`labels.${field}`]={max:10000};
for(const field of ['eyebrow','heading','paymentHeading','priceHeading'])expeditionContentFields[`booking.${field}`]={max:200};
for(const field of ['introduction','cancellationPolicy','paymentNote','priceCopy'])expeditionContentFields[`booking.${field}`]={max:10000};
for(const [field,max] of Object.entries({'booking.button.label':200,'booking.button.href':2048,'booking.button.newWindow':5,'enquiry.heading':200,'enquiry.introduction':10000,'enquiry.specialistName':200,'seo.title':200,'seo.description':1000,'seo.canonical':2048,'seo.following':200,'seo.breadcrumbLabel':200,'seo.indexing':200,'seo.sitemap':200,'seo.socialTitle':200,'seo.socialDescription':1000}))expeditionContentFields[field]={max};
expeditionContentFields['seo.title'].guidance={unit:'characters',max:60};expeditionContentFields['seo.description'].guidance={unit:'characters',max:160};
/** Table-level validation only; does not resolve links, plan changes or authorize writes. */
export function validateExpeditionImportTables(input:unknown){
 const issues:ImportIssue[]=[],tables:Partial<Record<ExpeditionImportSheet,Record<string,string>[]>>={};
 const error=(sheet:string,row:number,field:string,code:string,message:string,severity:'error'|'warning'='error')=>issues.push({sheet,row,field,code,message,severity});
 const object=(value:unknown):value is Record<string,unknown>=>Boolean(value&&typeof value==='object'&&!Array.isArray(value));
 if(!object(input)||input.templateVersion!==EXPEDITION_TEMPLATE_VERSION||input.pageType!=='photoExpedition'||!object(input.sheets))return {valid:false,issues:[{sheet:'Template',row:1,field:'version',severity:'error' as const,code:'template',message:'Use the supported expedition template.'}],tables};
 for(const key of Object.keys(input))if(!['templateVersion','pageType','sheets'].includes(key))error('Template',1,key,'unknown_field','Unknown template field.');
 let total=0,characters=0;
 for(const [sheet,rows]of Object.entries(input.sheets)){
  if(!Object.hasOwn(expeditionTemplate.sheets,sheet)){error(sheet,1,'sheet','unknown_sheet','Unknown expedition sheet.');continue;}
  if(!Array.isArray(rows)){error(sheet,1,'sheet','sheet_shape','Expected table rows.');continue;}
  total+=rows.length;if(total>500){error(sheet,1,'sheet','row_limit','Use at most 500 rows across the workbook.');break;}
  const fields:FieldDefinition[]=expeditionTemplate.sheets[sheet as ExpeditionImportSheet];const result:Record<string,string>[]=[];
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
   if(sheet==='Content'&&normalized.field){const rule=Object.hasOwn(expeditionContentFields,normalized.field)?expeditionContentFields[normalized.field]:undefined;if(!rule)error(sheet,n,'field','unknown_content_field','Choose a supported scalar content field.');else{const value=normalized.value??'';if(countCharacters(value)>rule.max)error(sheet,n,'value','character_limit',`Maximum ${rule.max} characters for ${normalized.field}.`);if(rule.guidance&&(rule.guidance.unit==='words'?countWords(value):countCharacters(value))>rule.guidance.max)error(sheet,n,'value','editorial_guidance',`Recommended maximum ${rule.guidance.max} ${rule.guidance.unit}.`,'warning');}}
   result.push(normalized);
  });tables[sheet as ExpeditionImportSheet]=result;
 }
 if(!tables.Pages?.some(row=>Object.keys(row).length))error('Pages',2,'recordId','required','Include at least one expedition page.');
 if(characters>2_000_000)error('Template',1,'size','character_limit','Template text exceeds 2 million characters.');
 return {valid:!issues.some(i=>i.severity==='error'),issues,tables};
}
