import test from 'node:test';import assert from 'node:assert/strict';
import {pageLanguageLinks} from '../lib/cms/page-language-links.ts';import {newGlobalSettings} from '../lib/cms/global-settings.ts';
const id=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`,page={recordId:id(2),revisionId:id(3),locale:'fr',path:'/languages/fr/histoire'};
const env={CMS_LOCALIZED_PAGES_ENABLED:'true',CMS_PUBLIC_DELIVERY_ENABLED:'true',CMS_CUSTOM_PAGES_ENABLED:'true',CMS_WEBSITE_ID:id(1),CMS_SUPABASE_URL:'https://db.test',CMS_SUPABASE_ANON_KEY:'anon'};
const settings={...newGlobalSettings().header,languageSelector:true,languageSelectorLabel:'Langues'};
const data=()=>({websiteId:id(1),recordId:id(2),revisionId:id(3),locale:'fr',variants:[{recordId:id(2),revisionId:id(3),locale:'fr',path:'/histoire',indexable:true,canonical:''},{recordId:id(4),revisionId:id(5),locale:'en',path:'/story',indexable:false,canonical:'https://example.com/other'}]});
test('page language links use native names, exact current identity and published paths including noindex destinations',async()=>{
 const result=await pageLanguageLinks(page,settings,env,async()=>Response.json(data()));assert.equal(result.label,'Langues');assert.deepEqual(result.links,[{locale:'fr',href:'/languages/fr/histoire',current:true,label:'français'},{locale:'en',href:'/story',current:false,label:'English'}]);
 for(const mutate of [v=>v.variants.pop(),v=>v.variants[0].path='/changed']){const value=data();mutate(value);assert.equal(await pageLanguageLinks(page,settings,env,async()=>Response.json(value)),null);}
 assert.equal(await pageLanguageLinks(page,settings,env,async()=>Response.json(null)),null);
});
test('selector remains offline when disabled and rejects substituted publication data',async()=>{
 const unexpected=async()=>assert.fail('unexpected network');assert.equal(await pageLanguageLinks(page,settings,{},unexpected),null);assert.equal(await pageLanguageLinks(page,{...settings,languageSelector:false},env,unexpected),null);
 await assert.rejects(()=>pageLanguageLinks(page,{...settings,languageSelectorLabel:''},env,unexpected),/label/);
 const value=data();value.revisionId=id(9);await assert.rejects(()=>pageLanguageLinks(page,settings,env,async()=>Response.json(value)),/changed/);
});
