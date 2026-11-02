import test from 'node:test';import assert from 'node:assert/strict';
import {verifiedDeliveryMonitor} from '../lib/cms/delivery-monitor.ts';import {handleDeliveryMonitor} from '../lib/cms/delivery-monitor-api.ts';
const id=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`,query={site:id(1),filter:'attention'};
const row={id:id(2),record:id(3),revision:id(4),title:'Record',locale:'en',operation:'unpublish',status:'failed',attempts:8,createdAt:'2026-10-29T00:00:00Z'},value={websiteId:id(1),filter:'attention',checkedAt:'2026-10-29T10:00:00Z',items:[row],nextCursor:null};
test('delivery monitor binds site filter order and omits internal worker fields',()=>{assert.equal(verifiedDeliveryMonitor(value,query).items.length,1);for(const bad of [{...value,websiteId:id(9)},{...value,items:[row,row]},{...value,items:[{...row,status:'delivered'}]},{...value,items:[{...row,lastError:'private'}]},{...value,nextCursor:id(9)}])assert.throws(()=>verifiedDeliveryMonitor(bad,query));});
test('delivery monitor forwards user auth with bounded filters and private caching',async()=>{
 const req=extra=>new Request(`https://cms.test/api/cms/delivery/monitor?site=${id(1)}${extra}`,{headers:{Authorization:'Bearer a.b.c'}});
 const response=await handleDeliveryMonitor(req(''),async(token,name,args)=>{assert.equal(token,'a.b.c');assert.equal(name,'list_delivery_monitor');assert.deepEqual(args,{p_site:id(1),p_after:null,p_filter:'attention',p_limit:20});return value;});assert.equal(response.status,200);assert.match(response.headers.get('cache-control'),/no-store/);
 for(const extra of ['&filter=bad','&filter=all&filter=failed','&after=invalid','&limit=200'])assert.equal((await handleDeliveryMonitor(req(extra),async()=>assert.fail())).status,422);
});
