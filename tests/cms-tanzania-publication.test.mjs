import {validateComposition} from '../lib/cms/composition.ts';
import test from 'node:test';import assert from 'node:assert/strict';
import inventory from '../docs/cms/tanzania-source-inventory.json' with {type:'json'};
import {planTanzaniaMigration,tanzaniaMigrationDependencies} from '../lib/cms/tanzania-migration.ts';
import {projectTanzaniaPage} from '../lib/cms/tanzania-page.ts';
import {validateTanzaniaPublication,tanzaniaLinkAvailable} from '../lib/cms/tanzania-page-validation.ts';
import {validateStoredContent} from '../lib/cms/content-validation.ts';
const [site,record,revision,other]=Array.from({length:4},(_,i)=>`00000000-0000-4000-8000-${String(i+1).padStart(12,'0')}`),now=new Date('2026-10-28T00:00:00Z');
function fixture(){const bindings=inventory.media.map((m,i)=>({sourcePath:m.sourcePath,sourceSha256:m.sha256,assetId:`image-${i}`})),payload=planTanzaniaMigration(tanzaniaMigrationDependencies,bindings).previewPayload;
 const paths=new Set();const walk=node=>{if(Array.isArray(node))return node.forEach(walk);if(node&&typeof node==='object')for(const [key,v]of Object.entries(node)){if(key==='href'&&typeof v==='string')paths.add(v.split(/[?#]/)[0]);else walk(v);}};walk(payload);
 return {page:{site,record,revision,type:'page',path:'/destinations/tanzania',locale:'en',payload},evidence:{site,record,revision,media:bindings.map(b=>({assetId:b.assetId,available:true})),publishedPaths:[...paths]}};
}
const check=f=>validateTanzaniaPublication(f.page,f.evidence,now),codes=f=>check(f).findings.map(f=>f.code);
test('Tanzania structural projection and pure publication checks preserve complete source content without enabling publication',()=>{
 const f=fixture(),page=projectTanzaniaPage({recordId:record,revisionId:revision,type:'page',payload:f.page.payload},{locale:'en',now});assert.equal(page.sections.length,9);assert.equal(page.sections[7].data.planner.interest,'Tanzania');assert.equal(check(f).contentChecksPass,true);assert.equal(check(f).validatorVersion,'tanzania-1');assert.equal(validateStoredContent(f.page,f.evidence.media).contentChecksPass,false);assert.ok(validateStoredContent(f.page,f.evidence.media).findings.some(f=>f.code==='publication_not_ready'));
});
test('Tanzania validation requires exact current revision and image evidence, including hidden images',()=>{
 for(const patch of [{site:other},{record:other},{revision:other},{extra:true}]){const f=fixture();Object.assign(f.evidence,patch);assert.ok(codes(f).includes('tanzania_evidence_mismatch'));}
 for(const change of [e=>e.media.pop(),e=>e.media.push({...e.media[0]}),e=>e.media[0].assetId='unknown']){const f=fixture();change(f.evidence);assert.ok(codes(f).includes('tanzania_media_evidence_mismatch'));}
 const f=fixture();f.page.payload.composition.sections[4].controls.visible=false;f.evidence.media[7].available=false;assert.ok(codes(f).includes('asset_verification_required'));
});
test('Tanzania structure rejects unsupported layouts, wrong identities and hero gaps throughout schedules',()=>{
 for(const mutate of [f=>f.page.locale='fr',f=>f.page.path='/destinations/kenya',f=>f.page.payload.composition.sections[0].controls.headingLevel='h2',f=>f.page.payload.composition.sections[0].controls.visible=false,f=>f.page.payload.composition.sections[0].controls.visibleUntil='2026-11-01T00:00:00Z',f=>f.page.payload.composition.sections[1].controls.regions=['india'],f=>f.page.payload.composition.sections[0].controls.background='ink',f=>f.page.payload.composition.sections[1].controls.animation='invalid',f=>f.page.payload.composition.sections[1].controls.mediaAlign='start',f=>f.page.payload.composition.sections[1].controls.mobileOrder='mediaFirst']){const f=fixture();mutate(f);assert.equal(check(f).contentChecksPass,false);}
 assert.equal(validateTanzaniaPublication(fixture().page,fixture().evidence,new Date('invalid')).contentChecksPass,false);
});
test('Tanzania link validation preserves query-bearing routes but does not infer foreign anchors or unpublished destinations',()=>{
 const anchors=new Set(['intro']),published=new Set(['/destinations/amboseli']);
 for(const href of ['/plan?destination=tanzania&tanzaniaRoute=mara-amboseli','/destinations/amboseli?season=dry','/destinations/tanzania?view=map#intro'])assert.equal(tanzaniaLinkAvailable(href,anchors,published),true,href);
 for(const href of ['https://evil.test','//evil.test','/unknown?destination=tanzania','/destinations/amboseli#intro','/destinations/tanzania#missing','/destinations/../admin','/plan\\evil','/plan?x=one\ntwo'])assert.equal(tanzaniaLinkAvailable(href,anchors,published),false,href);
 const f=fixture();f.page.payload.composition.sections[8].data.items[0].button.href='/unpublished?season=dry';assert.ok(codes(f).includes('tanzania_link_unverified'));
});
test('Tanzania future section links must have anchors throughout their visible interval',()=>{
 const f=fixture(),sections=f.page.payload.composition.sections;sections[1].controls.anchor='facts';sections[1].controls.visibleUntil='2026-11-01T00:00:00Z';sections[8].data.items[0].button.href='/destinations/tanzania#facts';assert.ok(codes(f).includes('tanzania_link_unverified'));
 sections[8].controls.visibleUntil='2026-11-01T00:00:00Z';assert.equal(check(f).contentChecksPass,true);
});

test('direct and queued workers report Tanzania dependency failures and accept only eligible saved content',async()=>{
 const {runTrustedValidation}=await import('../lib/cms/validation-worker.ts');const {runValidationQueue}=await import('../lib/cms/validation-queue-worker.ts');
 for(const mode of ['eligible','withdrawn','foreign','missing']){
  const f=fixture();if(mode==='withdrawn')f.evidence.media[0].available=false;if(mode==='foreign')f.evidence.site=other;
  const input={...f.page,mediaStatus:f.evidence.media,...(mode==='missing'?{}:{tanzaniaEvidence:f.evidence})};
  const expected=mode==='withdrawn'?'asset_verification_required':mode==='foreign'||mode==='missing'?'tanzania_evidence_mismatch':null;
  let receipt;
  const direct=await runTrustedValidation(async(name,args)=>{if(name==='get_validation_input')return input;assert.equal(name,'record_validation');receipt=args;},{site,record,revision});
  assert.equal(direct.contentChecksPass,mode==='eligible');assert.equal(receipt.p_valid,mode==='eligible');assert.ok(!receipt.p_findings.some(f=>f.code==='publication_not_ready'));if(expected)assert.ok(receipt.p_findings.some(f=>f.code===expected));
  let finished;const results=await runValidationQueue(async(name,args)=>{
   if(name==='claim_validations')return [{id:other,site,record,revision,token:other}];
   if(name==='get_validation_job_input')return input;
   assert.equal(name,'finish_validation_job');finished=args;
  });
  assert.equal(results[0].status,mode==='eligible'?'valid':'invalid');assert.equal(finished.p_token,other);assert.equal(finished.p_valid,mode==='eligible');assert.equal(finished.p_error_code,null);assert.deepEqual(finished.p_findings,receipt.p_findings);
 }
});
test('malformed Tanzania evidence fails worker transport validation without issuing a valid receipt',async()=>{
 const {runTrustedValidation}=await import('../lib/cms/validation-worker.ts');const {runValidationQueue}=await import('../lib/cms/validation-queue-worker.ts');const f=fixture();const input={...f.page,tanzaniaEvidence:{...f.evidence,media:'untrusted'}};let writes=0;
 await assert.rejects(runTrustedValidation(async(name)=>{if(name==='get_validation_input')return input;writes++;},{site,record,revision}));assert.equal(writes,0);
 let ack;const results=await runValidationQueue(async(name,args)=>name==='claim_validations'?[{id:other,site,record,revision,token:other}]:name==='get_validation_job_input'?input:(ack=args));assert.equal(results[0].status,'retry_pending');assert.equal(ack.p_error_code,'validation_unavailable');assert.equal(ack.p_valid,null);
});


test('Tanzania worker eligibility retains generic media checks and rejects malformed structure',async()=>{
 const {evaluateValidationInput}=await import('../lib/cms/validation-worker.ts');
 for(const mode of ['missing-media','revoked-media','bad-structure']){
  const f=fixture(),input={...f.page,tanzaniaEvidence:f.evidence,mediaStatus:structuredClone(f.evidence.media)};
  if(mode==='missing-media')delete input.mediaStatus;
  if(mode==='revoked-media')input.mediaStatus[0].available=false;
  if(mode==='bad-structure')input.payload.composition.sections=[];
  const result=evaluateValidationInput(input);assert.equal(result.contentChecksPass,false);
  assert.ok(result.findings.some(f=>f.severity==='error'&&f.code!=='publication_not_ready'));
 }
});

test('Tanzania publication accepts implemented width, spacing and text alignment combinations',()=>{
 for(const width of ['reading','content','full'])for(const spacing of ['compact','standard','generous'])for(const textAlign of ['start','center']){const f=fixture();for(const section of f.page.payload.composition.sections)Object.assign(section.controls,{width,spacing,textAlign});assert.equal(check(f).contentChecksPass,true,JSON.stringify({width,spacing,textAlign}));}
});


test('Tanzania motion preserves content and identity for none, fade and reveal',()=>{for(const animation of ['none','fade','reveal']){const f=fixture();for(const section of f.page.payload.composition.sections)section.controls.animation=animation;assert.equal(check(f).contentChecksPass,true);const projected=projectTanzaniaPage({recordId:record,revisionId:revision,type:'page',payload:f.page.payload},{locale:'en',now});assert.ok(projected.sections.every(s=>s.controls.animation===animation));assert.deepEqual(projected.sections.map(s=>s.data),f.page.payload.composition.sections.map(s=>s.data));}});

test('Tanzania explicit layouts preserve source defaults and reject misplaced flags',()=>{
 for(const background of ['paper','white','forest','ink'])for(const mediaAlign of ['start','end'])for(const mobileOrder of ['textFirst','mediaFirst']){const f=fixture();for(const section of f.page.payload.composition.sections){if(section.kind==='tanzaniaHero')continue;Object.assign(section.controls,{background,tanzaniaOverrides:{background:true}});if(section.kind==='tanzaniaPlaces')Object.assign(section.controls,{mediaAlign,mobileOrder,tanzaniaOverrides:{background:true,mediaAlign:true,mobileOrder:true}});}assert.equal(check(f).contentChecksPass,true);}
 for(const flags of [{background:true},{mediaAlign:true},{mobileOrder:true},{unknown:true},{background:'yes'}]){const f=fixture();f.page.payload.composition.sections[0].controls.tanzaniaOverrides=flags;assert.equal(check(f).contentChecksPass,false);}
 const f=fixture();f.page.payload.composition.sections=[{id:'text',kind:'text',controls:{label:'Text',tanzaniaOverrides:{background:true}},data:{body:[]}}];assert.equal(validateComposition(f.page.payload.composition).valid,false);
});
