import test from 'node:test';import assert from 'node:assert/strict';
import {submitTranslationCreation,retryTranslationCreation,acknowledgeTranslationCreation,readPendingTranslation} from '../lib/cms/translation-creation.ts';
const [actor,site,source,sourceRevision,requestKey,recordId,revisionId,other]=Array.from({length:8},(_,i)=>`00000000-0000-4000-8000-${String(i+1).padStart(12,'0')}`);
const input={action:'create',site,source,sourceRevision,locale:'fr',path:'/journeys/example'};
function fixture(){const values=new Map(),storage={getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v),removeItem:k=>values.delete(k)};let queue=Promise.resolve();const locks={request:(_key,work)=>{const result=queue.then(work);queue=result.catch(()=>{});return result;}};return {storage,locks,actor,values,input,now:()=>new Date('2026-10-28T00:00:00Z'),newId:()=>requestKey};}
const receipt=request=>({site:request.site,requestKey:request.requestKey,result:{recordId,revisionId}});
test('translation creation persists before sending and recovers the exact receipt after a lost response',async()=>{
 const f=fixture(),sent=[];let first=true;
 const send=async request=>{sent.push(request);assert.equal(readPendingTranslation(f.storage,actor,site,source).request.requestKey,request.requestKey);if(first){first=false;throw Error('Lost response after commit');}return receipt(request);};
 await assert.rejects(submitTranslationCreation({...f,send}),/Lost response/);
 await assert.rejects(submitTranslationCreation({...f,input:{...input,sourceRevision:other},send}),/earlier translation/);assert.equal(sent.length,1);
 assert.deepEqual(await retryTranslationCreation({...f,site,source,send}),{recordId,revisionId});assert.deepEqual(sent[1],sent[0]);assert.ok(readPendingTranslation(f.storage,actor,site,source).confirmed);
 await acknowledgeTranslationCreation({...f,site,source,record:other});assert.equal(f.values.size,1);
 await acknowledgeTranslationCreation({...f,site,source,record:recordId});assert.equal(f.values.size,0);
});
test('translation creation refuses missing locks, unavailable storage and corrupted identities before transport',async()=>{
 let sent=0;const send=async request=>{sent++;return receipt(request);};
 await assert.rejects(submitTranslationCreation({...fixture(),locks:undefined,send}),/Web Locks/);
 const f=fixture();f.storage.setItem=()=>{};await assert.rejects(submitTranslationCreation({...f,send}),/could not be stored/);
 const broken=fixture();broken.storage.setItem=()=>{throw Error('Quota exceeded');};await assert.rejects(submitTranslationCreation({...broken,send}),/Quota/);assert.equal(sent,0);
 const good=fixture();await submitTranslationCreation({...good,send});const [k,raw]=[...good.values][0];good.values.set(k,raw.replace(actor,other));assert.throws(()=>readPendingTranslation(good.storage,actor,site,source),/identity mismatch/);good.values.set(k,'x'.repeat(4001));assert.throws(()=>readPendingTranslation(good.storage,actor,site,source),/invalid/);
});
test('translation confirmation rejects unrelated or changed receipts and retains recovery',async()=>{
 for(const mutate of [v=>({...v,site:other}),v=>({...v,requestKey:other}),v=>({...v,result:{recordId:source,revisionId}}),v=>({...v,extra:'secret'})]){
  const f=fixture();await assert.rejects(submitTranslationCreation({...f,send:async r=>mutate(receipt(r))}));assert.equal(f.values.size,1);assert.equal(readPendingTranslation(f.storage,actor,site,source).confirmed,undefined);
 }
 const f=fixture();await submitTranslationCreation({...f,send:async r=>receipt(r)});await assert.rejects(retryTranslationCreation({...f,site,source,send:async r=>({...receipt(r),result:{recordId:other,revisionId}})}),/receipt changed/);
});
test('serialized translation attempts retain one identity and detect storage changes during transport',async()=>{
 const f=fixture(),sent=[];const send=async r=>{sent.push(r);return receipt(r);};
 await Promise.all([submitTranslationCreation({...f,send}),submitTranslationCreation({...f,send})]);assert.equal(sent.length,2);assert.equal(new Set(sent.map(v=>v.requestKey)).size,1);
 const g=fixture();await assert.rejects(submitTranslationCreation({...g,send:async r=>{g.values.clear();return receipt(r);}}),/changed before confirmation/);
 // A delayed tab still reuses its attempted key if another tab clears shared storage.
 f.values.clear();await submitTranslationCreation({...f,newId:()=>other,send});assert.equal(sent[2].requestKey,requestKey);
});

test('translation cancellation clears only a verified server fence and retains committed draft recovery',async()=>{
 const {cancelTranslationCreation}=await import('../lib/cms/translation-creation.ts');
 const f=fixture();await assert.rejects(submitTranslationCreation({...f,send:async()=>{throw Error('offline');}}));
 await assert.rejects(cancelTranslationCreation({...f,site,source,send:async r=>({site:other,requestKey:r.requestKey,result:{status:'cancelled'}})}),/does not match/);assert.equal(f.values.size,1);
 assert.deepEqual(await cancelTranslationCreation({...f,site,source,send:async r=>{assert.equal(r.action,'cancel_create');assert.equal(r.sourceRevision,sourceRevision);return {site,requestKey:r.requestKey,result:{status:'cancelled'}};}}),{status:'cancelled'});assert.equal(f.values.size,0);
 await submitTranslationCreation({...f,newId:()=>other,send:async r=>receipt(r)});assert.equal(readPendingTranslation(f.storage,actor,site,source).request.requestKey,other);
 await assert.rejects(cancelTranslationCreation({...f,site,source,send:async r=>({site,requestKey:r.requestKey,result:{status:'cancelled'}})}),/confirmed translation/);
 assert.deepEqual(await cancelTranslationCreation({...f,site,source,send:async r=>({site,requestKey:r.requestKey,result:{status:'created',result:{recordId,revisionId}}})}),{status:'created',result:{recordId,revisionId}});assert.equal(f.values.size,1);
});
test('pathless translation recovery preserves an explicit null path across creation and cancellation',async()=>{
 const {cancelTranslationCreation}=await import('../lib/cms/translation-creation.ts');const f=fixture();
 await assert.rejects(submitTranslationCreation({...f,input:{...input,path:null},send:async request=>{assert.equal(request.path,null);throw Error('Lost pathless response');}}),/Lost pathless/);
 assert.equal(readPendingTranslation(f.storage,actor,site,source).request.path,null);
 await cancelTranslationCreation({...f,site,source,send:async request=>{assert.equal(request.path,null);return {site,requestKey:request.requestKey,result:{status:'cancelled'}};}});assert.equal(f.values.size,0);
});
