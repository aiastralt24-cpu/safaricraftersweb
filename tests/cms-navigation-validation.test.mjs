import test from 'node:test';
import assert from 'node:assert/strict';
import {validateNavigationDraft} from '../lib/cms/navigation-validation.ts';
const id='00000000-0000-4000-8000-000000000001';
const item={id:'link',parentId:null,label:'Forest',target:{kind:'record',contentType:'journey',recordId:id},visibility:{visible:true}};
const record=items=>({type:'navigation',path:null,locale:'en',payload:{schemaVersion:1,title:'Menu',items}});
const evidence=[{recordId:id,available:true,type:'journey',locale:'en',path:'/journeys/forest',title:'Forest'}];
test('navigation checks require unique current published evidence for every target',()=>{
 for(const refs of [undefined,[],[{recordId:id,available:false}],evidence.concat(evidence),[{...evidence[0],type:'destination'}],[{...evidence[0],locale:'fr'}]])assert.ok(validateNavigationDraft(record([item]),refs).findings.some(f=>f.code==='navigation_target_unavailable'));
 const result=validateNavigationDraft(record([item]),evidence);assert.deepEqual(result.findings,[]);assert.equal(result.contentChecksPass,true);assert.equal(result.validatorVersion,'navigation-1');
});
test('navigation checks hidden items, unsupported internal URLs, empty groups and duplicate featured choices',()=>{
 const result=validateNavigationDraft(record([{...item,visibility:{visible:false}},{...item,id:'url',target:{kind:'url',href:'/unknown'}},{...item,id:'group',target:{kind:'group'},featuredContent:[{recordId:id},{recordId:id}]}]),[]);
 for(const code of ['navigation_target_unavailable','navigation_url_verification_required','navigation_empty_group','navigation_duplicate_feature'])assert.ok(result.findings.some(f=>f.code===code),code);
});
test('navigation checks malformed hierarchy, language, route and empty menus',()=>{
 const result=validateNavigationDraft({...record([{...item,parentId:'missing'}]),path:'/menu',locale:'invalid_locale'});
 for(const code of ['navigation_field','navigation_path','navigation_locale_not_ready'])assert.ok(result.findings.some(f=>f.code===code));assert.ok(validateNavigationDraft(record([])).findings.some(f=>f.code==='navigation_empty'));
});
test('translated menus accept same-language custom-page references and reject unsupported visitor destinations',()=>{
 const menu={...record([{...item,target:{kind:'record',contentType:'page',recordId:id}}]),locale:'fr'},refs=[{recordId:id,available:true,type:'page',locale:'fr',path:'/notre-histoire',title:'Notre histoire'}];
 assert.equal(validateNavigationDraft(menu,refs).contentChecksPass,true);
 for(const change of [{locale:'en'},{available:false},{type:'journey',path:'/journeys/forest'}])assert.equal(validateNavigationDraft(menu,[{...refs[0],...change}]).contentChecksPass,false);
 for(const href of ['/contact','/notre-histoire','https://safaricrafters.com/contact','https://www.safaricrafters.com./notre-histoire','https://admin.safaricrafters.com/'])assert.equal(validateNavigationDraft({...menu,payload:{...menu.payload,items:[{...item,target:{kind:'url',href}}]}}).contentChecksPass,false,href);
 for(const href of ['https://example.com/travel','#main'])assert.equal(validateNavigationDraft({...menu,payload:{...menu.payload,items:[{...item,target:{kind:'url',href}}]}}).contentChecksPass,true,href);
});
