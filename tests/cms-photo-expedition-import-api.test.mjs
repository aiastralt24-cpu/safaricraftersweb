import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {handleExpeditionImportUpload} from '../lib/cms/photo-expedition-import-api.ts';
import {newPhotoExpedition} from '../lib/cms/photo-expeditions.ts';
import {zip} from './office-fixtures.mjs';
const site='11111111-1111-4111-8111-111111111111',id='22222222-2222-4222-8222-222222222222',revision='33333333-3333-4333-8333-333333333333';
const current={id,type:'photoExpedition',currentRevision:revision,path:'/photo-expeditions/forest',locale:'en',title:'Original',payload:{...newPhotoExpedition(),slug:'forest',title:'Original',description:'Preserved description'}};
const upload=(body,headers={})=>new Request('https://site.test/api/cms/import/expeditions',{method:'POST',headers:{Authorization:'Bearer a.b.c','X-CMS-Site':site,'X-CMS-Format':'docx','X-CMS-Action':'review',...headers},body});
const transport=(overrides={})=>async(token,procedure,args)=>{assert.equal(token,'a.b.c');if(overrides[procedure])return overrides[procedure](args);if(procedure==='list_editor_sites')return [{id:site}];if(procedure==='review_expedition_import_links')return {assets:args.p_assets.map(assetId=>({assetId,available:true})),references:args.p_references.map(item=>({...item,available:true,locale:'en'}))};if(procedure==='get_editor_record'){assert.equal(args.p_record,id);return current;}throw Error(`Unexpected RPC ${procedure}`);};
function updateBytes(){
 const row=(key,value)=>`<w:tr><w:tc><w:p><w:r><w:t>${key}</w:t></w:r></w:p></w:tc><w:tc><w:p><w:r><w:t>${value}</w:t></w:r></w:p></w:tc></w:tr>`;
 return zip({'[Content_Types].xml':'<Types/>','word/document.xml':`<w:document xmlns:w="urn:w"><w:body><w:tbl><w:tr>${['CMSExpedition','1.0','photoExpedition'].map(v=>`<w:tc><w:p><w:r><w:t>${v}</w:t></w:r></w:p></w:tc>`).join('')}</w:tr></w:tbl><w:tbl>${row('Pages','record')}${row('field','value')}${Object.entries({recordId:id,operation:'update',expectedRevision:revision,slug:'forest',title:'Updated',locale:'en'}).map(([k,v])=>row(k,v)).join('')}</w:tbl></w:body></w:document>`});
}
test('authenticated expedition Office review returns draft proposals with explicit draft apply available',async()=>{
 const bytes=updateBytes();
 const response=await handleExpeditionImportUpload(upload(bytes),transport());assert.equal(response.status,200);assert.match(response.headers.get('cache-control'),/no-store/);
 const result=await response.json();assert.equal(result.plan.valid,true);assert.equal(result.plan.changes.length,1);assert.equal(result.applyAvailable,true);assert.equal(result.verification.media,true);assert.equal(result.reviewDigest.length,64);
});
test('expedition review preserves server content and digest changes with the proposed snapshot',async()=>{
 const first=await(await handleExpeditionImportUpload(upload(updateBytes()),transport())).json();assert.equal(first.plan.changes[0].payload.description,'Preserved description');
 const second=await(await handleExpeditionImportUpload(upload(updateBytes()),transport({get_editor_record:()=>({...current,payload:{...current.payload,description:'Changed'}})}))).json();assert.notEqual(first.reviewDigest,second.reviewDigest);
 const stale=await(await handleExpeditionImportUpload(upload(updateBytes()),transport({get_editor_record:()=>({...current,currentRevision:site})}))).json();assert.equal(stale.plan.valid,false);assert.deepEqual(stale.plan.changes,[]);
});
test('expedition review rejects unexpected record identities, types and routes',async()=>{
 for(const patch of [{id:site},{type:'journey'},{path:'/photo-expeditions/other'}])assert.equal((await handleExpeditionImportUpload(upload(updateBytes()),transport({get_editor_record:()=>({...current,...patch})}))).status,422);
 const missing=await(await handleExpeditionImportUpload(upload(updateBytes()),transport({get_editor_record:()=>null}))).json();assert.equal(missing.plan.valid,false);
});
test('expedition review verifies preserved nested images and rejects incomplete evidence',async()=>{
 const stored={...current,payload:{...current.payload,gallery:[{id:'photo',image:{assetId:'forest-image',alt:'Forest',decorative:false}}]}};
 const read=async available=>(await(await handleExpeditionImportUpload(upload(updateBytes()),transport({get_editor_record:()=>stored,review_expedition_import_links:()=>({assets:[{assetId:'forest-image',available}],references:[]})}))).json());
 const good=await read(true),bad=await read(false);assert.equal(good.plan.valid,true);assert.equal(bad.plan.valid,false);assert.equal(bad.plan.issues[0].row,2);assert.notEqual(good.reviewDigest,bad.reviewDigest);
 assert.equal((await handleExpeditionImportUpload(upload(updateBytes()),transport({get_editor_record:()=>stored,review_expedition_import_links:()=>({assets:[],references:[]})}))).status,503);
});
test('expedition upload enforces authentication, membership, origin, file limits and explicit apply acceptance',async()=>{
 const body=updateBytes();
 for(const [headers,status]of [[{Authorization:''},401],[{Origin:'https://other.test'},403],[{'X-CMS-Action':'apply'},400]])assert.equal((await handleExpeditionImportUpload(upload(body,headers),transport())).status,status);
 assert.equal((await handleExpeditionImportUpload(upload(Buffer.from('invalid')),transport({list_editor_sites:()=>[]}))).status,403);
 assert.equal((await handleExpeditionImportUpload(upload(Buffer.alloc(5_000_001)),transport())).status,413);
 assert.equal((await handleExpeditionImportUpload(upload(Buffer.from('invalid')),transport())).status,422);
});

