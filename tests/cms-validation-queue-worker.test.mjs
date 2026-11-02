import test from 'node:test';
import assert from 'node:assert/strict';
import {runValidationQueue} from '../lib/cms/validation-queue-worker.ts';
import {newForm} from '../lib/cms/form-drafts.ts';
const id='00000000-0000-4000-8000-000000000001';
const job={id,site:id,record:id,revision:id,token:id};
const input={site:id,record:id,revision:id,type:'form',path:null,payload:newForm('name')};
test('queue validates server input and sends result only through fenced completion',async()=>{
 const calls=[];const result=await runValidationQueue(async(name,args)=>{calls.push([name,args]);if(name==='claim_validations')return [job];if(name==='get_validation_job_input')return input;});
 assert.deepEqual(result,[{id,status:'valid'}]);assert.equal(calls[2][0],'finish_validation_job');assert.equal(calls[2][1].p_token,id);assert.equal(calls[2][1].p_version,'form-2');assert.equal(calls[2][1].p_valid,true);
});
test('queue never treats input errors or lost acknowledgements as certification',async()=>{
 const finishes=[];const broken=await runValidationQueue(async(name,args)=>{if(name==='claim_validations')return [job];if(name==='get_validation_job_input')return {...input,site:'00000000-0000-4000-8000-000000000002'};finishes.push(args);});
 assert.deepEqual(broken,[{id,status:'retry_pending'}]);assert.equal(finishes[0].p_valid,null);assert.equal(finishes[0].p_error_code,'validation_unavailable');
 assert.deepEqual(await runValidationQueue(async name=>{if(name==='claim_validations')return [job];if(name==='get_validation_job_input')return input;throw Error('lease lost');}),[{id,status:'unacknowledged'}]);
 await assert.rejects(runValidationQueue(async()=>[],0),/batch size/);
});
