import test from 'node:test';import assert from 'node:assert/strict';
import {verifyFormNotificationRoutes} from '../lib/cms/form-notification-routes.ts';
import {handleFormNotificationRoutes} from '../lib/cms/form-notification-routes-api.ts';
import {validateFormPublication} from '../lib/cms/form-publication.ts';
import {newForm} from '../lib/cms/form-drafts.ts';
const id=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const result={websiteId:id(1),formId:id(2),after:null,items:[{routeId:id(3),revisionId:id(4),label:'Applications team'}]};
test('form recipient options bind website, form and cursor without exposing recipient details',()=>{
 assert.deepEqual(verifyFormNotificationRoutes(result,id(1),id(2),null),result);
 for(const value of [{...result,websiteId:id(9)},{...result,formId:null},{...result,after:id(9)},{...result,items:[...result.items,...result.items]},{...result,items:[{...result.items[0],to:['private@example.test']}]}])assert.throws(()=>verifyFormNotificationRoutes(value,id(1),id(2),null));
});
test('form route picker uses the signed-in token and preserves notification publication gate',async()=>{
 const request=(extra={})=>new Request('https://cms.example.test/api/cms/form-notification-routes',{method:'POST',headers:{Authorization:'Bearer a.b.c','Content-Type':'application/json'},body:JSON.stringify({site:id(1),formId:id(2),...extra})});
 let calls=0;const call=async(token,args)=>{calls++;assert.equal(token,'a.b.c');assert.deepEqual(args,{p_site:id(1),p_form:id(2),p_after:null});return result;};
 const response=await handleFormNotificationRoutes(request(),call);assert.equal(response.status,200);assert.deepEqual(await response.json(),{result});assert.equal((await handleFormNotificationRoutes(request({actor:id(9)}),call)).status,422);assert.equal(calls,1);
 const validation=validateFormPublication({type:'form',path:null,locale:'en',payload:{...newForm('name'),notificationRouteIds:[id(3)]}});assert.equal(validation.contentChecksPass,false);assert.ok(validation.findings.some(v=>v.code==='notification_routes_unverified'));
});
