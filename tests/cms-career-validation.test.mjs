import {newForm} from '../lib/cms/form-drafts.ts';
import test from 'node:test';import assert from 'node:assert/strict';
import {newCareer} from '../lib/cms/careers.ts';import {validateCareerContent} from '../lib/cms/career-validation.ts';
const id=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const payload={...newCareer(),slug:'example',summary:'Guest advisor',organization:'Example',employment:'fullTime',workMode:'remote',remoteRegions:['India'],postedOn:'2026-10-30',application:{mode:'external',label:'Apply',url:'https://example.test/apply'},body:[{id:'intro',kind:'paragraph',text:'Responsibilities and requirements'}]};
const input={site:id(1),record:id(2),revision:id(3),type:'career',path:'/careers/example',locale:'en',payload},evidence={websiteId:id(1),recordId:id(2),revisionId:id(3),applicationForm:null,media:[],references:[],links:[]};
test('career checks require exact saved identity, supported language and complete job details',()=>{
 assert.equal(validateCareerContent(input,evidence).contentChecksPass,true);
 for(const patch of [{site:id(4)},{record:id(4)},{revision:id(4)},{type:'page'},{path:'/careers/other'},{locale:'fr'},{payload:{...payload,organization:''}},{payload:{...payload,workMode:'onSite'}}])assert.equal(validateCareerContent({...input,...patch},evidence).contentChecksPass,false);
 for(const e of [null,{...evidence,extra:true},{...evidence,revisionId:id(5)}])assert.equal(validateCareerContent(input,e).contentChecksPass,false);
});
test('career checks bind all selected media, relationships, forms and internal links to exact evidence',()=>{
 const draft={...payload,workMode:'onSite',image:{assetId:'photo',alt:'Team',decorative:false},application:{mode:'form',label:'Apply',formId:id(7)},relationships:{locations:[{recordId:id(4)}],documents:[{recordId:id(5)}],pages:[{recordId:id(6)}]},body:[...payload.body,{id:'link',kind:'link',label:'Contact',href:'/contact'}]};
 const e={...evidence,applicationForm:{websiteId:id(1),formId:id(7),revisionId:id(8),locale:'en',definition:newForm('name')},media:[{assetId:'photo',available:true}],links:[{href:'/contact',available:true}],references:['location','document','page','form'].map((type,i)=>({type,recordId:id(i+4),available:true,published:true,locale:'en'}))};
 const check=x=>validateCareerContent({...input,payload:draft},x).contentChecksPass;assert.equal(check(e),true);
 assert.equal(check({...e,applicationForm:{...e.applicationForm,definition:{...e.applicationForm.definition,notificationRouteIds:[id(9)]}}}),true);
 assert.equal(check({...e,applicationForm:null,references:e.references.map(r=>r.type==='form'?{...r,available:false,published:false}:r)}),false);
 for(const key of ['media','references','links']){assert.equal(check({...e,[key]:[]}),false);assert.equal(check({...e,[key]:[...e[key],e[key][0]]}),false);}
 for(let i=0;i<4;i++)for(const patch of [{available:false},{published:false},{locale:'fr'},{recordId:id(9)}])assert.equal(check({...e,references:e.references.map((r,n)=>n===i?{...r,...patch}:r)}),false);
 assert.equal(check({...e,media:[{assetId:'photo',available:false}]}),false);assert.equal(check({...e,links:[{href:'/contact',available:false}]}),false);
 for(const applicationForm of [null,{...e.applicationForm,formId:id(9)},{...e.applicationForm,definition:{...e.applicationForm.definition,fields:[]}},{...e.applicationForm,locale:'fr'}])assert.equal(check({...e,applicationForm}),false);
 // Closing applications does not turn a selected, unavailable form into valid content.
 assert.equal(validateCareerContent({...input,payload:{...draft,status:'closed',statusNote:'Recruitment complete'}},{...e,references:e.references.filter(r=>r.type!=='form')}).contentChecksPass,false);
});
