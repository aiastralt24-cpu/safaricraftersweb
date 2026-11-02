import test from 'node:test';
import assert from 'node:assert/strict';
import {globalSettingsSchema,newGlobalSettings,globalSettingsImpact} from '../lib/cms/global-settings.ts';
test('settings validate approved structured content and reject script links, missing images and extra code',()=>{
 const settings=newGlobalSettings();assert.equal(globalSettingsSchema.safeParse(settings).success,true);
 for(const patch of [{social:[{id:'social',label:'Social',url:'javascript:alert(1)'}]},{brand:{name:'Brand',tagline:'',logo:{assetId:'image',alt:''}}},{css:'body{}'},{seo:{...settings.seo,titleTemplate:'Missing title slot'}}])assert.equal(globalSettingsSchema.safeParse({...settings,...patch}).success,false);
 const invalid=structuredClone(settings);invalid.footer.groups=[{id:'same',title:'One',links:[]},{id:'same',title:'Two',links:[]}];assert.equal(globalSettingsSchema.safeParse(invalid).success,false);
});
test('impact detects shared changes, sensitive indexing and maintenance without rewriting inputs',()=>{
 const before=newGlobalSettings(),after=structuredClone(before);assert.deepEqual(globalSettingsImpact(before,after),[]);
 after.contact.email='client@example.test';assert.deepEqual(globalSettingsImpact(before,after).map(v=>v.field),['contact']);
 after.seo.indexing='noindex';after.errors.maintenance.enabled=true;
 const impact=globalSettingsImpact(before,after);assert.ok(impact.some(v=>v.field==='seo.indexing'&&v.requiresElevatedApproval));assert.ok(impact.some(v=>v.field==='errors.maintenance.enabled'&&v.requiresElevatedApproval));assert.equal(before.seo.indexing,'index');
});
test('nested key order does not create false impact and new drafts have independent defaults',()=>{
 const before=newGlobalSettings(),after=structuredClone(before);after.brand={tagline:before.brand.tagline,name:before.brand.name};assert.deepEqual(globalSettingsImpact(before,after),[]);
 after.errors.notFound.title='Changed';assert.equal(after.errors.serverError.title,'');assert.equal(newGlobalSettings().errors.notFound.title,'');
});

test('new safe defaults do not falsely require elevated approval, but initial sensitive settings do',()=>{
 const initial=newGlobalSettings();assert.ok(globalSettingsImpact(null,initial).every(item=>!item.requiresElevatedApproval));
 initial.seo.indexing='noindex';initial.errors.maintenance.enabled=true;const impact=globalSettingsImpact(null,initial);assert.ok(impact.some(item=>item.field==='seo.indexing'&&item.requiresElevatedApproval));assert.ok(impact.some(item=>item.field==='errors.maintenance.enabled'&&item.requiresElevatedApproval));
});
