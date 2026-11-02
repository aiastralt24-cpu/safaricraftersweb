import test from 'node:test';import assert from 'node:assert/strict';
import {planMiceMigration,miceMigrationDependencies} from '../lib/cms/mice-migration.ts';
import inventory from '../docs/cms/mice-migration-inventory.json' with {type:'json'};
import {validateMicePublication,miceLinkAvailable} from '../lib/cms/mice-page-validation.ts';
import {validateStoredContent} from '../lib/cms/content-validation.ts';
const ids=Array.from({length:6},(_,i)=>`00000000-0000-4000-8000-${String(i+1).padStart(12,'0')}`),[site,record,revision,form,formRevision,nextForm]=ids;
const now=new Date('2026-10-28T00:00:00Z');
function fixture(){
 const bindings=inventory.media.map((m,i)=>({sourcePath:m.sourcePath,sourceSha256:m.sha256,assetId:`image-${i}`}));
 const payload=planMiceMigration(miceMigrationDependencies,bindings,form).previewPayload;
 const page={site,record,revision,type:'page',path:'/mice',locale:'en',payload};
 const paths=new Set();const walk=node=>{if(Array.isArray(node))return node.forEach(walk);if(node&&typeof node==='object')for(const [key,v]of Object.entries(node)){if(key==='href'&&typeof v==='string'&&v.startsWith('/')&&!v.includes('#'))paths.add(v);else walk(v);}};walk(payload);
 return {page,evidence:{site,record,revision,forms:[{recordId:form,revisionId:formRevision,locale:'en',available:true}],media:bindings.map(b=>({assetId:b.assetId,available:true})),publishedPaths:[...paths]}};
}
const check=(f)=>validateMicePublication(f.page,f.evidence,now),codes=f=>check(f).findings.map(v=>v.code);
test('MICE content validation accepts a complete source proposal with exact trusted revision evidence',()=>{
 const f=fixture();assert.equal(check(f).contentChecksPass,true);assert.equal(check(f).validatorVersion,'mice-1');
 // A pure validator does not silently enable the current publication pipeline.
 assert.equal(validateStoredContent(f.page,f.evidence.media).contentChecksPass,false);
 assert.ok(validateStoredContent(f.page,f.evidence.media).findings.some(v=>v.code==='publication_not_ready'));
});
test('MICE validation rejects absent, foreign and stale evidence rather than accepting client assertions',()=>{
 for(const field of ['site','record','revision']){const f=fixture();f.evidence[field]=nextForm;assert.ok(codes(f).includes('mice_evidence_mismatch'));}
 for(const value of [null,{}, {...fixture().evidence,privateDefinition:{} }]){const f=fixture();f.evidence=value;assert.ok(codes(f).includes('mice_evidence_mismatch'));}
 for(const patch of [{locale:'fr'},{path:'/contact'},{record:'invalid'}]){const f=fixture();Object.assign(f.page,patch);assert.ok(codes(f).includes('mice_identity'));}
 assert.equal(validateMicePublication(fixture().page,fixture().evidence,new Date('bad')).contentChecksPass,false);
});
test('every configured corporate form needs one eligible published binding, including scheduled replacements',()=>{
 for(const patch of [{available:false},{revisionId:null},{locale:'fr'}]){const f=fixture();Object.assign(f.evidence.forms[0],patch);assert.ok(codes(f).includes('mice_form_unavailable'));}
 for(const mutate of [f=>f.evidence.forms=[],f=>f.evidence.forms.push({...f.evidence.forms[0]}),f=>f.evidence.forms[0].recordId=nextForm]){const f=fixture();mutate(f);assert.ok(codes(f).includes('mice_form_evidence_mismatch'));}
 const f=fixture(),sections=f.page.payload.composition.sections,old=sections.find(s=>s.kind==='miceEnquiry'),next=structuredClone(old);old.controls.visibleUntil='2026-11-01T00:00:00Z';next.id='future-enquiry';next.controls.anchor='future-enquiry';next.controls.visibleFrom='2026-11-01T00:00:00Z';next.data.form.recordId=nextForm;
 // Remove old-anchor actions from this scheduling fixture; links are checked independently.
 for(const section of sections){if(section.data.button)section.data.button.href='/contact';if(section.kind==='miceDestinations')for(const item of section.data.items)item.button.href='/contact';}
 sections.push(next);assert.equal(check(f).contentChecksPass,false);f.evidence.forms.push({recordId:nextForm,revisionId:formRevision,locale:'en',available:true});assert.equal(check(f).contentChecksPass,true);
 f.evidence.forms[1].available=false;assert.ok(codes(f).includes('mice_form_unavailable'));
});
test('image rights and exact evidence coverage are required for the complete saved payload',()=>{
 const f=fixture();f.evidence.media[0].available=false;assert.ok(codes(f).includes('asset_verification_required'));
 for(const mutate of [f=>f.evidence.media.pop(),f=>f.evidence.media.push({...f.evidence.media[0]}),f=>f.evidence.media[0].assetId='foreign']){const f=fixture();mutate(f);assert.ok(codes(f).includes('mice_media_evidence_mismatch'));}
});
test('MICE local link validation checks exact published paths and future anchor availability',()=>{
 const anchors=new Set(['corporate-enquiry']),paths=new Set(['/destinations/kenya']);
 for(const href of ['/contact','/destinations/kenya','#corporate-enquiry','/mice#corporate-enquiry'])assert.equal(miceLinkAvailable(href,anchors,paths),true,href);
 for(const href of ['/destinations/missing','/contact#unknown','https://foreign.test','//foreign.test','/contact?x=1','/mice#missing'])assert.equal(miceLinkAvailable(href,anchors,paths),false,href);
 const f=fixture(),intro=f.page.payload.composition.sections.find(s=>s.kind==='miceIntroduction');intro.data.button.href='/unpublished';assert.ok(codes(f).includes('mice_link_unverified'));f.evidence.publishedPaths.push('/unpublished');assert.equal(check(f).contentChecksPass,true);
 intro.data.button.href='/mice#temporary';const section=f.page.payload.composition.sections.find(s=>s.kind==='miceFormats');section.controls.anchor='temporary';section.controls.visibleUntil='2026-11-01T00:00:00Z';assert.ok(codes(f).includes('mice_link_unverified'));
});

