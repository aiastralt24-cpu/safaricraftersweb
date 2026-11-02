import test from 'node:test';
import assert from 'node:assert/strict';
import {runTrustedValidation} from '../lib/cms/validation-worker.ts';
const target={site:'00000000-0000-4000-8000-000000000001',record:'00000000-0000-4000-8000-000000000002',revision:'00000000-0000-4000-8000-000000000003'};
const input={...target,type:'journey',path:'/journeys/forest',payload:{slug:'forest'}};
test('worker rejects input identity mismatch and untrusted extra payload',async()=>{
 let writes=0;const rpc=async(name)=>{if(name==='record_validation')writes++;return {...input,site:target.record};};
 await assert.rejects(runTrustedValidation(rpc,target),/identity mismatch/);
 await assert.rejects(runTrustedValidation(rpc,{...target,payload:{title:'forged'}}));assert.equal(writes,0);
});
test('worker records actual failures and never reports success when acknowledgement fails',async()=>{
 let args;const result=await runTrustedValidation(async(name,value)=>{if(name==='get_validation_input')return input;args=value;},target);
 assert.equal(result.contentChecksPass,false);assert.equal(args.p_valid,false);assert.equal(args.p_revision,target.revision);assert.ok(args.p_findings.some(f=>f.code==='required'));
 await assert.rejects(runTrustedValidation(async(name)=>{if(name==='get_validation_input')return input;throw Error('revision_conflict');},target),/revision_conflict/);
});
