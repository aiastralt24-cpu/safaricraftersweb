import test from 'node:test';import assert from 'node:assert/strict';
import {handleConceptMigrationReview} from '../lib/cms/concept-migration-api.ts';
import {site,revision,makeConceptMigrationFixture} from './fixtures/cms-concept-migration.mjs';
const target='00000000-0000-4000-8000-000000000300';
const command=()=>({action:'review',site,recordId:null,expectedRevision:null,mappings:makeConceptMigrationFixture().mappings});
const request=(body=command(),headers={})=>new Request('http://localhost/api/cms/migrations/concept',{method:'POST',headers:{authorization:'Bearer caller.editor.token',origin:'http://localhost','content-type':'application/json',...headers},body:JSON.stringify(body)});
function transport(options={},seen=[]){const {records}=makeConceptMigrationFixture();return async(token,name,args)=>{
 seen.push({token,name,args});if(name==='can')return options.can??true;
 if((name==='review_about_migration_media'||name==='review_hero_video_migration_media'))return options.media?options.media(args.p_bindings):args.p_bindings.map(item=>({...item,available:true,sourceMatches:true,revision:1,processedSha256:'a'.repeat(64)}));
 if(name!=='get_editor_record')throw Error(`Unexpected mutation ${name}`);
 if(args.p_record===target)return options.target??{id:target,type:'page',path:'/concept',locale:'en',currentRevision:revision,payload:{},permissions:{edit:true}};
 const original=records.find(item=>item.id===args.p_record);return options.record?options.record(structuredClone(original)):original?{...original,permissions:{edit:false}}:null;
};}
test('concept review reads exact mapped IDs with caller credentials and returns draft-apply readiness without private consent evidence',async()=>{
 const seen=[],response=await handleConceptMigrationReview(request(),transport({},seen));assert.equal(response.status,200);const value=await response.json();
 assert.equal(value.recordComparison.sourceMatches,true);assert.equal(value.proposal.composition.sections.length,10);assert.equal(value.applyAvailable,true);
 assert.match(response.headers.get('cache-control'),/no-store/);assert.match(value.reviewDigest,/^[a-f0-9]{64}$/);
 assert.ok(seen.length>16);assert.ok(seen.every(call=>call.token==='caller.editor.token'&&call.args.p_site===site));assert.deepEqual([...new Set(seen.map(call=>call.name))],['can','get_editor_record','review_about_migration_media','review_hero_video_migration_media']);
 assert.deepEqual(seen.filter(call=>call.name==='get_editor_record').map(call=>call.args.p_record),command().mappings.records.map(item=>item.recordId));
 assert.equal(JSON.stringify(value).includes('PRIVATE_CONSENT_EVIDENCE'),false);
});
test('authorization, origins, target identity and stale revisions stop comparison before dependency reads',async()=>{
 const select={...command(),recordId:target,expectedRevision:revision};
 for(const [body,options,status] of [[command(),{can:false},403],[select,{target:{id:target,type:'page',path:'/',locale:'en',currentRevision:revision,payload:{},permissions:{edit:true}}},403],[{...select,expectedRevision:target},{},409]]){
  const seen=[];assert.equal((await handleConceptMigrationReview(request(body),transport(options,seen))).status,status);assert.equal(seen.length,1);
 }
 for(const headers of [{origin:'https://foreign.example'},{authorization:''}]){const seen=[];const response=await handleConceptMigrationReview(request(command(),headers),transport({},seen));assert.ok([401,403].includes(response.status));assert.equal(seen.length,0);}
});
test('concept review rejects incomplete apply actions, client record evidence and rejects incomplete or stale mappings',async()=>{
 for(const modify of [c=>c.action='apply',c=>c.records=[],c=>c.mappings.captureDigest='0'.repeat(64),c=>c.mappings.media.pop(),c=>c.mappings.records.push(c.mappings.records[0])]){
  const c=command(),seen=[];modify(c);assert.equal((await handleConceptMigrationReview(request(c),transport({},seen))).status,422);assert.equal(seen.length,0);
 }
});
test('wrong, unavailable or malformed provider records fail the whole review without returning a partial proposal',async()=>{
 for(const record of [()=>null,r=>({...r,permissions:{edit:false},id:target}),r=>({...r,permissions:{edit:false},locale:'fr'}),r=>({...r,permissions:{edit:false},currentRevision:'bad'})]){
  const response=await handleConceptMigrationReview(request(),transport({record}));assert.equal(response.status,503);assert.equal('proposal' in await response.json(),false);
 }
});
test('changed drafts produce field findings and a different digest; later revisions cannot reuse the earlier review identity',async()=>{
 const initial=await (await handleConceptMigrationReview(request(),transport())).json();
 const changed=await (await handleConceptMigrationReview(request(),transport({record:r=>({...r,permissions:{edit:false},currentRevision:target,payload:r.type==='journey'?{...r.payload,title:'PRIVATE_CHANGED_DRAFT'}:r.payload})}))).json();
 assert.equal(changed.recordComparison.sourceMatches,false);assert.notEqual(changed.reviewDigest,initial.reviewDigest);assert.equal(changed.applyAvailable,false);assert.equal(JSON.stringify(changed).includes('PRIVATE_CHANGED_DRAFT'),false);
 const selected=await handleConceptMigrationReview(request({...command(),recordId:target,expectedRevision:revision}),transport());assert.equal(selected.status,200);
});
test('image rights failures remain review findings, missing evidence fails closed, and evidence revisions change the review digest',async()=>{
 const initial=await (await handleConceptMigrationReview(request(),transport())).json();assert.equal(initial.mediaVerification.images.length,103);assert.equal(initial.mediaVerification.videos.length,2);assert.equal(initial.mediaVerification.verified,false);
 const changed=await (await handleConceptMigrationReview(request(),transport({media:bindings=>bindings.map(item=>({...item,available:false,sourceMatches:true,revision:2,processedSha256:'a'.repeat(64)}))}))).json();
 assert.equal(changed.mediaVerification.imagesVerified,false);assert.notEqual(changed.reviewDigest,initial.reviewDigest);assert.equal(changed.applyAvailable,false);
 const unavailable=await handleConceptMigrationReview(request(),transport({media:()=>[]}));assert.equal(unavailable.status,503);assert.equal('proposal' in await unavailable.json(),false);
});
test('video evidence participates in review identity and missing video responses fail the entire review',async()=>{
 const initial=await (await handleConceptMigrationReview(request(),transport())).json();assert.ok(initial.mediaVerification.videos.every(video=>video.evidence.available));assert.equal(initial.mediaVerification.verified,false);
 const changedTransport=transport();const changed=await (await handleConceptMigrationReview(request(),async(token,name,args)=>{
  const result=await changedTransport(token,name,args);return name==='review_hero_video_migration_media'?result.map(item=>({...item,available:false,revision:2})):result;
 })).json();
 assert.ok(changed.mediaVerification.videos.every(video=>!video.evidence.available));assert.notEqual(changed.reviewDigest,initial.reviewDigest);assert.equal(changed.applyAvailable,false);
 const base=transport();const missing=await handleConceptMigrationReview(request(),(token,name,args)=>name==='review_hero_video_migration_media'?Promise.resolve([]):base(token,name,args));assert.equal(missing.status,503);assert.equal('proposal' in await missing.json(),false);
});

