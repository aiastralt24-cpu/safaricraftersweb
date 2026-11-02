import test from 'node:test';import assert from 'node:assert/strict';
import {documentSchema,newDocument,documentDateState,validateDocumentDraft} from '../lib/cms/documents.ts';
import {validateStoredContent} from '../lib/cms/content-validation.ts';
import {handleEditorCommand} from '../lib/cms/editor-api.ts';
const site='00000000-0000-4000-8000-000000000001',asset='00000000-0000-4000-8000-000000000002';
const document=()=>({...newDocument(),title:'Safari planning brochure',file:{assetId:asset,downloadName:'Safari guide.pdf'},effectiveOn:'2026-10-01',expiresOn:'2026-10-23',reviewOn:'2026-10-20'});
test('document metadata preserves version and stable asset identity without editable approval or owner authority',()=>{
 const value=document(),parsed=documentSchema.parse(value);assert.deepEqual(parsed,value);assert.equal(parsed.file.assetId,asset);
 for(const change of [{owner:site},{approvalStatus:'approved'},{published:true},{file:{assetId:asset,downloadName:'../guide.pdf'}},{file:{assetId:asset,downloadName:'guide.pdf.exe'}},{file:{assetId:asset,downloadName:'guide\n.pdf'}},{file:{assetId:'https://files.example/guide.pdf',downloadName:'guide.pdf'}},{regions:['India','india']},{products:[{recordId:site},{recordId:site}]},{categories:[{recordId:'bad'}]}])assert.equal(documentSchema.safeParse({...value,...change}).success,false);
 assert.ok(documentSchema.safeParse({...value,access:'authenticated',file:{...value.file,downloadName:'New brochure.pdf'}}).success);
});
test('document date validation rejects impossible dates and contradictory intervals',()=>{
 for(const change of [{effectiveOn:'2026-02-29'},{expiresOn:'2026-13-01'},{reviewOn:'2026-04-31'},{expiresOn:'2026-09-30'},{reviewOn:'2026-09-30'},{effectiveOn:'2026-10-01T00:00:00Z'}])assert.equal(documentSchema.safeParse({...document(),...change}).success,false);
 assert.ok(documentSchema.safeParse({...document(),effectiveOn:'2024-02-29'}).success);
 assert.throws(()=>documentDateState(document(),new Date('invalid')),/evaluation time/);
});
test('expiry policies have distinct publication and delivery effects at inclusive UTC day boundaries',()=>{
 const value=document();for(const expiryPolicy of ['warn','blockPublication','removeAvailability']){
  assert.equal(documentDateState({...value,expiryPolicy},new Date('2026-10-23T23:59:59.999Z')).expired,false);
  const state=documentDateState({...value,expiryPolicy},new Date('2026-10-24T00:00:00Z'));assert.equal(state.expired,true);assert.equal(state.dateAllowsPublication,expiryPolicy==='warn');assert.equal(state.dateAllowsDelivery,expiryPolicy!=='removeAvailability');assert.equal(state.reviewOverdue,true);
 }
 const future=documentDateState(value,new Date('2026-09-30T23:59:59Z'));assert.equal(future.notYetEffective,true);assert.equal(future.dateAllowsDelivery,false);assert.equal(future.dateAllowsPublication,false);
 assert.equal(documentDateState(value,new Date('2026-10-20T23:59:59Z')).reviewOverdue,false);
});
test('document checks expose expiry/review findings but cannot authorize an unverified PDF or gated download',()=>{
 const now=new Date('2026-10-24T00:00:00Z');
 for(const expiryPolicy of ['warn','blockPublication','removeAvailability']){
  const payload={...document(),expiryPolicy,access:'authenticated'},record={type:'document',path:null,locale:'en',payload},result=validateDocumentDraft(record,now);
  assert.equal(result.contentChecksPass,false);assert.equal(result.findings.find(f=>f.code==='document_expired').severity,expiryPolicy==='warn'?'warning':'error');assert.ok(result.findings.some(f=>f.code==='document_evidence_missing'));assert.ok(result.findings.some(f=>f.code==='document_review_overdue'));
  assert.equal(validateStoredContent(record).validatorVersion,'document-1');
 }
 const missing=validateDocumentDraft({type:'document',path:'/manual',locale:'fr',payload:newDocument()},now);assert.ok(missing.findings.some(f=>f.code==='document_identity'));assert.ok(missing.findings.some(f=>f.code==='document_file_required'));
});
test('document save API checks payload and record identity before any persistence call',async()=>{
 const payload=document(),base={action:'save',site,record:null,expectedRevision:null,type:'document',path:null,title:payload.title,locale:'en',payload};
 const request=body=>new Request('https://cms.test/api/cms/content',{method:'POST',headers:{authorization:'Bearer test.editor.token','content-type':'application/json'},body:JSON.stringify(body)});
 let calls=0;const save=async(token,name,args)=>{calls++;assert.equal(token,'test.editor.token');assert.equal(name,'save_draft');assert.equal(args.p_type,'document');assert.equal(args.p_path,null);assert.deepEqual(args.p_payload,payload);return {recordId:site,revisionId:asset};};
 assert.equal((await handleEditorCommand(request(base),save)).status,200);assert.equal(calls,1);
 for(const change of [{title:'Different title'},{locale:'fr'},{path:'/downloads/guide'},{payload:{...payload,approved:true}},{payload:{...payload,expiresOn:'2026-09-01'}}])assert.equal((await handleEditorCommand(request({...base,...change}),async()=>assert.fail('Invalid document reached persistence'))).status,422);
});

test('document validation binds trusted PDF and product evidence and reports current file problems',()=>{
 const payload={...document(),products:[{recordId:site}]},record={type:'document',path:null,locale:'en',payload};
 const status={file:{assetId:asset,revision:1,processed:true,rightsApproved:true,rightsCurrent:true,archived:false},products:[{recordId:site,available:true,locale:'en'}]};
 const validate=evidence=>validateDocumentDraft(record,new Date('2026-10-10T00:00:00Z'),evidence);
 assert.deepEqual(validate(status).findings,[]);assert.equal(validate(status).contentChecksPass,true);
 for(const [patch,code] of [[{processed:false},'document_file_unprocessed'],[{rightsApproved:false},'document_rights_unapproved'],[{rightsCurrent:false},'document_rights_expired'],[{archived:true},'document_file_archived'],[{assetId:site},'document_file_mismatch'],[{revision:null},'document_file_unprocessed']])assert.ok(validate({...status,file:{...status.file,...patch}}).findings.some(f=>f.code===code));
 assert.ok(validate(undefined).findings.some(f=>f.code==='document_evidence_missing'));
 for(const products of [[],[status.products[0],status.products[0]],[{recordId:asset,available:true,locale:'en'}]])assert.ok(validate({...status,products}).findings.some(f=>f.code==='document_product_evidence'));
 for(const change of [{available:false},{locale:'fr'}])assert.ok(validate({...status,products:[{...status.products[0],...change}]}).findings.some(f=>f.code==='document_product_unavailable'));
 const categories=validateDocumentDraft({...record,payload:{...payload,categories:[{recordId:asset}]}},new Date('2026-10-10'),status);assert.ok(categories.findings.some(f=>f.code==='document_categories_not_ready'));assert.equal(categories.contentChecksPass,false);
});
