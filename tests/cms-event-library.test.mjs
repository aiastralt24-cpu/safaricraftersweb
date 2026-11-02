import test from 'node:test';import assert from 'node:assert/strict';
import {handleEventLibrary} from '../lib/cms/event-library-api.ts';import {verifiedEventLibrary} from '../lib/cms/event-library.ts';
const id=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`,site=id(1),row={id:id(2),type:'event',title:'Event',path:'/events/example',locale:'en',currentRevision:id(3),reviewStatus:'draft',publishedRevision:null,ownerId:id(4)};
const request=query=>new Request(`https://site.test/api/cms/events?${query}`,{headers:{Authorization:'Bearer a.b.c'}});
test('event library sends bounded filters to scoped search and checks pagination',async()=>{
 let args;const response=await handleEventLibrary(request(`site=${site}&attendance=hybrid&search=client&owned=mine&status=draft&publication=unpublished&limit=1`),async(token,name,input)=>{assert.equal(name,'search_event_library');args=input;return {records:[row],next:row.id};});assert.equal(response.status,200);assert.deepEqual(args,{p_site:site,p_event_status:'',p_start_from:'',p_start_to:'',p_attendance:'hybrid',p_search:'client',p_owned:true,p_status:'draft',p_publication:'unpublished',p_after:null,p_limit:1});assert.match(response.headers.get('cache-control'),/no-store/);
 for(const value of [{records:[row,row],next:null},{records:[row],next:id(9)},{records:[],next:id(9)},{records:[{...row,payload:{secret:true}}],next:null}])assert.throws(()=>verifiedEventLibrary(value,1));assert.throws(()=>verifiedEventLibrary({records:[row],next:null},1,row.id));
});
test('event library rejects duplicate or invalid filters before dispatch',async()=>{
 for(const extra of [`site=${site}`,'eventStatus=other','startFrom=2027-02-29','startFrom=2026-12-02&startTo=2026-12-01','attendance=other','owned=someone','status=deleted','publication=secret','limit=101','after=bad','search='+ 'a'.repeat(121),'actor='+id(8)])assert.equal((await handleEventLibrary(request(`site=${site}&${extra}`),async()=>assert.fail('Unexpected dispatch'))).status,400);
});

test('event library forwards lifecycle and inclusive civil-date boundaries',async()=>{
 const response=await handleEventLibrary(request(`site=${site}&eventStatus=cancelled&startFrom=2028-02-29&startTo=2028-03-01`),async(token,name,args)=>{
  assert.equal(args.p_event_status,'cancelled');assert.equal(args.p_start_from,'2028-02-29');assert.equal(args.p_start_to,'2028-03-01');return {records:[],next:null};
 });assert.equal(response.status,200);
});
