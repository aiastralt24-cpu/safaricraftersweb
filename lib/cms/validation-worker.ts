import {productCategoryValidationEvidence,validateProductCategoryContent} from './product-category-validation-worker.ts';
import {productEvidenceSchema,validateProductContent} from './product-validation.ts';
import {partnerEvidenceSchema,validatePartnerContent} from './partner-validation.ts';
import {certificationEvidenceSchema,validateCertificationContent} from './certification-validation.ts';
import {formNotificationEvidenceSchema,formNotificationFindings} from './form-notification-evidence.ts';
import {careerEvidenceSchema,validateCareerContent} from './career-validation.ts';
import {locationEvidenceSchema,validateLocationContent} from './location-validation.ts';
import {applicationEvidenceSchema,validateApplicationContent} from './application-validation.ts';
import {pageLeadershipEvidenceSchema,pageLeadershipFindings} from './page-leadership-validation.ts';
import {leadershipEvidenceSchema,validateLeadershipContent} from './leadership-validation.ts';
import {eventEvidenceSchema,validateEventContent} from './event-validation.ts';
import {newsEvidenceSchema,validateNewsContent} from './news-validation.ts';
import {faqEvidenceSchema,validateFaqContent} from './faq-validation.ts';
import {projectEvidenceSchema,validateProjectContent} from './project-validation.ts';
import {tanzaniaPublicationEvidenceSchema,validateTanzaniaPublication} from './tanzania-page-validation.ts';
import {localizedSettingsEvidenceSchema,validateLocalizedSettings} from './localized-settings-validation.ts';
import {isCustomPagePath} from './custom-page-path.ts';
import {localizedPublicationEvidenceSchema,localizedPublicationFindings} from './localized-publication-validation.ts';
import {kenyaPublicationEvidenceSchema,validateKenyaPublication} from './kenya-page-validation.ts';
import {micePublicationEvidenceSchema,validateMicePublication} from './mice-page-validation.ts';
import {contactFormStatusSchema} from './contact-form-status.ts';
import {downloadReferenceStatusSchema} from './download-reference-validation.ts';
import {documentValidationStatusSchema} from './document-validation-status.ts';
import {homepageReferenceStatusSchema} from './homepage-reference-status.ts';
import {expeditionReferenceStatusSchema} from './expedition-reference-status.ts';
import {specialistReferenceStatusSchema} from './specialist-reference-status.ts';
import {settingsReferenceStatusSchema} from './settings-reference-status.ts';
import {navigationReferenceStatusSchema} from './navigation-validation.ts';
import {z} from 'zod';
import {validateStoredContent} from './content-validation.ts';

const targetSchema=z.object({site:z.string().uuid(),record:z.string().uuid(),revision:z.string().uuid()}).strict();
export const validationInputSchema=targetSchema.extend({productCategoryEvidence:productCategoryValidationEvidence.nullable().optional(),productEvidence:productEvidenceSchema.nullable().optional(),partnerEvidence:partnerEvidenceSchema.nullable().optional(),certificationEvidence:certificationEvidenceSchema.nullable().optional(),formNotificationEvidence:formNotificationEvidenceSchema.nullable().optional(),careerEvidence:careerEvidenceSchema.nullable().optional(),locationEvidence:locationEvidenceSchema.nullable().optional(),applicationEvidence:applicationEvidenceSchema.nullable().optional(),pageLeadershipEvidence:pageLeadershipEvidenceSchema.nullable().optional(),leadershipEvidence:leadershipEvidenceSchema.nullable().optional(),eventEvidence:eventEvidenceSchema.nullable().optional(),newsEvidence:newsEvidenceSchema.nullable().optional(),faqEvidence:faqEvidenceSchema.nullable().optional(),projectEvidence:projectEvidenceSchema.nullable().optional(),localizedSettingsEvidence:localizedSettingsEvidenceSchema.nullable().optional(),localizedEvidence:localizedPublicationEvidenceSchema.nullable().optional(),tanzaniaEvidence:tanzaniaPublicationEvidenceSchema.nullable().optional(),kenyaEvidence:kenyaPublicationEvidenceSchema.nullable().optional(),miceEvidence:micePublicationEvidenceSchema.nullable().optional(),aviationPublishedPaths:z.array(z.string().max(2048)).max(10000).optional(),guidedPublishedPaths:z.array(z.string().max(2048)).max(10000).optional(),conceptPublishedPaths:z.array(z.string().max(2048)).max(10000).optional(),conceptStatus:homepageReferenceStatusSchema.optional(),contactFormStatus:contactFormStatusSchema.optional(),type:z.string(),path:z.string().nullable(),payload:z.record(z.string(),z.unknown()),locale:z.string().optional(),downloadStatus:downloadReferenceStatusSchema.optional(),documentStatus:documentValidationStatusSchema.optional(),homepageHeader:z.unknown().optional(),homepageStatus:homepageReferenceStatusSchema.optional(),homepagePublishedPaths:z.array(z.string().max(2048)).max(10000).optional(),navigationStatus:navigationReferenceStatusSchema.optional(),settingsStatus:settingsReferenceStatusSchema.optional(),specialistStatus:specialistReferenceStatusSchema.optional(),expeditionStatus:expeditionReferenceStatusSchema.optional(),referenceStatus:z.array(z.object({recordId:z.string().uuid(),type:z.enum(['journey','photoExpedition','destination']),available:z.boolean(),published:z.boolean().optional(),locale:z.string().optional()}).strict()).optional(),mediaStatus:z.array(z.object({assetId:z.string(),available:z.boolean()}).strict()).optional()}).strict();
export type ValidationTarget=z.infer<typeof targetSchema>;
/** A server-only transport provisioned with the restricted trusted-worker role.
 * Never supply a browser payload or fall back to privileged access in editor APIs. */
