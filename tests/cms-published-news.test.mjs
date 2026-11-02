import test from 'node:test';import assert from 'node:assert/strict';
import {newNews} from '../lib/cms/news.ts';import {projectPublishedNews} from '../lib/cms/published-news.ts';
const id='11111111-1111-4111-8111-111111111111';const {internalNotes,relationships,...payload}={...newNews(),slug:'example',summary:'Summary',author:'Author',date:'2026-10-29',topic:'Topic',body:[{id:'body',kind:'paragraph',text:'Body'}]};
const envelope={recordId:id,revisionId:id,type:'news',path:'/news/example',locale:'en',payload,related:[]};
test('public news projects only exact published content with no private data',()=>{
 assert.equal(projectPublishedNews(envelope,envelope.path).content.summary,'Summary');
 for(const patch of [{internalNotes:'private'},{relationships},{body:[]},{author:''},{kind:'pressRelease',dateline:''}])assert.throws(()=>projectPublishedNews({...envelope,payload:{...payload,...patch}},envelope.path));
 assert.throws(()=>projectPublishedNews({...envelope,ownerId:id},envelope.path));assert.throws(()=>projectPublishedNews(envelope,'/news/other'));assert.throws(()=>projectPublishedNews(envelope,envelope.path,'fr'));
});

test('news related cards reject unsafe routes, duplicates and private fields',()=>{
 const related=[{type:'project',title:'Project',href:'/projects/example'}];assert.deepEqual(projectPublishedNews({...envelope,related},envelope.path).related,related);
 for(const rows of [[{...related[0],href:'https://elsewhere.test'}],[{...related[0],recordId:id}],[...related,...related],[{type:'page',title:'Self',href:envelope.path}],[{type:'document',title:'File',href:'/api/documents/download?record=private'}],[{type:'document',title:'File',href:'/api/documents/download?record='+ '-'.repeat(36)+'&revision='+ '-'.repeat(36)}]])assert.throws(()=>projectPublishedNews({...envelope,related:rows},envelope.path));
});
