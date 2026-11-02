import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {handleImportUpload} from '../lib/cms/import-api.ts';
import {zip,wordFixture} from './office-fixtures.mjs';
const site='00000000-0000-4000-8000-000000000001',id='00000000-0000-4000-8000-000000000002',revision='00000000-0000-4000-8000-000000000003',requestId='00000000-0000-4000-8000-000000000004';
const current={id,type:'journey',currentRevision:revision,path:'/journeys/forest',locale:'en',title:'Original',payload:{title:'Original',intro:'Keep this copy'}};
function bytes(){const parts=wordFixture();parts['word/document.xml']=parts['word/document.xml'].replace('journey-01',id).replace('>r2<',`>${revision}<`);return zip(parts);}
function upload(body=bytes(),action='review',extra={}){return new Request('https://site.test/api/cms/import',{method:'POST',headers:{Authorization:'Bearer a.b.c','X-CMS-Site':site,'X-CMS-Format':'docx','X-CMS-Action':action,...extra},body});}
function transport(overrides={}){return async(_token,procedure,args)=>{
 if(procedure in overrides)return overrides[procedure](args);
 if(procedure==='list_editor_sites')return [{id:site}];
 if(procedure==='get_editor_record')return current;
 if(procedure==='get_import_receipt')return null;
 throw new Error(`Unexpected call ${procedure}`);
};}
test('actual Word upload produces review without a client-writable manifest',async()=>{
 const response=await handleImportUpload(upload(),transport());assert.equal(response.status,200);const result=await response.json();assert.equal(result.review.valid,true);assert.equal(result.review.pages.length,1);assert.equal(result.review.manifest,undefined);assert.equal(result.reviewDigest.length,64);
});
test('apply rebuilds original content from authorized records and saves only the reviewed manifest',async()=>{
 const reviewed=await (await handleImportUpload(upload(),transport())).json();let saved;
 const response=await handleImportUpload(upload(bytes(),'apply',{'Idempotency-Key':requestId,'X-CMS-Review':reviewed.reviewDigest}),transport({apply_reviewed_import:async args=>{saved=args;return [{recordId:id,revisionId:'new'}];}}));
 assert.equal(response.status,200);assert.equal(saved.p_items[0].payload.intro,'Keep this copy');assert.equal(saved.p_items[0].expectedRevision,revision);assert.equal(saved.p_review,reviewed.reviewDigest);
});
test('changing stored content or file bytes requires a fresh review',async()=>{
 const reviewed=await (await handleImportUpload(upload(),transport())).json();
 const response=await handleImportUpload(upload(bytes(),'apply',{'Idempotency-Key':requestId,'X-CMS-Review':reviewed.reviewDigest}),transport({get_editor_record:async()=>({...current,payload:{...current.payload,intro:'Other editor changed this'}})}));
 assert.equal(response.status,409);
});
test('retry returns a matching private receipt without reapplying old revisions',async()=>{
 const body=bytes(),digest='d'.repeat(64);let read=false;
 const response=await handleImportUpload(upload(body,'apply',{'Idempotency-Key':requestId,'X-CMS-Review':digest}),transport({get_import_receipt:async()=>({sourceSha256:createHash('sha256').update(body).digest('hex'),reviewSha256:digest,result:[{recordId:id}]}),get_editor_record:async()=>{read=true;return current;}}));
 assert.equal(response.status,200);assert.equal((await response.json()).replayed,true);assert.equal(read,false);
});
test('membership, explicit acceptance and upload bounds are enforced',async()=>{
 assert.equal((await handleImportUpload(upload(),transport({list_editor_sites:async()=>[]}))).status,403);
 assert.equal((await handleImportUpload(upload(bytes(),'apply'),transport())).status,400);
 assert.equal((await handleImportUpload(upload(Buffer.alloc(5_000_001)),transport())).status,413);
 assert.equal((await handleImportUpload(upload(Buffer.from('not a document')),transport())).status,422);
});
