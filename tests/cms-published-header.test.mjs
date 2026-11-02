import {defaultInterfaceText} from '../lib/cms/interface-text.ts';
import test from 'node:test';
import assert from 'node:assert/strict';
import {newGlobalSettings} from '../lib/cms/global-settings.ts';
import {projectPublishedHeader,readPublishedHeader} from '../lib/cms/published-header.ts';
const id=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`,site=id(1),now=new Date('2026-10-22T00:00:00Z');
function data(){const payload=newGlobalSettings();payload.header.mainMenu={recordId:id(2)};payload.header.featuredContent=[{recordId:id(3)}];return {settings:{websiteId:site,recordId:id(4),revisionId:id(5),locale:'en',payload},menus:{mainMenu:{websiteId:site,recordId:id(2),revisionId:id(6),locale:'en',payload:{schemaVersion:1,title:'Main',items:[{id:'contact',parentId:null,label:'Contact',target:{kind:'url',href:'/contact'},visibility:{visible:true}}]},references:[]},utilityMenu:null,mobileMenu:null},featured:[{recordId:id(3),available:true,type:'journey',title:'Featured journey',path:'/journeys/forest',locale:'en'}]};}
test('published header resolves exact menu and featured references with explicit mobile fallback',()=>{
 const input=data(),result=projectPublishedHeader(input,site,now);assert.equal(result.main.items[0].link.href,'/contact');assert.deepEqual(result.mobile,result.main);assert.equal(result.utility,null);assert.deepEqual(result.featured,[{recordId:id(3),title:'Featured journey',href:'/journeys/forest'}]);assert.equal('contact'in result,false);
 const separate=data();separate.settings.payload.header.mobileMenu={recordId:id(7)};separate.menus.mobileMenu={...separate.menus.mainMenu,recordId:id(7),payload:{...separate.menus.mainMenu.payload,title:'Mobile'}};assert.equal(projectPublishedHeader(separate,site,now).mobile.title,'Mobile');
});
test('header rejects wrong websites, wrong menu identity, missing referenced menus and substituted featured evidence',()=>{
 const changes=[d=>d.settings.websiteId=id(9),d=>d.menus.mainMenu.recordId=id(9),d=>d.menus.mainMenu=null,d=>d.featured=[],d=>d.featured.push(d.featured[0]),d=>d.featured[0].path='/admin',d=>d.menus.utilityMenu=d.menus.mainMenu];
 for(const change of changes){const d=data();change(d);assert.throws(()=>projectPublishedHeader(d,site,now));}
 const d=data();d.featured=[{recordId:id(3),available:false}];assert.deepEqual(projectPublishedHeader(d,site,now).featured,[]);
});
test('header loader remains offline when disabled and never substitutes missing published data',async()=>{
 assert.equal(await readPublishedHeader({},async()=>assert.fail('network')),undefined);
 const env={CMS_HEADER_SETTINGS_ENABLED:'true',CMS_PUBLIC_DELIVERY_ENABLED:'true',CMS_WEBSITE_ID:site,CMS_SUPABASE_URL:'https://db.test',CMS_SUPABASE_ANON_KEY:'anon'};
 const header=await readPublishedHeader(env,async(url,options)=>{assert.match(String(url),/get_public_header$/);assert.equal(options.headers.Authorization,'Bearer anon');assert.deepEqual(JSON.parse(options.body),{p_site:site,p_locale:'en'});return Response.json(data());},now);assert.equal(header.main.title,'Main');
 await assert.rejects(readPublishedHeader(env,async()=>Response.json(null)),/unavailable/);await assert.rejects(readPublishedHeader({...env,CMS_WEBSITE_ID:''}),/not configured/);
});
test('a configured language selector cannot silently render without localized route support',()=>{
 const d=data();d.settings.payload.header.languageSelector=true;assert.throws(()=>projectPublishedHeader(d,site,now),/localized route/);
});

test('localized headers bind settings menus featured records and every internal link to their language',async()=>{
 const d=data();d.settings.payload.interfaceText={...defaultInterfaceText('Marque'),homeLabel:'Accueil',openMenu:'Ouvrir le menu',closeMenu:'Fermer le menu'};d.settings.locale='fr';d.menus.mainMenu.locale='fr';d.featured[0].locale='fr';d.settings.payload.header.cta={label:'Contact',href:'/contact',newWindow:false};
 const options={locale:'fr',resolveLocalizedRoute:(path,locale)=>`/language/${locale}${path}`};
 assert.throws(()=>projectPublishedHeader(d,site,now),/language mismatch/);assert.throws(()=>projectPublishedHeader(d,site,now,{locale:'fr'}),/verified route/);
 const header=projectPublishedHeader(d,site,now,options);assert.equal(header.main.items[0].link.href,'/language/fr/contact');assert.equal(header.featured[0].href,'/language/fr/journeys/forest');assert.equal(header.cta.href,'/language/fr/contact');assert.deepEqual(header.mobile,header.main);
 for(const change of [v=>v.settings.locale='en',v=>v.menus.mainMenu.locale='en',v=>v.featured[0].locale='en']){const wrong=structuredClone(d);change(wrong);assert.throws(()=>projectPublishedHeader(wrong,site,now,options));}
 const env={CMS_HEADER_SETTINGS_ENABLED:'true',CMS_PUBLIC_DELIVERY_ENABLED:'true',CMS_WEBSITE_ID:site,CMS_SUPABASE_URL:'https://db.test',CMS_SUPABASE_ANON_KEY:'anon'};let calls=0;
 const fetcher=async(url,input)=>{calls++;assert.equal(JSON.parse(input.body).p_locale,'fr');return Response.json(d);};
 await assert.rejects(readPublishedHeader(env,fetcher,now,{locale:'fr'}),/verified route/);assert.equal(calls,0);assert.deepEqual(await readPublishedHeader(env,fetcher,now,options),header);assert.equal(calls,1);
});


test('localized header calls to action also resolve owned absolute URLs',()=>{
 const d=data();d.settings.payload.interfaceText={...defaultInterfaceText('Marque'),homeLabel:'Accueil',openMenu:'Ouvrir le menu',closeMenu:'Fermer le menu'};d.settings.locale='fr';d.menus.mainMenu.locale='fr';d.featured[0].locale='fr';
 const options={locale:'fr',resolveLocalizedRoute:(path,locale)=>`/language/${locale}${path}`};
 d.settings.payload.header.cta={label:'Contact',href:'https://www.safaricrafters.com/contact?source=header#main',newWindow:false};
 assert.equal(projectPublishedHeader(d,site,now,options).cta.href,'/language/fr/contact?source=header#main');
 d.settings.payload.header.cta.href='https://external.example/contact';assert.equal(projectPublishedHeader(d,site,now,options).cta.href,'https://external.example/contact');
});
