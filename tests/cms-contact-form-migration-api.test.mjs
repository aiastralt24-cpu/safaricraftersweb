import test from 'node:test';import assert from 'node:assert/strict';import {handleContactFormMigration} from '../lib/cms/contact-form-migration-api.ts';
const site='00000000-0000-4000-8000-000000000001',id='00000000-0000-4000-8000-000000000002',revision='00000000-0000-4000-8000-000000000003';
const targets=['contact','corporate'].map(variant=>({variant,recordId:null,expectedRevision:null}));
const request=(body,origin='http://localhost')=>new Request('http://localhost/api/cms/migrations/contact-forms',{method:'POST',headers:{authorization:'Bearer test.editor.token',origin,'content-type':'application/json'},body:JSON.stringify(body)});
test('form review uses caller authority, returns both proposals and performs no writes',async()=>{
 const calls=[];const response=await handleContactFormMigration(request({action:'review',site,targets}),async(token,name,args)=>{assert.equal(token,'test.editor.token');calls.push(name);assert.equal(args.p_type,'form');return true;});assert.equal(response.status,200);const body=await response.json();assert.deepEqual(calls,['can','can']);assert.deepEqual(body.before,[null,null]);assert.equal(body.proposal.forms.length,2);assert.match(response.headers.get('cache-control'),/no-store/);
});
test('form migration rejects foreign origins, altered targets, unauthorized and stale edits',async()=>{
 const body={action:'review',site,targets};let calls=0;
 for(const input of [{...body,targets:[targets[1],targets[0]]},{...body,targets:targets.map(t=>({...t,recordId:id,expectedRevision:revision}))},{...body,payload:{}},{...body,targets:[{...targets[0],recordId:id},targets[1]]}])assert.equal((await handleContactFormMigration(request(input),async()=>{calls++;return true;})).status,422);
 assert.equal(calls,0);assert.equal((await handleContactFormMigration(request(body,'https://foreign.test'),async()=>true)).status,403);assert.equal((await handleContactFormMigration(request(body),async()=>false)).status,403);
 const edited={...body,targets:[{...targets[0],recordId:id,expectedRevision:revision},targets[1]]};
 for(const [patch,status] of [[{currentRevision:site},409],[{id:site},403],[{locale:'fr'},403],[{permissions:{edit:false}},403],[{type:'page'},403]])assert.equal((await handleContactFormMigration(request(edited),async()=>({id,type:'form',locale:'en',currentRevision:revision,payload:{},permissions:{edit:true},...patch}))).status,status);
});
test('apply rejects a changed review before mutation and status rejects unrelated receipts',async()=>{
 let calls=0;assert.equal((await handleContactFormMigration(request({action:'apply',site,targets,requestKey:id,reviewDigest:'0'.repeat(64)}),async()=>{calls++;return true;})).status,409);assert.equal(calls,0);
 const status={action:'status',site,requestKey:id};assert.equal((await (await handleContactFormMigration(request(status),async()=>null)).json()).status,'unconfirmed');assert.equal((await handleContactFormMigration(request(status),async()=>({requestKey:revision}))).status,503);
});
