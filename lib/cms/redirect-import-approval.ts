import {z} from 'zod';
import {verifiedRedirectImportReceipt} from './redirect-import-proposal.ts';
const uuid=z.string().uuid(),status=z.enum(['submitted','approved','rejected','cancelled','applied']);
const application=z.object({site:uuid,proposalId:uuid,changes:z.number().int().min(1).max(100),jobs:z.array(z.object({jobId:uuid,recordId:uuid,revisionId:uuid}).strict()).max(100)}).strict();
export function verifiedRedirectProposal(raw:unknown,site:string,proposal:string){
 const value=z.object({site:uuid,actor:uuid,requestKey:uuid,proposalId:uuid,status,sourceDigest:z.string(),review:z.unknown(),stale:z.boolean(),canDecide:z.boolean(),reviewedBy:uuid.nullable(),canApply:z.boolean().default(false),application:application.nullable().default(null)}).strict().parse(raw);
 const {stale,canDecide,reviewedBy,canApply,application:applied,...base}=value;
 if(value.site!==site||value.proposalId!==proposal||canDecide&&value.status!=='submitted'||['approved','rejected','applied'].includes(value.status)&&!reviewedBy)throw Error('The redirect proposal response does not match this request.');
 const receipt=verifiedRedirectImportReceipt(base,{site,requestKey:value.requestKey});
 if((canApply&&(value.status!=='approved'||stale))||(value.status==='applied'?!applied:applied!==null))throw Error('Invalid redirect application state.');
 if(applied){
  const rows=z.object({items:z.array(z.object({target:uuid,status:z.string(),published:z.boolean()}))}).parse(receipt.review).items;
  const expected=[...new Set(rows.filter(row=>row.status!=='unchanged'&&row.published).map(row=>row.target))].sort();
  if(applied.site!==site||applied.proposalId!==proposal||applied.changes!==rows.filter(row=>row.status!=='unchanged').length||new Set(applied.jobs.map(job=>job.jobId)).size!==applied.jobs.length||applied.jobs.length!==expected.length||applied.jobs.some((job,index)=>job.recordId!==expected[index]))throw Error('Redirect application receipt does not match the reviewed batch.');
 }
 return {...receipt,stale,canDecide,reviewedBy,canApply,application:applied};
}
export function verifiedRedirectProposalList(raw:unknown,site:string,after:string|null){
 const value=z.object({site:uuid,items:z.array(z.object({proposalId:uuid,status,count:z.number().int().min(1).max(100)}).strict()).max(20),nextCursor:uuid.nullable()}).strict().parse(raw);
 if(value.site!==site||value.items.some((row,index)=>row.proposalId<=(index?value.items[index-1].proposalId:after??''))||value.nextCursor!==null&&(value.items.length!==20||value.nextCursor!==value.items.at(-1)?.proposalId))throw Error('The redirect proposal list could not be verified.');return value;
}
