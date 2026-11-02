import test from 'node:test';import assert from 'node:assert/strict';
import {verifyNotificationRouteHistory} from '../lib/cms/notification-routes.ts';
import {handleNotificationRoutes} from '../lib/cms/notification-routes-api.ts';
const id=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const entry=(n,createdAt)=>({revisionId:id(n),actorId:id(3),action:'save',createdAt,snapshot:{websiteId:id(1),routeId:id(2),revisionId:id(n),label:'Hiring',from:'cms@example.test',to:['original@example.test'],enabled:false,approvedAt:null,approvedBy:null}});
const fixture=()=>({websiteId:id(1),routeId:id(2),after:null,items:[entry(4,'2026-10-30T00:00:00.123456Z'),entry(5,'2026-10-30T00:00:00.123455Z')]});
test('recipient history preserves historical addresses and microsecond ordering with exact identity checks',()=>{
 const result=verifyNotificationRouteHistory(fixture(),id(1),id(2),null);assert.equal(result.items[1].snapshot.to[0],'original@example.test');
 for(const mutate of [v=>v.websiteId=id(9),v=>v.routeId=id(9),v=>v.items.reverse(),v=>v.items.push(v.items[0]),v=>v.items[0].snapshot.revisionId=id(9),v=>v.items[0].snapshot.routeId=id(9),v=>v.items[0].snapshot.enabled=true,v=>v.items[0].action='approve',v=>v.after=id(9)]){const value=fixture();mutate(value);assert.throws(()=>verifyNotificationRouteHistory(value,id(1),id(2),null));}
});
test('recipient history API binds authenticated website/route/cursor and hides missing routes',async()=>{
 const req=new Request('https://cms.test/api/cms/notification-routes',{method:'POST',headers:{Authorization:'Bearer a.b.c','Content-Type':'application/json'},body:JSON.stringify({action:'history',site:id(1),routeId:id(2)})});let call;
 const response=await handleNotificationRoutes(req.clone(),async(...args)=>{call=args;return fixture();});assert.equal(response.status,200);assert.deepEqual(call,['a.b.c','list_notification_route_history',{p_site:id(1),p_route:id(2),p_after:null}]);assert.match(response.headers.get('cache-control'),/no-store/);assert.equal((await handleNotificationRoutes(req.clone(),async()=>null)).status,404);
});
