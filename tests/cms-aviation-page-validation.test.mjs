import test from 'node:test';
import assert from 'node:assert/strict';
import {aviationPageFindings,aviationLinkAvailable} from '../lib/cms/aviation-page-validation.ts';
import {planPrivateAviationMigration,aviationMigrationDependencies} from '../lib/cms/private-aviation-migration.ts';
import {validateStoredContent} from '../lib/cms/content-validation.ts';
const now=new Date('2026-10-23T00:00:00Z');
const fixture=()=>({type:'page',path:'/private-aviation',locale:'en',payload:structuredClone(planPrivateAviationMigration(aviationMigrationDependencies).previewPayload)});
test('Aviation source passes editorial checks while publication and media remain gated',()=>{
 const record=fixture();assert.deepEqual(aviationPageFindings(record,now),[]);
 const result=validateStoredContent(record);assert.equal(result.contentChecksPass,false);
 for(const code of ['asset_verification_required','video_verification_required'])assert.ok(result.findings.some(f=>f.code===code),code);
 for(const change of [r=>r.path='/other',r=>r.type='homepage',r=>r.locale='fr']){const r=fixture();change(r);assert.ok(aviationPageFindings(r,now).some(f=>f.code==='aviation_identity'));}
});
test('Aviation links track target visibility across future schedules',()=>{
 const r=fixture(),sections=r.payload.composition.sections,source=sections[1],target=sections[3];
 target.controls.anchor='coordination';source.data.button.href='#coordination';assert.deepEqual(aviationPageFindings(r,now),[]);
 target.controls.visibleUntil='2027-01-01T00:00:00Z';assert.equal(aviationPageFindings(r,now).filter(f=>f.code==='aviation_link_unverified').length,1);
 source.controls.visibleUntil=target.controls.visibleUntil;assert.deepEqual(aviationPageFindings(r,now),[]);
 source.controls.visible=false;source.data.button.href='/journeys/missing';assert.deepEqual(aviationPageFindings(r,now),[]);
 sections[0].controls.visibleUntil='2027-01-01T00:00:00Z';assert.ok(aviationPageFindings(r,now).some(f=>f.code==='aviation_structure'));
});
test('Aviation planning intent and local destinations require exact identities',()=>{
 const anchors=new Set(['main']),paths=new Set(['/journeys/private']);
 for(const href of ['/plan?experience=private-aviation','https://www.safaricrafters.com/plan?experience=private-aviation','/journeys/private','https://safaricrafters.com/journeys/private','#main','https://outside.example/?q=one'])assert.equal(aviationLinkAvailable(href,anchors,paths),true,href);
 for(const href of ['/plan?experience=other','/plan?guided=true','/journeys/missing','/journeys/private?x=1','#missing','https://admin.safaricrafters.com/plan','https://safaricrafters.com:444/plan','https://safaricrafters.com/a/../plan','https://safaricrafters.com/%2e%2e/plan','javascript:alert(1)'])assert.equal(aviationLinkAvailable(href,anchors,paths),false,href);
});
test('both validation workers forward Aviation evidence without allowing release',async()=>{
 const {runTrustedValidation}=await import('../lib/cms/validation-worker.ts');const {runValidationQueue}=await import('../lib/cms/validation-queue-worker.ts');
 const id='00000000-0000-4000-8000-000000000001',target={site:id,record:id,revision:id};
 for(const queue of [false,true])for(const available of [false,true]){
  let receipt;const record=fixture();record.payload.composition.sections[1].data.button.href='/journeys/trusted';
  const input={...target,...record,aviationPublishedPaths:available?['/journeys/trusted']:[]};
  if(queue)await runValidationQueue(async(name,args)=>{if(name==='claim_validations')return [{...target,id,token:id}];if(name==='get_validation_job_input')return input;receipt=args;});
  else await runTrustedValidation(async(name,args)=>{if(name==='get_validation_input')return input;receipt=args;},target);
  assert.equal(receipt.p_findings.some(f=>f.code==='aviation_link_unverified'),!available);
  assert.equal(receipt.p_valid,false);assert.ok(receipt.p_findings.some(f=>f.code==='video_verification_required'));
 }
});
