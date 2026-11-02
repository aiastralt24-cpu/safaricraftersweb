import {aviationPageFindings} from './aviation-page-validation.ts';
import {guidedPageFindings} from './guided-page-validation.ts';
import {conceptPageFindings} from './concept-page-validation.ts';
import {contactFormFindings,type ContactFormStatus} from './contact-form-status.ts';
import {contactPageFindings} from './contact-page-validation.ts';
import {conservationPageFindings} from './conservation-page-validation.ts';
import {isCustomPagePath} from './custom-page-path.ts';
import {projectCustomPage} from './custom-page.ts';
import {downloadReferenceFindings,type DownloadReferenceStatus} from './download-reference-validation.ts';
import type {DocumentValidationStatus} from './document-validation-status.ts';
import {validateDocumentDraft} from './documents.ts';
import {homepageHeaderFindings,type HomepageHeaderEvidence} from './homepage-header-validation.ts';
import {validateTestimonialPublication} from './testimonial-publication.ts';
import {homepageReferenceFindings,type HomepageReferenceStatus} from './homepage-reference-status.ts';
import {homepageEditorialFindings} from './homepage-editorial-validation.ts';
import {projectAboutPage} from './about-page.ts';
import {legalPathSchema,projectLegalPage} from './legal-page.ts';
import type {ExpeditionReferenceStatus} from './expedition-reference-status.ts';
import {validatePhotoExpedition} from './photo-expeditions.ts';
import type {SpecialistReferenceStatus} from './specialist-reference-status.ts';
import type {SettingsReferenceStatus} from './settings-reference-status.ts';
import {validateSpecialistDraft} from './specialists.ts';
import type {NavigationReferenceStatus} from './navigation-validation.ts';
import {validateNavigationDraft} from './navigation-validation.ts';
import {validateSettingsDraft} from './settings-validation.ts';
import {validateJournalArticle} from './journal.ts';
import type {DestinationReferenceStatus} from './destinations.ts';
import {validateDestinationDraft} from './destinations.ts';
import {validateFormPublication} from './form-publication.ts';
import {pageSeoFindings} from './page-seo.ts';
import {expeditionPageFindings} from './expedition-page-validation.ts';
import {specialistPageFindings} from './specialist-page-validation.ts';
import {validateComposition} from './composition.ts';
import {journeyTemplate,planJourneyImport} from './import-contract.ts';

export const CONTENT_VALIDATOR_VERSION='journey-2';
export const PAGE_VALIDATOR_VERSION='composition-5';
export const HOMEPAGE_VALIDATOR_VERSION='homepage-1';
export type ContentFinding={field:string;severity:'error'|'warning';code:string;message:string};
export type ValidationRecord={aviationPublishedPaths?:string[];guidedPublishedPaths?:string[];conceptPublishedPaths?:string[];conceptStatus?:HomepageReferenceStatus[];contactFormStatus?:ContactFormStatus;downloadStatus?:DownloadReferenceStatus;documentStatus?:DocumentValidationStatus;record?:string;locale?:string;type:string;path:string|null;payload:Record<string,unknown>};
export type MediaStatus={assetId:string;available:boolean};

/** Advisory validation of a full stored revision, never an import patch. This does
 * not grant publication or write a trusted database validation receipt. */
