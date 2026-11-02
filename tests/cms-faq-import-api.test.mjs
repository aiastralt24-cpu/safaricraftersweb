import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {handleFaqImportUpload} from '../lib/cms/faq-import-api.ts';
import {newFaq} from '../lib/cms/faqs.ts';
import {zip} from './office-fixtures.mjs';
import {readFile} from 'node:fs/promises';
const site='11111111-1111-4111-8111-111111111111',id='22222222-2222-4222-8222-222222222222',revision='33333333-3333-4333-8333-333333333333';
const current={id,type:'faq',currentRevision:revision,path:null,locale:'en',payload:{...newFaq(),question:'Original',topic:'Preserved topic'}};
const upload=(body,headers={})=>new Request('https://site.test/api/cms/import/faqs',{method:'POST',headers:{Authorization:'Bearer a.b.c','X-CMS-Site':site,'X-CMS-Format':'docx','X-CMS-Action':'review',...headers},body});
const transport=(overrides={})=>async(token,procedure,args)=>{assert.equal(token,'a.b.c');if(overrides[procedure])return overrides[procedure](args);if(procedure==='list_editor_sites')return [{id:site}];if(procedure==='review_faq_import_links')return {references:args.p_references.map(ref=>({...ref,available:true,revision}))};if(procedure==='get_editor_record'){assert.equal(args.p_record,id);return current;}throw Error(`Unexpected RPC ${procedure}`);};
function updateBytes(){
 const row=(key,value)=>`<w:tr><w:tc><w:p><w:r><w:t>${key}</w:t></w:r></w:p></w:tc><w:tc><w:p><w:r><w:t>${value}</w:t></w:r></w:p></w:tc></w:tr>`;
 return zip({'[Content_Types].xml':'<Types/>','word/document.xml':`<w:document xmlns:w="urn:w"><w:body><w:tbl><w:tr>${['CMSFaq','1.0','faq'].map(v=>`<w:tc><w:p><w:r><w:t>${v}</w:t></w:r></w:p></w:tc>`).join('')}</w:tr></w:tbl><w:tbl>${row('Pages','record')}${row('field','value')}${Object.entries({recordId:id,operation:'update',expectedRevision:revision,question:'Updated',locale:'en'}).map(([k,v])=>row(k,v)).join('')}</w:tbl></w:body></w:document>`});
}
test('authenticated faq Office review returns draft proposals with explicit save eligibility',async()=>{
 const bytes=updateBytes();
 const response=await handleFaqImportUpload(upload(bytes),transport());assert.equal(response.status,200);assert.match(response.headers.get('cache-control'),/no-store/);
 const result=await response.json();assert.equal(result.plan.valid,true);assert.equal(result.plan.changes.length,1);assert.equal(result.applyAvailable,true);assert.equal(result.verification.references,true);assert.equal(result.reviewDigest.length,64);
});
test('faq review preserves server content and digest changes with the proposed snapshot',async()=>{
 const first=await(await handleFaqImportUpload(upload(updateBytes()),transport())).json();assert.equal(first.plan.changes[0].payload.topic,'Preserved topic');assert.equal(first.comparisons[0].before.question,'Original');assert.equal(first.comparisons[0].revision,revision);
 const second=await(await handleFaqImportUpload(upload(updateBytes()),transport({get_editor_record:()=>({...current,payload:{...current.payload,topic:'Changed'}})}))).json();assert.notEqual(first.reviewDigest,second.reviewDigest);
 const stale=await(await handleFaqImportUpload(upload(updateBytes()),transport({get_editor_record:()=>({...current,currentRevision:site})}))).json();assert.equal(stale.plan.valid,false);assert.deepEqual(stale.plan.changes,[]);
});
test('faq review rejects unexpected record identities, types and routes',async()=>{
 for(const patch of [{id:site},{type:'journey'},{path:'/faqs/other'}])assert.equal((await handleFaqImportUpload(upload(updateBytes()),transport({get_editor_record:()=>({...current,...patch})}))).status,422);
 const missing=await(await handleFaqImportUpload(upload(updateBytes()),transport({get_editor_record:()=>null}))).json();assert.equal(missing.plan.valid,false);
});
test('faq upload enforces authentication, membership, origin, file limits and explicit apply acceptance',async()=>{
 const body=updateBytes();
 for(const [headers,status]of [[{Authorization:''},401],[{Origin:'https://other.test'},403],[{'X-CMS-Action':'apply'},400]])assert.equal((await handleFaqImportUpload(upload(body,headers),transport())).status,status);
 assert.equal((await handleFaqImportUpload(upload(Buffer.from('invalid')),transport({list_editor_sites:()=>[]}))).status,403);
 assert.equal((await handleFaqImportUpload(upload(Buffer.alloc(5_000_001)),transport())).status,413);
 assert.equal((await handleFaqImportUpload(upload(Buffer.from('invalid')),transport())).status,422);
});

