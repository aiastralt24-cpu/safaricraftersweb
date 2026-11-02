import test from 'node:test';
import assert from 'node:assert/strict';
import {runValidationQueue} from '../lib/cms/validation-queue-worker.ts';
const id=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const job={id:id(1),site:id(2),record:id(3),revision:id(4),token:id(5)};
const input={site:job.site,record:job.record,revision:job.revision,type:'navigation',path:null,locale:'en',payload:{schemaVersion:1,title:'Menu',items:[{id:'journey',parentId:null,label:'Journey',target:{kind:'record',recordId:id(6),contentType:'journey'},visibility:{visible:true}}]},navigationStatus:[{recordId:id(6),available:true,type:'journey',path:'/journeys/forest',locale:'en',title:'Forest'}]};
test('queued navigation validation uses current reference evidence and writes fenced revision results',async()=>{
 for(const [status,expected]of [[input.navigationStatus,'valid'],[[{recordId:id(6),available:false}],'invalid'],[undefined,'invalid']]){
  let receipt;const output=await runValidationQueue(async(name,args)=>{if(name==='claim_validations')return [job];if(name==='get_validation_job_input')return {...input,navigationStatus:status};receipt=args;return null;});assert.deepEqual(output,[{id:job.id,status:expected}]);assert.equal(receipt.p_version,'navigation-1');assert.equal(receipt.p_valid,expected==='valid');assert.equal(receipt.p_token,job.token);
 }
});
test('malformed navigation evidence cannot create a successful worker receipt',async()=>{
 let receipt;const output=await runValidationQueue(async(name,args)=>{if(name==='claim_validations')return [job];if(name==='get_validation_job_input')return {...input,navigationStatus:[{...input.navigationStatus[0],privateField:'not permitted'}]};receipt=args;});assert.equal(output[0].status,'retry_pending');assert.equal(receipt.p_valid,null);assert.equal(receipt.p_error_code,'validation_unavailable');
});
test('translated menu without matching reference evidence receives an invalid result rather than retrying forever',async()=>{
 let receipt;const output=await runValidationQueue(async(name,args)=>{if(name==='claim_validations')return [job];if(name==='get_validation_job_input')return {...input,locale:'fr',navigationStatus:[]};receipt=args;});assert.equal(output[0].status,'invalid');assert.ok(receipt.p_findings.some(f=>f.code==='navigation_target_unavailable'));
});
