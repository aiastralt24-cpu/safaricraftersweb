import test from 'node:test';import assert from 'node:assert/strict';
import {validateLocalizedSettings,localizedSettingsPaths} from '../lib/cms/localized-settings-validation.ts';
import {newGlobalSettings} from '../lib/cms/global-settings.ts';import {defaultInterfaceText} from '../lib/cms/interface-text.ts';
const id=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
function fixture(){const payload=newGlobalSettings();payload.interfaceText={...defaultInterfaceText('Marque'),homeHref:'/notre-histoire'};payload.header.mainMenu={recordId:id(4)};payload.cookies.title='Préférences';payload.cookies.description='Confidentialité';payload.footer.copyright='Tous droits réservés.';payload.seo.description='Notre histoire.';payload.search.enabled=false;
 return {record:{site:id(1),record:id(2),revision:id(3),type:'settings',path:null,locale:'fr',payload},refs:[{recordId:id(4),type:'navigation',available:true,locale:'fr'}],evidence:{websiteId:id(1),recordId:id(2),revisionId:id(3),locale:'fr',registry:{websiteId:id(1),locale:'fr',routes:[{path:'/notre-histoire',available:true,recordId:id(5),revisionId:id(6)}]}}};}
test('translated settings require exact saved-revision evidence and explicit interface wording',()=>{
 const value=fixture();assert.equal(validateLocalizedSettings(value.record,[],value.refs,value.evidence).contentChecksPass,true);assert.deepEqual(localizedSettingsPaths(value.record.payload),['/notre-histoire']);
 for(const change of [v=>v.evidence.revisionId=id(7),v=>v.evidence.registry.locale='en',v=>v.evidence.registry.routes=[],v=>delete v.record.payload.interfaceText,v=>v.refs[0].locale='en',v=>v.record.payload.search.enabled=true,v=>v.record.payload.header.languageSelector=true,v=>v.record.payload.cookies.policy={label:'Contact',href:'/contact',newWindow:false}]){const v=fixture();change(v);assert.equal(validateLocalizedSettings(v.record,[],v.refs,v.evidence).contentChecksPass,false);}
});

test('translated selector requires an explicit label and permits configured publication',()=>{const v=fixture();v.record.payload.header.languageSelector=true;v.record.payload.header.languageSelectorLabel='Langues';assert.equal(validateLocalizedSettings(v.record,[],v.refs,v.evidence).contentChecksPass,true);v.record.payload.header.languageSelectorLabel=' ';assert.equal(validateLocalizedSettings(v.record,[],v.refs,v.evidence).contentChecksPass,false);});
