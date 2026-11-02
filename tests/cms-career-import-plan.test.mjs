import test from 'node:test';import assert from 'node:assert/strict';
import {validateCareerImportTables,careerTemplate} from '../lib/cms/career-import-contract.ts';
import {planCareerImport} from '../lib/cms/career-import-plan.ts';
import {careerDraftFindings} from '../lib/cms/careers.ts';
const uuid=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
function input(){return {templateVersion:'1.0',pageType:'career',sheets:{
 Pages:[{recordId:'job_1',operation:'create',slug:'guest-advisor',title:'Guest advisor',locale:'en'}],
 Content:[['organization','Example'],['summary','Support guests.'],['employment','fullTime'],['workMode','remote'],['postedOn','2026-10-30'],['opensAt','2026-11-01T09:00:00+05:30'],['closesAt','2026-12-01T09:00:00+05:30'],['internalNotes','Private hiring notes']].map(([field,value])=>({recordId:'job_1',field,value})),
 RemoteRegions:[{recordId:'job_1',itemId:'india',position:1,region:'India'}],
 Application:[{recordId:'job_1',mode:'external',label:'Apply',url:'https://example.test/apply'}],
 Compensation:[{recordId:'job_1',currency:'INR',minimum:'40000.50',maximum:'60000',unit:'month'}],
 Blocks:[{recordId:'job_1',itemId:'intro',position:'1',kind:'paragraph',text:'Help guests plan journeys.'}],
 Relationships:[{recordId:'job_1',itemId:'policy',position:'1',group:'documents',targetId:uuid(5)}],
 }};}
