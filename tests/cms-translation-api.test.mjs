import test from 'node:test';import assert from 'node:assert/strict';
import {handleTranslations,translationStatusSchema} from '../lib/cms/translation-api.ts';
const [site,source,record,revision,sourceRevision,requestKey,other]=Array.from({length:7},(_,i)=>`00000000-0000-4000-8000-${String(i+1).padStart(12,'0')}`);
const status=()=>({recordId:record,revisionId:revision,locale:'fr',sourceRecordId:source,sourceLocale:'en',sourceRevisionId:sourceRevision,currentSourceRevisionId:sourceRevision,reviewedRevisionId:revision,status:'current'});
const req=(body,headers={})=>new Request('https://site.test/api/cms/translations',{method:'POST',headers:{Authorization:'Bearer actor.test.token','Content-Type':'application/json',...headers},body:JSON.stringify(body)});
test('translation API dispatches caller-scoped reads, recoverable creation and independent review',async()=>{
 const calls=[],rpc=async(token,name,args)=>{calls.push({token,name,args});return name==='create_translation_draft'?{recordId:record,revisionId:revision}:status();};
 for(const c of [{action:'read',site,record},{action:'create',site,source,sourceRevision,locale:'fr',path:'/journeys/example',requestKey},{action:'review',site,record,revision,sourceRevision}]){const response=await handleTranslations(req(c),rpc);assert.equal(response.status,200);assert.match(response.headers.get('cache-control'),/private.*no-store/);assert.ok((await response.json()).result);}
 assert.deepEqual(calls.map(c=>c.name),['get_translation_status','create_translation_draft','review_translation']);assert.ok(calls.every(c=>c.token==='actor.test.token'&&c.args.p_site===site));assert.equal(calls[1].args.p_request,requestKey);assert.equal(calls[1].args.p_source_revision,sourceRevision);assert.equal((await(await handleTranslations(req({action:'read',site,record}),async()=>null)).json()).result,null);
});
test('translation API rejects unauthorized origin, invalid fields and forged status without sending unsafe requests',async()=>{
 let calls=0;const rpc=async()=>{calls++;return status();};const read={action:'read',site,record};
 assert.equal((await handleTranslations(req(read,{Authorization:''}),rpc)).status,401);assert.equal((await handleTranslations(req(read,{Origin:'https://foreign.test'}),rpc)).status,403);
 for(const c of [{...read,extra:true},{action:'create',site,source,sourceRevision,locale:'fr',path:'//foreign',requestKey},{action:'review',site,record,revision:'bad',sourceRevision}])assert.equal((await handleTranslations(req(c),rpc)).status,422);assert.equal(calls,0);
 for(const value of [{...status(),recordId:other},{...status(),reviewedRevisionId:null},{...status(),sourceLocale:'fr'},{...status(),secret:'private'}])assert.equal((await handleTranslations(req(read),async()=>value)).status,502);
 assert.equal((await handleTranslations(req({action:'review',site,record,revision,sourceRevision}),async()=>({...status(),currentSourceRevisionId:other,status:'source_changed'}))).status,502);
});
test('translation status distinguishes source change, translation change and first review without silent fallback',()=>{
 assert.equal(translationStatusSchema.safeParse({...status(),reviewedRevisionId:null,status:'unreviewed'}).success,true);assert.equal(translationStatusSchema.safeParse({...status(),currentSourceRevisionId:other,status:'source_changed'}).success,true);assert.equal(translationStatusSchema.safeParse({...status(),revisionId:other,status:'translation_changed'}).success,true);
 assert.equal(translationStatusSchema.safeParse({...status(),currentSourceRevisionId:other,status:'current'}).success,false);
});
test('translation API binds creation and cancellation receipts to the caller request',async()=>{
 const create={action:'create',site,source,sourceRevision,locale:'fr',path:'/journeys/example',requestKey};
 const response=await handleTranslations(req(create),async()=>({recordId:record,revisionId:revision}));assert.deepEqual(await response.json(),{site,requestKey,result:{recordId:record,revisionId:revision}});
 const cancel={...create,action:'cancel_create'};
 for(const result of [{status:'cancelled'},{status:'created',result:{recordId:record,revisionId:revision}}]){const res=await handleTranslations(req(cancel),async(token,name,args)=>{assert.equal(name,'cancel_translation_creation');assert.equal(args.p_request,requestKey);return result;});assert.equal(res.status,200);assert.deepEqual(await res.json(),{site,requestKey,result});}
 for(const result of [{status:'cancelled',extra:true},{status:'created',result:{recordId:source,revisionId:revision}},{status:'unknown'}])assert.equal((await handleTranslations(req(cancel),async()=>result)).status,502);
});
test('translation API preserves null URL identity for pathless records',async()=>{
 for(const action of ['create','cancel_create']){
  const response=await handleTranslations(req({action,site,source,sourceRevision,locale:'fr',path:null,requestKey}),async(token,name,args)=>{assert.equal(args.p_path,null);return action==='create'?{recordId:record,revisionId:revision}:{status:'cancelled'};});assert.equal(response.status,200);
 }
});
