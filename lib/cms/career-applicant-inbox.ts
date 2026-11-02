import {z} from 'zod';
import {readLeadCareerContext} from './lead-career-context.ts';
const uuid=z.string().uuid();
const status=z.enum(['new','assigned','contacted','qualified','in_progress','won','lost','invalid']);
const row=z.object({id:uuid,formId:uuid,formRevision:uuid,status,priority:z.enum(['low','normal','high']),nextFollowUp:z.iso.datetime({offset:true}).nullable(),createdAt:z.iso.datetime({offset:true}),version:z.number().int().positive(),attribution:z.unknown()}).strict();
const envelope=z.object({websiteId:uuid,status:status.nullable(),search:z.string().max(200),after:uuid.nullable(),items:z.array(row).max(50)}).strict();
export function verifiedCareerApplicants(input:unknown,site:string,filter:string|null,search:string,after:string|null){
 const value=envelope.parse(input);
 if(value.websiteId!==site||value.status!==filter||value.search!==search||value.after!==after||new Set(value.items.map(v=>v.id)).size!==value.items.length||value.items.some(v=>v.id===after||(filter!==null&&v.status!==filter)))throw Error('Applicant inbox response mismatch.');
 for(let i=1;i<value.items.length;i++){const a=value.items[i-1],b=value.items[i];if(Date.parse(a.createdAt)<Date.parse(b.createdAt)||(Date.parse(a.createdAt)===Date.parse(b.createdAt)&&a.id<=b.id))throw Error('Applicant inbox order mismatch.');}
 return value.items.map(item=>{const context=readLeadCareerContext(item.attribution,item);if(context.status!=='ready')throw Error('Applicant inbox context could not be verified.');const {attribution,...rest}=item;return {...rest,job:{title:context.context.title,referenceCode:context.context.referenceCode,recordId:context.context.recordId}};});
}