test('expedition Office review verifies preserved specialist/form references and blocks films even with available evidence',async()=>{
 const payload={...current.payload,specialists:[{recordId:revision,role:'mentor'},{recordId:revision,role:'guide'}],enquiry:{...current.payload.enquiry,form:{recordId:site}}};let checked;
 const good=await(await handleExpeditionImportUpload(upload(updateBytes()),transport({get_editor_record:()=>({...current,payload}),review_expedition_import_links:args=>{checked=args;return {assets:[],references:args.p_references.map(item=>({...item,available:true,locale:'en'}))};}}))).json();
 assert.equal(good.plan.valid,true);assert.equal(good.applyAvailable,true);assert.deepEqual(checked.p_records,[id]);assert.equal(checked.p_create,false);assert.deepEqual(checked.p_references,[{recordId:revision,type:'specialist'},{recordId:site,type:'form'}]);
 const bad=await(await handleExpeditionImportUpload(upload(updateBytes()),transport({get_editor_record:()=>({...current,payload}),review_expedition_import_links:args=>({assets:[],references:args.p_references.map(item=>({...item,available:true,locale:'fr'}))})}))).json();assert.equal(bad.plan.valid,false);assert.ok(bad.plan.issues.every(issue=>issue.row===2));assert.notEqual(good.reviewDigest,bad.reviewDigest);
 const film={assetId:'video',title:'Film',poster:{assetId:'poster',alt:'Poster',decorative:false},caption:'',transcript:'',captionsAssetId:'captions'};
 const blocked=await(await handleExpeditionImportUpload(upload(updateBytes()),transport({get_editor_record:()=>({...current,payload:{...current.payload,video:film}})}))).json();assert.equal(blocked.plan.valid,false);assert.ok(blocked.plan.issues.some(issue=>issue.code==='film_verification_pending'));assert.deepEqual(blocked.plan.changes[0].payload.video,film);
});
test('expedition review parses the actual downloadable Excel and Word fixtures without persistence calls',async()=>{
 const {readFile}=await import('node:fs/promises');
 for(const format of ['xlsx','docx']){const bytes=await readFile(new URL(`./fixtures/expedition-v1-filled.${format}`,import.meta.url));const response=await handleExpeditionImportUpload(upload(bytes,{'X-CMS-Format':format}),transport());assert.equal(response.status,200);const body=await response.json();assert.equal(body.plan.valid,true);assert.equal(body.applyAvailable,true);assert.equal(body.source.format,format);assert.equal(body.plan.changes[0].payload.departures[0].date,'2028-02-29');}
});

