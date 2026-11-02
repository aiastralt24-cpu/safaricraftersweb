import test from 'node:test';import assert from 'node:assert/strict';
import {handleContactFormMigration} from '../lib/cms/contact-form-migration-api.ts';
import {verifyContactFormReview,makePendingContactForms,readPendingContactForms,contactFormRecoveryKey,verifyContactFormReceipt,verifyContactFormRecovery,contactFormApplyCommand} from '../lib/cms/contact-form-migration-client.ts';
const site='00000000-0000-4000-8000-000000000001',actor='10000000-0000-4000-8000-000000000001',key='20000000-0000-4000-8000-000000000001',targets=['contact','corporate'].map(variant=>({variant,recordId:null,expectedRevision:null}));
async function review(){return (await handleContactFormMigration(new Request('http://localhost/api/cms/migrations/contact-forms',{method:'POST',headers:{authorization:'Bearer test.editor.token','content-type':'application/json'},body:JSON.stringify({action:'review',site,targets})}),async()=>true)).json();}
test('form browser review verifies exact definitions, targets and source/review identity',async()=>{
 const input=await review();assert.equal((await verifyContactFormReview(input,site,targets)).proposal.forms.length,2);
 for(const change of [v=>v.proposal.forms[0].definition.fields[0].required=false,v=>v.proposal.forms.reverse(),v=>v.reviewDigest='0'.repeat(64),v=>v.sourceDigest='0'.repeat(64),v=>v.before[0]={title:'Unexpected replacement'}]){const bad=structuredClone(input);change(bad);await assert.rejects(verifyContactFormReview(bad,site,targets));}
 await assert.rejects(verifyContactFormReview(input,actor,targets));
});
test('form recovery stores only bounded actor/site identities and rejects mismatched or partial results',async()=>{
 const checked=await verifyContactFormReview(await review(),site,targets),pending=makePendingContactForms(site,actor,targets,checked,key),stored=JSON.stringify(pending);
 assert.doesNotMatch(stored,/fields|consent|Bearer|proposal|before/);assert.deepEqual(readPendingContactForms(stored,site,actor),pending);assert.equal(readPendingContactForms(null,site,actor),null);assert.match(contactFormRecoveryKey(site,actor),new RegExp(actor));assert.throws(()=>readPendingContactForms(stored,site,key));assert.throws(()=>readPendingContactForms(' '.repeat(5001),site,actor));assert.deepEqual(contactFormApplyCommand(pending),{action:'apply',site,targets,requestKey:key,reviewDigest:checked.reviewDigest});
 const result=[{variant:'contact',recordId:site,revisionId:actor},{variant:'corporate',recordId:actor,revisionId:key}],response={requestKey:key,sourceDigest:pending.sourceDigest,reviewDigest:pending.reviewDigest,result,replayed:false};assert.deepEqual(verifyContactFormReceipt(response,pending),result);
 assert.equal(verifyContactFormRecovery({status:'unconfirmed',message:'Pending'},pending),null);
 for(const patch of [{requestKey:actor},{result:result.slice(0,1)},{result:[result[1],result[0]]},{result:[result[0],{...result[1],recordId:site}]},{sourceDigest:'0'.repeat(64)}])assert.throws(()=>verifyContactFormReceipt({...response,...patch},pending));
 const targeted={...pending,targets:[{variant:'contact',recordId:key,expectedRevision:site},targets[1]]};assert.throws(()=>verifyContactFormReceipt(response,targeted));
});
