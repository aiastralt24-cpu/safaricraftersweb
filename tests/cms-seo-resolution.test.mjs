import test from 'node:test';
import assert from 'node:assert/strict';
import {resolvePageSeo} from '../lib/cms/seo-resolution.ts';
import {handleSeoResolution} from '../lib/cms/seo-resolution-api.ts';
import {newGlobalSettings} from '../lib/cms/global-settings.ts';
import {newPageSeo} from '../lib/cms/page-seo.ts';
const context={origin:'https://example.test',path:'/about',title:'About us'};
test('SEO resolution reports exact default and override sources without mutating drafts',()=>{
 const settings=newGlobalSettings(),seo=newPageSeo();settings.seo.description='Site description';
 const result=resolvePageSeo(seo,settings,context);
 assert.equal(result.title.value,'About us | Safari Crafters');assert.equal(result.title.source,'Website title template + page title');assert.equal(result.description.value,'Site description');assert.equal(result.canonical.value,'https://example.test/about');assert.equal(result.sitemap.value,true);
 seo.title='Custom title';seo.socialTitle='Social';seo.breadcrumbLabel='Company';const overridden=resolvePageSeo(seo,settings,context);assert.equal(overridden.title.value,'Custom title');assert.equal(overridden.socialTitle.value,'Social');assert.equal(overridden.breadcrumbLabel.value,'Company');assert.equal(settings.seo.titleTemplate,'%s | Safari Crafters');
});
test('website noindex dominates page index and sitemap include, canonical alternatives are excluded',()=>{
 const settings=newGlobalSettings(),seo={...newPageSeo(),indexing:'index',sitemap:'include'};settings.seo.indexing='noindex';
 const restricted=resolvePageSeo(seo,settings,context);assert.equal(restricted.indexing.value,'noindex');assert.equal(restricted.indexing.source,'Website noindex restriction');assert.equal(restricted.sitemap.value,false);
 settings.seo.indexing='index';seo.canonical='https://other.test/original';assert.equal(resolvePageSeo(seo,settings,context).sitemap.value,false);
 for(const patch of [{origin:'https://user:secret@example.test'},{origin:'https://example.test/subpath'},{origin:'http://example.test'},{path:'//other'},{path:'/a//b'}])assert.throws(()=>resolvePageSeo(newPageSeo(),settings,{...context,...patch}));
});
const site='00000000-0000-4000-8000-000000000001',record='00000000-0000-4000-8000-000000000002',revision='00000000-0000-4000-8000-000000000003';
const body={site,record,revision,title:'About',seo:newPageSeo()};
const request=(value=body)=>new Request('https://cms.test/api/cms/seo/resolve',{method:'POST',headers:{Authorization:'Bearer a.b.c','Content-Type':'application/json'},body:JSON.stringify(value)});
const stored={id:record,type:'page',currentRevision:revision,locale:'fr',path:'/about'};
test('resolution API uses authorized locale settings and rejects stale page or inaccessible settings',async()=>{
 const calls=[];const rpc=async(token,name,args)=>{calls.push({token,name,args});return name==='get_editor_record'?stored:{record:{id:site,currentRevision:revision,payload:newGlobalSettings()}};};
 const response=await handleSeoResolution(request(),rpc,'https://example.test');assert.equal(response.status,200);const result=(await response.json()).result;assert.equal(result.publicationAuthorized,false);assert.equal(calls[1].args.p_locale,'fr');assert.equal(calls[0].token,'a.b.c');assert.match(response.headers.get('cache-control'),/no-store/);
 assert.equal((await handleSeoResolution(request({...body,revision:site}),rpc,'https://example.test')).status,409);
 assert.equal((await handleSeoResolution(request(),async(_t,n)=>n==='get_editor_record'?stored:{record:null},'https://example.test')).status,422);
 assert.equal((await handleSeoResolution(request({...body,settings:newGlobalSettings()}),async()=>assert.fail('unexpected RPC'),'https://example.test')).status,422);
 assert.equal((await handleSeoResolution(request(),rpc,'')).status,422);
});
test('website fallback sharing image fills only absent images and reports its source',()=>{
 const settings=newGlobalSettings(),fallback={assetId:'fallback',alt:'Fallback',decorative:false},explicit={assetId:'explicit',alt:'Explicit',decorative:false};settings.fallbackImage=fallback;
 let result=resolvePageSeo(newPageSeo(),settings,context);assert.deepEqual(result.socialImage.value,fallback);assert.equal(result.socialImage.source,'Website fallback image');
 settings.seo.socialImage=explicit;assert.deepEqual(resolvePageSeo(newPageSeo(),settings,context).socialImage.value,explicit);
 assert.equal(resolvePageSeo({...newPageSeo(),socialImage:{...explicit,assetId:'page'}},settings,context).socialImage.value.assetId,'page');assert.equal(settings.fallbackImage.assetId,'fallback');
});
