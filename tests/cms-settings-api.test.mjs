import test from 'node:test';
import assert from 'node:assert/strict';
import {handleSettingsRead} from '../lib/cms/settings-api.ts';
import {handleEditorCommand} from '../lib/cms/editor-api.ts';
import {newGlobalSettings} from '../lib/cms/global-settings.ts';
const site='00000000-0000-4000-8000-000000000001';
const get=query=>new Request(`https://site.test/api/cms/settings?${query}`,{headers:{Authorization:'Bearer a.b.c'}});
test('settings read binds site and locale and rejects ambiguous parameters',async()=>{
 let args;const response=await handleSettingsRead(get(`site=${site}&locale=fr`),async(...input)=>{args=input;return {record:null,canCreate:true};});assert.equal(response.status,200);assert.deepEqual(args,['a.b.c','get_settings_workspace',{p_site:site,p_locale:'fr'}]);assert.match(response.headers.get('cache-control'),/no-store/);
 for(const query of [`site=${site}&locale=en&locale=fr`,`site=${site}&private=true`,`site=${site}&locale=invalid_locale`])assert.equal((await handleSettingsRead(get(query),async()=>assert.fail('unexpected RPC'))).status,422);
 assert.equal((await handleSettingsRead(get(`site=${site}`),async()=>null)).status,404);
});
test('generic draft endpoint validates complete settings contract before persistence',async()=>{
 const save={action:'save',site,record:null,expectedRevision:null,type:'settings',path:null,title:'Settings',locale:'en',payload:newGlobalSettings()};
 const request=body=>new Request('https://site.test/api/cms/content',{method:'POST',headers:{Authorization:'Bearer a.b.c','Content-Type':'application/json'},body:JSON.stringify(body)});
 assert.equal((await handleEditorCommand(request(save),async()=>({recordId:site}))).status,200);
 for(const invalid of [{...save,path:'/settings'},{...save,payload:{schemaVersion:1}},{...save,payload:{...save.payload,css:'injected'}}])assert.equal((await handleEditorCommand(request(invalid),async()=>assert.fail('unexpected RPC'))).status,422);
});
test('translated saved-settings checks bind private evidence to the requested revision without authorizing publication',async()=>{
 const {defaultInterfaceText}=await import('../lib/cms/interface-text.ts');const id=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`,record=id(2),revision=id(3),menu=id(4),payload=newGlobalSettings();payload.header.mainMenu={recordId:menu};payload.search.enabled=false;payload.interfaceText={...defaultInterfaceText('Marque'),homeHref:'/notre-histoire'};payload.cookies.title='Préférences';payload.cookies.description='Confidentialité';payload.footer.copyright='Droits réservés.';payload.seo.description='Notre histoire.';
 const request=()=>new Request('https://site.test/api/cms/content',{method:'POST',headers:{Authorization:'Bearer a.b.c','Content-Type':'application/json'},body:JSON.stringify({action:'validate',site,record,revision})});let stale=false;
 const call=async(token,name,args)=>{assert.equal(token,'a.b.c');if(name==='get_editor_record')return {id:record,type:'settings',path:null,locale:'fr',currentRevision:revision,payload};if(name==='get_record_media_status')return [];if(name==='get_settings_reference_status')return [{recordId:menu,available:true,type:'navigation',locale:'fr'}];assert.equal(name,'get_editor_localized_settings_evidence');assert.deepEqual(args,{p_site:site,p_record:record,p_revision:revision});return {websiteId:site,recordId:record,revisionId:stale?id(9):revision,locale:'fr',registry:{websiteId:site,locale:'fr',routes:[{path:'/notre-histoire',available:true,recordId:id(5),revisionId:id(6)}]}};};
 const response=await handleEditorCommand(request(),call),body=await response.json();assert.equal(response.status,200);assert.equal(body.result.contentChecksPass,true);assert.equal(body.result.publicationAuthorized,false);stale=true;assert.equal((await (await handleEditorCommand(request(),call)).json()).result.contentChecksPass,false);
});
