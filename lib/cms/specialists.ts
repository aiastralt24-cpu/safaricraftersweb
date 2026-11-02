import {z} from 'zod';
import {image} from './composition.ts';
import type {ContentFinding,MediaStatus,ValidationRecord} from './content-validation.ts';
import type {SpecialistReferenceStatus} from './specialist-reference-status.ts';
const assetId=z.string().regex(/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,127}$/);
const references=z.array(z.object({recordId:z.string().uuid()}).strict()).max(100).refine(items=>new Set(items.map(item=>item.recordId)).size===items.length,'Select each record only once.');
export const specialistSchema=z.object({
 schemaVersion:z.literal(1),name:z.string().trim().min(1).max(200),kind:z.enum(['person','team']),visible:z.boolean(),sortOrder:z.number().int().min(0).max(9999),
 role:z.string().max(200),expertise:z.string().max(2000),bio:z.string().max(10000),moment:z.string().max(5000),image:image.optional(),
 planning:z.object({label:z.string().max(80),enquiryName:z.string().max(200)}).strict(),
 journeys:references,expeditions:references,
 video:z.object({assetId,title:z.string().max(200),poster:image,caption:z.string().max(2000),transcript:z.string().max(50000),captionsAssetId:assetId}).strict().optional(),
}).strict();
export type SpecialistDraft=z.infer<typeof specialistSchema>;
export function newSpecialist():SpecialistDraft{return {schemaVersion:1,name:'New specialist',kind:'person',visible:false,sortOrder:0,role:'',expertise:'',bio:'',moment:'',planning:{label:'',enquiryName:''},journeys:[],expeditions:[]};}
export function validateSpecialistDraft(record:ValidationRecord,mediaStatus?:MediaStatus[],referenceStatus?:SpecialistReferenceStatus[]){
 const findings:ContentFinding[]=[];
 const error=(field:string,code:string,message:string)=>findings.push({field,code,message,severity:'error'});
 const parsed=specialistSchema.safeParse(record.payload);
 if(!parsed.success)for(const issue of parsed.error.issues)error(issue.path.join('.'),'specialist_field',issue.message);
 if(record.path!==null)error('path','specialist_path','Specialists appear in the shared directory and do not have individual page URLs.');
 if(record.locale!=='en')error('locale','specialist_locale_not_ready','Localized specialist delivery is not connected yet.');
 if(parsed.success){
  const value=parsed.data;
  for(const [field,text] of [['role',value.role],['expertise',value.expertise],['bio',value.bio],['planning.label',value.planning.label],['planning.enquiryName',value.planning.enquiryName]])if(!text.trim())error(field,'specialist_required','Complete this field before preparing the profile for publication.');
  const checkImage=(picture:z.infer<typeof image>|undefined,path:string)=>{
   if(!picture){error(path,'specialist_image_required','Choose an approved profile image.');return;}
   const evidence=mediaStatus?.filter(item=>item.assetId===picture.assetId);
   if(evidence?.length!==1||!evidence[0].available)error(`${path}.assetId`,'asset_verification_required','Choose a processed image with current approved rights for this website.');
  };
  checkImage(value.image,'image');
  if(value.video){checkImage(value.video.poster,'video.poster');for(const key of ['title','transcript'] as const)if(!value.video[key].trim())error(`video.${key}`,'specialist_required','Complete the film title and transcript.');error('video','specialist_video_not_ready','Film and caption delivery must be connected before this profile can be published.');}
  const selected=new Set([...value.journeys,...value.expeditions].map(item=>item.recordId));
  if(referenceStatus?.some(item=>!selected.has(item.recordId)))error('references','specialist_reference_evidence','The reference check contains unexpected records. Reload and check again.');
  for(const [field,type] of [['journeys','journey'],['expeditions','photoExpedition']] as const)value[field].forEach((reference,index)=>{
   if(reference.recordId===record.record)error(`${field}.${index}.recordId`,'specialist_reference_unavailable','A specialist cannot reference itself.');
   const matches=referenceStatus?.filter(item=>item.recordId===reference.recordId);
   const status=matches?.length===1?matches[0]:undefined;
   if(!status?.available||status.type!==type||status.locale!==record.locale)error(`${field}.${index}.recordId`,'specialist_reference_unavailable','Choose published content of the correct type and language with currently available dependencies for this website.');
  });
  if(value.expeditions.length)error('expeditions','specialist_expeditions_not_ready','Photography expedition delivery must be connected before these profiles can be published.');
 }
 return {validatorVersion:'specialist-1',contentChecksPass:!findings.some(f=>f.severity==='error'),findings};
}
