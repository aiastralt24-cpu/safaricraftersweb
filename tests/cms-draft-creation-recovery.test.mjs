import test from 'node:test';import assert from 'node:assert/strict';
import {submitDraftCreation,retryDraftCreation,readPendingDraftCreation,cancelDraftCreation,acknowledgeDraftCreation} from '../lib/cms/draft-creation-recovery.ts';
const ids=Array.from({length:8},(_,i)=>`00000000-0000-4000-8000-${String(i+1).padStart(12,'0')}`),actor=ids[0],input={action:'save',site:ids[1],type:'journey',record:null,expectedRevision:null,path:'/journeys/forest',title:'Forest',locale:'en',payload:{slug:'forest',title:'Forest'}},result={recordId:ids[3],revisionId:ids[4]};
const now=()=>new Date('2026-10-23T00:00:00Z'),newId=()=>ids[2],locks={request:async(_,fn)=>fn()};
function memory(){const map=new Map();return {getItem:key=>map.get(key)??null,setItem:(key,value)=>map.set(key,value),removeItem:key=>map.delete(key)};}
const receipt=request=>({site:request.site,requestKey:request.requestKey,result});
test('lost response retains exact first-save request for reload retry and blocks changed content',async()=>{
 const storage=memory(),sent=[];let creations=0;
 const originalSend=async request=>{sent.push(request);creations++;throw Error('Response lost after commit');};
 await assert.rejects(submitDraftCreation({storage,locks,actor,input,now,newId,send:originalSend}),/lost/);
 const pending=readPendingDraftCreation(storage,actor,input.site,input.type);assert.equal(pending.request.requestKey,ids[2]);
 await assert.rejects(submitDraftCreation({storage,locks,actor,input:{...input,title:'Changed'},now,newId,send:originalSend}),/Resolve/);assert.equal(creations,1);
 const response=await retryDraftCreation({storage,locks,actor,site:input.site,kind:input.type,send:async request=>{assert.deepEqual(request,sent[0]);return receipt(request);}});
 assert.deepEqual(response.result,result);assert.equal(readPendingDraftCreation(storage,actor,input.site,input.type),null);
});
test('first-save transport never runs without locks or confirmed storage and cannot clear mismatched receipts',async()=>{
 let sent=0;const send=async request=>{sent++;return receipt(request);};const storage=memory();
 await assert.rejects(submitDraftCreation({storage,locks:undefined,actor,input,now,newId,send}),/Web Locks/);
 await assert.rejects(submitDraftCreation({storage:{...storage,setItem:()=>{}},locks,actor,input,now,newId,send}),/stored/);assert.equal(sent,0);
 await assert.rejects(submitDraftCreation({storage,locks,actor,input,now,newId,send:async request=>({...receipt(request),requestKey:ids[6]})}),/match/);
 assert.ok(readPendingDraftCreation(storage,actor,input.site,input.type));
 assert.equal(readPendingDraftCreation(storage,ids[5],input.site,input.type),null);
 await assert.rejects(retryDraftCreation({storage,locks,actor,site:input.site,kind:input.type,send:async()=>({result})}));assert.ok(readPendingDraftCreation(storage,actor,input.site,input.type));
});
test('tabs serialize requests and a waiting different save cannot replace an ambiguous request',async()=>{
 let unlock,start;const began=new Promise(resolve=>{start=resolve;}),release=new Promise(resolve=>{unlock=resolve;});let tail=Promise.resolve();
 const serialized={request:(_,fn)=>{const next=tail.then(fn);tail=next.catch(()=>{});return next;}};const storage=memory();let sends=0;
 const first=submitDraftCreation({storage,locks:serialized,actor,input,now,newId,send:async()=>{sends++;start();await release;throw Error('Lost');}});await began;
 const second=submitDraftCreation({storage,locks:serialized,actor,input:{...input,title:'Other tab'},now,newId:()=>ids[7],send:async()=>{sends++;}});
 unlock();await assert.rejects(first,/Lost/);await assert.rejects(second,/Resolve/);assert.equal(sends,1);assert.equal(readPendingDraftCreation(storage,actor,input.site,input.type).request.requestKey,ids[2]);
});
test('known rejection remains recoverable because an earlier same-key attempt may have committed',async()=>{
 const storage=memory();await assert.rejects(submitDraftCreation({storage,locks,actor,input,now,newId,send:async()=>{throw Object.assign(Error('Forbidden'),{status:403});}}),/Forbidden/);
 assert.ok(readPendingDraftCreation(storage,actor,input.site,input.type));
 const reordered={...input,payload:{title:'Forest',slug:'forest'}};
 const response=await submitDraftCreation({storage,locks,actor,input:reordered,now,newId:()=>ids[7],send:async request=>{assert.equal(request.requestKey,ids[2]);return receipt(request);}});assert.deepEqual(response.result,result);
});

