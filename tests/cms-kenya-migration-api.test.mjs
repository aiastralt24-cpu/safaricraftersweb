import test from 'node:test';import assert from 'node:assert/strict';
import inventory from '../docs/cms/kenya-source-inventory.json' with {type:'json'};
import {handleKenyaMigrationReview} from '../lib/cms/kenya-migration-api.ts';
const [site,record,revision,other]=Array.from({length:4},(_,i)=>`00000000-0000-4000-8000-${String(i+1).padStart(12,'0')}`);
const command={action:'review',site,recordId:null,expectedRevision:null,bindings:inventory.media.map((m,i)=>({sourcePath:m.sourcePath,sourceSha256:m.sha256,assetId:`verified-${i}`}))};
const request=(body=command,extra={})=>new Request('https://site.test/api/cms/migrations/kenya',{method:'POST',headers:{Authorization:'Bearer a.b.c','Content-Type':'application/json',...extra},body:JSON.stringify(body)});
const evidence=bindings=>bindings.map(b=>({...b,sourceMatches:true,revision:1,processedSha256:'a'.repeat(64),available:true}));
const detail={id:record,type:'page',path:'/destinations/kenya',locale:'en',currentRevision:revision,payload:{old:true},permissions:{edit:true}};
const rpc=(seen=[],patch=x=>x)=>async(token,name,args)=>{seen.push({token,name,args});if(name==='can')return true;if(name==='get_editor_record')return detail;assert.equal(name,'review_contact_migration_media');assert.equal(args.p_bindings.length,2);return patch(evidence(args.p_bindings));};
test('Kenya review checks all eight images using caller/site-scoped two-image batches and qualifies verified draft application',async()=>{
 const seen=[],response=await handleKenyaMigrationReview(request(),rpc(seen)),body=await response.json();assert.equal(response.status,200);assert.match(response.headers.get('cache-control'),/no-store/);assert.equal(body.applyAvailable,true);assert.equal(body.verification.verified,true);assert.equal(body.proposal.composition.sections.length,10);
 assert.deepEqual(seen.map(c=>c.name),['can',...Array(4).fill('review_contact_migration_media')]);assert.ok(seen.every(c=>c.token==='a.b.c'&&c.args.p_site===site));assert.equal(body.verification.evidence.length,8);assert.match(body.reviewDigest,/^[a-f0-9]{64}$/);
 const changed=await(await handleKenyaMigrationReview(request(),rpc([],items=>items.map(e=>({...e,available:false}))))).json();assert.equal(changed.verification.verified,false);assert.equal(changed.verification.unavailable.length,8);assert.notEqual(changed.reviewDigest,body.reviewDigest);assert.equal(changed.applyAvailable,false);
});
test('Kenya review rejects browser evidence, wrong mappings, missing auth and cross-origin requests before RPC',async()=>{
 const never=async()=>{throw Error('Must not reach RPC');};
 for(const body of [{...command,action:'apply'},{...command,evidence:[]},{...command,recordId:record},{...command,bindings:command.bindings.slice(1)},{...command,bindings:command.bindings.map(b=>({...b,sourceSha256:'0'.repeat(64)}))},{...command,bindings:Array(8).fill(command.bindings[0])}])assert.equal((await handleKenyaMigrationReview(request(body),never)).status,422);
 assert.equal((await handleKenyaMigrationReview(request(command,{Origin:'https://evil.test'}),never)).status,403);
 assert.equal((await handleKenyaMigrationReview(request(command,{Authorization:''}),never)).status,401);
 assert.equal((await handleKenyaMigrationReview(request(),async()=>false)).status,403);
});
test('Kenya review binds exact draft scope and revision before exposing media evidence',async()=>{
 const c={...command,recordId:record,expectedRevision:revision};
 for(const [patch,status]of [[{id:other},403],[{path:'/destinations/tanzania'},403],[{locale:'fr'},403],[{type:'destination'},403],[{currentRevision:other},409],[{permissions:{edit:false}},403]])assert.equal((await handleKenyaMigrationReview(request(c),async(_,name)=>{assert.equal(name,'get_editor_record');return {...detail,...patch};})).status,status);
 const body=await(await handleKenyaMigrationReview(request(c),rpc())).json();assert.deepEqual(body.before,{old:true});const created=await(await handleKenyaMigrationReview(request(),rpc())).json();assert.notEqual(body.reviewDigest,created.reviewDigest);
});
test('Kenya review fails closed on missing, reordered or contradictory provider evidence',async()=>{
 for(const change of [()=>null,items=>items.slice(1),items=>items.reverse(),items=>items.map(e=>({...e,sourceMatches:false})),items=>items.map(e=>({...e,processedSha256:null})),items=>items.map(e=>({...e,revision:null})),items=>items.map(e=>({...e,privateStorageKey:'secret'}))])assert.equal((await handleKenyaMigrationReview(request(),rpc([],change))).status,503);
});
test('Kenya review identity changes with site, target revision or processed-image revision',async()=>{
 const original=await(await handleKenyaMigrationReview(request(),rpc())).json();
 const otherSite=await(await handleKenyaMigrationReview(request({...command,site:other}),rpc())).json();assert.notEqual(original.reviewDigest,otherSite.reviewDigest);
 const newerMedia=await(await handleKenyaMigrationReview(request(),rpc([],items=>items.map(e=>({...e,revision:2}))))).json();assert.notEqual(original.reviewDigest,newerMedia.reviewDigest);
 const existing={...command,recordId:record,expectedRevision:revision};
 const first=await(await handleKenyaMigrationReview(request(existing),rpc())).json();
 const next=await(await handleKenyaMigrationReview(request({...existing,expectedRevision:other}),async(token,name,args)=>name==='get_editor_record'?{...detail,currentRevision:other}:rpc()(token,name,args))).json();assert.notEqual(first.reviewDigest,next.reviewDigest);
});

