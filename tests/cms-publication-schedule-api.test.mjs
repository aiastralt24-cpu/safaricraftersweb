import test from 'node:test';
import assert from 'node:assert/strict';
import {handlePublicationScheduleCommand as write,handlePublicationScheduleRead as read} from '../lib/cms/publication-schedule-api.ts';
import {CmsGatewayError} from '../lib/cms/gateway.ts';
const site='00000000-0000-4000-8000-000000000001',record='00000000-0000-4000-8000-000000000002',revision='00000000-0000-4000-8000-000000000003',id='00000000-0000-4000-8000-000000000004';
const body={action:'schedule',site,record,revision,operation:'publish',runAt:'2026-10-24T10:00:00+05:30'};
const now=()=>new Date('2026-10-23T00:00:00Z');
const request=(value,headers={})=>new Request('https://site.test/api/cms/schedules',{method:'POST',headers:{Authorization:'Bearer a.b.c','Content-Type':'application/json',...headers},body:JSON.stringify(value)});
const get=(search=`site=${site}&record=${record}`,headers={Authorization:'Bearer a.b.c'})=>new Request(`https://site.test/api/cms/schedules?${search}`,{headers});
const row={id,website_id:site,record_id:record,revision_id:revision,operation:'publish',run_at:'2026-10-24T04:30:00+00:00',status:'pending',attempts:0,created_at:'2026-10-23T00:00:00Z',finished_at:null,error_code:null,delivery_job_id:null};
test('schedule uses caller identity, fixed RPC and normalized instant without invoking worker operations',async()=>{
 const calls=[];const result=await write(request(body),async(...args)=>{calls.push(args);return id;},now);
 assert.equal(result.status,200);assert.deepEqual(calls,[['a.b.c','schedule_publication',{p_site:site,p_record:record,p_revision:revision,p_operation:'publish',p_run_at:'2026-10-24T04:30:00.000Z'}]]);
 assert.equal((await result.json()).result.status,'pending');assert.match(result.headers.get('cache-control'),/no-store/);
});
test('authorization, origin, body size and strict schedule fields reject before RPC',async()=>{
 for(const [value,headers,status] of [[body,{Authorization:''},401],[body,{Origin:'https://foreign.test'},403],[{...body,actor:site},{},422],[{...body,action:'execute'},{},422],[{...body,runAt:'2026-10-24T10:00'},{},422],[{...body,runAt:'2026-10-22T00:00:00Z'},{},422],[{...body,padding:'x'.repeat(1100001)},{},413]]){
  let called=false;const result=await write(request(value,headers),async()=>{called=true;return id;},now);
  assert.equal(result.status,status);assert.equal(called,false);
 }
});
test('cancellation requires a confirmed response and forwards only site and schedule',async()=>{
 let call;const result=await write(request({action:'cancel',site,schedule:id}),async(...args)=>{call=args;return null;},now);
 assert.equal(result.status,200);assert.deepEqual(call,['a.b.c','cancel_publication_schedule',{p_site:site,p_schedule:id}]);
 assert.equal((await result.json()).result.status,'cancelled');
 assert.equal((await write(request({action:'cancel',site,schedule:id}),async()=>undefined,now)).status,503);
});
test('list projects only safe fields and checks every returned identity',async()=>{
 let call;const result=await read(get(),async(...args)=>{call=args;return [{...row,actor_id:'SECRET',lease_token:'SECRET',other:'SECRET'}];});
 assert.equal(result.status,200);assert.deepEqual(call,['a.b.c','list_publication_schedules',{p_site:site,p_record:record}]);
 const text=await result.text();assert.equal(text.includes('SECRET'),false);assert.equal(JSON.parse(text).schedules[0].revision,revision);
 for(const rows of [[{...row,website_id:record}],[{...row,record_id:site}],[row,row],[{...row,status:'unexpected'}],null])assert.equal((await read(get(),async()=>rows)).status,503);
});
test('invalid or duplicate read filters and anonymous reads never query the database',async()=>{
 for(const req of [get(`site=${site}&site=${site}&record=${record}`),get(`site=${site}&record=${record}&sql=forged`),get('',{})]){
  let called=false;const result=await read(req,async()=>{called=true;return [];});assert.ok([400,401].includes(result.status));assert.equal(called,false);
 }
});
test('unconfirmed creation and database conflicts never claim a successful schedule',async()=>{
 assert.equal((await write(request(body),async()=>null,now)).status,503);
 for(const status of [403,409,422])assert.equal((await write(request(body),async()=>{throw new CmsGatewayError(status,'Safe message');},now)).status,status);
 const response=await write(request(body),async()=>{throw Error('SECRET');},now);assert.equal(response.status,500);assert.equal((await response.text()).includes('SECRET'),false);
});
