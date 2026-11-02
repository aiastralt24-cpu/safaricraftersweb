import test from 'node:test';
import assert from 'node:assert/strict';
import {homepageHeaderFindings} from '../lib/cms/homepage-header-validation.ts';
import {newGlobalSettings} from '../lib/cms/global-settings.ts';
import {runTrustedValidation} from '../lib/cms/validation-worker.ts';
import {runValidationQueue} from '../lib/cms/validation-queue-worker.ts';
const id=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`,site=id(1);
function header(){
 const payload=newGlobalSettings();payload.header.mainMenu={recordId:id(2)};
 return {settings:{websiteId:site,recordId:id(3),revisionId:id(4),locale:'en',payload},menus:{mainMenu:{websiteId:site,recordId:id(2),revisionId:id(5),locale:'en',payload:{schemaVersion:1,title:'Main',items:[{id:'contact',parentId:null,label:'Contact',target:{kind:'url',href:'/contact'},visibility:{visible:true}}]},references:[]},utilityMenu:null,mobileMenu:null},featured:[]};
}
test('homepage validation requires a renderable same-site published header and selected menus',()=>{
 assert.deepEqual(homepageHeaderFindings({site,header:header()}),[]);
 const changes=[d=>d.settings.websiteId=id(9),d=>d.menus.mainMenu.websiteId=id(9),d=>d.menus.mainMenu.recordId=id(9),d=>d.menus.mainMenu=null,d=>d.settings.payload.header.languageSelector=true,d=>d.settings.payload.header.utilityMenu={recordId:id(6)}];
 for(const change of changes){const value=header();change(value);assert.equal(homepageHeaderFindings({site,header:value})[0].code,'homepage_header_unavailable');}
 for(const evidence of [undefined,{site,header:null},{site,header:{private:'SECRET'}},{site:'invalid',header:header()}]){
  const result=homepageHeaderFindings(evidence);assert.equal(result[0].field,'header');assert.equal(JSON.stringify(result).includes('SECRET'),false);
 }
});
test('both trusted worker paths validate reader evidence and ignore a forged header inside the draft',async()=>{
 const target={site,record:id(7),revision:id(8)};
 for(const queue of [false,true])for(const available of [false,true]){
  const input={...target,type:'homepage',path:'/',locale:'en',payload:{homepageHeader:header()},homepageHeader:available?header():null};let receipt;
  if(queue)await runValidationQueue(async(name,args)=>{if(name==='claim_validations')return [{...target,id:id(9),token:id(10)}];if(name==='get_validation_job_input')return input;receipt=args;});
  else await runTrustedValidation(async(name,args)=>{if(name==='get_validation_input')return input;receipt=args;},target);
  assert.equal(receipt.p_findings.some(f=>f.code==='homepage_header_unavailable'),!available);
  assert.equal(receipt.p_valid,false);assert.equal(receipt.p_version,'homepage-1');
 }
});

test('homepage validation rejects unavailable header dependencies even when public navigation can omit them',async()=>{
 const {projectPublishedHeader}=await import('../lib/cms/published-header.ts');
 const featured=header();featured.settings.payload.header.featuredContent=[{recordId:id(11)}];featured.featured=[{recordId:id(11),available:false}];
 const menu=header();menu.menus.mainMenu.payload.items[0].target={kind:'record',recordId:id(11),contentType:'journey'};menu.menus.mainMenu.references=[{recordId:id(11),available:false}];
 for(const input of [featured,menu]){
  assert.doesNotThrow(()=>projectPublishedHeader(input,site,new Date()));
  assert.equal(homepageHeaderFindings({site,header:input})[0].code,'homepage_header_unavailable');
 }
});