test('reviewed apply rechecks evidence and exact retries recover after a lost response without rereading newer drafts',async()=>{
 const base=transport(),selection={...command(),recordId:target,expectedRevision:revision};let saved=null,manifest=null,lost=true,applies=0,reads=0;
 const call=async(token,name,args)=>{
  if(name==='get_concept_migration_result')return saved;
  if(name==='apply_concept_migration'){
   applies++;if(manifest)assert.deepEqual(args.p_manifest,manifest);else manifest=structuredClone(args.p_manifest);
   const result={recordId:target,revisionId:'00000000-0000-4000-8000-000000000400'};
   saved={requestKey:args.p_request,sourceDigest:args.p_source,reviewDigest:args.p_review,createdAt:new Date().toISOString(),result};
   if(lost){lost=false;throw Error('Connection lost after commit');}return result;
  }
  reads++;if(saved)throw Error('Recovery must not reread newer drafts');return base(token,name,args);
 };
 const reviewed=await (await handleConceptMigrationReview(request(selection),call)).json();assert.equal(reviewed.applyAvailable,true);
 const apply={...selection,action:'apply',requestKey:'00000000-0000-4000-8000-000000000500',reviewDigest:reviewed.reviewDigest,evidence:{recordComparison:reviewed.recordComparison,mediaVerification:reviewed.mediaVerification}};
 assert.equal((await handleConceptMigrationReview(request(apply),call)).status,500);
 assert.equal(manifest.bindings.length,105);assert.equal(manifest.records.length,selection.mappings.records.length);assert.equal(manifest.evidence.length,105);assert.equal(JSON.stringify(manifest).includes('PRIVATE_CONSENT_EVIDENCE'),false);
 const readCount=reads,status=await (await handleConceptMigrationReview(request({action:'status',site,requestKey:apply.requestKey}),call)).json();assert.equal(status.status,'complete');assert.deepEqual(status.result,saved.result);
 const response=await handleConceptMigrationReview(request(apply),call);assert.equal(response.status,200);assert.equal((await response.json()).replayed,true);assert.equal(reads,readCount);assert.equal(applies,2);
});
test('apply refuses changed or contradictory reviews before a write and reports unknown recovery as unconfirmed',async()=>{
 const initial=await (await handleConceptMigrationReview(request(),transport())).json();
 const apply={...command(),action:'apply',requestKey:target,reviewDigest:initial.reviewDigest,evidence:{recordComparison:initial.recordComparison,mediaVerification:initial.mediaVerification}};
 const unavailable=transport({media:bindings=>bindings.map(item=>({...item,available:false,sourceMatches:true,revision:2,processedSha256:'a'.repeat(64)}))});let writes=0;
 const call=async(token,name,args)=>{if(name==='get_concept_migration_result')return null;if(name==='apply_concept_migration'){writes++;throw Error('Unexpected write');}return unavailable(token,name,args);};
 assert.equal((await handleConceptMigrationReview(request(apply),call)).status,422);
 const drift=transport({record:r=>({...r,permissions:{edit:false},currentRevision:target})});
 assert.equal((await handleConceptMigrationReview(request(apply),(token,name,args)=>name==='get_concept_migration_result'?Promise.resolve(null):drift(token,name,args))).status,409);
 for(const mutate of [c=>c.reviewDigest='0'.repeat(64),c=>c.evidence.recordComparison.revisions.pop(),c=>c.evidence.mediaVerification.videos[0].evidence.assetId=target]){const changed=structuredClone(apply);mutate(changed);assert.ok([409,422].includes((await handleConceptMigrationReview(request(changed),call)).status));}
 const status=await (await handleConceptMigrationReview(request({action:'status',site,requestKey:target}),call)).json();assert.equal(status.status,'unconfirmed');assert.equal(writes,0);
});
