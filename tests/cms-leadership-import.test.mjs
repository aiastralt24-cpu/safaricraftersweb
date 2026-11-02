import test from 'node:test';import assert from 'node:assert/strict';
import {newLeadership} from '../lib/cms/leadership.ts';
import {planLeadershipImport} from '../lib/cms/leadership-import-plan.ts';
import {validateLeadershipImportTables} from '../lib/cms/leadership-import-contract.ts';
const recordId='00000000-0000-4000-8000-000000000001',revision='00000000-0000-4000-8000-000000000002';
const input=()=>({templateVersion:'1.0',pageType:'leadership',sheets:{
 Pages:[{recordId:'profile',operation:'create',slug:'example-leader',title:'Example Leader',locale:'en'}],
 Content:[{recordId:'profile',field:'role',value:'Director'},{recordId:'profile',field:'department',value:'Board'},{recordId:'profile',field:'status',value:'former'},{recordId:'profile',field:'sortOrder',value:'12'},{recordId:'profile',field:'summary',value:'A leadership summary.'}],
 Blocks:[{recordId:'profile',itemId:'bio',position:'1',kind:'paragraph',text:'A complete biography.'}],
 Links:[{recordId:'profile',itemId:'link',position:'1',label:'Contact',href:'/contact'}],
}});
test('leadership proposals retain scalar identity, rich biography and ordered links without writing',()=>{
 const source=input(),before=structuredClone(source),result=planLeadershipImport(source);assert.equal(result.valid,true,JSON.stringify(result.issues));assert.deepEqual(source,before);
 const change=result.changes[0];assert.equal(change.path,'/leadership/example-leader');assert.equal(change.payload.sortOrder,12);assert.equal(change.payload.status,'former');assert.equal(change.payload.role,'Director');assert.equal(change.payload.body[0].text,'A complete biography.');assert.deepEqual(change.payload.links,[{label:'Contact',href:'/contact'}]);assert.equal(change.expectedRevision,null);
});
test('leadership update retains omitted fields and requires explicit collection replacement or clearing',()=>{
 const base={...newLeadership(),slug:'example-leader',role:'Founder',summary:'Keep summary',links:[{label:'Existing',href:'/about'}],body:[{id:'old',kind:'paragraph',text:'Keep biography'}],internalNotes:'Retain notes'};
 const current=[{recordId,revision,locale:'en',payload:base}],source={templateVersion:'1.0',pageType:'leadership',sheets:{Pages:[{recordId,expectedRevision:revision,operation:'update',slug:'example-leader',title:'Renamed Leader',locale:'en'}]}};
 const result=planLeadershipImport(source,current);assert.equal(result.valid,true);assert.deepEqual(result.changes[0].payload,{...base,title:'Renamed Leader'});
 source.sheets.Links=[{recordId,itemId:'new',position:'1',label:'New link',href:'/contact'}];assert.ok(planLeadershipImport(source,current).issues.some(i=>i.code==='replacement_required'));
 source.sheets.Pages[0].replaceCollections='links';assert.deepEqual(planLeadershipImport(source,current).changes[0].payload.links,[{label:'New link',href:'/contact'}]);
 source.sheets.Links=[];assert.deepEqual(planLeadershipImport(source,current).changes[0].payload.links,[]);assert.deepEqual(base.links,[{label:'Existing',href:'/about'}]);
 for(const patch of [{expectedRevision:recordId},{slug:'changed-url'},{locale:'fr'}]){const bad=structuredClone(source);Object.assign(bad.sheets.Pages[0],patch);assert.equal(planLeadershipImport(bad,current).valid,false);}
});
test('leadership import separates hard character limits from editorial guidance',()=>{
 const source=input();source.sheets.Content.find(r=>r.field==='summary').value=Array(81).fill('word').join(' ');let result=planLeadershipImport(source);assert.equal(result.valid,true);assert.ok(result.issues.some(i=>i.code==='editorial_guidance'&&i.severity==='warning'));
 source.sheets.Content.find(r=>r.field==='summary').value='x'.repeat(2001);assert.equal(planLeadershipImport(source).valid,false);
 for(const value of ['-1','1.5','10000','1e2','','01']){const bad=input();bad.sheets.Content.find(r=>r.field==='sortOrder').value=value;assert.equal(planLeadershipImport(bad).valid,false,value);}
 const bad=input();bad.sheets.Pages[0].title='x'.repeat(201);assert.equal(validateLeadershipImportTables(bad).valid,false);
});
test('leadership imports reject unknown fields and incompatible media, relationships and unsafe links',()=>{
 for(const mutate of [
 s=>s.sheets.Content.push({recordId:'profile',field:'author',value:'Unsupported'}),
 s=>s.sheets.Content.push({recordId:'profile',field:'__proto__',value:'Unsupported'}),
 s=>s.sheets.Links[0].href='javascript:alert(1)',
 s=>s.sheets.Media=[{recordId:'profile',itemId:'photo',position:'1',role:'heroImage',assetId:'test',alt:'Photo',decorative:'false'}],
 s=>s.sheets.Relationships=[{recordId:'profile',itemId:'ref',position:'1',group:'destinations',targetId:recordId}],
 s=>s.sheets.Pages[0].replaceCollections='gallery',
 s=>s.sheets.Pages[0].extra='cannot discard',
 ]){const source=input();mutate(source);const result=planLeadershipImport(source);assert.equal(result.valid,false);assert.deepEqual(result.changes,[]);}
});
test('leadership import batches fail atomically on orphan rows, duplicate positions or invalid late rows',()=>{
 for(const mutate of [
 s=>s.sheets.Links[0].recordId='missing',
 s=>s.sheets.Links.push({...s.sheets.Links[0],itemId:'second'}),
 s=>s.sheets.Pages.push({...s.sheets.Pages[0],recordId:'second',slug:'bad/slug'}),
 s=>s.sheets.Pages.push({...s.sheets.Pages[0],recordId:'second'}),
 s=>s.sheets.Pages=Array.from({length:26},(_,i)=>({...s.sheets.Pages[0],recordId:'p'+i,slug:'person-'+i})),
 ]){const source=input();mutate(source);const result=planLeadershipImport(source);assert.equal(result.valid,false);assert.deepEqual(result.changes,[]);}
});
test('leadership import preserves media, same-type references and exact Office formatting',()=>{
 const source=input();source.sheets.Media=[{recordId:'profile',itemId:'portrait',position:'1',role:'image',assetId:'portrait',alt:'Portrait',decorative:'false'}];
 source.sheets.Relationships=[{recordId:'profile',itemId:'related',position:'1',group:'articles',targetId:recordId}];
 source.formatting=[{sheet:'Blocks',row:2,field:'text',spans:[{text:'A complete biography.',bold:true}]}];
 const result=planLeadershipImport(source);assert.equal(result.valid,true,JSON.stringify(result.issues));assert.equal(result.changes[0].payload.image.assetId,'portrait');assert.deepEqual(result.changes[0].payload.relationships.articles,[{recordId}]);assert.equal(result.changes[0].payload.body[0].spans[0].bold,true);
 source.formatting[0].spans[0].text='Different';assert.equal(planLeadershipImport(source).valid,false);
});
