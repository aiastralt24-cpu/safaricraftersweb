import {z} from 'zod';
const uuid=z.string().uuid();
export const notificationReconciliationCommand=z.object({site:uuid,leadId:uuid,jobId:uuid,dispatchId:uuid,providerMessageId:uuid,requestId:uuid}).strict();
export const receiptSchema=z.object({websiteId:uuid,leadId:uuid,jobId:uuid,dispatchId:uuid,providerMessageId:uuid,requestId:uuid,actorId:uuid,recordedAt:z.iso.datetime({offset:true})}).strict();

type Command=z.infer<typeof notificationReconciliationCommand>;
export function checkScope(value:{websiteId:string;leadId:string;jobId:string;dispatchId:string;providerMessageId:string;requestId:string},command:Command){
 if(value.websiteId!==command.site||(['leadId','jobId','dispatchId','providerMessageId','requestId'] as const).some(key=>value[key]!==command[key]))throw Error('Reconciliation response mismatch.');
}

export function verifyNotificationReconciliationReceipt(raw:unknown,command:Command,actor:string){const value=receiptSchema.parse(raw);checkScope(value,command);if(value.actorId!==actor)throw Error('Reconciliation actor mismatch.');return value;}