test('FAQ review checks preserved references and binds their current revisions',async()=>{
 const stored={...current,payload:{...current.payload,relationships:{...current.payload.relationships,pages:[{recordId:site}]}}};
 const check=async patch=>handleFaqImportUpload(upload(updateBytes()),transport({get_editor_record:()=>stored,review_faq_import_links:args=>({references:args.p_references.map(ref=>({...ref,available:true,revision,...patch}))})}));
 const first=await(await check({})).json();assert.equal(first.plan.valid,true);
 const changed=await(await check({revision:site})).json();assert.notEqual(first.reviewDigest,changed.reviewDigest);
 const missing=await(await check({available:false,revision:null})).json();assert.equal(missing.plan.valid,false);assert.equal(missing.plan.issues[0].row,2);
 for(const patch of [{available:true,revision:null},{type:'project'},{recordId:id}])assert.equal((await check(patch)).status,503);
});
test('FAQ filled Word and Excel reviews are valid and eligible for explicit draft saving',async()=>{
 for(const format of ['docx','xlsx']){const bytes=await readFile(new URL(`./fixtures/faq-v1-filled.${format}`,import.meta.url));const response=await handleFaqImportUpload(upload(bytes,{'X-CMS-Format':format}),transport());assert.equal(response.status,200);const result=await response.json();assert.equal(result.plan.valid,true);assert.equal(result.applyAvailable,true);assert.equal(result.comparisons[0].before,null);}
});
test('faq apply rebuilds the reviewed payload and validates its save receipt',async()=>{
 const body=updateBytes(),review=await(await handleFaqImportUpload(upload(body),transport())).json();let saved;
 const headers={'X-CMS-Action':'apply','Idempotency-Key':site,'X-CMS-Review':review.reviewDigest};
 const rpc=transport({get_faq_import_receipt:()=>null,apply_faq_import:args=>{saved=args;return args.p_items.map(i=>({sourceKey:i.sourceKey,recordId:i.recordId,revisionId:site}));}});
 const response=await handleFaqImportUpload(upload(body,headers),rpc);assert.equal(response.status,200);assert.equal((await response.json()).replayed,false);assert.equal(saved.p_items[0].payload.topic,'Preserved topic');assert.equal(saved.p_items[0].expectedRevision,revision);
 const changed=await handleFaqImportUpload(upload(body,headers),transport({get_faq_import_receipt:()=>null,get_editor_record:()=>({...current,payload:{...current.payload,topic:'Changed'}})}));assert.equal(changed.status,409);
 const bad=await handleFaqImportUpload(upload(body,headers),transport({get_faq_import_receipt:()=>null,apply_faq_import:()=>[]}));assert.equal(bad.status,503);
});
test('faq retry and recovery return completed receipts without rereading changed records',async()=>{
 const body=updateBytes(),receipt={requestKey:site,sourceDigest:createHash('sha256').update(body).digest('hex'),reviewDigest:'a'.repeat(64),result:[{recordId:id,revisionId:revision,sourceKey:'faq_import_'+'b'.repeat(64)}]};
 const rpc=transport({get_faq_import_receipt:()=>receipt,get_editor_record:()=>{throw Error('Must not reread');}});
 const response=await handleFaqImportUpload(upload(body,{'X-CMS-Action':'apply','Idempotency-Key':site,'X-CMS-Review':receipt.reviewDigest}),rpc);assert.equal(response.status,200);assert.equal((await response.json()).replayed,true);
 const conflict=await handleFaqImportUpload(upload(Buffer.from('changed'),{'X-CMS-Action':'apply','Idempotency-Key':site,'X-CMS-Review':receipt.reviewDigest}),rpc);assert.equal(conflict.status,409);
 const status=await(await handleFaqImportUpload(upload(undefined,{'X-CMS-Action':'status','Idempotency-Key':site}),rpc)).json();assert.equal(status.status,'complete');assert.deepEqual(status.result,receipt.result);
 const missing=await(await handleFaqImportUpload(upload(undefined,{'X-CMS-Action':'status','Idempotency-Key':site}),transport({get_faq_import_receipt:()=>null}))).json();assert.equal(missing.status,'unconfirmed');
 const mismatch=await handleFaqImportUpload(upload(undefined,{'X-CMS-Action':'status','Idempotency-Key':site}),transport({get_faq_import_receipt:()=>({...receipt,requestKey:id})}));assert.equal(mismatch.status,503);
});
test('faq cancellation requires bound digests and returns only verified cancellation or completed receipts',async()=>{
 const cancelled={status:'cancelled',requestKey:site,sourceDigest:'a'.repeat(64),reviewDigest:'b'.repeat(64)};
 const headers={'X-CMS-Action':'cancel','Idempotency-Key':site,'X-CMS-Source':cancelled.sourceDigest,'X-CMS-Review':cancelled.reviewDigest};
 assert.equal((await handleFaqImportUpload(upload(undefined,headers),transport({cancel_faq_import:()=>cancelled}))).status,200);
 assert.equal((await handleFaqImportUpload(upload(undefined,{...headers,'X-CMS-Source':''}),transport())).status,400);
 assert.equal((await handleFaqImportUpload(upload(undefined,headers),transport({cancel_faq_import:()=>({...cancelled,requestKey:id})}))).status,503);
 assert.equal((await handleFaqImportUpload(upload(undefined,headers),transport({cancel_faq_import:()=>({...cancelled,sourceDigest:'c'.repeat(64)})}))).status,503);
 const status=await(await handleFaqImportUpload(upload(undefined,{...headers,'X-CMS-Action':'status'}),transport({get_faq_import_receipt:()=>cancelled}))).json();assert.deepEqual(status,cancelled);
 assert.equal((await handleFaqImportUpload(upload(updateBytes(),{...headers,'X-CMS-Action':'apply'}),transport({get_faq_import_receipt:()=>cancelled}))).status,409);
 const {status:_,...receipt}=cancelled;const completed={...receipt,result:[{recordId:id,revisionId:revision,sourceKey:'faq_import_'+'a'.repeat(64)}]};
 const recovered=await(await handleFaqImportUpload(upload(undefined,headers),transport({cancel_faq_import:()=>completed}))).json();assert.equal(recovered.status,'complete');assert.deepEqual(recovered.result,completed.result);
});