test('direct and queued workers accept complete MICE evidence and reject dependency failures',async()=>{
 const {runTrustedValidation}=await import('../lib/cms/validation-worker.ts');const {runValidationQueue}=await import('../lib/cms/validation-queue-worker.ts');
 for(const mode of ['eligible','withdrawn','foreign','missing']){
  const f=fixture();if(mode==='withdrawn')f.evidence.forms[0].available=false;if(mode==='foreign')f.evidence.site=nextForm;
  const input={...f.page,mediaStatus:f.evidence.media,...(mode==='missing'?{}:{miceEvidence:f.evidence})};
  const expected=mode==='withdrawn'?'mice_form_unavailable':mode==='foreign'||mode==='missing'?'mice_evidence_mismatch':null;
  let receipt;
  const direct=await runTrustedValidation(async(name,args)=>{if(name==='get_validation_input')return input;assert.equal(name,'record_validation');receipt=args;},{site,record,revision});
  assert.equal(direct.contentChecksPass,mode==='eligible');assert.equal(receipt.p_valid,mode==='eligible');assert.ok(!receipt.p_findings.some(f=>f.code==='publication_not_ready'));if(expected)assert.ok(receipt.p_findings.some(f=>f.code===expected));
  let finished;const results=await runValidationQueue(async(name,args)=>{
   if(name==='claim_validations')return [{id:form,site,record,revision,token:formRevision}];
   if(name==='get_validation_job_input')return input;
   assert.equal(name,'finish_validation_job');finished=args;
  });
  assert.equal(results[0].status,mode==='eligible'?'valid':'invalid');assert.equal(finished.p_token,formRevision);assert.equal(finished.p_valid,mode==='eligible');assert.equal(finished.p_error_code,null);assert.deepEqual(finished.p_findings,receipt.p_findings);
 }
});
test('malformed MICE evidence fails worker transport validation without issuing a valid receipt',async()=>{
 const {runTrustedValidation}=await import('../lib/cms/validation-worker.ts');const {runValidationQueue}=await import('../lib/cms/validation-queue-worker.ts');const f=fixture();const input={...f.page,miceEvidence:{...f.evidence,forms:'untrusted'}};let writes=0;
 await assert.rejects(runTrustedValidation(async(name)=>{if(name==='get_validation_input')return input;writes++;},{site,record,revision}));assert.equal(writes,0);
 let ack;const results=await runValidationQueue(async(name,args)=>name==='claim_validations'?[{id:form,site,record,revision,token:formRevision}]:name==='get_validation_job_input'?input:(ack=args));assert.equal(results[0].status,'retry_pending');assert.equal(ack.p_error_code,'validation_unavailable');assert.equal(ack.p_valid,null);
});


test('MICE worker eligibility retains generic media checks and rejects malformed structure',async()=>{
 const {evaluateValidationInput}=await import('../lib/cms/validation-worker.ts');
 for(const mode of ['missing-media','revoked-media','bad-structure']){
  const f=fixture(),input={...f.page,miceEvidence:f.evidence,mediaStatus:structuredClone(f.evidence.media)};
  if(mode==='missing-media')delete input.mediaStatus;
  if(mode==='revoked-media')input.mediaStatus[0].available=false;
  if(mode==='bad-structure')input.payload.composition.sections=[];
  const result=evaluateValidationInput(input);assert.equal(result.contentChecksPass,false);
  assert.ok(result.findings.some(f=>f.severity==='error'&&f.code!=='publication_not_ready'));
 }
});
