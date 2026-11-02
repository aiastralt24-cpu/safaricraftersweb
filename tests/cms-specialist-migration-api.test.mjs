import test from 'node:test';
import assert from 'node:assert/strict';
import {handleSpecialistMigrationReview} from '../lib/cms/specialist-migration-api.ts';
import {planSpecialistMigration} from '../lib/cms/specialist-migration.ts';
const site='00000000-0000-4000-8000-000000000001',trip='00000000-0000-4000-8000-000000000002';
const source={specialists:[{name:'Guide',role:'Naturalist',expertise:'Forest',bio:'Guide biography',moment:'',image:{src:'/legacy.jpg'}}],journeys:[{slug:'forest',specialist:'Guide'}],expeditions:[]};
const key=planSpecialistMigration(source).candidates[0].sourceKey;
const command={action:'review',site,locale:'en',source,mappings:{profiles:{[key]:{image:{assetId:'portrait',alt:'Guide',decorative:false}}},journeys:{forest:trip}}};
const evidence={assets:[{assetId:'portrait',available:true}],references:[{recordId:trip,type:'journey',available:true,locale:'en'}]};
const request=(body=command,headers={})=>new Request('https://site.test/api/cms/migrations/specialists',{method:'POST',headers:{Authorization:'Bearer a.b.c','Content-Type':'application/json',...headers},body:JSON.stringify(body)});
test('specialist migration review checks website evidence and returns a stable draft-import review digest',async()=>{
 let args;const response=await handleSpecialistMigrationReview(request(),async(...input)=>{args=input;return evidence;});assert.equal(response.status,200);assert.match(response.headers.get('cache-control'),/no-store/);
 assert.deepEqual(args,['a.b.c','review_specialist_migration_links',{p_site:site,p_assets:['portrait'],p_references:[{recordId:trip,type:'journey'}]}]);
 const result=await response.json();assert.equal(result.plan.readyDrafts,1);assert.equal(result.applyAvailable,true);assert.match(result.reviewDigest,/^[a-f0-9]{64}$/);
 assert.equal((await (await handleSpecialistMigrationReview(request(),async()=>evidence)).json()).reviewDigest,result.reviewDigest);
 const changed=await (await handleSpecialistMigrationReview(request({...command,locale:'fr'}),async()=>evidence)).json();assert.notEqual(changed.reviewDigest,result.reviewDigest);assert.equal(changed.plan.readyDrafts,0);
});
test('unavailable image or wrong-language trip prevents draft readiness',async()=>{
 for(const unavailable of [{...evidence,assets:[{assetId:'portrait',available:false}]},{...evidence,references:[{recordId:trip,type:'journey',available:false}]},{...evidence,references:[{recordId:trip,type:'journey',available:true,locale:'fr'}]}]){const response=await handleSpecialistMigrationReview(request(),async()=>unavailable);assert.equal(response.status,200);assert.equal((await response.json()).plan.readyDrafts,0);}
});
test('unexpected evidence is unavailable, not trusted or presented as an authoring error',async()=>{
 for(const bad of [null,{assets:[],references:[]},{...evidence,assets:[...evidence.assets,...evidence.assets]},{...evidence,references:[{...evidence.references[0],recordId:site}]},{...evidence,secret:'private'}])assert.equal((await handleSpecialistMigrationReview(request(),async()=>bad)).status,503);
});
test('review endpoint rejects anonymous, cross-origin, unknown and incomplete apply requests before RPC',async()=>{
 const noCall=async()=>assert.fail('Unexpected database call');
 assert.equal((await handleSpecialistMigrationReview(request(command,{Authorization:''}),noCall)).status,401);assert.equal((await handleSpecialistMigrationReview(request(command,{Origin:'https://other.test'}),noCall)).status,403);
 for(const body of [{...command,action:'apply'},{...command,extra:true},{...command,source:{...source,specialists:[]}}])assert.equal((await handleSpecialistMigrationReview(request(body),noCall)).status,422);
});

