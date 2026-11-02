import {z} from 'zod';
import {certificationSchema,certificationPath} from './certifications.ts';
/** Only explicitly public fields are admitted. Evidence and review records stay private. */
export const publicCertificationContentSchema=z.object(certificationSchema.shape).omit({evidence:true,relationships:true,internalNotes:true,reviewOn:true,statusNote:true}).strict();
const envelope=z.object({recordId:z.string().uuid(),revisionId:z.string().uuid(),type:z.literal('certification'),path:z.string(),locale:z.literal('en'),payload:publicCertificationContentSchema}).strict();
export function projectPublishedCertification(input:unknown,path:string,locale='en'){
 const value=envelope.parse(input),d=value.payload;
 if(locale!=='en'||value.path!==path||path!==certificationPath(d.slug))throw Error('Published certification identity mismatch.');
 // Reuse structural/date checks without interpreting synthetic fields as approval.
 certificationSchema.parse({...d,evidence:[],relationships:{locations:[],pages:[]},internalNotes:'',reviewOn:'',statusNote:''});
 if(d.status!=='active'||d.validity==='unspecified'||!d.issuedOn||!d.validFrom||d.validity==='dated'&&!d.expiresOn||[d.title,d.summary,d.issuer,d.statement,d.scope].some(s=>!s.trim()))throw Error('Published certification is incomplete.');
 return {recordId:value.recordId,revisionId:value.revisionId,path:value.path,locale:value.locale,content:d};
}
export type PublishedCertification=ReturnType<typeof projectPublishedCertification>;
