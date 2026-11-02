import test from 'node:test';
import assert from 'node:assert/strict';
import {fetchServerErrorMessage} from '../lib/cms/error-message-client.ts';
const message={enabled:true,title:'Please try later',body:'Our team can help.',button:{label:'Contact',href:'/contact',newWindow:false}};
test('server-error message client accepts only safe enabled public copy',async()=>{
 const signal=new AbortController().signal;
 assert.deepEqual(await fetchServerErrorMessage(signal,async(url,options)=>{assert.equal(url,'/api/cms/public/error-message');assert.equal(options.credentials,'omit');assert.equal(options.cache,'no-store');return Response.json(message);}),message);
 for(const invalid of [null,{...message,enabled:false},{...message,title:' '},{...message,body:' '},{...message,diagnostics:'private'},{...message,button:{...message.button,href:'javascript:alert(1)'}}])assert.equal(await fetchServerErrorMessage(signal,async()=>Response.json(invalid)),undefined);
 assert.equal(await fetchServerErrorMessage(signal,async()=>new Response('offline',{status:503})),undefined);
 assert.equal(await fetchServerErrorMessage(signal,async()=>{throw Error('offline');}),undefined);
 assert.equal(await fetchServerErrorMessage(signal,async()=>new Response('bad JSON')),undefined);
});
test('server-error message client forwards cancellation and preserves fallback',async()=>{
 const controller=new AbortController();controller.abort();assert.equal(await fetchServerErrorMessage(controller.signal,async(_url,options)=>{assert.equal(options.signal.aborted,true);throw options.signal.reason;}),undefined);
});
