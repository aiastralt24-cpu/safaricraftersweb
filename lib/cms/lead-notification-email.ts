import {z} from 'zod';
import type {LeadNotificationDelivery} from './lead-notification-worker.ts';
const uuid=z.string().uuid();
const email=z.email().max(254).refine(v=>!/[\r\n]/.test(v));
/** Server-resolved configuration only. Recipient changes require a new route revision. */
export const notificationEmailRouteSchema=z.object({websiteId:uuid,routeId:uuid,revisionId:uuid,enabled:z.literal(true),from:email,to:z.array(email).min(1).max(20).refine(v=>new Set(v.map(s=>s.toLowerCase())).size===v.length)}).strict();
export const notificationEmailSchema=z.object({from:email,to:z.array(email).min(1).max(20),subject:z.string().min(1).max(200).refine(v=>!/[\r\n]/.test(v)),text:z.string().min(1).max(10000)}).strict();
export type NotificationEmail=z.infer<typeof notificationEmailSchema>;
/** Keep submitted answers and applicant addresses in the authenticated inbox. */
export function prepareLeadNotificationEmail(input:LeadNotificationDelivery,rawRoute:unknown,cmsOrigin:string):NotificationEmail{
 const route=notificationEmailRouteSchema.parse(rawRoute);
 if(route.websiteId!==input.websiteId||!uuid.safeParse(input.leadId).success||!input.routeIds.includes(route.routeId))throw Error('Notification route mismatch.');
 const origin=new URL(cmsOrigin);if(origin.protocol!=='https:'||origin.username||origin.password||origin.pathname!=='/'||origin.search||origin.hash)throw Error('Invalid CMS notification origin.');
 const title=input.career?'New job application':'New website enquiry';
 const lines=[title,`Reference: ${input.leadId}`];
 if(input.career)lines.push(`Job: ${input.career.title}`,`Organization: ${input.career.organization}`,`Job reference: ${input.career.referenceCode||'Not recorded'}`);
 lines.push('',`Review the submission in the CMS: ${origin.origin}/cms`,'Sign in and open Enquiries to review submissions. Keep the reference above for follow-up.');
 return notificationEmailSchema.parse({from:route.from,to:route.to,subject:title,text:lines.join('\n')});
}
