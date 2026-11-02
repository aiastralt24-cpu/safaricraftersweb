import {z} from 'zod';
export const enquiryFileRetentionPolicy=z.object({enabled:z.boolean(),submittedDays:z.number().int().min(1).max(36500).nullable(),abandonedHours:z.number().int().min(1).max(8760).nullable(),approvalReference:z.string().max(1000)}).strict().refine(v=>!v.enabled||v.submittedDays!==null&&v.abandonedHours!==null&&v.approvalReference.trim().length>0,'Approved retention periods and an approval reference are required before enabling deletion.');
const uuid=z.string().uuid();
export const retentionCommands=z.discriminatedUnion('action',[
 z.object({action:z.literal('retention'),site:uuid}).strict(),
 z.object({action:z.literal('save_retention'),site:uuid,expected:z.number().int().nonnegative(),requestId:uuid,policy:enquiryFileRetentionPolicy}).strict(),
 z.object({action:z.literal('preview_retention'),site:uuid,version:z.number().int().nonnegative()}).strict(),
]);
const settings=z.object({websiteId:uuid,version:z.number().int().nonnegative(),policy:enquiryFileRetentionPolicy}).strict();
const preview=z.object({websiteId:uuid,version:z.number().int().nonnegative(),enabled:z.boolean(),asOf:z.string().datetime({offset:true}),hasMore:z.boolean(),candidateCount:z.number().int().min(0).max(500),submittedCount:z.number().int().min(0).max(500),abandonedCount:z.number().int().min(0).max(500),plannedBytes:z.number().int().min(0).max(25000000000)}).strict().refine(v=>v.candidateCount===v.submittedCount+v.abandonedCount&&(!v.hasMore||v.candidateCount===500));
export function verifyRetentionSettings(input:unknown,site:string){const value=settings.parse(input);if(value.websiteId!==site)throw Error('Retention settings belong to another website.');return value;}
export function verifyRetentionPreview(input:unknown,site:string,version:number){const value=preview.parse(input);if(value.websiteId!==site||value.version!==version)throw Error('Retention preview changed. Reload the settings.');return value;}