test('specialist apply rechecks review evidence and sends a source-preserving draft manifest',async()=>{
 const review=await (await handleSpecialistMigrationReview(request(),async()=>evidence)).json();const requestKey=site,result=[{sourceKey:key,recordId:site,revisionId:trip}];const calls=[];
 const response=await handleSpecialistMigrationReview(request({...command,action:'apply',requestKey,reviewDigest:review.reviewDigest}),async(_token,name,args)=>{calls.push(name);if(name==='get_specialist_migration_result')return null;if(name==='review_specialist_migration_links')return evidence;assert.equal(name,'apply_specialist_migration');assert.deepEqual(args.p_items[0].source,source.specialists[0]);assert.deepEqual(args.p_items[0].relatedSources.journeys,source.journeys);assert.deepEqual(args.p_items[0].mappings,command.mappings);assert.equal(args.p_items[0].locale,'en');return result;});
 assert.equal(response.status,200);assert.deepEqual((await response.json()).result,result);assert.deepEqual(calls,['get_specialist_migration_result','review_specialist_migration_links','apply_specialist_migration']);
 const stale=await handleSpecialistMigrationReview(request({...command,action:'apply',requestKey,reviewDigest:review.reviewDigest}),async(_token,name)=>{if(name==='get_specialist_migration_result')return null;assert.equal(name,'review_specialist_migration_links');return {...evidence,assets:[{assetId:'portrait',available:false}]};});assert.equal(stale.status,409);
});
test('completed specialist import recovers before availability changes and verifies exact replay receipt',async()=>{
 const review=await (await handleSpecialistMigrationReview(request(),async()=>evidence)).json();const result=[{sourceKey:key,recordId:site,revisionId:trip}],receipt={requestKey:site,sourceDigest:review.plan.sourceDigest,reviewDigest:review.reviewDigest,createdAt:'2026-10-22T00:00:00Z',result};
 const apply={...command,action:'apply',requestKey:site,reviewDigest:review.reviewDigest};const calls=[];
 const recovered=await handleSpecialistMigrationReview(request(apply),async(_token,name)=>{calls.push(name);return name==='get_specialist_migration_result'?receipt:result;});assert.equal(recovered.status,200);assert.equal((await recovered.json()).replayed,true);assert.deepEqual(calls,['get_specialist_migration_result','apply_specialist_migration']);
 assert.equal((await handleSpecialistMigrationReview(request({...apply,reviewDigest:'f'.repeat(64)}),async()=>receipt)).status,409);
 assert.equal((await handleSpecialistMigrationReview(request(apply),async(_token,name)=>name==='get_specialist_migration_result'?receipt:[{...result[0],revisionId:site}])).status,503);
});
test('specialist status is scoped and distinguishes unconfirmed requests from completed receipts',async()=>{
 const status={action:'status',site,requestKey:trip};
 const response=await handleSpecialistMigrationReview(request(status),async(_token,name,args)=>{assert.equal(name,'get_specialist_migration_result');assert.deepEqual(args,{p_site:site,p_request:trip});return null;});assert.equal((await response.json()).status,'unconfirmed');
 assert.equal((await handleSpecialistMigrationReview(request(status),async()=>({requestKey:site}))).status,503);
});
test('unmatched source assignments block applying an otherwise mapped profile',async()=>{
 const c={...command,source:{...source,journeys:[...source.journeys,{slug:'unmatched',specialist:'Unknown team'}]}};
 const review=await (await handleSpecialistMigrationReview(request(c),async()=>evidence)).json();assert.equal(review.applyAvailable,false);assert.equal(review.plan.readyDrafts,1);
 const response=await handleSpecialistMigrationReview(request({...c,action:'apply',requestKey:site,reviewDigest:review.reviewDigest}),async(_token,name)=>{if(name==='get_specialist_migration_result')return null;assert.equal(name,'review_specialist_migration_links');return evidence;});assert.equal(response.status,422);
});

test('explicit name aliases participate in review readiness and source-preserving apply manifests',async()=>{
 const c={...command,source:{...source,journeys:[{slug:'forest',specialist:'Older guide name'}]},mappings:{...command.mappings,aliases:{'Older guide name':key}}};
 const review=await (await handleSpecialistMigrationReview(request(c),async()=>evidence)).json();assert.equal(review.applyAvailable,true);assert.deepEqual(review.plan.unmatchedAssignments,[]);
 const response=await handleSpecialistMigrationReview(request({...c,action:'apply',requestKey:site,reviewDigest:review.reviewDigest}),async(_token,name,args)=>{if(name==='get_specialist_migration_result')return null;if(name==='review_specialist_migration_links')return evidence;assert.equal(args.p_items[0].relatedSources.journeys[0].specialist,'Older guide name');assert.deepEqual(args.p_items[0].mappings.aliases,c.mappings.aliases);return [{sourceKey:key,recordId:site,revisionId:trip}];});assert.equal(response.status,200);
 const unused=await (await handleSpecialistMigrationReview(request({...c,mappings:{...c.mappings,aliases:{...c.mappings.aliases,'Unused':key}}}),async()=>evidence)).json();assert.equal(unused.applyAvailable,false);assert.notEqual(unused.reviewDigest,review.reviewDigest);
});
