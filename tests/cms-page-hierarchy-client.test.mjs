import test from 'node:test';import assert from 'node:assert/strict';
import {parsePageMove,pageMoveStorageKey,verifyPageMoveResult,verifyPageMoveCancellation} from '../lib/cms/page-hierarchy-client.ts';
const [actor,site,record,revision,parent,requestKey,other]=Array.from({length:7},(_,i)=>`00000000-0000-4000-8000-${String(i+1).padStart(12,'0')}`);
const pending={actor,site,record,revision,parent,requestKey,version:2};
test('page move recovery is scoped and bounded, retaining the exact original revision/request',()=>{
 assert.deepEqual(parsePageMove(JSON.stringify(pending),{actor,site,record}),pending);
 for(const field of ['actor','site','record'])assert.throws(()=>parsePageMove(JSON.stringify(pending),{actor,site,record,[field]:other}));
 assert.throws(()=>parsePageMove('x'.repeat(4097),{actor,site,record}));assert.throws(()=>parsePageMove(JSON.stringify({...pending,token:'secret'}),{actor,site,record}));
 assert.notEqual(pageMoveStorageKey(actor,site,record),pageMoveStorageKey(other,site,record));
});
test('page move receipt cannot clear recovery for a different move',()=>{
 const result={recordId:record,revisionId:revision,parentId:parent,version:3};assert.deepEqual(verifyPageMoveResult(result,pending),result);
 for(const patch of [{recordId:other},{revisionId:other},{parentId:other},{version:4},{version:1}])assert.throws(()=>verifyPageMoveResult({...result,...patch},pending));
});

test('cancellation preserves intent across reload and distinguishes completed moves',()=>{
 const cancelling={...pending,cancelRequested:true};assert.deepEqual(parsePageMove(JSON.stringify(cancelling),{actor,site,record}),cancelling);
 assert.equal(verifyPageMoveCancellation({status:'cancelled',requestKey,recordId:record},cancelling),'cancelled');
 assert.equal(verifyPageMoveCancellation({status:'completed',result:{recordId:record,revisionId:revision,parentId:parent,version:3}},cancelling),'completed');
 assert.throws(()=>verifyPageMoveCancellation({status:'cancelled',requestKey:other,recordId:record},cancelling));
 assert.throws(()=>verifyPageMoveCancellation({status:'completed',result:{recordId:record,revisionId:revision,parentId:other,version:3}},cancelling));
});
