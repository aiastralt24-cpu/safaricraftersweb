import test from 'node:test';
import assert from 'node:assert/strict';
import {newGlobalSettings} from '../lib/cms/global-settings.ts';
import {runValidationQueue} from '../lib/cms/validation-queue-worker.ts';
const id=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const job={id:id(1),site:id(2),record:id(3),revision:id(4),token:id(5)};
const payload=newGlobalSettings();payload.header.mainMenu={recordId:id(6)};
const input={site:job.site,record:job.record,revision:job.revision,type:'settings',path:null,locale:'en',payload};
test('settings queue carries reference findings for incomplete content',async()=>{
 for(const [settingsStatus,hasFinding] of [[[{recordId:id(6),available:true,type:'navigation',locale:'en'}],false],[[{recordId:id(6),available:false}],true],[undefined,true]]){
  let receipt;const output=await runValidationQueue(async(name,args)=>{if(name==='claim_validations')return [job];if(name==='get_validation_job_input')return {...input,settingsStatus};receipt=args;return null;});
  assert.deepEqual(output,[{id:job.id,status:'invalid'}]);assert.equal(receipt.p_valid,false);assert.equal(receipt.p_token,job.token);assert.equal(receipt.p_findings.some(f=>f.code==='settings_reference_verification_required'),hasFinding);assert.ok(receipt.p_findings.some(f=>f.code==='settings_required'));assert.equal(receipt.p_version,'settings-1');
 }
});
test('malformed settings evidence cannot become an acknowledged validation result',async()=>{
 let receipt;const output=await runValidationQueue(async(name,args)=>{if(name==='claim_validations')return [job];if(name==='get_validation_job_input')return {...input,settingsStatus:[{recordId:id(6),available:true,privateField:'untrusted'}]};receipt=args;});assert.equal(output[0].status,'retry_pending');assert.equal(receipt.p_valid,null);assert.equal(receipt.p_error_code,'validation_unavailable');
});
test('settings queue acknowledges complete revision-bound settings as valid',async()=>{
 const complete=structuredClone(payload);complete.seo.description='Forest journeys';complete.footer.copyright='Safari Crafters';complete.cookies.title='Cookie preferences';complete.cookies.description='Choose optional cookies.';complete.search.contentTypes=['journey'];
 let receipt;const output=await runValidationQueue(async(name,args)=>{if(name==='claim_validations')return [job];if(name==='get_validation_job_input')return {...input,payload:complete,settingsStatus:[{recordId:id(6),available:true,type:'navigation',locale:'en'}]};receipt=args;return null;});
 assert.deepEqual(output,[{id:job.id,status:'valid'}]);assert.equal(receipt.p_valid,true);assert.equal(receipt.p_version,'settings-1');assert.equal(receipt.p_token,job.token);assert.deepEqual(receipt.p_findings,[]);
});
