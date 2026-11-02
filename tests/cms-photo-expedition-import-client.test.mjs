import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {handleExpeditionImportUpload} from '../lib/cms/photo-expedition-import-api.ts';
import {sourceDigest} from '../lib/cms/testimonial-migration.ts';
import {importSha256,verifyExpeditionImportReview,prepareExpeditionImportRecovery,readPendingExpeditionImport,verifyExpeditionImportReceipt} from '../lib/cms/photo-expedition-import-client.ts';
const site=randomUUID(),actor=randomUUID(),requestKey=randomUUID();
async function fixture(){
 const bytes=await readFile(new URL('./fixtures/expedition-v1-filled.docx',import.meta.url));
 const response=await handleExpeditionImportUpload(new Request('https://site.test/api/cms/import/expeditions',{method:'POST',headers:{Authorization:'Bearer a.b.c','X-CMS-Site':site,'X-CMS-Format':'docx','X-CMS-Action':'review'},body:bytes}),async(_token,name,args)=>{if(name==='list_editor_sites')return [{id:site}];assert.equal(name,'review_expedition_import_links');return {assets:args.p_assets.map(assetId=>({assetId,available:true})),references:args.p_references.map(ref=>({...ref,available:true,locale:'en'}))};});
 assert.equal(response.status,200);return {review:await response.json(),source:{hash:await importSha256(bytes),size:bytes.length,format:'docx'}};
}
test('expedition browser review binds real Office bytes and recovery targets match server hashing',async()=>{
 const {review,source}=await fixture(),checked=verifyExpeditionImportReview(review,source);assert.equal(checked.applyAvailable,true);
 const pending=await prepareExpeditionImportRecovery(checked,site,actor,requestKey);assert.equal(pending.targets[0].sourceKey,`expedition_import_${sourceDigest(checked.plan.changes[0].importId)}`);
 assert.deepEqual(readPendingExpeditionImport(JSON.stringify(pending),site,actor),pending);assert.equal(readPendingExpeditionImport(null,site,actor),null);assert.equal('payload' in pending,false);
 for(const patch of [{hash:'f'.repeat(64)},{size:source.size+1},{format:'xlsx'}])assert.throws(()=>verifyExpeditionImportReview(review,{...source,...patch}),/selected file/);
});
test('expedition browser rejects inconsistent readiness, duplicate routes and update identities',async()=>{
 const {review,source}=await fixture();
 for(const mutate of [r=>{r.plan.valid=false;},r=>{r.verification.references=false;},r=>{r.verification.media=false;},r=>{r.plan.changes=[];},r=>{r.plan.issues.push({sheet:'Pages',row:2,field:'title',code:'bad',severity:'error',message:'Fix'});},r=>{r.plan.changes[0].path='/other';},r=>{r.plan.changes[0].locale='fr';},r=>{r.plan.changes[0].operation='update';},r=>{r.plan.changes.push({...r.plan.changes[0],importId:'other'});}]){
  const changed=structuredClone(review);mutate(changed);assert.throws(()=>verifyExpeditionImportReview(changed,source));
 }
 const blocked={...review,applyAvailable:false};assert.equal(verifyExpeditionImportReview(blocked,source).applyAvailable,false);await assert.rejects(prepareExpeditionImportRecovery(blocked,site,actor,requestKey),/Resolve review/);
});
test('expedition recovery rejects other accounts, corrupt storage and duplicate update targets',async()=>{
 const {review}=await fixture(),pending=await prepareExpeditionImportRecovery(review,site,actor,requestKey);
 assert.throws(()=>readPendingExpeditionImport(JSON.stringify(pending),site,randomUUID()));assert.throws(()=>readPendingExpeditionImport(JSON.stringify(pending),randomUUID(),actor));
 for(const text of ['broken','x'.repeat(20001),JSON.stringify({...pending,payload:{secret:'not stored'}}),JSON.stringify({...pending,targets:[pending.targets[0],pending.targets[0]]})])assert.throws(()=>readPendingExpeditionImport(text,site,actor));
 const recordId=randomUUID();assert.throws(()=>readPendingExpeditionImport(JSON.stringify({...pending,targets:[{...pending.targets[0],recordId},{sourceKey:'expedition_import_'+'f'.repeat(64),recordId}]}),site,actor));
});
test('expedition recovery accepts only complete matching receipts with unique revisions and exact update IDs',async()=>{
 const {review}=await fixture(),pending=await prepareExpeditionImportRecovery(review,site,actor,requestKey);
 const receipt={requestKey,sourceDigest:pending.sourceDigest,reviewDigest:pending.reviewDigest,result:[{sourceKey:pending.targets[0].sourceKey,recordId:randomUUID(),revisionId:randomUUID()}]};assert.deepEqual(verifyExpeditionImportReceipt(receipt,pending),receipt.result);
 for(const patch of [{requestKey:randomUUID()},{sourceDigest:'f'.repeat(64)},{reviewDigest:'f'.repeat(64)},{result:[]},{result:[{...receipt.result[0],sourceKey:'unknown'}]}])assert.throws(()=>verifyExpeditionImportReceipt({...receipt,...patch},pending));
 assert.throws(()=>verifyExpeditionImportReceipt(receipt,{...pending,targets:[{...pending.targets[0],recordId:randomUUID()}]}));
 const secondKey='expedition_import_'+'e'.repeat(64),two={...pending,targets:[...pending.targets,{sourceKey:secondKey,recordId:null}]};
 assert.throws(()=>verifyExpeditionImportReceipt({...receipt,result:[...receipt.result,{...receipt.result[0],sourceKey:secondKey,recordId:randomUUID()}]},two));
});
