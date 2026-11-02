import {z} from 'zod';
const uuid=z.string().uuid();
export const formNotificationRouteQuery=z.object({site:uuid,formId:uuid.nullable(),after:uuid.nullable().default(null)}).strict();
export function verifyFormNotificationRoutes(raw:unknown,site:string,formId:string|null,after:string|null){
 const value=z.object({websiteId:uuid,formId:uuid.nullable(),after:uuid.nullable(),items:z.array(z.object({routeId:uuid,revisionId:uuid,label:z.string().min(1).max(100)}).strict()).max(50)}).strict().parse(raw);
 if(value.websiteId!==site||value.formId!==formId||value.after!==after||value.items.some((v,i)=>(after!==null&&v.routeId<=after)||(i>0&&v.routeId<=value.items[i-1].routeId)))throw Error('Form recipient options mismatch.');return value;
}
