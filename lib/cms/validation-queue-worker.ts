import {z} from 'zod';
import {validationInputSchema,evaluateValidationInput} from './validation-worker.ts';
import type {validateStoredContent} from './content-validation.ts';
const uuid=z.string().uuid();
const jobsSchema=z.array(z.object({id:uuid,site:uuid,record:uuid,revision:uuid,token:uuid}).strict()).max(50);
export type ValidationQueueRpc=(procedure:'claim_validations'|'get_validation_job_input'|'finish_validation_job',args:Record<string,unknown>)=>Promise<unknown>;
/** Server-only queue consumer. Receipt writes happen inside fenced acknowledgement. */
export async function runValidationQueue(call:ValidationQueueRpc,limit=10){
 if(!Number.isInteger(limit)||limit<1||limit>50)throw Error('Invalid validation batch size.');
 const jobs=jobsSchema.parse(await call('claim_validations',{p_limit:limit,p_lease_seconds:120}));
 return Promise.all(jobs.map(async job=>{
  const args={p_job:job.id,p_token:job.token};
  let result:ReturnType<typeof validateStoredContent>;
  try{
   const input=validationInputSchema.parse(await call('get_validation_job_input',args));
   if(input.site!==job.site||input.record!==job.record||input.revision!==job.revision)throw Error('Identity mismatch');
   result=evaluateValidationInput(input);
  }catch{
   try{await call('finish_validation_job',{...args,p_version:null,p_valid:null,p_findings:null,p_error_code:'validation_unavailable'});return {id:job.id,status:'retry_pending' as const};}
   catch{return {id:job.id,status:'unacknowledged' as const};}
  }
  try{await call('finish_validation_job',{...args,p_version:result.validatorVersion,p_valid:result.contentChecksPass,p_findings:result.findings,p_error_code:null});return {id:job.id,status:result.contentChecksPass?'valid' as const:'invalid' as const};}
  catch{return {id:job.id,status:'unacknowledged' as const};}
 }));
}
