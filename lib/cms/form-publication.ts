import {formSchema} from './forms.ts';
import type {ContentFinding,ValidationRecord} from './content-validation.ts';
export const FORM_VALIDATOR_VERSION='form-1';
/** Forms deliver from the current published pointer through uncached intake APIs.
 * Unsupported attachments and notification routes must never silently disappear. */
export function validateFormPublication(record:ValidationRecord){
 const findings:ContentFinding[]=[];
 const error=(field:string,code:string,message:string)=>findings.push({field,code,message,severity:'error'});
 if(record.path!==null)error('path','form_path','Forms must not claim a page URL.');
 const parsed=formSchema.safeParse(record.payload);
 if(!parsed.success){for(const issue of parsed.error.issues)error(issue.path.join('.'),'form_field',issue.message);}
 else{
  parsed.data.fields.forEach((field,index)=>{if(field.type==='file')error(`fields.${index}`,'attachment_delivery_unavailable','Attachment intake is not connected. Remove this field before publishing.');});
  if(parsed.data.notificationRouteIds.length)error('notificationRouteIds','notification_routes_unverified','Notification route delivery is not configured. Use inbox-only collection until routes can be verified.');
  else findings.push({field:'notificationRouteIds',code:'inbox_only',severity:'warning',message:'Enquiries are stored in the CMS inbox. Email notifications are not enabled.'});
 }
 return {validatorVersion:FORM_VALIDATOR_VERSION,contentChecksPass:!findings.some(f=>f.severity==='error'),findings};
}
