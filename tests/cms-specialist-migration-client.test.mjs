import test from 'node:test';
import assert from 'node:assert/strict';
import {parseSpecialistSnapshot,verifySpecialistReceipt,readPendingSpecialistMigration,verifySpecialistRecovery,specialistRecoveryKey,verifySpecialistReview} from '../lib/cms/specialist-migration-client.ts';
import {handleSpecialistMigrationReview} from '../lib/cms/specialist-migration-api.ts';
const site='00000000-0000-4000-8000-000000000001',actor='00000000-0000-4000-8000-000000000002',key='specialist_'+'a'.repeat(64),digest='b'.repeat(64);
const source={specialists:[{name:'Guide'}],journeys:[],expeditions:[]};
test('specialist source parser accepts site export collections and bounds uploads',()=>{assert.deepEqual(parseSpecialistSnapshot(JSON.stringify({...source,unrelated:'ignored'})),source);assert.throws(()=>parseSpecialistSnapshot(JSON.stringify({specialists:source.specialists})));assert.throws(()=>parseSpecialistSnapshot('x'.repeat(1000001)));});
test('specialist browser verifies reviewed source identity and readiness',async()=>{const request=new Request('https://site.test/api/cms/migrations/specialists',{method:'POST',headers:{Authorization:'Bearer a.b.c','Content-Type':'application/json'},body:JSON.stringify({action:'review',site,locale:'en',source,mappings:{}})});const response=await (await handleSpecialistMigrationReview(request,async()=>({assets:[],references:[]}))).json();assert.equal((await verifySpecialistReview(response,source)).applyAvailable,false);await assert.rejects(verifySpecialistReview({...response,applyAvailable:true},source));await assert.rejects(verifySpecialistReview(response,{...source,specialists:[{name:'Other'}]}));});
test('specialist receipts and durable recovery require exact website, actor and complete source coverage',()=>{
 const result=[{sourceKey:key,recordId:site,revisionId:actor}],pending={version:1,site,actorId:actor,requestKey:site,reviewDigest:digest,sourceDigest:digest,sourceKeys:[key]};
 assert.equal(specialistRecoveryKey(site,actor),`cms-specialist-migration:${site}:${actor}`);assert.deepEqual(readPendingSpecialistMigration(JSON.stringify(pending),site,actor),pending);assert.throws(()=>readPendingSpecialistMigration(JSON.stringify(pending),actor,site));
 assert.deepEqual(verifySpecialistReceipt({result},[key]),result);assert.throws(()=>verifySpecialistReceipt({result:[...result,...result]},[key]));assert.throws(()=>verifySpecialistReceipt({result},['specialist_'+'f'.repeat(64)]));
 assert.equal(verifySpecialistRecovery({status:'unconfirmed',message:'Pending'},pending),null);
 const receipt={status:'complete',requestKey:site,reviewDigest:digest,sourceDigest:digest,createdAt:'2026-10-22T00:00:00Z',result};assert.deepEqual(verifySpecialistRecovery(receipt,pending),result);assert.throws(()=>verifySpecialistRecovery({...receipt,requestKey:actor},pending));
});
