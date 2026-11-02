import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {handleApplicationImportUpload} from '../lib/cms/application-import-api.ts';
import {newApplication} from '../lib/cms/applications.ts';
import {zip} from './office-fixtures.mjs';
import {readFile} from 'node:fs/promises';
const site='11111111-1111-4111-8111-111111111111',id='22222222-2222-4222-8222-222222222222',revision='33333333-3333-4333-8333-333333333333';
const current={id,type:'application',currentRevision:revision,path:'/applications/forest',locale:'en',payload:{...newApplication(),slug:'forest',title:'Original',summary:'Preserved summary'}};
const upload=(body,headers={})=>new Request('https://site.test/api/cms/import/application',{method:'POST',headers:{Authorization:'Bearer a.b.c','X-CMS-Site':site,'X-CMS-Format':'docx','X-CMS-Action':'review',...headers},body});
const transport=(overrides={})=>async(token,procedure,args)=>{assert.equal(token,'a.b.c');if(overrides[procedure])return overrides[procedure](args);if(procedure==='list_editor_sites')return [{id:site}];if(procedure==='review_application_import_links')return {assets:args.p_assets.map(assetId=>({assetId,available:true})),references:args.p_references.map(ref=>({...ref,available:true,revision}))};if(procedure==='get_editor_record'){assert.equal(args.p_record,id);return current;}throw Error(`Unexpected RPC ${procedure}`);};
function updateBytes(){
 const row=(key,value)=>`<w:tr><w:tc><w:p><w:r><w:t>${key}</w:t></w:r></w:p></w:tc><w:tc><w:p><w:r><w:t>${value}</w:t></w:r></w:p></w:tc></w:tr>`;
 return zip({'[Content_Types].xml':'<Types/>','word/document.xml':`<w:document xmlns:w="urn:w"><w:body><w:tbl><w:tr>${['CMSApplication','1.0','application'].map(v=>`<w:tc><w:p><w:r><w:t>${v}</w:t></w:r></w:p></w:tc>`).join('')}</w:tr></w:tbl><w:tbl>${row('Pages','record')}${row('field','value')}${Object.entries({recordId:id,kind:'application',operation:'update',expectedRevision:revision,slug:'forest',title:'Updated',locale:'en'}).map(([k,v])=>row(k,v)).join('')}</w:tbl></w:body></w:document>`});
}
test('authenticated application Office review returns draft proposals with explicit save eligibility',async()=>{
 const bytes=updateBytes();
 const response=await handleApplicationImportUpload(upload(bytes),transport());assert.equal(response.status,200);assert.match(response.headers.get('cache-control'),/no-store/);
 const result=await response.json();assert.equal(result.plan.valid,true);assert.equal(result.plan.changes.length,1);assert.equal(result.applyAvailable,true);assert.equal(result.verification.media,true);assert.equal(result.reviewDigest.length,64);
});
test('application review preserves server content and digest changes with the proposed snapshot',async()=>{
 const first=await(await handleApplicationImportUpload(upload(updateBytes()),transport())).json();assert.equal(first.plan.changes[0].payload.summary,'Preserved summary');assert.equal(first.comparisons[0].before.title,'Original');assert.equal(first.comparisons[0].revision,revision);
 const second=await(await handleApplicationImportUpload(upload(updateBytes()),transport({get_editor_record:()=>({...current,payload:{...current.payload,summary:'Changed'}})}))).json();assert.notEqual(first.reviewDigest,second.reviewDigest);
 const stale=await(await handleApplicationImportUpload(upload(updateBytes()),transport({get_editor_record:()=>({...current,currentRevision:site})}))).json();assert.equal(stale.plan.valid,false);assert.deepEqual(stale.plan.changes,[]);
});
test('application review rejects unexpected record identities, types and routes',async()=>{
 for(const patch of [{id:site},{type:'journey'},{path:'/application/other'}])assert.equal((await handleApplicationImportUpload(upload(updateBytes()),transport({get_editor_record:()=>({...current,...patch})}))).status,422);
 const missing=await(await handleApplicationImportUpload(upload(updateBytes()),transport({get_editor_record:()=>null}))).json();assert.equal(missing.plan.valid,false);
});
test('application review verifies preserved nested images and rejects incomplete evidence',async()=>{
 const stored={...current,payload:{...current.payload,image:{assetId:'forest-image',alt:'Forest',decorative:false}}};
 const read=async available=>(await(await handleApplicationImportUpload(upload(updateBytes()),transport({get_editor_record:()=>stored,review_application_import_links:()=>({assets:[{assetId:'forest-image',available}],references:[]})}))).json());
 const good=await read(true),bad=await read(false);assert.equal(good.plan.valid,true);assert.equal(bad.plan.valid,false);assert.equal(bad.plan.issues[0].row,2);assert.notEqual(good.reviewDigest,bad.reviewDigest);
 assert.equal((await handleApplicationImportUpload(upload(updateBytes()),transport({get_editor_record:()=>stored,review_application_import_links:()=>[]}))).status,503);
});
test('application upload enforces authentication, membership, origin, file limits and explicit apply acceptance',async()=>{
 const body=updateBytes();
 for(const [headers,status]of [[{Authorization:''},401],[{Origin:'https://other.test'},403],[{'X-CMS-Action':'apply'},400]])assert.equal((await handleApplicationImportUpload(upload(body,headers),transport())).status,status);
 assert.equal((await handleApplicationImportUpload(upload(Buffer.from('invalid')),transport({list_editor_sites:()=>[]}))).status,403);
 assert.equal((await handleApplicationImportUpload(upload(Buffer.alloc(5_000_001)),transport())).status,413);
 assert.equal((await handleApplicationImportUpload(upload(Buffer.from('invalid')),transport())).status,422);
});
test('application apply rebuilds the reviewed payload and validates its save receipt',async()=>{
 const body=updateBytes(),review=await(await handleApplicationImportUpload(upload(body),transport())).json();let saved;
 const headers={'X-CMS-Action':'apply','Idempotency-Key':site,'X-CMS-Review':review.reviewDigest};
 const rpc=transport({get_application_import_receipt:()=>null,apply_application_import:args=>{saved=args;return args.p_items.map(i=>({sourceKey:i.sourceKey,recordId:i.recordId,revisionId:site}));}});
 const response=await handleApplicationImportUpload(upload(body,headers),rpc);assert.equal(response.status,200);assert.equal((await response.json()).replayed,false);assert.equal(saved.p_items[0].payload.summary,'Preserved summary');assert.equal(saved.p_items[0].expectedRevision,revision);
 const changed=await handleApplicationImportUpload(upload(body,headers),transport({get_application_import_receipt:()=>null,get_editor_record:()=>({...current,payload:{...current.payload,summary:'Changed'}})}));assert.equal(changed.status,409);
 const bad=await handleApplicationImportUpload(upload(body,headers),transport({get_application_import_receipt:()=>null,apply_application_import:()=>[]}));assert.equal(bad.status,503);
});
test('application retry and recovery return completed receipts without rereading changed records',async()=>{
 const body=updateBytes(),receipt={requestKey:site,sourceDigest:createHash('sha256').update(body).digest('hex'),reviewDigest:'a'.repeat(64),result:[{recordId:id,revisionId:revision,sourceKey:'application_import_'+'b'.repeat(64)}]};
 const rpc=transport({get_application_import_receipt:()=>receipt,get_editor_record:()=>{throw Error('Must not reread');}});
 const response=await handleApplicationImportUpload(upload(body,{'X-CMS-Action':'apply','Idempotency-Key':site,'X-CMS-Review':receipt.reviewDigest}),rpc);assert.equal(response.status,200);assert.equal((await response.json()).replayed,true);
 const conflict=await handleApplicationImportUpload(upload(Buffer.from('changed'),{'X-CMS-Action':'apply','Idempotency-Key':site,'X-CMS-Review':receipt.reviewDigest}),rpc);assert.equal(conflict.status,409);
 const status=await(await handleApplicationImportUpload(upload(undefined,{'X-CMS-Action':'status','Idempotency-Key':site}),rpc)).json();assert.equal(status.status,'complete');assert.deepEqual(status.result,receipt.result);
 const missing=await(await handleApplicationImportUpload(upload(undefined,{'X-CMS-Action':'status','Idempotency-Key':site}),transport({get_application_import_receipt:()=>null}))).json();assert.equal(missing.status,'unconfirmed');
 const mismatch=await handleApplicationImportUpload(upload(undefined,{'X-CMS-Action':'status','Idempotency-Key':site}),transport({get_application_import_receipt:()=>({...receipt,requestKey:id})}));assert.equal(mismatch.status,503);
});
test('application cancellation requires bound digests and returns only verified cancellation or completed receipts',async()=>{
 const cancelled={status:'cancelled',requestKey:site,sourceDigest:'a'.repeat(64),reviewDigest:'b'.repeat(64)};
 const headers={'X-CMS-Action':'cancel','Idempotency-Key':site,'X-CMS-Source':cancelled.sourceDigest,'X-CMS-Review':cancelled.reviewDigest};
 assert.equal((await handleApplicationImportUpload(upload(undefined,headers),transport({cancel_application_import:()=>cancelled}))).status,200);
 assert.equal((await handleApplicationImportUpload(upload(undefined,{...headers,'X-CMS-Source':''}),transport())).status,400);
 assert.equal((await handleApplicationImportUpload(upload(undefined,headers),transport({cancel_application_import:()=>({...cancelled,requestKey:id})}))).status,503);
 assert.equal((await handleApplicationImportUpload(upload(undefined,headers),transport({cancel_application_import:()=>({...cancelled,sourceDigest:'c'.repeat(64)})}))).status,503);
 const status=await(await handleApplicationImportUpload(upload(undefined,{...headers,'X-CMS-Action':'status'}),transport({get_application_import_receipt:()=>cancelled}))).json();assert.deepEqual(status,cancelled);
 assert.equal((await handleApplicationImportUpload(upload(updateBytes(),{...headers,'X-CMS-Action':'apply'}),transport({get_application_import_receipt:()=>cancelled}))).status,409);
 const {status:_,...receipt}=cancelled;const completed={...receipt,result:[{recordId:id,revisionId:revision,sourceKey:'application_import_'+'a'.repeat(64)}]};
 const recovered=await(await handleApplicationImportUpload(upload(undefined,headers),transport({cancel_application_import:()=>completed}))).json();assert.equal(recovered.status,'complete');assert.deepEqual(recovered.result,completed.result);
});
