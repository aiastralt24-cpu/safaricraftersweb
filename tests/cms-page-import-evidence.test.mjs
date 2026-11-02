import test from 'node:test';
import assert from 'node:assert/strict';
import {pageImportLinks,verifyPageImportEvidence} from '../lib/cms/page-import-evidence.ts';
const recordId='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',versionId='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
function changes(){return [{importId:'guide',payload:{seo:{image:{assetId:'seo-image'}},composition:{sections:[{kind:'hero',data:{image:{assetId:'hero-image'}}},{kind:'downloads',visible:false,data:{items:[{document:{recordId:recordId.toUpperCase()},versionId:versionId.toUpperCase()},{document:{recordId},versionId}]}},{kind:'cards',data:{items:[{image:{assetId:'hero-image'}}]}}]}}}];}
function evidence(input){const links=pageImportLinks(input);return {assets:links.assets.map(assetId=>({assetId,available:true})),documents:links.documents.map(value=>({...value,available:true}))};}
test('page import evidence includes hidden pins, nested and SEO images, with stable unique references',()=>{
 const input=changes(),before=structuredClone(input);
 assert.deepEqual(pageImportLinks(input),{assets:['seo-image','hero-image'],documents:[{recordId,versionId}]});
 assert.deepEqual(verifyPageImportEvidence(input,evidence(input)).issues,[]);
 assert.deepEqual(input,before);
});
test('page import evidence rejects missing, extra, duplicated, reordered and malformed evidence',()=>{
 const input=changes();
 for(const mutate of [e=>delete e.documents,e=>e.documents.pop(),e=>e.documents.push({...e.documents[0]}),e=>e.documents[0].versionId=recordId,e=>e.documents[0].privateKey='secret',e=>e.assets.reverse(),e=>e.assets.pop(),e=>e.assets.push({...e.assets[0]}),e=>e.assets[0].available='true',e=>e.extra=true]){
  const raw=evidence(input);mutate(raw);assert.equal(verifyPageImportEvidence(input,raw),null);
 }
 assert.equal(verifyPageImportEvidence(input,null),null);
 assert.deepEqual(verifyPageImportEvidence([],{assets:[],documents:[]}).issues,[]);
 assert.equal(verifyPageImportEvidence([],evidence(input)),null);
});
test('unavailable evidence reports each affected page without treating a different version as current',()=>{
 const input=changes();input.push({...structuredClone(input[0]),importId:'second'});
 const raw=evidence(input);raw.assets[1].available=false;raw.documents[0].available=false;
 const result=verifyPageImportEvidence(input,raw);
 assert.deepEqual(result.issues.map(value=>value.code),['asset_unavailable','download_unavailable','asset_unavailable','download_unavailable']);
 assert.match(result.issues[0].message,/^guide:/);assert.match(result.issues[2].message,/^second:/);
 assert.equal(result.issues.every(value=>value.severity==='error'),true);
 raw.documents[0].recordId=recordId.toUpperCase();raw.documents[0].versionId=versionId.toUpperCase();
 assert.ok(verifyPageImportEvidence(input,raw));
});
