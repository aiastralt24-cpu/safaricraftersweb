import test from 'node:test';import assert from 'node:assert/strict';
import {parsePageRecoveryDraft} from '../lib/cms/page-draft-recovery.ts';
import {newPageSeo} from '../lib/cms/page-seo.ts';
const value={title:'Recovered title',path:'/field-guide',page:{schemaVersion:1,title:'Saved title',sections:[{id:'intro',kind:'text',controls:{label:'Intro',headingLevel:'h1'},data:{title:'Heading',body:[]}}]},seo:newPageSeo(),conceptMenu:null};
test('page recovery preserves editable composition and SEO for pages and homepage',()=>{
 const parsed=parsePageRecoveryDraft(value,value.path);assert.equal(parsed.title,'Recovered title');assert.equal(parsed.page.sections[0].data.title,'Heading');assert.deepEqual(parsed.seo,value.seo);
 assert.equal(parsePageRecoveryDraft({...value,path:'/'},'/').path,'/');
});
test('page recovery rejects route changes, malformed sections, missing SEO and foreign navigation',()=>{
 assert.throws(()=>parsePageRecoveryDraft(value,'/other'),/URL/);
 assert.throws(()=>parsePageRecoveryDraft({...value,page:{sections:[]}},value.path),/sections/);
 assert.throws(()=>parsePageRecoveryDraft({...value,seo:null},value.path));
 assert.throws(()=>parsePageRecoveryDraft({...value,conceptMenu:{}},value.path));
 assert.throws(()=>parsePageRecoveryDraft({...value,title:''},value.path));
 assert.throws(()=>parsePageRecoveryDraft({...value,extra:'ignored?'},value.path));
});

test('new page recovery preserves duplicate identity and rejects page-type or duplicate-route changes',async()=>{
 const {parseNewPageRecoveryDraft}=await import('../lib/cms/page-draft-recovery.ts');
 const source='00000000-0000-4000-8000-000000000001';
 assert.equal(parseNewPageRecoveryDraft({...value,duplicateSource:source},'page').duplicateSource,source);
 assert.equal(parseNewPageRecoveryDraft({...value,path:'/',duplicateSource:null},'homepage').path,'/');
 assert.throws(()=>parseNewPageRecoveryDraft({...value,path:'/',duplicateSource:null},'page'));
 assert.throws(()=>parseNewPageRecoveryDraft({...value,duplicateSource:source},'homepage'));
 assert.throws(()=>parseNewPageRecoveryDraft({...value,path:'/about',duplicateSource:source},'page'));
});
