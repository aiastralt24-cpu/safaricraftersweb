import test from 'node:test';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
import {parseRedirectImport} from '../lib/cms/redirect-import.ts';
import {parseSavedRedirectImport,verifiedRedirectImportReceipt,redirectImportStorageKey} from '../lib/cms/redirect-import-proposal.ts';
import {handleRedirectImportReview} from '../lib/cms/redirect-import-api.ts';
const id=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`,site=id(1),actor=id(2),requestKey=id(3),file=JSON.stringify({schemaVersion:1,kind:'cms-redirect-import',site,redirects:[{sourcePath:'/old',destinationPath:'/new',locale:'en',enabled:true}]}),snapshots=['a'.repeat(32)],saved={site,actor,requestKey,file,snapshots};
const receipt={site,actor,requestKey,proposalId:id(4),status:'submitted',sourceDigest:createHash('sha256').update(file).digest('hex'),review:{site,items:[{...parseRedirectImport(file,site)[0],index:0,status:'new',reason:'eligible',target:id(5),published:false,snapshot:snapshots[0]}]}};
test('redirect proposal recovery binds account, site, exact file rows and reviewed snapshots',()=>{
 assert.deepEqual(parseSavedRedirectImport(JSON.stringify(saved),site,actor),saved);assert.match(redirectImportStorageKey(site,actor),new RegExp(actor));assert.deepEqual(verifiedRedirectImportReceipt(receipt,saved),receipt);
 for(const patch of [{actor:id(8)},{site:id(8)},{snapshots:[]}])assert.throws(()=>parseSavedRedirectImport(JSON.stringify({...saved,...patch}),site,actor));
 for(const patch of [{actor:id(8)},{site:id(8)},{requestKey:id(8)},{sourceDigest:null},{proposalId:null},{review:null}])assert.throws(()=>verifiedRedirectImportReceipt({...receipt,...patch},saved));
 assert.throws(()=>verifiedRedirectImportReceipt(receipt,{...saved,snapshots:['b'.repeat(32)]}));
 const stopped={...receipt,proposalId:null,sourceDigest:null,review:null,status:'cancelled'};assert.deepEqual(verifiedRedirectImportReceipt(stopped,saved),stopped);
});
test('redirect proposal API submits freshly parsed rows and binds source hash; status and cancellation remain actor-scoped RPC calls',async()=>{
 const request=body=>new Request('https://cms.test/api/cms/redirects/import',{method:'POST',headers:{authorization:'Bearer a.b.c','content-type':'application/json'},body:JSON.stringify(body)});const submit={site,action:'submit',requestKey,file,snapshots};
 let args;const response=await handleRedirectImportReview(request(submit),async(token,name,value)=>{assert.equal(token,'a.b.c');assert.equal(name,'submit_redirect_import');args=value;return receipt;});assert.equal(response.status,200);assert.equal(args.p_source,receipt.sourceDigest);assert.deepEqual(args.p_items,parseRedirectImport(file,site));assert.deepEqual(args.p_snapshots,snapshots);
 const mismatch=await handleRedirectImportReview(request(submit),async()=>({...receipt,sourceDigest:'b'.repeat(64)}));assert.ok(mismatch.status>=400);
 for(const action of ['status','cancel']){const result=await handleRedirectImportReview(request({site,action,requestKey}),async(token,name,value)=>{assert.equal(name,action==='status'?'get_redirect_import_request':'cancel_redirect_import_request');assert.deepEqual(value,{p_site:site,p_request:requestKey});return action==='status'?null:{...receipt,status:'cancelled'};});assert.equal(result.status,200);}
 assert.ok((await handleRedirectImportReview(request({...submit,snapshots:[]}),async()=>{assert.fail('Invalid submission reached database');})).status>=400);
});

test('retarget recovery retains prior ownership evidence even when JSON field order changes',()=>{
 const retargetFrom={path:'/previous',recordId:id(8)},retargetFile=JSON.stringify({schemaVersion:1,kind:'cms-redirect-retarget',site,redirects:[{sourcePath:'/old',destinationPath:'/new',locale:'en',enabled:true,retargetFrom}]});
 const value={...receipt,review:{site,items:[{...receipt.review.items[0],status:'retarget',retargetFrom}]}};
 assert.equal(verifiedRedirectImportReceipt(value,{site,requestKey}).review.items[0].retargetFrom.recordId,id(8));assert.equal(verifiedRedirectImportReceipt(value,{...saved,file:retargetFile}).review.items[0].status,'retarget');
 assert.throws(()=>verifiedRedirectImportReceipt({...value,review:{site,items:[{...value.review.items[0],retargetFrom:{...retargetFrom,recordId:id(9)}}]}},{...saved,file:retargetFile}));
});
