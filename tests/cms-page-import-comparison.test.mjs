import test from 'node:test';import assert from 'node:assert/strict';
import {comparePageImport,pageImportComparisonSchema} from '../lib/cms/page-import-comparison.ts';
import {validateComposition} from '../lib/cms/composition.ts';import {newPageSeo} from '../lib/cms/page-seo.ts';
const section=(id,title)=>({id,kind:'text',controls:{label:title},data:{title,body:[]}});
function payload(sections){return {composition:validateComposition({schemaVersion:1,title:'Guide',sections}).page,seo:newPageSeo()};}
test('page comparison identifies stable-ID removals, additions, edits and reordering',()=>{
 const before=payload([section('intro','Introduction'),section('old','Old advice'),section('keep','Keep')]),after=payload([section('keep','Keep'),section('intro','Updated introduction'),section('new','New advice')]),original=structuredClone(before);
 after.composition.title='New title';after.seo.description='New description';const result=comparePageImport(before,after);
 assert.ok(pageImportComparisonSchema.safeParse(result).success);assert.deepEqual(result.title,{before:'Guide',after:'New title'});
 assert.deepEqual(result.sections.map(s=>[s.id,s.action]),[['old','removed'],['keep','moved'],['intro','changedAndMoved'],['new','added']]);
 assert.deepEqual(result.sections[2].fields,['controls.label','data.title']);assert.equal(result.sections[0].before.label,'Old advice');assert.equal(result.sections[0].after,null);
 assert.deepEqual(result.seo,[{field:'description',before:'',after:'New description'}]);assert.deepEqual(before,original);
});
test('page comparison ignores object key order and reports SEO removal and new-page additions',()=>{
 const before=payload([section('intro','Introduction')]);before.seo.description='Previous description';const after=structuredClone(before);after.composition.sections[0].data={body:[],title:'Introduction'};
 assert.deepEqual(comparePageImport(before,after),{title:null,sections:[],seo:[]});after.seo.description='';assert.deepEqual(comparePageImport(before,after).seo,[{field:'description',before:'Previous description',after:''}]);
 const created=comparePageImport(null,after);assert.equal(created.title.before,null);assert.equal(created.sections[0].action,'added');assert.deepEqual(created.seo,[]);
});
