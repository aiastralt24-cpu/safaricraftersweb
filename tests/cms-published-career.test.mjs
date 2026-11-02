import test from 'node:test';import assert from 'node:assert/strict';
import {newCareer} from '../lib/cms/careers.ts';import {projectPublishedCareer} from '../lib/cms/published-career.ts';
import {publicCareerConfig,readPublishedCareer,readPublishedCareerList} from '../lib/cms/public-career-runtime.ts';
const id=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const {internalNotes,relationships,...content}={...newCareer(),slug:'advisor',summary:'Guest support',organization:'Example',employment:'fullTime',workMode:'remote',remoteRegions:['India'],postedOn:'2026-10-30',application:{mode:'external',label:'Apply',url:'https://example.test/apply'},body:[{id:'intro',kind:'paragraph',text:'Responsibilities'}]};
const value={recordId:id(1),revisionId:id(2),type:'career',path:'/careers/advisor',locale:'en',payload:content,applicationForm:null,related:[]};
test('published careers reject private fields, incomplete jobs and invalid application or workplace identity',()=>{
 assert.equal(projectPublishedCareer(value,value.path).content.title,'New job');
 for(const v of [{...value,payload:{...content,internalNotes:'private'}},{...value,payload:{...content,relationships:{}}},{...value,payload:{...content,workMode:'onSite'}},{...value,applicationForm:{formId:id(5),revisionId:id(6)}},{...value,payload:{...content,opensAt:'2026-10-30T10:00:00Z',closesAt:'2026-10-30T09:00:00Z'}},{...value,locale:'fr'},{...value,path:'/careers/other'}])assert.throws(()=>projectPublishedCareer(v,value.path));
 const onsite={...value,payload:{...content,workMode:'onSite'},related:[{type:'location',recordId:id(4),title:'Office',href:'/locations/office'}]};assert.equal(projectPublishedCareer(onsite,value.path).related.length,1);
 for(const ref of [{...onsite.related[0],href:'https://evil.test'},{type:'page',recordId:id(4),title:'Private',href:'/cms'},{type:'document',recordId:id(4),title:'PDF',href:`/api/documents/download?record=${id(5)}&revision=${id(6)}`}])assert.throws(()=>projectPublishedCareer({...value,related:[ref]},value.path));
 const form={...value,payload:{...content,application:{mode:'form',label:'Apply',formId:id(5)}},applicationForm:{formId:id(5),revisionId:id(6)}};assert.equal(projectPublishedCareer(form,value.path).applicationForm.revisionId,id(6));assert.throws(()=>projectPublishedCareer({...form,applicationForm:null},value.path));
});
test('career runtime uses anonymous no-store requests only when both rollout switches are enabled',async()=>{
 assert.equal(publicCareerConfig({}),null);const env={CMS_PUBLIC_DELIVERY_ENABLED:'true',CMS_CAREER_DELIVERY_ENABLED:'true',CMS_WEBSITE_ID:id(9),CMS_SUPABASE_URL:'https://fixture.test',CMS_SUPABASE_ANON_KEY:'anon-fixture',CMS_SUPABASE_SERVICE_ROLE_KEY:'never-send'};let request;
 const config=publicCareerConfig(env,async(url,init)=>{request={url,init};return Response.json(value);});assert.equal((await readPublishedCareer('advisor',config)).recordId,id(1));assert.equal(request.init.cache,'no-store');assert.ok(!JSON.stringify(request).includes('never-send'));assert.match(String(request.url),/get_public_career$/);assert.equal(await readPublishedCareer('../admin',config),null);await assert.rejects(()=>readPublishedCareer('advisor',null));
});
test('career directory validates exact fields and pagination before presenting summaries',async()=>{
 const row={recordId:id(1),revisionId:id(2),path:value.path,title:content.title,summary:content.summary,modifiedAt:'2026-10-30T00:00:00Z',image:null,employment:'fullTime',status:'open',opensAt:'',closesAt:'',seo:content.seo};
 const config={site:id(9),read:async()=>null,list:async()=>[row]};assert.equal((await readPublishedCareerList(config,'fullTime')).length,1);
 for(const rows of [[row,row],[{...row,internalNotes:'private'}],[{...row,path:'/locations/advisor'}],[{...row,employment:'partTime'}]])await assert.rejects(()=>readPublishedCareerList({...config,list:async()=>rows},'fullTime'));
});
