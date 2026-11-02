import test from 'node:test';import assert from 'node:assert/strict';import {summarizeReleaseDelivery} from '../lib/cms/release-delivery-status.ts';import {handleReleaseDeliveryRead} from '../lib/cms/release-delivery-api.ts';
const id='00000000-0000-4000-8000-000000000001',other='00000000-0000-4000-8000-000000000002';
const item={record:id,revision:id,deliveryJob:id,status:'delivered',attempts:1},value={site:id,request:id,release:id,status:'committed',items:[item]};
test('release summary never reports successful delivery while a member is waiting, failed or superseded',()=>{
 for(const [status,summary] of [['delivered','delivered'],['running','in_progress'],['retry_pending','in_progress'],['failed','needs_attention'],['superseded','superseded']])assert.equal(summarizeReleaseDelivery({...value,items:[item,{...item,record:other,deliveryJob:other,status}]}).summary,summary);
 assert.equal(summarizeReleaseDelivery({...value,status:'cancelled',items:[]}).summary,'cancelled');
 for(const patch of [{items:[]},{items:[item,item]},{status:'cancelled'},{items:[{...item,lease:'SECRET'}]}])assert.throws(()=>summarizeReleaseDelivery({...value,...patch}));
});
test('status API uses caller authority, binds target, rejects unsafe shapes and never leaks unknown releases',async()=>{
 const req=(search=`site=${id}&request=${id}`,headers={Authorization:'Bearer a.b.c'})=>new Request(`https://site.test/api/cms/releases?${search}`,{headers});let called;
 const response=await handleReleaseDeliveryRead(req(),async(...args)=>{called=args;return value;});assert.equal(response.status,200);assert.equal(called[0],'a.b.c');assert.equal(called[1],'get_release_delivery_status');assert.match(response.headers.get('cache-control'),/no-store/);
 assert.equal((await handleReleaseDeliveryRead(req(),async()=>null)).status,404);
 for(const raw of [{...value,site:other},{...value,request:other},{...value,token:'SECRET'}])assert.equal((await handleReleaseDeliveryRead(req(),async()=>raw)).status,503);
 for(const request of [req(`site=${id}&site=${id}&request=${id}`),req('',{})]){let calls=0;const result=await handleReleaseDeliveryRead(request,async()=>{calls++;return value;});assert.ok([400,401].includes(result.status));assert.equal(calls,0);}
});
