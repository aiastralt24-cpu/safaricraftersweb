import test from 'node:test';import assert from 'node:assert/strict';
import {handlePublicExpeditionDirectory,parseExpeditionDirectoryResponse,publicExpeditionDirectoryConfig} from '../lib/cms/expedition-directory-runtime.ts';
import {newPhotoExpedition} from '../lib/cms/photo-expeditions.ts';
import {publishedExpeditionCardSchema} from '../lib/cms/public-expedition-directory.ts';
const site='00000000-0000-4000-8000-000000000001',id='00000000-0000-4000-8000-000000000002';
const content=publishedExpeditionCardSchema.shape.content.strip().parse({...newPhotoExpedition(),slug:'forest',title:'Forest',image:{assetId:'portrait',alt:'Forest'}});
const card={websiteId:site,recordId:id,revisionId:id,locale:'en',path:'/photo-expeditions/forest',content};
const request=(q=`site=${site}`,method='GET')=>new Request(`https://site.test/api/cms/published/expeditions?${q}`,{method});
const page=items=>({websiteId:site,locale:'en',snapshot:'a'.repeat(32),items,nextCursor:null});
test('published expedition endpoint preserves safe cards and browser rejects identity, path and private-field changes',async()=>{
 const response=await handlePublicExpeditionDirectory(request(),{site,read:async()=>page([card])});assert.equal(response.status,200);assert.match(response.headers.get('cache-control'),/no-store/);
 const body=await response.json();assert.deepEqual(parseExpeditionDirectoryResponse(body,site,'en'),[card]);
 for(const items of [[card,card],[{...card,websiteId:id}],[{...card,path:'https://bad.test'}],[{...card,privateNotes:'private'}],[{...card,content:{...content,image:undefined}}]])assert.throws(()=>parseExpeditionDirectoryResponse({...body,items},site,'en'));
 assert.throws(()=>parseExpeditionDirectoryResponse({...body,websiteId:id},site,'en'));assert.throws(()=>parseExpeditionDirectoryResponse(body,site,'fr'));
});
test('directory endpoint separates empty, unavailable and invalid requests, and returns no partial changed snapshot',async()=>{
 let calls=0;const config={site,read:async()=>{calls++;return page([]);}};
 for(const q of ['',`site=${site}&site=${site}`,`site=${site}&locale=fr`,`site=${site}&draft=true`])assert.equal((await handlePublicExpeditionDirectory(request(q),config)).status,400);
 assert.equal((await handlePublicExpeditionDirectory(request(`site=${id}`),config)).status,404);assert.equal((await handlePublicExpeditionDirectory(request(undefined,'POST'),config)).status,405);assert.equal(calls,0);
 assert.equal(publicExpeditionDirectoryConfig({}),null);assert.equal((await handlePublicExpeditionDirectory(request(),null)).status,503);
 assert.deepEqual(parseExpeditionDirectoryResponse(await(await handlePublicExpeditionDirectory(request(),config)).json(),site,'en'),[]);
 const failed=await handlePublicExpeditionDirectory(request(),{site,read:async()=>{throw Error('Private provider detail');}});assert.equal(failed.status,503);assert.doesNotMatch(await failed.text(),/Private provider/);
 let reads=0;const changed=await handlePublicExpeditionDirectory(request(),{site,read:async()=>++reads===1?{...page([card]),nextCursor:id}:{...page([]),snapshot:'b'.repeat(32)}});assert.equal(changed.status,503);assert.equal(reads,2);
});
