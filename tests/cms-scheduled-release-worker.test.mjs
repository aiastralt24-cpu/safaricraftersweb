import test from 'node:test';import assert from 'node:assert/strict';import {runScheduledRelease} from '../lib/cms/scheduled-release-worker.ts';
const id='00000000-0000-4000-8000-000000000001';const job={id,token:id,site:id,request:id,items:[{record:id,revision:id}]};
const input={site:id,record:id,revision:id,type:'journey',path:'/journeys/forest',payload:{slug:'forest',title:'Forest',description:'A forest journey.',intro:'Explore the forest.',region:'India',duration:'5 days',bestMonths:'November'}};
test('scheduled release validates pinned stored input and writes receipt before atomic execution',async()=>{
 const events=[];const result=await runScheduledRelease(async(name,args)=>{events.push(name);if(name==='claim_scheduled_release')return job;assert.deepEqual(args,{p_job:id,p_token:id});return 'published';},async name=>{events.push(name);if(name==='get_validation_input')return input;return null;});assert.equal(result.status,'published');assert.deepEqual(events,['claim_scheduled_release','get_validation_input','record_validation','execute_scheduled_release']);
});
test('invalid or unavailable validation never executes the group and preserves safe error codes',async()=>{
 for(const unavailable of [false,true]){const calls=[];const result=await runScheduledRelease(async(name,args)=>{calls.push([name,args]);return name==='claim_scheduled_release'?job:'blocked';},async()=>{if(unavailable)throw Error('PRIVATE');return {...input,payload:{}};});assert.equal(result.status,'blocked');assert.equal(calls.at(-1)[0],'fail_scheduled_release');assert.equal(calls.at(-1)[1].p_code,unavailable?'validation_unavailable':'validation_failed');assert.equal(calls.some(([name])=>name==='execute_scheduled_release'),false);}
});
test('idle, duplicate claims and lost execution responses cannot look like publication success',async()=>{
 assert.deepEqual(await runScheduledRelease(async()=>null,async()=>{throw Error();}),{status:'idle'});
 await assert.rejects(runScheduledRelease(async()=>({...job,items:[...job.items,...job.items]}),async()=>input));
 const result=await runScheduledRelease(async name=>{if(name==='claim_scheduled_release')return job;throw Error('lost response');},async name=>name==='get_validation_input'?input:null);assert.equal(result.status,'unacknowledged');
});
