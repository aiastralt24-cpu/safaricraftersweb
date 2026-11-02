import test from 'node:test';
import assert from 'node:assert/strict';
import {localizedShellSettings,loadLocalizedShell} from '../lib/cms/localized-shell.ts';
import {newGlobalSettings} from '../lib/cms/global-settings.ts';
import {defaultInterfaceText} from '../lib/cms/interface-text.ts';
const id='00000000-0000-4000-8000-000000000001';
const resolve=(path,locale)=>path.startsWith('/welcome')?`/languages/${locale}${path}`:null;
test('localized shared settings map footer, cookie, message and home destinations without mutating source',()=>{
 const settings=newGlobalSettings();settings.interfaceText={...defaultInterfaceText('Marque'),homeHref:'/welcome'};
 settings.footer.legalLinks=[{id:'legal',link:{label:'Conditions',href:'/welcome?legal=1#terms',newWindow:false}}];
 settings.cookies.policy={label:'Confidentialité',href:'https://safaricrafters.com/welcome#privacy',newWindow:false};
 settings.announcement={enabled:true,title:'Actualités',body:'',button:{label:'Lire',href:'/welcome',newWindow:false}};
 settings.stickyCta={enabled:true,button:{label:'Contact',href:'mailto:hello@example.com',newWindow:false}};
 const before=structuredClone(settings),result=localizedShellSettings(settings,'fr',resolve);
 assert.deepEqual(settings,before);assert.equal(result.interfaceText.homeHref,'/languages/fr/welcome');
 assert.equal(result.footer.legalLinks[0].link.href,'/languages/fr/welcome?legal=1#terms');
 assert.equal(result.cookies.policy.href,'/languages/fr/welcome#privacy');assert.equal(result.announcement.button.href,'/languages/fr/welcome');assert.equal(result.stickyCta.button.href,'mailto:hello@example.com');
 settings.cookies.policy.href='/missing';assert.throws(()=>localizedShellSettings(settings,'fr',resolve),/unavailable/);
 settings.cookies.policy.href='#privacy';settings.announcement.title=' ';assert.throws(()=>localizedShellSettings(settings,'fr',resolve),/accessible title/);
});
test('localized shell refuses settings revisions that differ from page metadata before resolving routes',async()=>{
 const env={CMS_LOCALIZED_PAGES_ENABLED:'true',CMS_CUSTOM_PAGES_ENABLED:'true',CMS_PUBLIC_DELIVERY_ENABLED:'true',CMS_WEBSITE_ID:id,CMS_SUPABASE_URL:'https://db.test',CMS_SUPABASE_ANON_KEY:'anon'};let calls=0;
 const fetcher=async()=>{calls++;return Response.json({settings:{websiteId:id,locale:'fr',recordId:id,revisionId:id,payload:newGlobalSettings()}});};
 assert.equal(await loadLocalizedShell('fr',{recordId:id,revisionId:id},{},fetcher),null);assert.equal(calls,0);
 await assert.rejects(()=>loadLocalizedShell('fr',{recordId:id,revisionId:'00000000-0000-4000-8000-000000000002'},env,fetcher),/publication changed/);assert.equal(calls,1);
 await assert.rejects(()=>loadLocalizedShell('en',{recordId:id,revisionId:id},env,fetcher),/Invalid/);assert.equal(calls,1);
});
test('shell loads one coherent settings/menu snapshot with anonymous verified routing and no English fallback',async()=>{
 const payload=newGlobalSettings();payload.interfaceText={...defaultInterfaceText('Marque'),homeHref:'/welcome'};payload.header.mainMenu={recordId:id};
 const raw={settings:{websiteId:id,recordId:id,revisionId:id,locale:'fr',payload},menus:{mainMenu:{websiteId:id,recordId:id,revisionId:id,locale:'fr',payload:{schemaVersion:1,title:'Explorer',items:[{id:'welcome',parentId:null,label:'Bienvenue',target:{kind:'record',recordId:id,contentType:'page'},visibility:{visible:true}}]},references:[{recordId:id,available:true,type:'page',title:'Bienvenue',path:'/welcome',locale:'fr'}]},utilityMenu:null,mobileMenu:null},featured:[]};
 const env={CMS_LOCALIZED_PAGES_ENABLED:'true',CMS_CUSTOM_PAGES_ENABLED:'true',CMS_PUBLIC_DELIVERY_ENABLED:'true',CMS_WEBSITE_ID:id,CMS_SUPABASE_URL:'https://db.test',CMS_SUPABASE_ANON_KEY:'anon',CMS_SUPABASE_SERVICE_ROLE_KEY:'never-send'};const calls=[];let available=true;
 const fetcher=async(url,options)=>{assert.equal(options.headers.Authorization,'Bearer anon');const body=JSON.parse(options.body);assert.equal(body.p_locale,'fr');calls.push(String(url));if(String(url).endsWith('get_public_header'))return Response.json(raw);assert.deepEqual(body.p_paths,['/welcome']);return Response.json({websiteId:id,locale:'fr',routes:[available?{path:'/welcome',available:true,recordId:id,revisionId:id}:{path:'/welcome',available:false}]});};
 const shell=await loadLocalizedShell('fr',{recordId:id,revisionId:id},env,fetcher);
 assert.equal(calls.length,2);assert.equal(shell.header.main.items[0].link.href,'/languages/fr/welcome');assert.equal(shell.interfaceText.homeHref,shell.settings.interfaceText.homeHref);assert.equal(raw.settings.payload.interfaceText.homeHref,'/welcome');
 available=false;await assert.rejects(()=>loadLocalizedShell('fr',{recordId:id,revisionId:id},env,fetcher),/unavailable/);
 available=true;raw.menus.mainMenu.locale='en';await assert.rejects(()=>loadLocalizedShell('fr',{recordId:id,revisionId:id},env,fetcher),/identity/);
});
