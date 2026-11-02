import {z} from 'zod';
const uuid=z.string().uuid();
export const probeReconciliationCommand=z.object({site:uuid,probeId:uuid,providerMessageId:uuid,requestId:uuid}).strict();
export const probeReconciliationReceipt=z.object({websiteId:uuid,probeId:uuid,requestId:uuid,actorId:uuid,providerMessageId:uuid,recordedAt:z.iso.datetime({offset:true})}).strict();
export function checkProbeReconciliationScope(value:{websiteId:string;probeId:string;requestId:string;providerMessageId:string},command:z.infer<typeof probeReconciliationCommand>){
 if(value.websiteId!==command.site||value.probeId!==command.probeId||value.requestId!==command.requestId||value.providerMessageId!==command.providerMessageId)throw Error('Verification reconciliation scope mismatch.');
}
export function verifyProbeReconciliationReceipt(raw:unknown,command:z.infer<typeof probeReconciliationCommand>,actor:string){
 const value=probeReconciliationReceipt.parse(raw);checkProbeReconciliationScope(value,command);if(value.actorId!==actor)throw Error('Verification reconciliation actor mismatch.');return value;
}
