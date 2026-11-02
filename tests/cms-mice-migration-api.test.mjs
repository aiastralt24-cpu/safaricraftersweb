import test from 'node:test';import assert from 'node:assert/strict';
import inventory from '../docs/cms/mice-migration-inventory.json' with {type:'json'};
import {handleMiceMigrationReview} from '../lib/cms/mice-migration-api.ts';
const ids=Array.from({length:4},(_,i)=>`00000000-0000-4000-8000-${String(i+1).padStart(12,'0')}`),[site,record,revision,form]=ids;
const command={action:'review',site,recordId:null,expectedRevision:null,formId:form,bindings:inventory.media.map((m,i)=>({sourcePath:m.sourcePath,sourceSha256:m.sha256,assetId:`verified-${i}`}))};
const request=(body=command,extra={})=>new Request('https://site.test/api/cms/migrations/mice',{method:'POST',headers:{Authorization:'Bearer a.b.c','Content-Type':'application/json',...extra},body:JSON.stringify(body)});
const formEvidence=()=>({recordId:form,revisionId:revision,locale:'en',available:true});
const evidence=()=>command.bindings.map(b=>({assetId:b.assetId,sourceSha256:b.sourceSha256,sourceMatches:true,revision:1,processedSha256:'a'.repeat(64),available:true}));
test('MICE review uses caller-scoped current media and form evidence to qualify draft application',async()=>{
 const calls=[];const response=await handleMiceMigrationReview(request(),async(token,name,args)=>{calls.push({token,name,args});return name==='can'?true:name==='review_mice_migration_form'?formEvidence():evidence();});assert.equal(response.status,200);assert.match(response.headers.get('cache-control'),/no-store/);
 const body=await response.json();assert.equal(body.verification.verified,true);assert.equal(body.applyAvailable,true);assert.equal(body.proposal.composition.sections.length,6);assert.match(body.reviewDigest,/^[a-f0-9]{64}$/);assert.deepEqual(calls.map(c=>c.name),['can','review_contact_migration_media','review_mice_migration_form']);assert.ok(calls.every(c=>c.token==='a.b.c'&&c.args.p_site===site));
 const unavailable=evidence();unavailable[0].available=false;const changed=await (await handleMiceMigrationReview(request(),async(_,name)=>name==='can'?true:name==='review_mice_migration_form'?formEvidence():unavailable)).json();assert.equal(changed.verification.verified,false);assert.notEqual(changed.reviewDigest,body.reviewDigest);
});
test('review rejects browser evidence, incomplete apply commands, unknown originals, permissions and cross-origin requests',async()=>{
 for(const value of [{...command,evidence:evidence()},{...command,action:'apply'},{...command,recordId:record},{...command,bindings:[command.bindings[0]]}])assert.equal((await handleMiceMigrationReview(request(value),async()=>{throw Error('Must not reach RPC');})).status,422);
 assert.equal((await handleMiceMigrationReview(request(command,{Origin:'https://evil.test'}),async()=>{throw Error('Must not read');})).status,403);
 assert.equal((await handleMiceMigrationReview(request(),async()=>false)).status,403);
 assert.equal((await handleMiceMigrationReview(request({...command,bindings:command.bindings.map(b=>({...b,sourceSha256:'b'.repeat(64)}))}),async()=>true)).status,422);
});
test('existing MICE review checks exact target and revision before media, rejecting contradictory evidence',async()=>{
 const existing={...command,recordId:record,expectedRevision:revision},detail={id:record,type:'page',path:'/mice',locale:'en',currentRevision:revision,payload:{old:true},permissions:{edit:true}};
 for(const [patch,status]of [[{path:'/about'},403],[{currentRevision:form},409],[{permissions:{edit:false}},403]])assert.equal((await handleMiceMigrationReview(request(existing),async(_,name)=>{assert.equal(name,'get_editor_record');return {...detail,...patch};})).status,status);
 for(const bad of [[...evidence()].reverse(),evidence().map(e=>({...e,sourceMatches:false})),evidence().map(e=>({...e,revision:null}))])assert.equal((await handleMiceMigrationReview(request(existing),async(_,name)=>name==='get_editor_record'?detail:bad)).status,503);
 const body=await (await handleMiceMigrationReview(request(existing),async(_,name)=>name==='get_editor_record'?detail:name==='review_mice_migration_form'?formEvidence():evidence())).json();assert.deepEqual(body.before,{old:true});
});

test('MICE review binds its digest to published corporate form evidence and rejects malformed identities',async()=>{
 const run=async(value)=>handleMiceMigrationReview(request(),async(_,name)=>name==='can'?true:name==='review_mice_migration_form'?value:evidence());
 const valid=await(await run(formEvidence())).json();assert.deepEqual(valid.formEvidence,formEvidence());
 const unavailable={...formEvidence(),revisionId:null,locale:null,available:false};const changed=await(await run(unavailable)).json();assert.deepEqual(changed.formEvidence,unavailable);assert.notEqual(changed.reviewDigest,valid.reviewDigest);assert.equal(changed.applyAvailable,false);
 const newer=await(await run({...formEvidence(),revisionId:record})).json();assert.notEqual(newer.reviewDigest,valid.reviewDigest);
 for(const bad of [null,{...formEvidence(),recordId:record},{...formEvidence(),revisionId:null},{...formEvidence(),locale:'fr'},{...formEvidence(),definition:{private:true}}])assert.equal((await run(bad)).status,503);
 const noForm=await handleMiceMigrationReview(request({...command,formId:null}),async(_,name)=>{assert.notEqual(name,'review_mice_migration_form');return name==='can'?true:evidence();});assert.equal((await noForm.json()).formEvidence,null);
});

