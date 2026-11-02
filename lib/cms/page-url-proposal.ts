import {z} from 'zod';
const uuid=z.string().uuid();
export const pageUrlProposalSchema=z.object({proposalId:uuid,site:uuid,recordId:uuid,revisionId:uuid,oldPath:z.string(),newPath:z.string(),locale:z.string(),redirectChoice:z.enum(['permanent','none']),noRedirectReason:z.string().nullable(),status:z.enum(['submitted','approved','rejected','cancelled','applied']),stale:z.boolean(),createdBy:uuid,reviewedBy:uuid.nullable()}).strict();
export type PageUrlProposal=z.infer<typeof pageUrlProposalSchema>;
const listing=z.object({site:uuid,recordId:uuid,items:z.array(pageUrlProposalSchema.pick({proposalId:true,oldPath:true,newPath:true,status:true,redirectChoice:true})).max(50),nextCursor:uuid.nullable()}).strict();
export function parsePageUrlProposalList(value:unknown,scope:{site:string;record:string;after:string|null}){
 const result=listing.parse(value);
 if(result.site!==scope.site||result.recordId!==scope.record||result.items.some((item,index)=>item.proposalId<=(index?result.items[index-1].proposalId:scope.after??''))||result.nextCursor!==null&&(result.items.length!==50||result.nextCursor!==result.items.at(-1)?.proposalId))throw Error('The proposal list does not match this page. Refresh the list.');return result;
}
export function parsePageUrlProposal(value:unknown,scope:{site:string;record:string;proposal:string}){
 const result=pageUrlProposalSchema.parse(value);if(result.site!==scope.site||result.recordId!==scope.record||result.proposalId!==scope.proposal)throw Error('The proposal does not match this page. Refresh before reviewing.');return result;
}
export const pageUrlSubmission=z.object({actor:uuid,site:uuid,record:uuid,revision:uuid,path:z.string().min(1).max(500),snapshot:z.string().regex(/^[a-f0-9]{32}$/),redirect:z.enum(['permanent','none']),reason:z.string().max(2000).nullable(),requestKey:uuid,stopRequested:z.boolean().optional()}).strict();
export type PageUrlSubmission=z.infer<typeof pageUrlSubmission>;
export function urlSubmissionStorageKey(scope:{actor:string;site:string;record:string}){return `cms-url-submission:${uuid.parse(scope.actor)}:${uuid.parse(scope.site)}:${uuid.parse(scope.record)}`;}
export function parseUrlSubmission(raw:string,scope:{actor:string;site:string;record:string}){if(raw.length>16000)throw Error('Invalid saved URL proposal.');const result=pageUrlSubmission.parse(JSON.parse(raw));if(result.actor!==scope.actor||result.site!==scope.site||result.record!==scope.record)throw Error('The saved URL submission belongs to another page or account.');return result;}
export function verifySubmittedProposal(value:unknown,pending:PageUrlSubmission){const result=pageUrlProposalSchema.parse(value);if(result.site!==pending.site||result.recordId!==pending.record||result.revisionId!==pending.revision||result.createdBy!==pending.actor||result.newPath!==pending.path||result.redirectChoice!==pending.redirect||result.noRedirectReason!==pending.reason)throw Error('The saved proposal does not match the pending submission. Keep it for recovery.');return result;}
export function parseUrlSubmissionStatus(value:unknown,scope:{record:string;requestKey:string;site:string}){
 const result=z.discriminatedUnion('status',[
  z.object({status:z.enum(['unconfirmed','cancelled']),recordId:uuid,requestKey:uuid}).strict(),
  z.object({status:z.literal('completed'),recordId:uuid,requestKey:uuid,proposal:pageUrlProposalSchema}).strict(),
 ]).parse(value);if(result.recordId!==scope.record||result.requestKey!==scope.requestKey||result.status==='completed'&&(result.proposal.site!==scope.site||result.proposal.recordId!==scope.record))throw Error('The URL submission status does not match the request.');return result;
}
