import test from 'node:test';
import assert from 'node:assert/strict';
import {parseExpeditionSnapshot,parseExpeditionMappings,expeditionSourceDigest,verifyExpeditionReview,verifyExpeditionReceipt,readPendingExpeditionMigration,verifyExpeditionRecovery,expeditionRecoveryKey} from '../lib/cms/photo-expedition-migration-client.ts';
import {handlePhotoExpeditionMigrationReview} from '../lib/cms/photo-expedition-migration-api.ts';
import {sourceDigest} from '../lib/cms/testimonial-migration.ts';
import {newPhotoExpedition} from '../lib/cms/photo-expeditions.ts';
const site='00000000-0000-4000-8000-000000000001',actor='00000000-0000-4000-8000-000000000002',record='00000000-0000-4000-8000-000000000003',revision='00000000-0000-4000-8000-000000000004';
const source=[{slug:'forest',title:'Forest',geography:'India',image:{src:'/forest.webp'},price:'INR 1,20,000 + tax',date:'Dates on request'}],key=`snapshot:${sourceDigest(source[0])}`,image={assetId:'forest',alt:'Forest',decorative:false},draft=newPhotoExpedition();
const maps={[key]:{images:{image},programmeStatus:'preview',specialists:[],display:{heroTitle:'Forest',heroCopy:'Reviewed copy',heroImage:image,gallery:[],labels:draft.labels,booking:draft.booking,enquiry:{...draft.enquiry,form:{recordId:record}},additionalFaqs:[],reviewedOn:'2026-10-22',reviewNotes:'Reviewed display'}}};
async function review(){const response=await handlePhotoExpeditionMigrationReview(new Request('https://site.test/api/cms/migrations/expeditions',{method:'POST',headers:{Authorization:'Bearer a.b.c','Content-Type':'application/json'},body:JSON.stringify({action:'review',site,locale:'en',source,mappings:maps})}),async(_t,_n,args)=>({assets:args.p_assets.map(assetId=>({assetId,available:true})),references:args.p_references.map(item=>({...item,available:true,locale:'en'}))}));assert.equal(response.status,200);return response.json();}
test('browser parser supports expedition arrays/site exports, shared mapping contracts and exact server hashes',async()=>{
 assert.deepEqual(parseExpeditionSnapshot(JSON.stringify(source)),source);assert.deepEqual(parseExpeditionSnapshot(JSON.stringify({expeditions:source,unrelated:'ignored'})),source);assert.deepEqual(parseExpeditionMappings(JSON.stringify(maps)),maps);
 assert.equal(await expeditionSourceDigest(source),sourceDigest(source));assert.equal(await expeditionSourceDigest({z:'é',a:[2,1]}),sourceDigest({a:[2,1],z:'é'}));
 for(const text of ['bad','[]','{}',JSON.stringify(Array(26).fill(source[0])),' '.repeat(1000001)])assert.throws(()=>parseExpeditionSnapshot(text));
 assert.throws(()=>parseExpeditionMappings(JSON.stringify({[key]:{images:{image}}})));
});
test('browser validates actual endpoint reviews and rejects changed sources, mappings, identities and readiness',async()=>{
 const value=await review();assert.equal((await verifyExpeditionReview(value,source,maps)).applyAvailable,true);
 await assert.rejects(verifyExpeditionReview(value,[{...source[0],title:'Changed'}],maps));const changed=structuredClone(maps);changed[key].display.reviewNotes='Changed';await assert.rejects(verifyExpeditionReview(value,source,changed));
 for(const mutate of [v=>v.plan.count++,v=>v.plan.readyDrafts=0,v=>v.applyAvailable=false,v=>v.plan.candidates[0].sourceIndex=1,v=>v.plan.candidates[0].payload.slug='different',v=>v.plan.candidates[0].mapping=null,v=>v.plan.candidates[0].issues.push({field:'image',severity:'error',message:'Unavailable'}),v=>v.plan.unusedMappings.push('unknown'),v=>v.verification.publication=true]){const altered=structuredClone(value);mutate(altered);await assert.rejects(verifyExpeditionReview(altered,source,maps));}
});
test('receipts and persisted recovery bind exact records, account, website and request without retaining source text',()=>{
 const result=[{recordId:record,revisionId:revision,sourceKey:key}],pending={version:1,site,actorId:actor,requestKey:record,sourceDigest:sourceDigest(source),reviewDigest:'a'.repeat(64),sourceKeys:[key]};
 assert.deepEqual(verifyExpeditionReceipt({result,replayed:false},[key]),result);assert.deepEqual(readPendingExpeditionMigration(JSON.stringify(pending),site,actor),pending);assert.equal(readPendingExpeditionMigration(null,site,actor),null);
 assert.notEqual(expeditionRecoveryKey(site,actor),expeditionRecoveryKey(site,record));assert.throws(()=>readPendingExpeditionMigration(JSON.stringify(pending),site,record));assert.throws(()=>readPendingExpeditionMigration(JSON.stringify({...pending,source}),site,actor));assert.throws(()=>readPendingExpeditionMigration(JSON.stringify({...pending,sourceKeys:[key,key]}),site,actor));
 const response={status:'complete',requestKey:record,sourceDigest:pending.sourceDigest,reviewDigest:pending.reviewDigest,createdAt:'2026-10-22T12:00:00Z',result};assert.deepEqual(verifyExpeditionRecovery(response,pending),result);assert.equal(verifyExpeditionRecovery({status:'unconfirmed',message:'May still complete'},pending),null);
 for(const change of [{requestKey:revision},{sourceDigest:'b'.repeat(64)},{reviewDigest:'b'.repeat(64)},{result:[]},{result:[...result,...result]}])assert.throws(()=>verifyExpeditionRecovery({...response,...change},pending));
 assert.throws(()=>verifyExpeditionReceipt({result:[...result,...result]},[key,key]));assert.throws(()=>verifyExpeditionReceipt({result:[result[0],{...result[0],sourceKey:'snapshot:'+'b'.repeat(64)}]},[key,'snapshot:'+'b'.repeat(64)]));
});
