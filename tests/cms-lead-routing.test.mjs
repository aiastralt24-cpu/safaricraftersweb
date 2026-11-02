import test from 'node:test';import assert from 'node:assert/strict';
import {routingRules,verifiedLeadRouting,verifiedRoutingOptions} from '../lib/cms/lead-routing.ts';
import {handleLeadCommand} from '../lib/cms/leads-api.ts';
const uuid=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`,site=uuid(1),rule={id:uuid(2),name:'Private journeys',enabled:true,formId:uuid(3),fieldId:'interest',fieldType:'productInterest',value:'private',ownerId:uuid(4)};
const req=body=>new Request('https://site.test/api/cms/leads',{method:'POST',headers:{Authorization:'Bearer a.b.c','Content-Type':'application/json'},body:JSON.stringify(body)});
test('routing configuration is bounded, typed, uniquely identified and scoped to the website',()=>{
 assert.equal(routingRules.safeParse([rule]).success,true);for(const rules of [[rule,rule],[{...rule,enabled:'true'}],[{...rule,value:' '}],[{...rule,fieldType:'email'}],Array.from({length:21},(_,i)=>({...rule,id:uuid(i+20)}))])assert.equal(routingRules.safeParse(rules).success,false);
 assert.throws(()=>verifiedLeadRouting({websiteId:uuid(2),version:1,rules:[rule]},site));assert.throws(()=>verifiedRoutingOptions({websiteId:site,forms:[],owners:[{id:uuid(4),email:null},{id:uuid(4),email:null}]},site));
});
test('assignment API confirms exact saves and exposes only fixed authenticated operations',async()=>{
 let called;const body={action:'save_routing',site,expected:0,rules:[rule]};const response=await handleLeadCommand(req(body),async(...args)=>{called=args;return {websiteId:site,version:1,rules:[rule]};});assert.equal(response.status,200);assert.deepEqual(called,['a.b.c','save_lead_routing',{p_site:site,p_expected:0,p_rules:[rule]}]);assert.match(response.headers.get('cache-control'),/no-store/);
 for(const result of [{websiteId:site,version:2,rules:[rule]},{websiteId:site,version:1,rules:[]}])assert.equal((await handleLeadCommand(req(body),async()=>result)).status,503);
 for(const patch of [{expected:-1},{actor:uuid(9)},{rules:[{...rule,priority:100}]}])assert.equal((await handleLeadCommand(req({...body,...patch}),async()=>assert.fail('unexpected RPC'))).status,422);
 for(const [action,name,result]of [['routing','get_lead_routing',{websiteId:site,version:0,rules:[]}],['routing_options','get_lead_routing_options',{websiteId:site,forms:[],owners:[]}]])assert.equal((await handleLeadCommand(req({action,site}),async(token,rpc,args)=>{assert.equal(rpc,name);assert.deepEqual(args,{p_site:site});return result;})).status,200);
});