test('cancellation preserves lost/mismatched responses and clears only confirmed outcomes',async()=>{
 for(const outcome of [{status:'cancelled'},{status:'created',result}]){
  const storage=memory();await assert.rejects(submitDraftCreation({storage,locks,actor,input,now,newId,send:async()=>{throw Error('Lost');}}));
  const options={storage,locks,actor,site:input.site,kind:input.type};
  await assert.rejects(cancelDraftCreation({...options,send:async()=>{throw Error('Lost cancellation');}}),/Lost cancellation/);
  await assert.rejects(cancelDraftCreation({...options,send:async()=>({site:ids[7],requestKey:ids[2],result:outcome})}),/match/);
  assert.ok(readPendingDraftCreation(storage,actor,input.site,input.type));
  assert.deepEqual(await cancelDraftCreation({...options,send:async request=>{assert.deepEqual(request,{action:'cancel_create',site:input.site,requestKey:ids[2],type:input.type});return {site:input.site,requestKey:ids[2],result:outcome};}}),outcome);
  assert.equal(readPendingDraftCreation(storage,actor,input.site,input.type),null);
 }
});
test('cancellation refuses to clear a changed local snapshot',async()=>{
 const storage=memory();await assert.rejects(submitDraftCreation({storage,locks,actor,input,now,newId,send:async()=>{throw Error('Lost');}}));
 await assert.rejects(cancelDraftCreation({storage,locks,actor,site:input.site,kind:input.type,send:async()=>{
  const pending=readPendingDraftCreation(storage,actor,input.site,input.type);pending.request.title='Changed';
  storage.setItem(`cms-create-pending-v1:${actor}:${input.site}:${input.type}`,JSON.stringify(pending));
  return {site:input.site,requestKey:ids[2],result:{status:'cancelled'}};
 }}),/changed/);
 assert.equal(readPendingDraftCreation(storage,actor,input.site,input.type).request.title,'Changed');
});

test('confirmed save remains retryable until matching record load is acknowledged',async()=>{
 const storage=memory(),options={storage,locks,actor,input,now,newId,retainUntilLoaded:true,send:async request=>receipt(request)};
 await submitDraftCreation(options);
 assert.deepEqual(readPendingDraftCreation(storage,actor,input.site,input.type).confirmed,result);
 await acknowledgeDraftCreation({storage,locks,actor,site:input.site,kind:input.type,record:ids[7]});
 assert.ok(readPendingDraftCreation(storage,actor,input.site,input.type));
 await submitDraftCreation({...options,newId:()=>{throw Error('Must reuse the saved identity');}});
 await assert.rejects(submitDraftCreation({...options,input:{...input,title:'Different'}}),/Resolve/);
 await acknowledgeDraftCreation({storage,locks,actor,site:input.site,kind:input.type,record:result.recordId});
 assert.equal(readPendingDraftCreation(storage,actor,input.site,input.type),null);
});

test('a stale tab reuses its attempted identity after another tab acknowledges the record',async()=>{
 const shared=memory(),tabA={...shared},tabB={...shared};let sends=0;
 const options={locks,actor,input,now,newId,retainUntilLoaded:true,send:async request=>{sends++;return receipt(request);}};
 await assert.rejects(submitDraftCreation({...options,storage:tabB,send:async()=>{throw Error('Lost');}}));
 await submitDraftCreation({...options,storage:tabA});
 await acknowledgeDraftCreation({storage:tabA,locks,actor,site:input.site,kind:input.type,record:result.recordId});
 assert.equal(readPendingDraftCreation(tabB,actor,input.site,input.type),null);
 await assert.rejects(submitDraftCreation({...options,storage:tabB,input:{...input,title:'Changed in stale tab'}}),/earlier first save/);
 await submitDraftCreation({...options,storage:tabB,newId:()=>{throw Error('Must reuse the first request identity');}});
 assert.equal(readPendingDraftCreation(tabB,actor,input.site,input.type).request.requestKey,ids[2]);
 await acknowledgeDraftCreation({storage:tabB,locks,actor,site:input.site,kind:input.type,record:result.recordId});
 await submitDraftCreation({...options,storage:tabB,input:{...input,title:'Intentional next draft'},newId:()=>ids[7]});
 assert.equal(readPendingDraftCreation(tabB,actor,input.site,input.type).request.requestKey,ids[7]);assert.equal(sends,3);
});
