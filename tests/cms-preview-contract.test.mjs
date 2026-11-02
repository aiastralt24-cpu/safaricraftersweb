import test from 'node:test';
import assert from 'node:assert/strict';
import {parsePreviewDocument} from '../lib/cms/preview-contract.ts';
const id='00000000-0000-4000-8000-000000000001';
const other='00000000-0000-4000-8000-000000000002';
const now=Date.parse('2026-10-22T12:00:00Z');
const document={previewId:id,websiteId:other,recordId:other,revisionId:other,expiresAt:'2026-10-22T12:01:00Z',type:'page',path:'/example',locale:'en',payload:{composition:{sections:[]}}};
test('preview accepts only the requested unexpired scoped document',()=>{
 assert.deepEqual(parsePreviewDocument(document,id,now),document);
 assert.throws(()=>parsePreviewDocument(document,other,now),/unavailable/);
 assert.throws(()=>parsePreviewDocument(document,id,now+60000),/expired/);
 assert.throws(()=>parsePreviewDocument(document,id,now+60001),/expired/);
});
test('preview rejects missing site identity and malformed response envelopes',()=>{
 for(const value of [null,{...document,websiteId:undefined},{...document,websiteId:'bad'},{...document,expiresAt:'tomorrow'},{...document,payload:null},{...document,token:'unexpected'}])assert.throws(()=>parsePreviewDocument(value,id,now));
});
