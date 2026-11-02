import {z} from 'zod';
const uuid=z.string().uuid(),version=z.number().int().min(0).max(Number.MAX_SAFE_INTEGER);
export const pageHierarchyState=z.object({recordId:uuid,revisionId:uuid,version,parentId:uuid.nullable(),parentTitle:z.string().nullable(),parentRestricted:z.boolean(),path:z.string().nullable(),locale:z.string()}).strict();
export const pageParentCandidates=z.object({recordId:uuid,revisionId:uuid,items:z.array(z.object({id:uuid,title:z.string(),path:z.string().nullable(),type:z.enum(['page','homepage'])}).strict()).max(50),nextCursor:uuid.nullable()}).strict();
export const pendingPageMove=z.object({actor:uuid,site:uuid,record:uuid,revision:uuid,version,parent:uuid.nullable(),requestKey:uuid,cancelRequested:z.boolean().optional()}).strict();
export type PendingPageMove=z.infer<typeof pendingPageMove>;
export function pageMoveStorageKey(actor:string,site:string,record:string){return `cms-page-move:${uuid.parse(actor)}:${uuid.parse(site)}:${uuid.parse(record)}`;}
export function parsePageMove(value:string,scope:{actor:string;site:string;record:string}){
 if(value.length>4096)throw Error('The saved page move is invalid.');const result=pendingPageMove.parse(JSON.parse(value));
 if(result.actor!==scope.actor||result.site!==scope.site||result.record!==scope.record)throw Error('The saved page move belongs to another account or page.');return result;
}
export function verifyPageMoveResult(value:unknown,pending:PendingPageMove){
 const result=z.object({recordId:uuid,revisionId:uuid,parentId:uuid.nullable(),version}).strict().parse(value);
 if(result.recordId!==pending.record||result.revisionId!==pending.revision||result.parentId!==pending.parent||![pending.version,pending.version+1].includes(result.version))throw Error('The move response does not match the pending request. Keep it for recovery.');return result;
}

export function verifyPageMoveCancellation(value:unknown,pending:PendingPageMove){
 const result=z.discriminatedUnion('status',[
  z.object({status:z.literal('cancelled'),requestKey:uuid,recordId:uuid}).strict(),
  z.object({status:z.literal('completed'),result:z.unknown()}).strict(),
 ]).parse(value);
 if(result.status==='completed'){verifyPageMoveResult(result.result,pending);return 'completed' as const;}
 if(result.requestKey!==pending.requestKey||result.recordId!==pending.record)throw Error('Cancellation does not match the pending page move.');return 'cancelled' as const;
}
