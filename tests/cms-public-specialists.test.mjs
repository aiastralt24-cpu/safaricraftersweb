import test from 'node:test';
import assert from 'node:assert/strict';
import {newSpecialist} from '../lib/cms/specialists.ts';
import {projectPublishedSpecialist,readPublishedSpecialist,specialistReader} from '../lib/cms/public-specialists.ts';
const site='00000000-0000-4000-8000-000000000001',record='00000000-0000-4000-8000-000000000002',journey='00000000-0000-4000-8000-000000000003';
const page={websiteId:site,recordId:record,revisionId:record,locale:'en',payload:{...newSpecialist(),visible:true,role:'Guide',expertise:'Forests',bio:'Biography',image:{assetId:'portrait',alt:'Guide',decorative:false},planning:{label:'Plan with guide',enquiryName:'Guide & Team'},journeys:[{recordId:journey}]},references:[{recordId:journey,available:true,type:'journey',title:'Forest journey',path:'/journeys/forest',locale:'en'}]};
test('published specialist projects ordered references and an encoded enquiry target',()=>{const result=projectPublishedSpecialist(page,site,record);assert.equal(result.planningHref,'/plan?specialist=Guide%20%26%20Team');assert.deepEqual(result.relatedJourneys,page.references);});
test('published specialist rejects draft visibility, private fields, unsupported films and mismatched references',()=>{
 for(const invalid of [{...page,websiteId:record},{...page,payload:{...page.payload,visible:false}},{...page,payload:{...page.payload,privateNotes:'Secret'}},{...page,payload:{...page.payload,video:{}}},{...page,references:[]},{...page,references:[...page.references,...page.references]},{...page,references:[{...page.references[0],path:'/cms'}]}])assert.throws(()=>projectPublishedSpecialist(invalid,site,record));
 assert.throws(()=>projectPublishedSpecialist(page,site,record,'fr'));
});
test('public specialist transport binds configured website and anonymous published reader',async()=>{
 assert.equal(await readPublishedSpecialist(site,record,'en',async()=>null),null);assert.throws(()=>specialistReader({}));
 const read=specialistReader({CMS_PUBLIC_DELIVERY_ENABLED:'true',CMS_WEBSITE_ID:site,CMS_SUPABASE_URL:'https://cms.example.test',CMS_SUPABASE_ANON_KEY:'anon'},async(url,options)=>{assert.match(url.pathname,/get_public_specialist$/);assert.equal(options.headers.Authorization,'Bearer anon');assert.deepEqual(JSON.parse(options.body),{p_site:site,p_record:record,p_locale:'en'});return Response.json(page);});
 assert.equal((await readPublishedSpecialist(site,record,'en',read)).recordId,record);assert.throws(()=>read(record,record,'en'));
});

test('specialist directory traverses ordered pages and rejects inconsistent cursors or duplicate profiles',async()=>{
 const {readPublishedSpecialists}=await import('../lib/cms/public-specialists.ts');
 const second={...page,recordId:journey,payload:{...page.payload,sortOrder:2}};const cursor={sortOrder:page.payload.sortOrder,recordId:record};let calls=0;
 const result=await readPublishedSpecialists(site,'en',async(_site,_locale,after)=>{calls++;if(calls===1){assert.equal(after,null);return {websiteId:site,locale:'en',items:[page],nextCursor:cursor};}assert.deepEqual(after,cursor);return {websiteId:site,locale:'en',items:[second],nextCursor:null};});assert.deepEqual(result.map(item=>item.recordId),[record,journey]);
 for(const response of [{websiteId:record,locale:'en',items:[],nextCursor:null},{websiteId:site,locale:'en',items:[second,page],nextCursor:null},{websiteId:site,locale:'en',items:[page,page],nextCursor:null},{websiteId:site,locale:'en',items:[],nextCursor:cursor},{websiteId:site,locale:'en',items:[page],nextCursor:{...cursor,sortOrder:4}}])await assert.rejects(readPublishedSpecialists(site,'en',async()=>response));
 let repeat=0;await assert.rejects(readPublishedSpecialists(site,'en',async()=>({websiteId:site,locale:'en',items:[page],nextCursor:repeat++===0?cursor:null})),/order changed/);
 assert.deepEqual(await readPublishedSpecialists(site,'en',async()=>({websiteId:site,locale:'en',items:[],nextCursor:null})),[]);
});
test('specialist directory transport sends bounded ordering cursor and rejects other websites',async()=>{
 const {specialistDirectoryReader}=await import('../lib/cms/public-specialists.ts');let body;
 const read=specialistDirectoryReader({CMS_PUBLIC_DELIVERY_ENABLED:'true',CMS_WEBSITE_ID:site,CMS_SUPABASE_URL:'https://cms.example.test',CMS_SUPABASE_ANON_KEY:'anon'},async(url,options)=>{assert.match(url.pathname,/list_public_specialists$/);body=JSON.parse(options.body);return Response.json({websiteId:site,locale:'en',items:[],nextCursor:null});});
 await read(site,'en',{sortOrder:3,recordId:record});assert.deepEqual(body,{p_site:site,p_locale:'en',p_after_order:3,p_after_id:record,p_limit:50});assert.throws(()=>read(record,'en',null));assert.throws(()=>read(site,'en',{sortOrder:-1,recordId:record}));
});

test('specialist directory bounds traversal and never returns a truncated directory',async()=>{
 const {readPublishedSpecialists}=await import('../lib/cms/public-specialists.ts');
 const profile=index=>({...page,recordId:`00000000-0000-4000-8000-${String(index+1).padStart(12,'0')}`,payload:{...page.payload,sortOrder:index}});
 let calls=0;
 await assert.rejects(readPublishedSpecialists(site,'en',async()=>{
  const item=profile(calls++);
  return {websiteId:site,locale:'en',items:[item],nextCursor:{sortOrder:item.payload.sortOrder,recordId:item.recordId}};
 }),/page limit/);
 assert.equal(calls,20);
 calls=0;
 await assert.rejects(readPublishedSpecialists(site,'en',async()=>{
  const items=Array.from({length:100},(_,index)=>profile(calls*100+index));calls++;
  const last=items.at(-1);
  return {websiteId:site,locale:'en',items,nextCursor:{sortOrder:last.payload.sortOrder,recordId:last.recordId}};
 }),/supported size/);
 assert.equal(calls,11);
 calls=0;
 const complete=await readPublishedSpecialists(site,'en',async()=>{
  const items=Array.from({length:50},(_,index)=>profile(calls*50+index));calls++;
  const last=items.at(-1);
  return {websiteId:site,locale:'en',items,nextCursor:calls===20?null:{sortOrder:last.payload.sortOrder,recordId:last.recordId}};
 });
 assert.equal(complete.length,1000);assert.equal(calls,20);
});
