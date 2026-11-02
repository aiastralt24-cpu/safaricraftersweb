import test from 'node:test';import assert from 'node:assert/strict';
import {projectPublishedNavigation} from '../lib/cms/published-navigation.ts';import {validateNavigationDraft} from '../lib/cms/navigation-validation.ts';
const id='00000000-0000-4000-8000-000000000001',ref='00000000-0000-4000-8000-000000000002';
test('custom page navigation requires typed current evidence and suppresses withdrawn targets and children',()=>{
 const payload={schemaVersion:1,title:'Menu',items:[{id:'guide',parentId:null,label:'Guide',target:{kind:'record',contentType:'page',recordId:ref},visibility:{visible:true}},{id:'child',parentId:'guide',label:'Contact',target:{kind:'url',href:'/contact'},visibility:{visible:true}}]},references=[{recordId:ref,available:true,type:'page',path:'/travel-resources/guide',locale:'en',title:'Guide'}],identity={site:id,record:id,locale:'en'},envelope={websiteId:id,recordId:id,revisionId:id,locale:'en',payload,references};
 assert.equal(validateNavigationDraft({type:'navigation',path:null,locale:'en',payload},references).contentChecksPass,true);assert.equal(projectPublishedNavigation(envelope,identity,{now:new Date()}).items[0].link.href,references[0].path);
 assert.deepEqual(projectPublishedNavigation({...envelope,references:[{recordId:ref,available:false}]},identity,{now:new Date()}).items,[]);
 for(const path of ['/admin/guide','/journeys/guide','/a%2fb']){const evidence=[{...references[0],path}];assert.equal(validateNavigationDraft({type:'navigation',path:null,locale:'en',payload},evidence).contentChecksPass,false);assert.throws(()=>projectPublishedNavigation({...envelope,references:evidence},identity,{now:new Date()}));}
});
