import {testimonialSchema} from './testimonials.ts';
import type {ContentFinding,MediaStatus,ValidationRecord} from './content-validation.ts';
/** Consent evidence is required for approval but never included in findings. */
export function validateTestimonialPublication(record:ValidationRecord,mediaStatus?:MediaStatus[]){
 const findings:ContentFinding[]=[];
 const error=(field:string,code:string,message:string)=>findings.push({field,code,message,severity:'error'});
 const parsed=testimonialSchema.safeParse(record.payload);
 if(!parsed.success)for(const issue of parsed.error.issues)error(issue.path.join('.'),'testimonial_field',issue.message);
 if(record.path!==null)error('path','testimonial_path','Guest reviews are shared content and cannot own a page URL.');
 if(record.locale!=='en')error('locale','testimonial_locale_not_ready','Only English guest review delivery is connected.');
 if(parsed.success){
  const value=parsed.data;
  if(!value.name.trim())error('name','testimonial_name_required','Record the guest name before publication. Anonymous display can withhold it.');
  if(!value.verified)error('verified','testimonial_verification_required','Verify the wording against the guest’s source before publication.');
  if(value.consent.status!=='granted')error('consent.status','testimonial_consent_required','Record granted publication consent before publishing this review.');
  if(value.image){
   const evidence=mediaStatus?.filter(item=>item.assetId===value.image!.assetId);
   if(evidence?.length!==1||!evidence[0].available)error('image.assetId','asset_verification_required','Choose a processed image with current approved rights for this website, or remove the image.');
  }
 }
 return {validatorVersion:'testimonial-1',contentChecksPass:!findings.some(f=>f.severity==='error'),findings};
}