const errors=plan=>plan.issues.filter(v=>v.severity==='error');
test('career import covers job details, timing, compensation, remote regions and application routing without writes',()=>{
 const original=input(),plan=planCareerImport(original);assert.equal(plan.valid,true,JSON.stringify(plan.issues));assert.equal(plan.changes.length,1);const change=plan.changes[0];assert.equal(change.path,'/careers/guest-advisor');assert.equal(change.recordId,null);assert.deepEqual(change.payload.compensation,{currency:'INR',minimum:40000.5,maximum:60000,unit:'month'});assert.deepEqual(change.payload.remoteRegions,['India']);assert.equal(change.payload.internalNotes,'Private hiring notes');assert.equal(change.payload.opensAt,'2026-11-01T09:00:00+05:30');assert.equal(careerDraftFindings(change.payload).filter(v=>v.severity==='error').length,0);assert.deepEqual(original,input());assert.equal(careerTemplate.type,'career');
});
test('career updates preserve omitted values and require explicit replacement before collections or routing change',()=>{
 const base=planCareerImport(input()).changes[0].payload,existing=[{recordId:uuid(1),revision:uuid(2),locale:'en',payload:base}];
 const update={templateVersion:'1.0',pageType:'career',sheets:{Pages:[{recordId:uuid(1),operation:'update',expectedRevision:uuid(2),slug:base.slug,title:'Senior advisor',locale:'en'}]}};
 const plan=planCareerImport(update,existing);assert.equal(plan.valid,true);assert.deepEqual(plan.changes[0].payload,{...base,title:'Senior advisor'});
 update.sheets.Application=[{recordId:uuid(1),mode:'form',label:'Apply here',formId:uuid(9)}];assert.ok(errors(planCareerImport(update,existing)).some(v=>v.code==='replacement_required'));
 update.sheets.Pages[0].replaceCollections='application,compensation,remoteRegions,body';const changed=planCareerImport(update,existing);assert.equal(changed.valid,true,JSON.stringify(changed.issues));assert.equal(changed.changes[0].payload.application.formId,uuid(9));assert.equal(changed.changes[0].payload.compensation,undefined);assert.deepEqual(changed.changes[0].payload.remoteRegions,[]);assert.deepEqual(changed.changes[0].payload.body,[]);
 delete update.sheets.Application;assert.deepEqual(planCareerImport(update,existing).changes[0].payload.application,{mode:'none'});
 update.sheets.Pages[0].expectedRevision=uuid(8);assert.ok(errors(planCareerImport(update,existing)).some(v=>v.code==='revision_conflict'));
});
test('career import refuses ambiguous routing, numeric coercion, reversed ranges and timezone-free deadlines',()=>{
 const cases=[
 v=>v.sheets.Application[0].formId=uuid(9),v=>v.sheets.Application[0].url='javascript:alert(1)',v=>v.sheets.Application.push({...v.sheets.Application[0]}),
 v=>v.sheets.Compensation[0].minimum='1e3',v=>v.sheets.Compensation[0].minimum='1,000',v=>v.sheets.Compensation[0].maximum='2',v=>v.sheets.Compensation[0].minimum=40000,
 v=>v.sheets.Content.find(r=>r.field==='opensAt').value='2026-11-01T09:00:00',v=>v.sheets.Content.find(r=>r.field==='closesAt').value='2026-10-01T09:00:00Z',
 v=>v.sheets.RemoteRegions.push({recordId:'job_1',itemId:'duplicate',position:2,region:'india'}),v=>v.sheets.Relationships[0].group='projects',v=>v.sheets.Content.push({recordId:'job_1',field:'application.url',value:'https://other.test'}),
 ];
 for(const mutate of cases){const value=input();mutate(value);const plan=planCareerImport(value);assert.equal(plan.valid,false);assert.deepEqual(plan.changes,[]);}
});
test('career import preserves Office row numbers and reports limits, unknown fields and orphan rows',()=>{
 let value=input();value.sheets.Content.unshift({});value.sheets.Content[1].value='x'.repeat(201);const checked=validateCareerImportTables(value);assert.equal(checked.valid,false);assert.ok(checked.issues.some(v=>v.row===3&&v.code==='character_limit'));
 value=input();value.sheets.Content.find(v=>v.field==='summary').value=Array(81).fill('word').join(' ');assert.equal(planCareerImport(value).valid,true);assert.ok(planCareerImport(value).issues.some(v=>v.code==='editorial_guidance'&&v.severity==='warning'));
 value=input();value.sheets.RemoteRegions[0].recordId='missing';assert.ok(errors(planCareerImport(value)).some(v=>v.code==='orphan_row'));
 value=input();value.sheets.Application[0].sendEmail='true';assert.equal(planCareerImport(value).valid,false);
 value=input();value.sheets.Pages=Array.from({length:26},(_,i)=>({...value.sheets.Pages[0],recordId:'job_'+i,slug:'job-'+i}));assert.ok(errors(planCareerImport(value)).some(v=>v.code==='batch_limit'));
 value=input();value.sheets.RemoteRegions=Array.from({length:501},()=>({}));assert.ok(errors(planCareerImport(value)).some(v=>v.code==='row_limit'));
});
test('career import retains rich Office paragraphs and validates lists and tables',()=>{
 const value=input();value.formatting=[{sheet:'Blocks',row:2,field:'text',spans:[{text:'Help guests plan journeys.',bold:true}]}];let plan=planCareerImport(value);assert.equal(plan.valid,true,JSON.stringify(plan.issues));assert.deepEqual(plan.changes[0].payload.body[0].spans,value.formatting[0].spans);
 value.formatting[0].spans[0].text='Unrelated';assert.equal(planCareerImport(value).valid,false);delete value.formatting;
 value.sheets.Blocks.push({recordId:'job_1',itemId:'benefits',position:'2',kind:'list',ordered:'false'});value.sheets.ListItems=[{recordId:'job_1',itemId:'benefit_1',position:'1',blockId:'benefits',text:'Training'}];plan=planCareerImport(value);assert.equal(plan.valid,true);assert.deepEqual(plan.changes[0].payload.body[1].items,['Training']);
 value.sheets.ListItems[0].blockId='missing';assert.ok(errors(planCareerImport(value)).some(v=>v.code==='list_parent'));value.sheets.ListItems[0].blockId='benefits';
 value.sheets.Blocks.push({recordId:'job_1',itemId:'hours',position:'3',kind:'table',caption:'Work hours'});value.sheets.Tables=[{recordId:'job_1',itemId:'head',position:'1',blockId:'hours',role:'header',column1:'Day'},{recordId:'job_1',itemId:'row',position:'1',blockId:'hours',role:'row',column1:'Monday'}];plan=planCareerImport(value);assert.equal(plan.valid,true,JSON.stringify(plan.issues));assert.deepEqual(plan.changes[0].payload.body[2].rows,[['Monday']]);value.sheets.Tables[1].column2='Unlabelled content';assert.ok(errors(planCareerImport(value)).some(v=>v.code==='table_extra_cell'));
});

test('career import rejects an entire mixed batch when one job has conflicting identity or route intent',()=>{
 const value=input();value.sheets.Pages.push({...value.sheets.Pages[0],recordId:'job_2',slug:'second-job'});assert.equal(planCareerImport(value).changes.length,2);
 value.sheets.Pages[1].slug=value.sheets.Pages[0].slug;const duplicate=planCareerImport(value);assert.equal(duplicate.valid,false);assert.deepEqual(duplicate.changes,[]);assert.ok(errors(duplicate).some(v=>v.code==='duplicate_slug'));
 const base=planCareerImport(input()).changes[0].payload,existing=[{recordId:uuid(1),revision:uuid(2),locale:'en',payload:base}];const before=structuredClone(existing);
 const update={templateVersion:'1.0',pageType:'career',sheets:{Pages:[{recordId:uuid(1),operation:'update',expectedRevision:uuid(2),slug:'changed-url',title:'Changed',locale:'en'}]}};
 assert.ok(errors(planCareerImport(update,existing)).some(v=>v.code==='route_change'));assert.deepEqual(existing,before);
});