test('expedition apply binds review, saves server manifest and recovers without rereading changed records',async()=>{
 const bytes=updateBytes(),requestKey='44444444-4444-4444-8444-444444444444';let receipt=null,writes=0;
 const rpc=transport({get_expedition_import_receipt:()=>receipt,apply_expedition_import:args=>{writes++;assert.equal(args.p_items[0].expectedRevision,revision);assert.equal(args.p_items[0].payload.description,'Preserved description');const result=[{recordId:id,revisionId:site,sourceKey:args.p_items[0].sourceKey}];receipt={requestKey,sourceDigest:args.p_source,reviewDigest:args.p_review,result};return result;}});
 const review=await(await handleExpeditionImportUpload(upload(bytes),rpc)).json();
 const headers={'X-CMS-Action':'apply','Idempotency-Key':requestKey,'X-CMS-Review':review.reviewDigest};
 assert.equal((await handleExpeditionImportUpload(upload(bytes,{...headers,'X-CMS-Review':'f'.repeat(64)}),rpc)).status,409);assert.equal(writes,0);
 const applied=await(await handleExpeditionImportUpload(upload(bytes,headers),rpc)).json();assert.equal(applied.applied,true);assert.equal(applied.replayed,false);assert.equal(writes,1);
 const recovery=transport({get_expedition_import_receipt:()=>receipt,get_editor_record:()=>{throw Error('Must not reread after completed receipt');}});
 const replay=await(await handleExpeditionImportUpload(upload(bytes,headers),recovery)).json();assert.equal(replay.replayed,true);assert.deepEqual(replay.result,applied.result);
 const status=await(await handleExpeditionImportUpload(upload(null,{'X-CMS-Action':'status','Idempotency-Key':requestKey}),recovery)).json();assert.equal(status.status,'complete');assert.deepEqual(status.result,applied.result);
 assert.equal((await handleExpeditionImportUpload(upload(Buffer.from('changed'),headers),recovery)).status,409);
});
test('expedition apply rejects changed evidence and unverifiable persistence receipts',async()=>{
 const bytes=updateBytes(),requestKey='44444444-4444-4444-8444-444444444444';const review=await(await handleExpeditionImportUpload(upload(bytes),transport())).json();
 const headers={'X-CMS-Action':'apply','Idempotency-Key':requestKey,'X-CMS-Review':review.reviewDigest};
 const changed=transport({get_expedition_import_receipt:()=>null,get_editor_record:()=>({...current,currentRevision:site})});assert.equal((await handleExpeditionImportUpload(upload(bytes,headers),changed)).status,409);
 const malformed=transport({get_expedition_import_receipt:()=>null,apply_expedition_import:()=>[]});assert.equal((await handleExpeditionImportUpload(upload(bytes,headers),malformed)).status,503);
 assert.equal((await handleExpeditionImportUpload(upload(bytes,headers),transport({get_expedition_import_receipt:()=>({requestKey})}))).status,503);
 const unknown=await(await handleExpeditionImportUpload(upload(null,{'X-CMS-Action':'status','Idempotency-Key':requestKey}),transport({get_expedition_import_receipt:()=>null}))).json();assert.equal(unknown.status,'unconfirmed');
});
