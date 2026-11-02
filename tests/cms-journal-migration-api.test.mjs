import test from 'node:test';
import assert from 'node:assert/strict';
import {handleJournalMigrationReview} from '../lib/cms/journal-migration-api.ts';
import {sourceDigest} from '../lib/cms/testimonial-migration.ts';
const site='00000000-0000-4000-8000-000000000001';
const source={slug:'forest',title:'Forest',category:'Wildlife',author:'Guide',date:'October 22, 2026',readTime:'',description:'Forest',quote:'',body:['Article'],image:{src:'/forest.jpg',alt:'Forest',credit:'Archive'},gallery:[]};
const mappings={[`snapshot:${sourceDigest(source)}`]:{images:{image:{assetId:'forest',alt:'Forest',credit:'Archive',decorative:false}}}};
const body={action:'review',site,locale:'en',source:[source],mappings};
const req=(input=body,headers={})=>new Request('https://site.test/api/cms/migrations/journal',{method:'POST',headers:{Authorization:'Bearer a.b.c','Content-Type':'application/json',...headers},body:JSON.stringify(input)});
test('journal migration review uses caller-scoped evidence and offers saving only after successful review',async()=>{
 let called;const response=await handleJournalMigrationReview(req(),async(...args)=>{called=args;return [{assetId:'forest',available:true}];});assert.equal(response.status,200);assert.deepEqual(called,['a.b.c','review_journal_migration_media',{p_site:site,p_assets:['forest']}]);const result=await response.json();assert.equal(result.plan.readyDrafts,1);assert.equal(result.applyAvailable,true);assert.equal(result.plan.candidates[0].source.body[0],'Article');assert.match(result.reviewDigest,/^[a-f0-9]{64}$/);assert.match(response.headers.get('cache-control'),/no-store/);
});
test('journal review availability changes block candidates and change the reviewed digest',async()=>{
 const read=async available=>(await (await handleJournalMigrationReview(req(),async()=>[{assetId:'forest',available}])).json());const good=await read(true),bad=await read(false);assert.equal(bad.plan.readyDrafts,0);assert.notEqual(good.reviewDigest,bad.reviewDigest);assert.ok(bad.plan.candidates[0].issues.some(i=>i.field==='media'));
 const foreign=await (await handleJournalMigrationReview(req({...body,locale:'fr'}),async()=>[{assetId:'forest',available:true}])).json();assert.notEqual(good.reviewDigest,foreign.reviewDigest);
});
test('journal review rejects incomplete, reordered or malformed media evidence',async()=>{
 for(const evidence of [[],[{assetId:'wrong',available:true}],[{assetId:'forest',available:true,secret:'unexpected'}],null])assert.equal((await handleJournalMigrationReview(req(),async()=>evidence)).status,503);
});
test('journal migration rejects unauthenticated, cross-origin, oversize and apply commands before RPC',async()=>{
 let calls=0;const call=async()=>{calls++;return [];};
 for(const [request,status]of [[req(body,{Authorization:''}),401],[req(body,{Origin:'https://other.test'}),403],[req({...body,action:'apply'}),422],[req({...body,source:Array(26).fill(source)}),422],[req({...body,mappings:{padding:'x'.repeat(1_100_001)}}),413]])assert.equal((await handleJournalMigrationReview(request,call)).status,status);assert.equal(calls,0);
});

test('journal review verifies retained hidden-gallery mappings as well as visible content',async()=>{
 const value={...source,gallery:[{src:'/forest.jpg',alt:'Hidden gallery descriptor',credit:'Archive'}]},map={[`snapshot:${sourceDigest(value)}`]:{images:{image:mappings[Object.keys(mappings)[0]].images.image,'gallery.0':{assetId:'hidden',alt:'Hidden gallery descriptor',credit:'Archive',decorative:false}}}};
 let assets;const response=await handleJournalMigrationReview(req({...body,source:[value],mappings:map}),async(_token,_name,args)=>{assets=args.p_assets;return assets.map(assetId=>({assetId,available:assetId!=='hidden'}));});const result=await response.json();assert.deepEqual(assets,['forest','hidden']);assert.deepEqual(result.plan.candidates[0].payload.gallery,[]);assert.equal(result.plan.readyDrafts,0);assert.ok(result.plan.candidates[0].issues.some(i=>i.message.includes('hidden is unavailable')));
});

test('journal apply rechecks evidence and sends exact retained source and mappings to atomic persistence',async()=>{
 const evidence=[{assetId:'forest',available:true}],review=await (await handleJournalMigrationReview(req(),async()=>evidence)).json();
 const requestKey='30000000-0000-4000-8000-000000000001',calls=[];
 const result=[{recordId:'40000000-0000-4000-8000-000000000001',revisionId:'50000000-0000-4000-8000-000000000001',sourceKey:`journal_${sourceDigest(source)}`}];
 const apply={...body,action:'apply',requestKey,reviewDigest:review.reviewDigest};
 const rpc=async(_token,name,args)=>{calls.push([name,args]);if(name==='get_journal_migration_result')return null;if(name==='review_journal_migration_media')return evidence;return result;};
 const response=await handleJournalMigrationReview(req(apply),rpc);assert.equal(response.status,200);assert.deepEqual((await response.json()).result,result);
 assert.deepEqual(calls.map(c=>c[0]),['get_journal_migration_result','review_journal_migration_media','apply_journal_migration']);
 assert.deepEqual(calls[2][1].p_items[0].source,source);assert.deepEqual(calls[2][1].p_items[0].mappings,mappings[Object.keys(mappings)[0]]);
 calls.length=0;assert.equal((await handleJournalMigrationReview(req({...apply,reviewDigest:'a'.repeat(64)}),rpc)).status,409);assert.equal(calls.some(c=>c[0]==='apply_journal_migration'),false);
 const revoked=async(_token,name)=>name==='get_journal_migration_result'?null:[{assetId:'forest',available:false}];assert.equal((await handleJournalMigrationReview(req(apply),revoked)).status,409);
});

test('journal recovery distinguishes unknown status and replays committed requests without current-media checks',async()=>{
 const review=await (await handleJournalMigrationReview(req(),async()=>[{assetId:'forest',available:true}])).json(),requestKey='30000000-0000-4000-8000-000000000002';
 const result=[{recordId:'40000000-0000-4000-8000-000000000002',revisionId:'50000000-0000-4000-8000-000000000002',sourceKey:`journal_${sourceDigest(source)}`}];
 const receipt={requestKey,sourceDigest:review.plan.sourceDigest,reviewDigest:review.reviewDigest,createdAt:'2026-10-22T00:00:00Z',result};
 const status={action:'status',site,requestKey};assert.equal((await (await handleJournalMigrationReview(req(status),async()=>null)).json()).status,'unconfirmed');
 assert.equal((await (await handleJournalMigrationReview(req(status),async()=>receipt)).json()).status,'complete');
 assert.equal((await handleJournalMigrationReview(req(status),async()=>({...receipt,requestKey:site}))).status,503);
 const calls=[];const replay=await handleJournalMigrationReview(req({...body,action:'apply',requestKey,reviewDigest:review.reviewDigest}),async(_token,name)=>{calls.push(name);return name==='get_journal_migration_result'?receipt:result;});
 assert.equal(replay.status,200);assert.equal((await replay.json()).replayed,true);assert.deepEqual(calls,['get_journal_migration_result','apply_journal_migration']);
});
