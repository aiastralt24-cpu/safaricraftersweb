import test from 'node:test';import assert from 'node:assert/strict';
import {defaultInterfaceText,interfaceTextForLocale,interfaceTextSchema} from '../lib/cms/interface-text.ts';
import {globalSettingsSchema,newGlobalSettings} from '../lib/cms/global-settings.ts';
import {readFooterSettings} from '../lib/cms/footer-settings.ts';
import {readCookiePresentation} from '../lib/cms/cookie-settings.ts';
const id='00000000-0000-4000-8000-000000000001';
test('interface wording preserves English compatibility but never defaults translated controls',()=>{
 assert.deepEqual(interfaceTextForLocale(undefined,'en','Brand'),defaultInterfaceText('Brand'));assert.throws(()=>interfaceTextForLocale(undefined,'fr','Marque'),/Complete translated/);
 const text={...defaultInterfaceText('Marque'),homeLabel:'Accueil',openMenu:'Ouvrir le menu',closeMenu:'Fermer le menu',cookieSaveError:'Impossible de sauvegarder votre choix.'};assert.deepEqual(interfaceTextForLocale(text,'fr','Marque'),text);
 for(const change of [{openMenu:''},{closeMenu:' '.repeat(3)},{homeHref:'javascript:alert(1)'},{cookieSaveError:'x'.repeat(1001)},{privateNote:'secret'}])assert.equal(interfaceTextSchema.safeParse({...text,...change}).success,false);
 assert.ok(globalSettingsSchema.safeParse(newGlobalSettings()).success);assert.ok(globalSettingsSchema.safeParse({...newGlobalSettings(),interfaceText:text}).success);
});
test('published footer and cookie controls receive configured wording without extra settings reads',async()=>{
 const interfaceText={...defaultInterfaceText('Brand'),footer:'Custom footer',cookieSaveError:'Custom storage error'},payload={...newGlobalSettings(),interfaceText},env={CMS_PUBLIC_DELIVERY_ENABLED:'true',CMS_WEBSITE_ID:id,CMS_SUPABASE_URL:'https://db.test',CMS_SUPABASE_ANON_KEY:'anon',CMS_FOOTER_DELIVERY_ENABLED:'true',CMS_COOKIE_SETTINGS_ENABLED:'true'};let calls=0;
 const fetcher=async()=>{calls++;return Response.json({websiteId:id,recordId:id,revisionId:id,locale:'en',payload});};
 assert.deepEqual((await readFooterSettings(env,fetcher)).interfaceText,interfaceText);assert.deepEqual((await readCookiePresentation(env,fetcher)).interfaceText,interfaceText);assert.equal(calls,2);
});
