import test from 'node:test';import assert from 'node:assert/strict';import {handleScheduledReleaseCommand as write,handleScheduledReleaseRead as read} from '../lib/cms/scheduled-release-api.ts';
const id='00000000-0000-4000-8000-000000000001',other='00000000-0000-4000-8000-000000000002',body={action:'schedule',site:id,request:id,items:[{record:id,revision:id}],runAt:'2030-01-01T10:00:00+05:30'};
const req=(value=body,headers={})=>new Request('https://site.test/api/cms/releases/schedules',{method:'POST',headers:{Authorization:'Bearer a.b.c','Content-Type':'application/json',...headers},body:JSON.stringify(value)});
test('group scheduling retains caller, manifest, instant and retry identity without claiming execution',async()=>{
 let call;const response=await write(req(),async(...args)=>{call=args;return id;});assert.equal(response.status,200);assert.deepEqual(call,['a.b.c','schedule_release',{p_site:id,p_request:id,p_items:body.items,p_run_at:'2030-01-01T04:30:00.000Z'}]);assert.equal((await response.json()).result.status,undefined);
 const old=await write(req({...body,runAt:'2020-01-01T00:00:00Z'}),async()=>id);assert.equal(old.status,200); // Database decides new vs retry.
});
test('group schedule boundary rejects forged actors, duplicates, ambiguous instants and foreign writes',async()=>{
 for(const [value,headers,status] of [[{...body,actor:id},{},422],[{...body,items:[...body.items,...body.items]},{},422],[{...body,runAt:'2030-01-01T10:00:00'},{},422],[body,{Authorization:''},401],[body,{Origin:'https://foreign.test'},403]]){let called=false;assert.equal((await write(req(value,headers),async()=>{called=true;return id;})).status,status);assert.equal(called,false);}
 assert.equal((await write(req(),async()=>null)).status,503);
});
test('cancel requires confirmed void response and group reads reject foreign or private data',async()=>{
 let call;assert.equal((await write(req({action:'cancel',site:id,schedule:id}),async(...args)=>{call=args;return null;})).status,200);assert.equal(call[1],'cancel_scheduled_release');assert.equal((await write(req({action:'cancel',site:id,schedule:id}),async()=>true)).status,503);
 const request=new Request(`https://site.test/api/cms/releases/schedules?site=${id}`,{headers:{Authorization:'Bearer a.b.c'}}),row={id,site:id,request:id,items:body.items,runAt:'2030-01-01T00:00:00Z',status:'pending',attempts:0,errorCode:null,createdAt:'2026-10-23T00:00:00Z'};
 assert.equal((await read(request,async()=>[row])).status,200);
 for(const data of [[{...row,site:other}],[{...row,leaseToken:'SECRET'}],[row,row]])assert.equal((await read(request,async()=>data)).status,503);
});