export type ValidationRpc=(procedure:'get_validation_input'|'record_validation',args:Record<string,unknown>)=>Promise<unknown>;

export async function runTrustedValidation(call:ValidationRpc,target:ValidationTarget){
  const request=targetSchema.parse(target);
  const args={p_site:request.site,p_record:request.record,p_revision:request.revision};
  const stored=validationInputSchema.parse(await call('get_validation_input',args));
  if(stored.site!==request.site||stored.record!==request.record||stored.revision!==request.revision)
    throw new Error('Validation input identity mismatch.');
  const result=evaluateValidationInput(stored);
  // The receipt function rechecks the current revision and deployment-owned
  // validator policy while holding the record lock. Failure must propagate.
  await call('record_validation',{...args,p_version:result.validatorVersion,p_valid:result.contentChecksPass,p_findings:result.findings});
  return {revision:request.revision,...result};
}

/** Shared by direct and fenced queue workers. Only trusted, revision-bound page-family
 * checks replace the generic unsupported-page gate; other findings remain blocking. */
export function evaluateValidationInput(input:z.infer<typeof validationInputSchema>){
 if(input.type==='form'){
  const result=validateStoredContent(input),delivery=formNotificationFindings(input,input.formNotificationEvidence);
  // Only this trusted, revision-bound path can replace the advisory routing fence.
  // Field/file checks and all evidence failures remain blocking.
  const verified=!delivery.some(v=>v.severity==='error');
  const findings=[...result.findings.filter(v=>!verified||v.code!=='notification_routes_unverified'),...delivery];
  return {...result,validatorVersion:'form-2',findings,contentChecksPass:!findings.some(v=>v.severity==='error')};
 }
 if(input.type==='certification')return validateCertificationContent(input,input.certificationEvidence);
 if(input.type==='career')return validateCareerContent(input,input.careerEvidence);
 if(input.type==='productCategory')return validateProductCategoryContent(input,input.productCategoryEvidence);
 if(input.type==='product')return validateProductContent(input,input.productEvidence);
 if(input.type==='partner')return validatePartnerContent(input,input.partnerEvidence);
 if(input.type==='location')return validateLocationContent(input,input.locationEvidence);
 if(input.type==='application')return validateApplicationContent(input,input.applicationEvidence);
 if(input.type==='leadership')return validateLeadershipContent(input,input.leadershipEvidence);
 if(input.type==='event')return validateEventContent(input,input.eventEvidence);
 if(input.type==='news')return validateNewsContent(input,input.newsEvidence);
 if(input.type==='faq')return validateFaqContent(input,input.faqEvidence);
 if(input.type==='project')return validateProjectContent(input,input.projectEvidence);
 if(input.type==='settings'&&input.locale&&input.locale!=='en')return validateLocalizedSettings(input,input.mediaStatus,input.settingsStatus,input.localizedSettingsEvidence);
 const result=validateStoredContent(input,input.mediaStatus,input.referenceStatus,input.navigationStatus,input.settingsStatus,input.specialistStatus,input.expeditionStatus,input.homepagePublishedPaths,input.homepageStatus,{site:input.site,header:input.homepageHeader});
 if(input.type==='page'){const extra=pageLeadershipFindings(input,input.pageLeadershipEvidence);if(extra.length){result.findings.push(...extra);result.contentChecksPass=false;}}
 if(input.type==='page'&&input.locale&&input.locale!=='en'&&isCustomPagePath(input.path)){
  const findings=[...result.findings.filter(f=>f.code!=='custom_page_content'),...localizedPublicationFindings(input,input.localizedEvidence)];
  return {...result,contentChecksPass:!findings.some(f=>f.severity==='error'),findings};
 }
 if(input.type!=='page'||!['/mice','/destinations/kenya','/destinations/tanzania'].includes(input.path??''))return result;
 const specialized=input.path==='/destinations/tanzania'?validateTanzaniaPublication(input,input.tanzaniaEvidence):input.path==='/mice'?validateMicePublication(input,input.miceEvidence):validateKenyaPublication(input,input.kenyaEvidence);
 const findings=[...new Map([...result.findings.filter(f=>f.code!=='publication_not_ready'),...specialized.findings].map(f=>[`${f.field}:${f.code}`,f])).values()];
 return {...result,contentChecksPass:specialized.contentChecksPass&&!findings.some(f=>f.severity==='error'),findings};
}
