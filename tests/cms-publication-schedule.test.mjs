import test from 'node:test';
import assert from 'node:assert/strict';
import {parseFuturePublicationSchedule} from '../lib/cms/publication-schedule.ts';
import {runPublicationScheduleBatch} from '../lib/cms/publication-schedule-worker.ts';
const job={site:'00000000-0000-4000-8000-000000000001',record:'00000000-0000-4000-8000-000000000002',revision:'00000000-0000-4000-8000-000000000003',id:'00000000-0000-4000-8000-000000000004',token:'00000000-0000-4000-8000-000000000005',operation:'publish',runAt:'2026-10-24T10:00:00+05:30'};
const {id,token,...request}=job;
const stored={site:job.site,record:job.record,revision:job.revision,type:'journey',path:'/journeys/forest',payload:{slug:'forest',title:'Forest journey',description:'A journey through the forest.',intro:'Walk through the forest with an expert guide.',region:'India',duration:'5 days',bestMonths:'November'}};
function fixture(overrides={}){
 const calls=[];
 return {calls,adapter:{claim:async()=>[job],validation:async(name,args)=>{calls.push([name,args]);if(name==='get_validation_input')return stored;},execute:async(...args)=>{calls.push(['execute',...args]);return 'published';},fail:async(...args)=>{calls.push(['fail',...args]);return 'blocked';},...overrides}};
}
test('schedule normalizes explicit offsets and rejects ambiguous, past or forged requests',()=>{
 const now=new Date('2026-10-23T00:00:00Z');
 assert.equal(parseFuturePublicationSchedule(request,now).runAt,'2026-10-24T04:30:00.000Z');
 for(const change of [{runAt:'2026-10-24T10:00:00'},{runAt:'2026-10-23T00:00:00Z'},{runAt:'2026-02-30T10:00:00Z'},{revision:''},{actor:job.site},{operation:'delete'}])
  assert.throws(()=>parseFuturePublicationSchedule({...request,...change},now));
 assert.throws(()=>parseFuturePublicationSchedule(request,new Date(NaN)));
 // Explicit offsets disambiguate the two occurrences of 01:30 during fall-back.
 const a=parseFuturePublicationSchedule({...request,runAt:'2026-11-01T01:30:00-04:00'},now);
 const b=parseFuturePublicationSchedule({...request,runAt:'2026-11-01T01:30:00-05:00'},now);
 assert.equal(Date.parse(b.runAt)-Date.parse(a.runAt),3600000);
});
test('publish validates pinned database content and acknowledges its receipt before execution',async()=>{
 const {adapter,calls}=fixture();
 assert.deepEqual(await runPublicationScheduleBatch(adapter),[{id,status:'published'}]);
 assert.deepEqual(calls.map(c=>c[0]),['get_validation_input','record_validation','execute']);
 assert.equal(calls[1][1].p_valid,true);assert.equal(calls[1][1].p_revision,job.revision);
 assert.deepEqual(calls[2],['execute',id,token]);
});
test('invalid content and unavailable receipt never execute publication',async()=>{
 for(const unavailable of [false,true]){
  const {adapter,calls}=fixture({validation:async(name)=>{
   if(name==='get_validation_input')return unavailable?stored:{...stored,payload:{slug:'forest'}};
   if(unavailable)throw Error('secret upstream error');
  }});
  assert.deepEqual(await runPublicationScheduleBatch(adapter),[{id,status:'blocked'}]);
  assert.deepEqual(calls,[['fail',id,token,unavailable?'validation_unavailable':'validation_failed']]);
 }
});
test('identity mismatch cannot write a receipt or execute',async()=>{
 let writes=0;const {adapter,calls}=fixture({validation:async(name)=>{if(name==='record_validation')writes++;return {...stored,revision:job.record};}});
 await runPublicationScheduleBatch(adapter);assert.equal(writes,0);
 assert.deepEqual(calls,[['fail',id,token,'validation_unavailable']]);
});
test('withdrawal bypasses content validation but still requires fenced atomic execution',async()=>{
 const {adapter,calls}=fixture({claim:async()=>[{...job,operation:'unpublish'}],execute:async(...args)=>{calls.push(['execute',...args]);return 'unpublished';}});
 assert.deepEqual(await runPublicationScheduleBatch(adapter),[{id,status:'unpublished'}]);
 assert.deepEqual(calls,[['execute',id,token]]);
});
test('lost or inconsistent acknowledgements never claim success or overwrite possible committed execution',async()=>{
 for(const execute of [async()=>{throw Error('lost response');},async()=> 'unpublished',async()=>undefined]){
  const {adapter,calls}=fixture({execute});
  assert.deepEqual(await runPublicationScheduleBatch(adapter),[{id,status:'unacknowledged'}]);
  assert.equal(calls.some(c=>c[0]==='fail'),false);
 }
 const {adapter}=fixture({validation:async()=>{throw Error('offline');},fail:async()=>{throw Error('lease lost');}});
 assert.deepEqual(await runPublicationScheduleBatch(adapter),[{id,status:'unacknowledged'}]);
});
test('malformed or duplicate claims and invalid limits fail before any side effects',async()=>{
 for(const jobs of [[job,job],[{...job,token:''}],[{...job,actor:job.site}]]){
  const {adapter,calls}=fixture({claim:async()=>jobs});
  await assert.rejects(runPublicationScheduleBatch(adapter));assert.deepEqual(calls,[]);
 }
 for(const limit of [0,51,1.5,NaN]){
  let claimed=false;const {adapter}=fixture({claim:async()=>{claimed=true;return [];}});
  await assert.rejects(runPublicationScheduleBatch(adapter,limit));assert.equal(claimed,false);
 }
});