const requestKey='00000000-0000-4000-8000-000000000005';
async function applyBody(){const reviewed=await(await handleKenyaMigrationReview(request(),rpc())).json();return {...command,action:'apply',requestKey,reviewDigest:reviewed.reviewDigest,evidence:reviewed.verification.evidence};}
const applyRpc=(seen=[],options={})=>async(token,name,args)=>{seen.push({token,name,args});if(name==='get_kenya_migration_result')return options.receipt??null;if(name==='apply_kenya_migration')return options.result??{recordId:record,revisionId:revision};if(name==='can')return options.can??true;assert.equal(name,'review_contact_migration_media');return options.evidence?options.evidence(evidence(args.p_bindings)):evidence(args.p_bindings);};
test('Kenya apply reconstructs server-owned content and sends exact reviewed evidence to the atomic transaction',async()=>{
 const body=await applyBody(),seen=[],response=await handleKenyaMigrationReview(request(body),applyRpc(seen));assert.equal(response.status,200);assert.match(response.headers.get('cache-control'),/no-store/);const value=await response.json();assert.equal(value.replayed,false);assert.equal(value.requestKey,requestKey);
 assert.deepEqual(seen.map(c=>c.name),['get_kenya_migration_result','can',...Array(4).fill('review_contact_migration_media'),'apply_kenya_migration']);assert.ok(seen.every(c=>c.token==='a.b.c'&&c.args.p_site===site));
 const manifest=seen.at(-1).args.p_manifest;assert.equal(manifest.payload.composition.sections.length,10);assert.deepEqual(manifest.evidence,body.evidence);assert.equal(manifest.recordId,null);
 assert.equal((await handleKenyaMigrationReview(request({...body,payload:{forged:true}}),async()=>{throw Error('No RPC');})).status,422);
});
test('Kenya apply rejects altered review identity and newly unavailable or changed media without saving',async()=>{
 const body=await applyBody();for(const [patch,status]of [[{reviewDigest:'0'.repeat(64)},409],[{site:other},409],[{evidence:body.evidence.map(e=>({...e,available:false}))},422],[{evidence:body.evidence.map(e=>({...e,revision:2}))},409]]){
  const seen=[];assert.equal((await handleKenyaMigrationReview(request({...body,...patch}),applyRpc(seen))).status,status);assert.equal(seen.length,0);
 }
 for(const [options,status]of [[{can:false},403],[{evidence:items=>items.map(e=>({...e,available:false}))},422],[{evidence:items=>items.map(e=>({...e,revision:2}))},409]]){const seen=[];assert.equal((await handleKenyaMigrationReview(request(body),applyRpc(seen,options))).status,status);assert.ok(!seen.some(c=>c.name==='apply_kenya_migration'));}
});
test('Kenya recovery validates receipts and reenters the transaction for exact authorized replay',async()=>{
 const body=await applyBody(),reviewed=await(await handleKenyaMigrationReview(request(),rpc())).json(),receipt={requestKey,sourceDigest:reviewed.sourceDigest,reviewDigest:body.reviewDigest,createdAt:'2026-10-28T00:00:00Z',result:{recordId:record,revisionId:revision}},seen=[];
 const response=await handleKenyaMigrationReview(request(body),applyRpc(seen,{receipt}));assert.equal(response.status,200);assert.equal((await response.json()).replayed,true);assert.deepEqual(seen.map(c=>c.name),['get_kenya_migration_result','apply_kenya_migration']);
 const status=await(await handleKenyaMigrationReview(request({action:'status',site,requestKey}),applyRpc([],{receipt}))).json();assert.equal(status.status,'complete');assert.deepEqual(status.result,receipt.result);
 assert.equal((await(await handleKenyaMigrationReview(request({action:'status',site,requestKey}),applyRpc())).json()).status,'unconfirmed');
 assert.equal((await handleKenyaMigrationReview(request(body),applyRpc([],{receipt:{...receipt,reviewDigest:'0'.repeat(64)}}))).status,409);
 assert.equal((await handleKenyaMigrationReview(request(body),applyRpc([],{receipt,result:{recordId:other,revisionId:revision}}))).status,503);
 assert.equal((await handleKenyaMigrationReview(request({action:'status',site,requestKey}),applyRpc([],{receipt:{...receipt,requestKey:other}}))).status,503);
});
