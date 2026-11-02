import test from 'node:test';
import assert from 'node:assert/strict';
import {newLeadership,leadershipSchema} from '../lib/cms/leadership.ts';
import {handleLeadershipSave} from '../lib/cms/leadership-editor-api.ts';
const id=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const base={action:'save',site:id(1),record:null,expectedRevision:null,requestKey:id(2),locale:'en',payload:newLeadership()};
const req=(body,origin='https://site.test')=>new Request('https://site.test/api/cms/leadership',{method:'POST',headers:{authorization:'Bearer a.b.c',origin,'content-type':'application/json'},body:JSON.stringify(body)});
test('Leadership creation uses durable request identity and verifies the save receipt',async()=>{
 const result={recordId:id(3),revisionId:id(4)};
 const response=await handleLeadershipSave(req(base),async(token,name,args)=>{assert.equal(name,'create_draft_once');assert.equal(args.p_request,base.requestKey);assert.equal(args.p_path,'/leadership/new-leadership-profile');assert.equal(args.p_type,'leadership');return result;});
 assert.equal(response.status,200);assert.deepEqual(await response.json(),{site:base.site,requestKey:base.requestKey,result});
 assert.equal((await handleLeadershipSave(req(base),async()=>({recordId:'bad'}))).status,503);
 assert.equal((await handleLeadershipSave(req({...base,requestKey:undefined}),async()=>assert.fail())).status,422);
 assert.equal((await handleLeadershipSave(req(base,'https://other.test'),async()=>assert.fail())).status,403);
});
test('Leadership updates reject wrong type, stale revision and changed identity before writing',async()=>{
 const body={...base,record:id(3),expectedRevision:id(4)};delete body.requestKey;
 const stored={id:id(3),type:'leadership',currentRevision:id(4),path:'/leadership/new-leadership-profile',locale:'en'};
 for(const [change,status] of [[{type:'project'},404],[{currentRevision:id(9)},409],[{path:'/bad'},422],[{locale:'fr'},422]])assert.equal((await handleLeadershipSave(req(body),async(_,name)=>{assert.equal(name,'get_editor_record');return {...stored,...change};})).status,status);
 let calls=0;const response=await handleLeadershipSave(req(body),async(_,name,args)=>{calls++;if(name==='get_editor_record')return stored;assert.equal(name,'save_draft');assert.equal(args.p_expected,id(4));return {recordId:id(3),revisionId:id(5)};});assert.equal(response.status,200);assert.equal(calls,2);
});
test('Leadership cancellation uses the scoped server fence and rejects ambiguous receipts',async()=>{
 const body={action:'cancel_create',site:base.site,requestKey:base.requestKey};
 for(const result of [{status:'cancelled'},{status:'created',result:{recordId:id(3),revisionId:id(4)}}]){const response=await handleLeadershipSave(req(body),async(_,name,args)=>{assert.equal(name,'cancel_draft_creation');assert.deepEqual(args,{p_site:base.site,p_request:base.requestKey,p_type:'leadership'});return result;});assert.equal(response.status,200);assert.deepEqual((await response.json()).result,result);}
 assert.equal((await handleLeadershipSave(req(body),async()=>({status:'unknown'}))).status,503);
 assert.equal((await handleLeadershipSave(req({...body,type:'project'}),async()=>assert.fail())).status,422);
});
