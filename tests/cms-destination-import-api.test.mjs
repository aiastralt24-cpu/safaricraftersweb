import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {handleDestinationImportUpload} from '../lib/cms/destination-import-api.ts';
import {newDestination} from '../lib/cms/destinations.ts';
import {zip} from './office-fixtures.mjs';
const site='11111111-1111-4111-8111-111111111111',id='22222222-2222-4222-8222-222222222222',revision='33333333-3333-4333-8333-333333333333';
const current={id,type:'destination',currentRevision:revision,path:'/destinations/forest',locale:'en',payload:{...newDestination(),slug:'forest',title:'Original',intro:'Preserved introduction'}};
const upload=(body,headers={})=>new Request('https://site.test/api/cms/import/destinations',{method:'POST',headers:{Authorization:'Bearer a.b.c','X-CMS-Site':site,'X-CMS-Format':'docx','X-CMS-Action':'review',...headers},body});
const transport=(overrides={})=>async(token,procedure,args)=>{assert.equal(token,'a.b.c');if(overrides[procedure])return overrides[procedure](args);if(procedure==='list_editor_sites')return [{id:site}];if(procedure==='review_destination_import_links')return {assets:args.p_assets.map(assetId=>({assetId,available:true})),references:args.p_references.map(r=>({...r,available:true,locale:'en'}))};if(procedure==='get_editor_record'){assert.equal(args.p_record,id);return current;}throw Error(`Unexpected RPC ${procedure}`);};
function updateBytes(){
 const row=(key,value)=>`<w:tr><w:tc><w:p><w:r><w:t>${key}</w:t></w:r></w:p></w:tc><w:tc><w:p><w:r><w:t>${value}</w:t></w:r></w:p></w:tc></w:tr>`;
 return zip({'[Content_Types].xml':'<Types/>','word/document.xml':`<w:document xmlns:w="urn:w"><w:body><w:tbl><w:tr>${['CMSDestination','1.0','destination'].map(v=>`<w:tc><w:p><w:r><w:t>${v}</w:t></w:r></w:p></w:tc>`).join('')}</w:tr></w:tbl><w:tbl>${row('Pages','record')}${row('field','value')}${Object.entries({recordId:id,operation:'update',expectedRevision:revision,slug:'forest',title:'Updated',locale:'en'}).map(([k,v])=>row(k,v)).join('')}</w:tbl></w:body></w:document>`});
}
test('authenticated destination Office review returns draft proposals and permits valid reviewed drafts',async()=>{
 const bytes=await readFile(new URL('./fixtures/destination-v1-filled.docx',import.meta.url));
 const response=await handleDestinationImportUpload(upload(bytes),transport());assert.equal(response.status,200);assert.match(response.headers.get('cache-control'),/no-store/);
 const result=await response.json();assert.equal(result.plan.valid,true);assert.equal(result.plan.changes.length,1);assert.equal(result.applyAvailable,true);assert.equal(result.verification.mediaAndReferences,true);assert.equal(result.reviewDigest.length,64);
});
test('destination review preserves server content and digest changes with the proposed snapshot',async()=>{
 const first=await(await handleDestinationImportUpload(upload(updateBytes()),transport())).json();assert.equal(first.plan.changes[0].payload.intro,'Preserved introduction');
 const second=await(await handleDestinationImportUpload(upload(updateBytes()),transport({get_editor_record:()=>({...current,payload:{...current.payload,intro:'Changed'}})}))).json();assert.notEqual(first.reviewDigest,second.reviewDigest);
 const stale=await(await handleDestinationImportUpload(upload(updateBytes()),transport({get_editor_record:()=>({...current,currentRevision:site})}))).json();assert.equal(stale.plan.valid,false);assert.deepEqual(stale.plan.changes,[]);
});
test('destination review rejects unexpected record identities, types and routes',async()=>{
 for(const patch of [{id:site},{type:'journey'},{path:'/destinations/other'}])assert.equal((await handleDestinationImportUpload(upload(updateBytes()),transport({get_editor_record:()=>({...current,...patch})}))).status,422);
 const missing=await(await handleDestinationImportUpload(upload(updateBytes()),transport({get_editor_record:()=>null}))).json();assert.equal(missing.plan.valid,false);
});
test('destination review binds current media evidence and rejects mismatched evidence',async()=>{
 const stored={...current,payload:{...current.payload,image:{assetId:'forest-image',alt:'Forest',decorative:false},pairings:[{recordId:site,title:'Pairing',reason:'Extend'}]}};
 const check=async available=>(await(await handleDestinationImportUpload(upload(updateBytes()),transport({get_editor_record:()=>stored,review_destination_import_links:args=>({assets:[{assetId:'forest-image',available}],references:args.p_references.map(r=>({...r,available:true,locale:'en'}))})}))).json());
 const ready=await check(true),missing=await check(false);assert.equal(ready.plan.valid,true);assert.equal(missing.plan.valid,false);assert.equal(missing.plan.issues.find(i=>i.code==='asset_unavailable').row,2);assert.notEqual(ready.reviewDigest,missing.reviewDigest);
 assert.equal((await handleDestinationImportUpload(upload(updateBytes()),transport({get_editor_record:()=>stored,review_destination_import_links:()=>({assets:[],references:[]})}))).status,503);
});
test('destination review reports unavailable, wrong-language and self references',async()=>{
 for(const scenario of [{target:site,available:false,locale:'en',code:'reference_unavailable'},{target:site,available:true,locale:'fr',code:'reference_unavailable'},{target:id,available:true,locale:'en',code:'self_reference'}]){
  const stored={...current,payload:{...current.payload,pairings:[{recordId:scenario.target,title:'Pair',reason:'Reason'}]}};
  const result=await(await handleDestinationImportUpload(upload(updateBytes()),transport({get_editor_record:()=>stored,review_destination_import_links:args=>({assets:[],references:args.p_references.map(r=>({...r,available:scenario.available,locale:scenario.locale}))})}))).json();
  assert.equal(result.plan.valid,false);assert.ok(result.plan.issues.some(i=>i.code===scenario.code&&i.row===2));
 }
});
test('destination upload enforces authentication, membership, origin, file limits and explicit apply acceptance',async()=>{
 const body=updateBytes();
 for(const [headers,status]of [[{Authorization:''},401],[{Origin:'https://other.test'},403],[{'X-CMS-Action':'apply'},400]])assert.equal((await handleDestinationImportUpload(upload(body,headers),transport())).status,status);
 assert.equal((await handleDestinationImportUpload(upload(Buffer.from('invalid')),transport({list_editor_sites:()=>[]}))).status,403);
 assert.equal((await handleDestinationImportUpload(upload(Buffer.alloc(5_000_001)),transport())).status,413);
 assert.equal((await handleDestinationImportUpload(upload(Buffer.from('invalid')),transport())).status,422);
});
test('destination apply rebuilds the reviewed payload and validates its save receipt',async()=>{
 const body=updateBytes(),review=await(await handleDestinationImportUpload(upload(body),transport())).json();let saved;
 const headers={'X-CMS-Action':'apply','Idempotency-Key':site,'X-CMS-Review':review.reviewDigest};
 const rpc=transport({get_destination_import_receipt:()=>null,apply_destination_import:args=>{saved=args;return args.p_items.map(i=>({sourceKey:i.sourceKey,recordId:i.recordId,revisionId:site}));}});
 const response=await handleDestinationImportUpload(upload(body,headers),rpc);assert.equal(response.status,200);assert.equal((await response.json()).replayed,false);assert.equal(saved.p_items[0].payload.intro,'Preserved introduction');assert.equal(saved.p_items[0].expectedRevision,revision);
 const changed=await handleDestinationImportUpload(upload(body,headers),transport({get_destination_import_receipt:()=>null,get_editor_record:()=>({...current,payload:{...current.payload,intro:'Changed'}})}));assert.equal(changed.status,409);
 const bad=await handleDestinationImportUpload(upload(body,headers),transport({get_destination_import_receipt:()=>null,apply_destination_import:()=>[]}));assert.equal(bad.status,503);
});
test('destination retry and recovery return completed receipts without rereading changed records',async()=>{
 const body=updateBytes(),receipt={requestKey:site,sourceDigest:createHash('sha256').update(body).digest('hex'),reviewDigest:'a'.repeat(64),result:[{recordId:id,revisionId:revision,sourceKey:'destination_import_'+'b'.repeat(64)}]};
 const rpc=transport({get_destination_import_receipt:()=>receipt,get_editor_record:()=>{throw Error('Must not reread');}});
 const response=await handleDestinationImportUpload(upload(body,{'X-CMS-Action':'apply','Idempotency-Key':site,'X-CMS-Review':receipt.reviewDigest}),rpc);assert.equal(response.status,200);assert.equal((await response.json()).replayed,true);
 const conflict=await handleDestinationImportUpload(upload(Buffer.from('changed'),{'X-CMS-Action':'apply','Idempotency-Key':site,'X-CMS-Review':receipt.reviewDigest}),rpc);assert.equal(conflict.status,409);
 const status=await(await handleDestinationImportUpload(upload(undefined,{'X-CMS-Action':'status','Idempotency-Key':site}),rpc)).json();assert.equal(status.status,'complete');assert.deepEqual(status.result,receipt.result);
 const missing=await(await handleDestinationImportUpload(upload(undefined,{'X-CMS-Action':'status','Idempotency-Key':site}),transport({get_destination_import_receipt:()=>null}))).json();assert.equal(missing.status,'unconfirmed');
 const mismatch=await handleDestinationImportUpload(upload(undefined,{'X-CMS-Action':'status','Idempotency-Key':site}),transport({get_destination_import_receipt:()=>({...receipt,requestKey:id})}));assert.equal(mismatch.status,503);
});
