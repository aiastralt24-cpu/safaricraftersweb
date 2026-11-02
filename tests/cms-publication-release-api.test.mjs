import test from 'node:test';
import assert from 'node:assert/strict';
import {releaseManifestSchema,parseReleaseReceipt} from '../lib/cms/publication-release.ts';
import {handlePublicationRelease} from '../lib/cms/publication-release-api.ts';
import {CmsGatewayError} from '../lib/cms/gateway.ts';
const ids=Array.from({length:8},(_,i)=>`00000000-0000-4000-8000-${String(i+1).padStart(12,'0')}`);
const manifest={site:ids[0],request:ids[1],items:[{record:ids[2],revision:ids[3]},{record:ids[4],revision:ids[5]}]};
const receipt={release:ids[6],request:manifest.request,items:manifest.items.map((item,i)=>({...item,deliveryJob:ids[6+i]}))};
const request=(body=manifest,headers={})=>new Request('https://site.test/api/cms/releases',{method:'POST',headers:{Authorization:'Bearer a.b.c','Content-Type':'application/json',...headers},body:JSON.stringify(body)});
test('release API uses caller credentials and exact ordered manifest; receipt is not cache success',async()=>{
 let called;const response=await handlePublicationRelease(request(),async(...args)=>{called=args;return receipt;});
 assert.equal(response.status,200);assert.deepEqual(called,['a.b.c','publish_release',{p_site:manifest.site,p_request:manifest.request,p_items:manifest.items}]);
 assert.deepEqual(await response.json(),{site:manifest.site,result:receipt,deliveryStatus:'unverified'});assert.match(response.headers.get('cache-control'),/no-store/);
});
test('receipt must match request, ordered members and unique delivery IDs without unknown fields',()=>{
 assert.deepEqual(parseReleaseReceipt(receipt,manifest),receipt);
 for(const value of [null,{...receipt,request:ids[0]},{...receipt,items:[...receipt.items].reverse()},{...receipt,items:receipt.items.slice(0,1)},{...receipt,items:receipt.items.map(item=>({...item,revision:ids[7]}))},{...receipt,items:receipt.items.map(item=>({...item,deliveryJob:ids[7]}))},{...receipt,private:'secret'}])assert.throws(()=>parseReleaseReceipt(value,manifest));
});
test('malformed manifests, forged fields, duplicates, cross-origin and anonymous requests never call RPC',async()=>{
 for(const [body,headers,status] of [[manifest,{Authorization:''},401],[manifest,{Origin:'https://foreign.test'},403],[{...manifest,actor:ids[0]},{},422],[{...manifest,items:[]},{},422],[{...manifest,items:[manifest.items[0],manifest.items[0]]},{},422],[{...manifest,items:Array(51).fill(manifest.items[0])},{},422],[{...manifest,request:''},{},422]]){
  let called=false;const response=await handlePublicationRelease(request(body,headers),async()=>{called=true;return receipt;});assert.equal(response.status,status);assert.equal(called,false);
 }
 assert.equal(releaseManifestSchema.safeParse({...manifest,items:[{...manifest.items[0],approved:true}]}).success,false);
});
test('ambiguous responses remain unconfirmed; exact retry reuses request identity',async()=>{
 const calls=[];let attempt=0;const call=async(...args)=>{calls.push(args);return attempt++?receipt:null;};
 const first=await handlePublicationRelease(request(),call);assert.equal(first.status,503);assert.match((await first.json()).error,/exact manifest/);
 const second=await handlePublicationRelease(request(),call);assert.equal(second.status,200);assert.deepEqual(calls[0],calls[1]);
 for(const status of [403,409,422])assert.equal((await handlePublicationRelease(request(),async()=>{throw new CmsGatewayError(status,'Safe error');})).status,status);
 const hidden=await handlePublicationRelease(request(),async()=>{throw Error('PRIVATE');});assert.equal((await hidden.text()).includes('PRIVATE'),false);
});
test('cancellation uses fixed caller-authorized RPC and validates exact cancelled or committed outcome',async()=>{
 const cancelled={status:'cancelled',...manifest};let called;
 const result=await handlePublicationRelease(request(),async(...args)=>{called=args;return cancelled;},'cancel');assert.equal(result.status,200);assert.equal(called[1],'cancel_release');assert.equal(called[0],'a.b.c');
 assert.equal((await handlePublicationRelease(request(),async()=>({status:'committed',result:receipt}),'cancel')).status,200);
 for(const value of [{...cancelled,request:ids[7]},{...cancelled,items:[]},{status:'committed',result:null}])assert.equal((await handlePublicationRelease(request(),async()=>value,'cancel')).status,503);
});