export function validateStoredContent(record:ValidationRecord,mediaStatus?:MediaStatus[],referenceStatus?:DestinationReferenceStatus[],navigationStatus?:NavigationReferenceStatus[],settingsStatus?:SettingsReferenceStatus[],specialistStatus?:SpecialistReferenceStatus[],expeditionStatus?:ExpeditionReferenceStatus[],homepagePublishedPaths?:string[],homepageStatus?:HomepageReferenceStatus[],homepageHeader?:HomepageHeaderEvidence){
  if(record.type==='document')return validateDocumentDraft(record,new Date(),record.documentStatus);
  if(record.type==='testimonial')return validateTestimonialPublication(record,mediaStatus);
  if(record.type==='photoExpedition')return validatePhotoExpedition(record,mediaStatus,expeditionStatus);
  if(record.type==='specialist')return validateSpecialistDraft(record,mediaStatus,specialistStatus);
  if(record.type==='navigation')return validateNavigationDraft(record,navigationStatus);
  if(record.type==='settings')return validateSettingsDraft(record,mediaStatus,settingsStatus);
  if(record.type==='journalArticle')return validateJournalArticle(record,mediaStatus);
  if(record.type==='destination')return validateDestinationDraft({...record,id:record.record},mediaStatus,referenceStatus);
  if(record.type==='form')return validateFormPublication(record);
  const findings:ContentFinding[]=[];
  const error=(field:string,code:string,message:string)=>findings.push({field,code,message,severity:'error'});
  if(record.type==='page'||record.type==='homepage'){
    if(record.type==='homepage')findings.push(...homepageEditorialFindings(record,homepagePublishedPaths),...homepageReferenceFindings(record,homepageStatus),...homepageHeaderFindings(homepageHeader));
    if(record.payload.seo!==undefined)findings.push(...pageSeoFindings(record.payload.seo));
    const composition=validateComposition(record.payload.composition);
    findings.push(...downloadReferenceFindings(composition.page,record.downloadStatus));
    for(const issue of composition.issues)error(`composition.${issue.path}`,'composition_field',issue.message);
    if(record.path==='/photo-expeditions')findings.push(...expeditionPageFindings(record));
    if(record.path==='/specialists')findings.push(...specialistPageFindings(record));
    if(record.path==='/concept')findings.push(...conceptPageFindings(record),...homepageReferenceFindings(record,record.conceptStatus).map(finding=>({...finding,code:'concept_reference_unavailable'})));
    if(record.path==='/private-aviation')findings.push(...aviationPageFindings(record));
    if(record.path==='/guided-bespoke-safaris')findings.push(...guidedPageFindings(record));
    if(record.path==='/contact')findings.push(...contactPageFindings(record),...contactFormFindings(record.payload.composition,record.contactFormStatus));
    if(record.path==='/conservation-commitment')findings.push(...conservationPageFindings(record));
    if(record.type==='page'&&isCustomPagePath(record.path)){
      try{projectCustomPage({recordId:'00000000-0000-4000-8000-000000000001',revisionId:'00000000-0000-4000-8000-000000000002',type:'page',payload:record.payload},record.path,{locale:record.locale??'en',now:new Date()});}
      catch(reason){error('composition','custom_page_content',reason instanceof Error?reason.message:'Complete the custom page content.');}
    }
    if(record.path==='/about'){
      try{projectAboutPage({recordId:'00000000-0000-4000-8000-000000000001',revisionId:'00000000-0000-4000-8000-000000000002',type:record.type,payload:record.payload},{locale:record.locale??'en',now:new Date()});}
      catch(reason){error('composition','about_page_content',reason instanceof Error?reason.message:'Complete the About page content.');}
    }
    if(legalPathSchema.safeParse(record.path).success){
      try{projectLegalPage({recordId:'00000000-0000-4000-8000-000000000001',revisionId:'00000000-0000-4000-8000-000000000002',type:record.type,payload:record.payload},legalPathSchema.parse(record.path),{locale:record.locale??'en',now:new Date()});}
      catch(reason){error('composition','legal_page_content',reason instanceof Error?reason.message:'Complete the legal page content.');}
    }
    const visit=(value:unknown,path:string)=>{
      if(Array.isArray(value)){value.forEach((item,index)=>visit(item,`${path}.${index}`));return;}
      if(!value||typeof value!=='object')return;
      for(const [key,item]of Object.entries(value)){
        const field=path?`${path}.${key}`:key;
        if(key==='desktopAssetId'||key==='mobileAssetId'){
          if(!(record.type==='homepage'||(record.type==='page'&&['/concept','/private-aviation'].includes(record.path??'')&&record.locale==='en'))||typeof item!=='string'||mediaStatus?.filter(asset=>asset.assetId===item).length!==1||!mediaStatus?.find(asset=>asset.assetId===item)?.available)error(field,'video_verification_required','Select a verified silent background video with current approved rights for this website.');
        }else if(key==='assetId'){
          if(typeof item!=='string'||mediaStatus?.filter(asset=>asset.assetId===item).length!==1||!mediaStatus?.find(asset=>asset.assetId===item)?.available)error(field,'asset_verification_required','Select an inspected image with current approved rights for this website.');
        }else visit(item,field);
      }
    };
    visit(record.payload,'');
    if(record.type==='page'&&(['/private-aviation','/guided-bespoke-safaris','/concept','/contact','/conservation-commitment','/photo-expeditions','/specialists','/about'].includes(record.path??'')||legalPathSchema.safeParse(record.path).success||isCustomPagePath(record.path)))return {validatorVersion:PAGE_VALIDATOR_VERSION,contentChecksPass:!findings.some(f=>f.severity==='error'),findings};
    if(record.type==='homepage')return {validatorVersion:HOMEPAGE_VALIDATOR_VERSION,contentChecksPass:!findings.some(f=>f.severity==='error'),findings};
    error('type','publication_not_ready','Complete page publication checks are not connected yet. Keep this page as a draft.');
    return {validatorVersion:PAGE_VALIDATOR_VERSION,contentChecksPass:false,findings};
  }
  if(record.type!=='journey'){
    error('type','unsupported_type','Publication validation is not implemented for this content type.');
    return {validatorVersion:CONTENT_VALIDATOR_VERSION,contentChecksPass:false,findings};
  }
  const payload=record.payload;
  const scalars=journeyTemplate.sheets.Pages.filter(f=>!['recordId','operation','expectedRevision'].includes(f.key));
  const collections={itinerary:'Itinerary',faqs:'FAQs',media:'Media'} as const;
  const known=new Set<string>([...scalars.map(f=>f.key),...Object.keys(collections)]);
  for(const key of Object.keys(payload))if(!known.has(key))error(key,'unsupported_field','This field needs a publication validator before it can go live.');
  const page:Record<string,unknown>={recordId:'validation',operation:'create'};
  for(const field of scalars)page[field.key]=payload[field.key];
  const sheets:Record<string,unknown>={Pages:[page]};
  for(const [key,sheet] of Object.entries(collections)){
    if(payload[key]===undefined)continue;
    if(!Array.isArray(payload[key])){error(key,'collection_shape','Expected a list of content items.');continue;}
    sheets[sheet]=payload[key].map((item,index)=>{
      if(!item||typeof item!=='object'||Array.isArray(item)){error(`${key}.${index}`,'item_shape','Expected a content item.');return {};}
      for(const field of journeyTemplate.sheets[sheet]){
        if(field.required&&field.key!=='recordId'&&(item[field.key]===undefined||item[field.key]===null||String(item[field.key]).trim()===''))
          error(`${key}.${index}.${field.key}`,'required','This field is required.');
      }
      // recordId is transport metadata, never a persisted editable field.
      if('recordId' in item)error(`${key}.${index}.recordId`,'transport_field','Remove import transport metadata from stored content.');
      return {...item,recordId:'validation'};
    });
  }
  const plan=planJourneyImport({templateVersion:'1.0',pageType:'journey',sheets});
  const prefixes:Record<string,string>={Pages:'',Itinerary:'itinerary',FAQs:'faqs',Media:'media'};
  for(const issue of plan.issues){
    const prefix=prefixes[issue.sheet];
    findings.push({field:prefix?`${prefix}.${Math.max(0,issue.row-2)}.${issue.field}`:issue.field,severity:issue.severity,code:issue.code,message:issue.message});
  }
  if(record.path!==`/journeys/${payload.slug}`)error('slug','path_mismatch','The stored slug must match the journey URL.');
  if(Array.isArray(payload.media))for(const [index,item]of payload.media.entries()){
    if(!item||typeof item!=='object'||typeof item.assetId!=='string')continue;
    if(!mediaStatus?.some(asset=>asset.assetId===item.assetId&&asset.available))
      error(`media.${index}.assetId`,'asset_verification_required','This image is unavailable, unverified, archived, or lacks current usage rights. Select an approved image for this website.');
  }
  return {validatorVersion:CONTENT_VALIDATOR_VERSION,contentChecksPass:!findings.some(f=>f.severity==='error'),findings};
}