const requestKey='00000000-0000-4000-8000-000000000005';
async function reviewedApply(){const reviewed=await(await handleMiceMigrationReview(request(),async(_,name)=>name==='can'?true:name==='review_mice_migration_form'?formEvidence():evidence())).json();return {body:{...command,action:'apply',requestKey,reviewDigest:reviewed.reviewDigest,evidence:reviewed.verification.evidence,formEvidence:reviewed.formEvidence},reviewed};}
function applyTransport(overrides={},seen=[]){return async(token,name,args)=>{
 seen.push({token,name,args});
 if(name==='get_mice_migration_result')return overrides.receipt??null;
 if(name==='can')return overrides.can??true;
 if(name==='review_contact_migration_media')return overrides.evidence??evidence();
 if(name==='review_mice_migration_form')return overrides.formEvidence??formEvidence();
 if(name==='apply_mice_migration')return overrides.result??{recordId:record,revisionId:revision};
 throw Error(`Unexpected RPC: ${name}`);
};}
test('MICE apply reconstructs only the reviewed draft and returns validated identity',async()=>{
 const {body,reviewed}=await reviewedApply(),seen=[];const response=await handleMiceMigrationReview(request(body),applyTransport({},seen));assert.equal(response.status,200);assert.match(response.headers.get('cache-control'),/no-store/);
 const result=await response.json();assert.equal(result.replayed,false);assert.equal(result.requestKey,requestKey);
 assert.deepEqual(seen.map(c=>c.name),['get_mice_migration_result','can','review_contact_migration_media','review_mice_migration_form','apply_mice_migration']);assert.ok(seen.every(c=>c.token==='a.b.c'&&c.args.p_site===site));
 const args=seen.at(-1).args;assert.equal(args.p_source,reviewed.sourceDigest);assert.equal(args.p_review,body.reviewDigest);assert.deepEqual(args.p_manifest.payload,reviewed.proposal);assert.deepEqual(args.p_manifest.formBinding,{recordId:form,revisionId:revision,locale:'en'});
 assert.equal((await handleMiceMigrationReview(request({...body,payload:{forged:true}}),async()=>{throw Error('No RPC');})).status,422);
});
test('MICE apply rejects forged, withdrawn and changed evidence without writing',async()=>{
 const {body}=await reviewedApply();
 for(const [patch,status]of [[{formId:null},422],[{formEvidence:{...formEvidence(),recordId:record}},422],[{formEvidence:{...formEvidence(),revisionId:record}},409],[{reviewDigest:'0'.repeat(64)},409],[{evidence:evidence().map(e=>({...e,available:false}))},422]]){
  const seen=[];assert.equal((await handleMiceMigrationReview(request({...body,...patch}),applyTransport({},seen))).status,status);assert.equal(seen.length,0);
 }
 for(const [overrides,status]of [[{can:false},403],[{evidence:evidence().map(e=>({...e,available:false}))},422],[{evidence:evidence().map(e=>({...e,revision:2}))},409],[{formEvidence:{...formEvidence(),available:false}},422],[{formEvidence:{...formEvidence(),revisionId:record}},409]]){
  const seen=[];assert.equal((await handleMiceMigrationReview(request(body),applyTransport(overrides,seen))).status,status);assert.ok(!seen.some(c=>c.name==='apply_mice_migration'));
 }
});
test('MICE receipt recovery rechecks the exact immutable transaction before returning success',async()=>{
 const {body,reviewed}=await reviewedApply(),receipt={requestKey,sourceDigest:reviewed.sourceDigest,reviewDigest:body.reviewDigest,createdAt:'2026-10-28T00:00:00Z',result:{recordId:record,revisionId:revision}},seen=[];
 const replay=await handleMiceMigrationReview(request(body),applyTransport({receipt},seen));assert.equal(replay.status,200);assert.equal((await replay.json()).replayed,true);assert.deepEqual(seen.map(c=>c.name),['get_mice_migration_result','apply_mice_migration']);
 assert.equal((await handleMiceMigrationReview(request(body),applyTransport({receipt:{...receipt,reviewDigest:'0'.repeat(64)}}))).status,409);
 assert.equal((await handleMiceMigrationReview(request(body),applyTransport({receipt,result:{recordId:record,revisionId:form}}))).status,503);
 const status={action:'status',site,requestKey};const pending=await handleMiceMigrationReview(request(status),async()=>null);assert.equal((await pending.json()).status,'unconfirmed');
 assert.equal((await(await handleMiceMigrationReview(request(status),async()=>receipt)).json()).status,'complete');
 for(const invalid of [{},{...receipt,requestKey:record},{...receipt,result:{recordId:record}}])assert.equal((await handleMiceMigrationReview(request(status),async()=>invalid)).status,503);
});
