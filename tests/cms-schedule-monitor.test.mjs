import test from 'node:test';import assert from 'node:assert/strict';
import {verifiedScheduleMonitor} from '../lib/cms/schedule-monitor.ts';
import {handleScheduleMonitor} from '../lib/cms/schedule-monitor-api.ts';
const id=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`,query={site:id(1),state:'attention',operation:'all'};
const row=n=>({id:id(n),record:id(2),revision:id(3),title:'Record',type:'page',locale:'en',operation:'publish',runAt:'2026-10-29T10:00:00Z',status:'pending',attempts:0,errorCode:null});
test('schedule monitor verifies filters identity order cursors and private-field projection',()=>{
 const value={websiteId:id(1),state:'attention',operation:'all',items:[row(4),row(5)],nextCursor:id(5)};assert.equal(verifiedScheduleMonitor(value,query).items.length,2);
 for(const bad of [{...value,websiteId:id(9)},{...value,state:'all'},{...value,items:[row(5),row(4)]},{...value,items:[{...row(4),status:'published'}]},{...value,nextCursor:id(9)},{...value,items:[{...row(4),leaseToken:'private'}]}])assert.throws(()=>verifiedScheduleMonitor(bad,query));assert.throws(()=>verifiedScheduleMonitor(value,{...query,after:id(4)}));
});
test('schedule monitor API scopes filters and authorization with private caching',async()=>{
 const req=extra=>new Request(`https://cms.test/api/cms/schedules/monitor?site=${id(1)}${extra}`,{headers:{Authorization:'Bearer a.b.c'}});
 const response=await handleScheduleMonitor(req('&state=blocked&operation=unpublish'),async(token,name,args)=>{assert.equal(token,'a.b.c');assert.equal(name,'list_schedule_monitor');assert.deepEqual(args,{p_site:id(1),p_after:null,p_state:'blocked',p_operation:'unpublish',p_limit:20});return {websiteId:id(1),state:'blocked',operation:'unpublish',items:[],nextCursor:null};});assert.equal(response.status,200);assert.match(response.headers.get('cache-control'),/no-store/);
 for(const extra of ['&state=unknown','&state=pending&state=blocked','&operation=delete','&after=bad','&limit=100'])assert.equal((await handleScheduleMonitor(req(extra),async()=>assert.fail())).status,422);
});
