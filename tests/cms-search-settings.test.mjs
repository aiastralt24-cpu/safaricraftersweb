import test from 'node:test';
import assert from 'node:assert/strict';
import {newGlobalSettings} from '../lib/cms/global-settings.ts';
import {searchCategories} from '../lib/cms/search-policy.ts';
import {readSearchSettings} from '../lib/cms/search-settings.ts';
import {validateSettingsDraft} from '../lib/cms/settings-validation.ts';
const site='00000000-0000-4000-8000-000000000001';
test('search selection preserves configured categories and refuses unsupported delivery',()=>{
 const settings={...newGlobalSettings().search,contentTypes:['journalArticle','journey']};
 assert.deepEqual(searchCategories(settings),['Journal','Journey']);
 assert.deepEqual(searchCategories({...settings,contentTypes:['project']}),['Project']);
 assert.deepEqual(searchCategories({...settings,contentTypes:['product']}),['Product']);
 assert.throws(()=>searchCategories({...settings,contentTypes:['unsupported']}),/not available/);
 assert.deepEqual(searchCategories({...settings,enabled:false,contentTypes:['page']}),[]);
 assert.deepEqual(searchCategories({...settings,contentTypes:['page']}),['Page']);
 const payload=newGlobalSettings();payload.search.contentTypes=['product'];const result=validateSettingsDraft({payload,path:null,locale:'en',type:'settings'});
 assert.ok(!result.findings.some(f=>f.code==='settings_search_type_not_ready'&&f.field==='search.contentTypes.0'));
});
test('search settings use published data only and disabled rollout makes no call',async()=>{
 assert.equal(await readSearchSettings({},async()=>assert.fail('network')),undefined);
 const env={CMS_SEARCH_SETTINGS_ENABLED:'true',CMS_PUBLIC_DELIVERY_ENABLED:'true',CMS_WEBSITE_ID:site,CMS_SUPABASE_URL:'https://db.test',CMS_SUPABASE_ANON_KEY:'anon'};
 const payload=newGlobalSettings();payload.search.contentTypes=['journey'];
 const row={websiteId:site,recordId:site,revisionId:site,locale:'en',payload};
 assert.deepEqual(await readSearchSettings(env,async()=>Response.json(row)),payload.search);
 await assert.rejects(readSearchSettings(env,async()=>Response.json(null)),/unavailable/);
 await assert.rejects(readSearchSettings(env,async()=>Response.json({...row,locale:'fr'})));
 payload.search.enabled=false;assert.equal((await readSearchSettings(env,async()=>Response.json(row))).enabled,false);
});
