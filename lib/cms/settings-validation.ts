import {interfaceTextForLocale} from './interface-text.ts';
import {localizedShellSettings} from './localized-shell.ts';
import type {LocalizedRouteResolver} from './localized-navigation-link.ts';
import {navigationUrlStatus} from './navigation-routes.ts';
import type {SettingsReferenceStatus} from './settings-reference-status.ts';
import {searchTypeMap} from './search-policy.ts';
import {globalSettingsSchema} from './global-settings.ts';
import type {ContentFinding,MediaStatus,ValidationRecord} from './content-validation.ts';

/** Validate the stored English settings revision and its current dependency evidence.
 * Publication still requires approval and database release-time dependency checks. */
export function validateSettingsDraft(record:ValidationRecord,mediaStatus?:MediaStatus[],references?:SettingsReferenceStatus[],resolveLocalizedRoute?:LocalizedRouteResolver){
 const findings:ContentFinding[]=[];
 const error=(field:string,code:string,message:string)=>findings.push({field,code,message,severity:'error'});
 const parsed=globalSettingsSchema.safeParse(record.payload);
 if(!parsed.success)for(const issue of parsed.error.issues)error(issue.path.join('.'),'settings_field',issue.message);
 if(record.path!==null)error('path','settings_path','Website settings cannot have a page URL.');
 if(record.locale!=='en'&&!resolveLocalizedRoute)error('locale','settings_locale_not_ready','Public settings currently support English only. Other languages can be saved as drafts.');
 if(parsed.success){
  const value=parsed.data;
  if(record.locale!=='en'&&resolveLocalizedRoute){
   try{interfaceTextForLocale(value.interfaceText,record.locale??'',value.brand.name);localizedShellSettings(value,record.locale??'',resolveLocalizedRoute);}catch(reason){error('interfaceText','localized_settings_content',reason instanceof Error?reason.message:'Complete translated interface wording and destinations.');}
   if(value.header.featuredContent.length)error('header.featuredContent','localized_settings_featured','Featured visitor families are not connected in translated headers yet.');
   if(value.search.enabled)error('search.enabled','localized_settings_search','Disable search until translated search delivery is connected.');
  }
  if(!value.header.mainMenu)error('header.mainMenu','settings_main_menu_required','Select a published main menu before preparing website settings for release.');
  const featuredIds=new Set<string>();
  value.header.featuredContent.forEach((ref,index)=>{if(featuredIds.has(ref.recordId))error(`header.featuredContent.${index}.recordId`,'settings_duplicate_feature','Select each featured record only once.');featuredIds.add(ref.recordId);});
  if(value.header.languageSelector&&!value.header.languageSelectorLabel?.trim())error('header.languageSelectorLabel','settings_language_selector_label','Add a translated label for the language selector.');
  const required=(field:string,text:string)=>{if(!text.trim())error(field,'settings_required','Complete this field before preparing settings for publication.');};
  required('seo.description',value.seo.description);
  required('footer.copyright',value.footer.copyright);
  value.contact.addresses.forEach((address,index)=>{required(`contact.addresses.${index}.label`,address.label);required(`contact.addresses.${index}.address`,address.address);});
  value.social.forEach((profile,index)=>required(`social.${index}.label`,profile.label));
  for(const key of ['title','description','acceptLabel','rejectLabel','preferencesLabel'] as const)required(`cookies.${key}`,value.cookies[key]);
  if(value.search.enabled){required('search.placeholder',value.search.placeholder);required('search.emptyMessage',value.search.emptyMessage);if(!value.search.contentTypes.length)error('search.contentTypes','settings_search_types','Choose at least one searchable content type.');}
  if(value.search.enabled)for(const [index,type] of value.search.contentTypes.entries())if(!(type in searchTypeMap))error(`search.contentTypes.${index}`,'settings_search_type_not_ready',`Search delivery for ${type} is not connected yet.`);
  for(const [path,message]of [['announcement',value.announcement],['errors.notFound',value.errors.notFound],['errors.serverError',value.errors.serverError],['errors.maintenance',value.errors.maintenance]] as const){if(message.enabled){required(`${path}.title`,message.title);required(`${path}.body`,message.body);}}
  if(value.footer.cta?.enabled){required('footer.cta.title',value.footer.cta.title);if(!value.footer.cta.button)error('footer.cta.button','settings_footer_cta_button','Add a button for the enabled footer call to action.');}
  for(const [index,group]of value.footer.groups.entries()){required(`footer.groups.${index}.title`,group.title);if(!group.links.length)error(`footer.groups.${index}.links`,'settings_footer_links','Add links or remove the empty footer group.');}
  const expected=new Set([value.header.mainMenu,value.header.utilityMenu,value.header.mobileMenu,...value.header.featuredContent].flatMap(ref=>ref?[ref.recordId]:[]));
  if(references?.some(ref=>!expected.has(ref.recordId)))error('header','settings_evidence_mismatch','Reference evidence does not match this settings revision.');
  const visit=(input:unknown,path:string)=>{
   if(Array.isArray(input)){input.forEach((item,index)=>visit(item,`${path}.${index}`));return;}
   if(!input||typeof input!=='object')return;
   for(const [key,item]of Object.entries(input)){
    const field=path?`${path}.${key}`:key;
    if(key==='label'&&'href' in input&&typeof item==='string'&&!item.trim())error(field,'settings_link_label_required','Enter visible text for this link.');
    else if(key==='assetId'){
     const matching=mediaStatus?.filter(asset=>asset.assetId===item);
     if(matching?.length!==1||!matching[0].available)error(field,'asset_verification_required','Choose a processed image with current approved rights for this website.');
    }else if(key==='recordId'){
     const matching=references?.filter(ref=>ref.recordId===item),ref=matching?.[0];
     const menu=/^header\.(mainMenu|utilityMenu|mobileMenu)\.recordId$/.test(field);
     if(matching?.length!==1||!ref?.available||ref.locale!==record.locale||(menu?ref.type!=='navigation':!['journey','destination','journalArticle'].includes(ref.type??'')))error(field,'settings_reference_verification_required','Choose currently available published content of the correct type and language.');
    }
    else if((key==='href'||key==='homeHref')&&typeof item==='string'&&!(record.locale!=='en'&&resolveLocalizedRoute)&&navigationUrlStatus(item)!=='available')error(field,'settings_url_verification_required','Choose a verified public page or a safe external HTTPS link.');
    else visit(item,field);
   }
  };
  visit(value,'');
  if(value.seo.indexing==='noindex')findings.push({field:'seo.indexing',severity:'warning',code:'website_noindex',message:'This setting requests exclusion of the entire website from search-engine indexing.'});
 }
 return {validatorVersion:'settings-1',contentChecksPass:!findings.some(finding=>finding.severity==='error'),findings};
}
