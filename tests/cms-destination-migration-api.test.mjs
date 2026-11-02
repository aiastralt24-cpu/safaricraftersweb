import test from 'node:test';
import assert from 'node:assert/strict';
import {handleDestinationMigrationReview} from '../lib/cms/destination-migration-api.ts';
import {sourceDigest} from '../lib/cms/testimonial-migration.ts';
const site='10000000-0000-4000-8000-000000000001',related='20000000-0000-4000-8000-000000000001';
const source={slug:'forest',title:'Forest',continent:'India',country:'India',status:'rich',image:{src:'/image.jpg'},journeys:['Related journey']};
const body={action:'review',site,locale:'en',source:[source],mappings:{[`snapshot:${sourceDigest(source)}`]:{images:{image:{assetId:'forest',alt:'Forest',decorative:false}},references:{'journeys.0':related}}}};
const request=(value=body,headers={})=>new Request('https://example.test/api/cms/migrations/destinations',{method:'POST',headers:{Authorization:'Bearer a.b.c','Content-Type':'application/json',...headers},body:JSON.stringify(value)});
const evidence={assets:[{assetId:'forest',available:true}],references:[{recordId:related,type:'journey',available:true,locale:'en'}]};
test('destination migration review uses caller-scoped evidence and binds review to current availability',async()=>{
 let calls=[];const call=async(token,name,args)=>{calls.push({token,name,args});return evidence;};
 const response=await handleDestinationMigrationReview(request(),call);assert.equal(response.status,200);const good=await response.json();assert.equal(good.plan.readyDrafts,1);assert.equal(good.applyAvailable,true);assert.equal(calls[0].token,'a.b.c');assert.equal(calls[0].name,'review_destination_migration_links');assert.equal(calls[0].args.p_site,site);
 const changed=await (await handleDestinationMigrationReview(request(),async()=>({...evidence,assets:[{assetId:'forest',available:false}]}))).json();assert.equal(changed.plan.readyDrafts,0);assert.notEqual(changed.reviewDigest,good.reviewDigest);
 const wrongLocale=await (await handleDestinationMigrationReview(request(),async()=>({...evidence,references:[{...evidence.references[0],locale:'fr'}]}))).json();assert.equal(wrongLocale.plan.readyDrafts,0);
 assert.equal((await handleDestinationMigrationReview(request(),async()=>({...evidence,assets:[]}))).status,503);
});
test('migration review rejects unauthenticated, cross-origin and unsupported apply requests before RPC',async()=>{
 const fail=async()=>{throw Error('Unexpected RPC');};
 assert.equal((await handleDestinationMigrationReview(request(body,{Authorization:''}),fail)).status,401);
 assert.equal((await handleDestinationMigrationReview(request(body,{Origin:'https://outside.test'}),fail)).status,403);
 assert.equal((await handleDestinationMigrationReview(request({...body,action:'apply'}),fail)).status,422);
});


test('destination apply binds reviewed source and mapping to caller-scoped draft-only transaction',async()=>{
 const review=await (await handleDestinationMigrationReview(request(),async()=>evidence)).json();const calls=[];
 const applyBody={...body,action:'apply',requestKey:'30000000-0000-4000-8000-000000000001',reviewDigest:review.reviewDigest};
 const response=await handleDestinationMigrationReview(request(applyBody),async(token,name,args)=>{calls.push({token,name,args});return name==='review_destination_migration_links'?evidence:[];});
 assert.equal(response.status,200);assert.equal(calls[1].name,'apply_destination_migration');assert.equal(calls[1].token,'a.b.c');assert.deepEqual(calls[1].args.p_items[0].source,source);assert.equal(calls[1].args.p_items[0].payload.image.assetId,'forest');
 const stale=await handleDestinationMigrationReview(request({...applyBody,reviewDigest:'0'.repeat(64)}),async()=>evidence);assert.equal(stale.status,409);
});

test('migration recovery is read-only and distinguishes unconfirmed from completed results',async()=>{
 const requestKey='30000000-0000-4000-8000-000000000001',statusBody={action:'status',site,requestKey};let calls=[];
 const pending=await handleDestinationMigrationReview(request(statusBody),async(token,name,args)=>{calls.push({token,name,args});return null;});assert.equal((await pending.json()).status,'unconfirmed');assert.equal(calls[0].name,'get_destination_migration_result');assert.equal(calls[0].token,'a.b.c');
 const result={requestKey,sourceDigest:'a'.repeat(64),reviewDigest:'b'.repeat(64),createdAt:'2026-10-22T00:00:00Z',result:[{recordId:related,revisionId:site,sourceKey:'destination_'+'c'.repeat(64)}]};
 const complete=await handleDestinationMigrationReview(request(statusBody),async()=>result);assert.equal((await complete.json()).status,'complete');
 assert.equal((await handleDestinationMigrationReview(request(statusBody),async()=>({...result,requestKey:site}))).status,503);
 assert.equal((await handleDestinationMigrationReview(request(statusBody),async()=>({...result,result:[result.result[0],result.result[0]]}))).status,503);
});
