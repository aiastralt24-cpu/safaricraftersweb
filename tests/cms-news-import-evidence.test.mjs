import test from 'node:test';import assert from 'node:assert/strict';
import {newNews} from '../lib/cms/news.ts';import {newsImportLinks,verifyNewsImportEvidence} from '../lib/cms/news-import-evidence.ts';
const id='00000000-0000-4000-8000-000000000001',revision='00000000-0000-4000-8000-000000000002';
const changes=[{importId:'example',payload:{...newNews(),image:{assetId:'photo',alt:'Photo',decorative:false},heroImage:{assetId:'photo',alt:'Hero',decorative:false},relationships:{...newNews().relationships,pages:[{recordId:id}],articles:[{recordId:id}]}}}];
const evidence={assets:[{assetId:'photo',available:true}],references:[{recordId:id,type:'page',available:true,revision},{recordId:id,type:'journalArticle',available:true,revision}]};
test('News import evidence deduplicates images but keeps typed references and verifies exact coverage',()=>{
 assert.deepEqual(newsImportLinks(changes),{assets:['photo'],references:[{type:'page',recordId:id},{type:'journalArticle',recordId:id}]});assert.deepEqual(verifyNewsImportEvidence(changes,evidence).issues,[]);
 for(const raw of [{...evidence,assets:[]},{...evidence,references:[...evidence.references].reverse()},{...evidence,private:'data'},{...evidence,references:[{...evidence.references[0],revision:null},evidence.references[1]]}])assert.equal(verifyNewsImportEvidence(changes,raw),null);
});
test('News import evidence reports unavailable media and references without permitting publication',()=>{
 const result=verifyNewsImportEvidence(changes,{assets:[{assetId:'photo',available:false}],references:evidence.references.map(r=>({...r,available:false,revision:null}))});assert.equal(result.issues.length,3);assert.ok(result.issues.every(i=>i.severity==='error'));
});
