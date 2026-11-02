import test from 'node:test';import assert from 'node:assert/strict';
import {conservationPageFindings} from '../lib/cms/conservation-page-validation.ts';
import {validateStoredContent} from '../lib/cms/content-validation.ts';
import {planConservationMigration,conservationMigrationDependencies} from '../lib/cms/conservation-migration.ts';
const now=new Date('2026-10-23T00:00:00Z');
const source=()=>({type:'page',path:'/conservation-commitment',locale:'en',payload:planConservationMigration(conservationMigrationDependencies).previewPayload});
const assets=()=>Array.from({length:5},(_,i)=>({assetId:`review-only-conservation-${i+1}`,available:true}));
test('conservation draft checks give useful diagnostics with complete media evidence (advisory checks do not grant publication)',()=>{
 const record=source(),findings=conservationPageFindings(record,now);
 assert.equal(findings.some(f=>f.severity==='error'),false);assert.equal(findings[0].code,'conservation_claims_review');
 const result=validateStoredContent(record,assets());assert.equal(result.contentChecksPass,true);assert.equal(result.findings.some(f=>f.code==='publication_not_ready'),false);
 assert.ok(result.findings.some(f=>f.code==='conservation_claims_review'));
});
test('conservation diagnostics identify scheduled kind, targeting, heading, locale and payload problems',()=>{
 for(const [change,code]of [
  [v=>v.locale='fr','conservation_page_locale'],[v=>v.type='homepage','conservation_page_route'],[v=>v.payload.privateNotes='retained','conservation_page_fields'],
  [v=>v.payload.composition.sections[0].controls.visibleUntil='2027-01-01T00:00:00Z','conservation_page_heading_schedule'],
  [v=>v.payload.composition.sections[2].controls.regions=['india'],'conservation_page_region'],
  [v=>v.payload.composition.sections.push({id:'future',kind:'text',controls:{label:'Future',visibleFrom:'2027-01-01T00:00:00Z'},data:{body:[]}}),'conservation_page_section'],
 ]){const record=source();change(record);assert.ok(conservationPageFindings(record,now).some(f=>f.code===code),code);}
 assert.ok(conservationPageFindings(source(),new Date(NaN)).some(f=>f.code==='conservation_page_time'));
 const hidden=source();hidden.payload.composition.sections.push({id:'retained',kind:'text',controls:{label:'Retained',visible:false},data:{body:[]}});assert.equal(conservationPageFindings(hidden,now).some(f=>f.code==='conservation_page_section'),false);
});
test('complete conservation snapshot media checks include hidden, future and social-only images',()=>{
 const record=source();record.payload.composition.sections[3].controls.visible=false;
 record.payload.composition.sections[0].controls.visibleFrom='2027-01-01T00:00:00Z';
 record.payload.seo.socialImage.assetId='social-only';
 const result=validateStoredContent(record,[]),fields=result.findings.filter(f=>f.code==='asset_verification_required').map(f=>f.field);
 assert.ok(fields.includes('composition.sections.0.data.image.assetId'));
 for(let i=0;i<4;i++)assert.ok(fields.includes(`composition.sections.3.data.items.${i}.image.assetId`));
 assert.ok(fields.includes('seo.socialImage.assetId'));assert.equal(fields.length,6);
 const status=[...assets(),{assetId:'social-only',available:true},{assetId:'social-only',available:true}];
 const duplicate=validateStoredContent(record,status);assert.ok(duplicate.findings.some(f=>f.field==='seo.socialImage.assetId'&&f.code==='asset_verification_required'));
});
