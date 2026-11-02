import {z} from 'zod';
const uuid=z.string().uuid();
export const notificationRetryCommand=z.object({action:z.literal('retry_notification'),site:uuid,lead:uuid,job:uuid,generation:z.number().int().positive(),requestId:uuid}).strict();
export type NotificationRetryCommand=z.infer<typeof notificationRetryCommand>;
export function verifiedNotificationRetry(input:unknown,command:NotificationRetryCommand){const value=z.object({websiteId:uuid,leadId:uuid,jobId:uuid,requestId:uuid,generation:z.number().int().positive(),replayed:z.boolean()}).strict().parse(input);if(value.websiteId!==command.site||value.leadId!==command.lead||value.jobId!==command.job||value.requestId!==command.requestId||value.generation!==command.generation+1)throw Error('Notification retry receipt mismatch.');return value;}
