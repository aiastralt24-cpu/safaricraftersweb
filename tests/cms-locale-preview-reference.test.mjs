import test from 'node:test';
import assert from 'node:assert/strict';
import {localePreviewLoader} from '../lib/cms/locale-preview-reference.ts';
const id='00000000-0000-4000-8000-000000000001',other='00000000-0000-4000-8000-000000000002';
test('draft references require exact language and identity without fallback',async()=>{
 const value={id,locale:'fr',payload:{title:'Titre'}},signal=new AbortController().signal;let calls=0;
 assert.equal(await localePreviewLoader(async(i,s)=>{calls++;assert.equal(i,id);assert.equal(s,signal);return value;},'fr')(id,signal),value);assert.equal(calls,1);
 for(const bad of [null,{...value,id:other},{...value,locale:'en'},{...value,locale:undefined},{...value,locale:'fr-CA'}])await assert.rejects(localePreviewLoader(async()=>bad,'fr')(id,signal),/Automatic language fallback is not enabled/);
 await assert.rejects(localePreviewLoader(async()=>assert.fail('invalid language must not load'),'')(id,signal));
 await assert.rejects(localePreviewLoader(async()=>assert.fail('invalid reference must not load'),'fr')('invalid',signal));
 await assert.rejects(localePreviewLoader(async()=>{throw Error('permission denied');},'fr')(id,signal),/permission denied/);
});
