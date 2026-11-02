import test from 'node:test';import assert from 'node:assert/strict';
import {validateComposition} from '../lib/cms/composition.ts';
import {downloadReferenceFindings} from '../lib/cms/download-reference-validation.ts';
const recordId='00000000-0000-4000-8000-000000000001',versionId='00000000-0000-4000-8000-000000000002';
const section=(id)=>({id,kind:'downloads',controls:{label:'Resources',visible:false},data:{title:'Downloads',items:[{id:'guide',label:'Guide',document:{recordId},versionId}]}});
const page=validateComposition({schemaVersion:1,title:'Resources',sections:[section('first'),section('second')]}).page;
test('download findings bind exact unique trusted evidence to every section occurrence including hidden links',()=>{
 assert.ok(page);const evidence=[{recordId,versionId,available:true}];assert.deepEqual(downloadReferenceFindings(page,evidence),[]);
 assert.equal(downloadReferenceFindings(page)[0].code,'download_evidence_missing');
 for(const value of [[],[...evidence,...evidence],[{...evidence[0],versionId:recordId}]])assert.equal(downloadReferenceFindings(page,value)[0].code,'download_evidence_mismatch');
 const failed=downloadReferenceFindings(page,[{recordId,versionId,available:false}]);assert.equal(failed.length,2);assert.deepEqual(failed.map(f=>f.field),['composition.sections.0.data.items.0.document','composition.sections.1.data.items.0.document']);assert.ok(failed.every(f=>f.code==='download_unavailable'));
 assert.deepEqual(downloadReferenceFindings(undefined),[]);
 assert.deepEqual(downloadReferenceFindings({...page,sections:[]}),[]);
});
