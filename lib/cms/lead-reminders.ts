import {z} from 'zod';
const uuid=z.string().uuid(),instant=z.string().datetime({offset:true}),positive=z.number().int().positive();
export const reminderScope=z.enum(['mine','accessible']),reminderFilter=z.enum(['due','snoozed','acknowledged']);
export const reminderCommand=z.object({action:z.literal('reminder'),site:uuid,lead:uuid,generation:positive,expected:z.number().int().nonnegative(),operation:z.enum(['acknowledge','snooze','reset']),until:instant.nullable().default(null)}).strict().refine(v=>(v.operation==='snooze')===(v.until!==null));
export type ReminderCommand=z.infer<typeof reminderCommand>;
const schema=z.object({websiteId:uuid,actorId:uuid,scope:reminderScope,filter:reminderFilter,asOf:instant,items:z.array(z.object({id:uuid,status:z.enum(['new','assigned','contacted','qualified','in_progress']),priority:z.enum(['low','normal','high']),version:positive,followUp:instant,generation:positive,reminderVersion:z.number().int().nonnegative(),state:reminderFilter,snoozedUntil:instant.nullable()}).strict()).max(20),nextCursor:uuid.nullable()}).strict();
export type LeadReminders=z.infer<typeof schema>;
export function verifiedLeadReminders(input:unknown,site:string,scope:LeadReminders['scope'],filter:LeadReminders['filter'],after:string|null=null,actor?:string){
 const value=schema.parse(input);if(value.websiteId!==site||value.scope!==scope||value.filter!==filter||actor&&value.actorId!==actor)throw Error('Follow-up reminder response mismatch.');let previous=after;
 for(const row of value.items){if(previous&&row.id<=previous||row.state!==filter||Date.parse(row.followUp)>Date.parse(value.asOf))throw Error('Follow-up reminder ordering or state mismatch.');previous=row.id;
 if(row.state==='snoozed'&&(!row.snoozedUntil||Date.parse(row.snoozedUntil)<=Date.parse(value.asOf))||row.state==='acknowledged'&&row.snoozedUntil!==null||row.state==='due'&&row.snoozedUntil&&Date.parse(row.snoozedUntil)>Date.parse(value.asOf))throw Error('Follow-up reminder timing mismatch.');}
 if(value.nextCursor!==null&&(value.items.length!==20||value.nextCursor!==previous))throw Error('Follow-up reminder cursor mismatch.');return value;
}
export function verifiedReminderReceipt(input:unknown,command:ReminderCommand,actor?:string){
 const value=z.object({websiteId:uuid,actorId:uuid,leadId:uuid,generation:positive,version:positive,state:z.enum(['pending','snoozed','acknowledged']),snoozedUntil:instant.nullable(),replayed:z.boolean()}).strict().parse(input);
 const state=command.operation==='acknowledge'?'acknowledged':command.operation==='snooze'?'snoozed':'pending';
 if(value.websiteId!==command.site||value.leadId!==command.lead||value.generation!==command.generation||value.version!==command.expected+1||value.state!==state||actor&&value.actorId!==actor||(value.snoozedUntil===null)!==(command.until===null)||value.snoozedUntil&&command.until&&Date.parse(value.snoozedUntil)!==Date.parse(command.until))throw Error('Follow-up reminder receipt mismatch.');return value;
}
