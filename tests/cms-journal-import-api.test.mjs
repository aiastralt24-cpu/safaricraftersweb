import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {handleJournalImportUpload} from '../lib/cms/journal-import-api.ts';
import {newJournalArticle} from '../lib/cms/journal.ts';
import {zip} from './office-fixtures.mjs';
const site='11111111-1111-4111-8111-111111111111',id='22222222-2222-4222-8222-222222222222',revision='33333333-3333-4333-8333-333333333333';
const current={id,type:'journalArticle',currentRevision:revision,path:'/journal/forest',locale:'en',payload:{...newJournalArticle(),slug:'forest',title:'Original',description:'Preserved descriptionduction'}};
const upload=(body,headers={})=>new Request('https://site.test/api/cms/import/journals',{method:'POST',headers:{Authorization:'Bearer a.b.c','X-CMS-Site':site,'X-CMS-Format':'docx','X-CMS-Action':'review',...headers},body});
const transport=(overrides={})=>async(token,procedure,args)=>{assert.equal(token,'a.b.c');if(overrides[procedure])return overrides[procedure](args);if(procedure==='list_editor_sites')return [{id:site}];if(procedure==='review_journal_import_links')return args.p_assets.map(assetId=>({assetId,available:true}));if(procedure==='get_editor_record'){assert.equal(args.p_record,id);return current;}throw Error(`Unexpected RPC ${procedure}`);};
function updateBytes(){
 const row=(key,value)=>`<w:tr><w:tc><w:p><w:r><w:t>${key}</w:t></w:r></w:p></w:tc><w:tc><w:p><w:r><w:t>${value}</w:t></w:r></w:p></w:tc></w:tr>`;
 return zip({'[Content_Types].xml':'<Types/>','word/document.xml':`<w:document xmlns:w="urn:w"><w:body><w:tbl><w:tr>${['CMSJournal','1.0','journalArticle'].map(v=>`<w:tc><w:p><w:r><w:t>${v}</w:t></w:r></w:p></w:tc>`).join('')}</w:tr></w:tbl><w:tbl>${row('Pages','record')}${row('field','value')}${Object.entries({recordId:id,operation:'update',expectedRevision:revision,slug:'forest',title:'Updated',locale:'en'}).map(([k,v])=>row(k,v)).join('')}</w:tbl></w:body></w:document>`});
}
test('authenticated journal Office review returns draft proposals and permits valid reviewed drafts',async()=>{
 const bytes=updateBytes();
 const response=await handleJournalImportUpload(upload(bytes),transport());assert.equal(response.status,200);assert.match(response.headers.get('cache-control'),/no-store/);
 const result=await response.json();assert.equal(result.plan.valid,true);assert.equal(result.plan.changes.length,1);assert.equal(result.applyAvailable,true);assert.equal(result.verification.media,true);assert.equal(result.reviewDigest.length,64);
});
test('journal review preserves server content and digest changes with the proposed snapshot',async()=>{
 const first=await(await handleJournalImportUpload(upload(updateBytes()),transport())).json();assert.equal(first.plan.changes[0].payload.description,'Preserved descriptionduction');
 const second=await(await handleJournalImportUpload(upload(updateBytes()),transport({get_editor_record:()=>({...current,payload:{...current.payload,description:'Changed'}})}))).json();assert.notEqual(first.reviewDigest,second.reviewDigest);
 const stale=await(await handleJournalImportUpload(upload(updateBytes()),transport({get_editor_record:()=>({...current,currentRevision:site})}))).json();assert.equal(stale.plan.valid,false);assert.deepEqual(stale.plan.changes,[]);
});
test('journal review rejects unexpected record identities, types and routes',async()=>{
 for(const patch of [{id:site},{type:'journey'},{path:'/journal/other'}])assert.equal((await handleJournalImportUpload(upload(updateBytes()),transport({get_editor_record:()=>({...current,...patch})}))).status,422);
 const missing=await(await handleJournalImportUpload(upload(updateBytes()),transport({get_editor_record:()=>null}))).json();assert.equal(missing.plan.valid,false);
});
test('journal review verifies preserved nested images and rejects incomplete evidence',async()=>{
 const stored={...current,payload:{...current.payload,body:[{id:'photo',kind:'image',image:{assetId:'forest-image',alt:'Forest',decorative:false}}]}};
 const read=async available=>(await(await handleJournalImportUpload(upload(updateBytes()),transport({get_editor_record:()=>stored,review_journal_import_links:()=>[{assetId:'forest-image',available}]}))).json());
 const good=await read(true),bad=await read(false);assert.equal(good.plan.valid,true);assert.equal(bad.plan.valid,false);assert.equal(bad.plan.issues[0].row,2);assert.notEqual(good.reviewDigest,bad.reviewDigest);
 assert.equal((await handleJournalImportUpload(upload(updateBytes()),transport({get_editor_record:()=>stored,review_journal_import_links:()=>[]}))).status,503);
});
test('journal upload enforces authentication, membership, origin, file limits and explicit apply acceptance',async()=>{
 const body=updateBytes();
 for(const [headers,status]of [[{Authorization:''},401],[{Origin:'https://other.test'},403],[{'X-CMS-Action':'apply'},400]])assert.equal((await handleJournalImportUpload(upload(body,headers),transport())).status,status);
 assert.equal((await handleJournalImportUpload(upload(Buffer.from('invalid')),transport({list_editor_sites:()=>[]}))).status,403);
 assert.equal((await handleJournalImportUpload(upload(Buffer.alloc(5_000_001)),transport())).status,413);
 assert.equal((await handleJournalImportUpload(upload(Buffer.from('invalid')),transport())).status,422);
});
test('journal apply rebuilds the reviewed payload and validates its save receipt',async()=>{
 const body=updateBytes(),review=await(await handleJournalImportUpload(upload(body),transport())).json();let saved;
 const headers={'X-CMS-Action':'apply','Idempotency-Key':site,'X-CMS-Review':review.reviewDigest};
 const rpc=transport({get_journal_import_receipt:()=>null,apply_journal_import:args=>{saved=args;return args.p_items.map(i=>({sourceKey:i.sourceKey,recordId:i.recordId,revisionId:site}));}});
 const response=await handleJournalImportUpload(upload(body,headers),rpc);assert.equal(response.status,200);assert.equal((await response.json()).replayed,false);assert.equal(saved.p_items[0].payload.description,'Preserved descriptionduction');assert.equal(saved.p_items[0].expectedRevision,revision);
 const changed=await handleJournalImportUpload(upload(body,headers),transport({get_journal_import_receipt:()=>null,get_editor_record:()=>({...current,payload:{...current.payload,description:'Changed'}})}));assert.equal(changed.status,409);
 const bad=await handleJournalImportUpload(upload(body,headers),transport({get_journal_import_receipt:()=>null,apply_journal_import:()=>[]}));assert.equal(bad.status,503);
});
test('journal retry and recovery return completed receipts without rereading changed records',async()=>{
 const body=updateBytes(),receipt={requestKey:site,sourceDigest:createHash('sha256').update(body).digest('hex'),reviewDigest:'a'.repeat(64),result:[{recordId:id,revisionId:revision,sourceKey:'journal_import_'+'b'.repeat(64)}]};
 const rpc=transport({get_journal_import_receipt:()=>receipt,get_editor_record:()=>{throw Error('Must not reread');}});
 const response=await handleJournalImportUpload(upload(body,{'X-CMS-Action':'apply','Idempotency-Key':site,'X-CMS-Review':receipt.reviewDigest}),rpc);assert.equal(response.status,200);assert.equal((await response.json()).replayed,true);
 const conflict=await handleJournalImportUpload(upload(Buffer.from('changed'),{'X-CMS-Action':'apply','Idempotency-Key':site,'X-CMS-Review':receipt.reviewDigest}),rpc);assert.equal(conflict.status,409);
 const status=await(await handleJournalImportUpload(upload(undefined,{'X-CMS-Action':'status','Idempotency-Key':site}),rpc)).json();assert.equal(status.status,'complete');assert.deepEqual(status.result,receipt.result);
 const missing=await(await handleJournalImportUpload(upload(undefined,{'X-CMS-Action':'status','Idempotency-Key':site}),transport({get_journal_import_receipt:()=>null}))).json();assert.equal(missing.status,'unconfirmed');
 const mismatch=await handleJournalImportUpload(upload(undefined,{'X-CMS-Action':'status','Idempotency-Key':site}),transport({get_journal_import_receipt:()=>({...receipt,requestKey:id})}));assert.equal(mismatch.status,503);
});
