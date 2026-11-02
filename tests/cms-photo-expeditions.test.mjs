import test from 'node:test';
import assert from 'node:assert/strict';
import {newPhotoExpedition,photoExpeditionSchema,expeditionDepartureSchema} from '../lib/cms/photo-expeditions.ts';
import {validateStoredContent} from '../lib/cms/content-validation.ts';
import {handleEditorCommand} from '../lib/cms/editor-api.ts';
const site='00000000-0000-4000-8000-000000000001';
const image={assetId:'photo',alt:'Forest view',decorative:false};
const request=command=>new Request('https://site.test/api/cms/content',{method:'POST',headers:{Authorization:'Bearer a.b.c','Content-Type':'application/json'},body:JSON.stringify(command)});
test('expedition contract preserves price/date copy and independent images, stable collections and editorial fields',()=>{
 const value={...newPhotoExpedition(),price:'INR 1,20,000 + applicable taxes',dateLabel:'Dates to be confirmed by the team',image,heroImage:{...image,assetId:'hero'},mobileHeroImage:{...image,assetId:'mobile'},days:[{id:'day-one',label:'Arrival',title:'Into the forest',copy:'Arrive and settle in.',stay:'Forest lodge'}],departures:[{id:'departure-one',date:'2028-02-29',endDate:'2028-03-04',status:'Available',availability:'Ask the team'}],highlights:[{id:'highlight',text:'Patient wildlife photography'}],body:[{id:'paragraph',text:'First paragraph.\nSecond line.'}],specialists:[{recordId:site,role:'mentor'},{recordId:site,role:'guide'}]};
 assert.deepEqual(photoExpeditionSchema.parse(value),value);assert.equal(newPhotoExpedition().programmeStatus,'preview');assert.deepEqual(photoExpeditionSchema.parse(JSON.parse(JSON.stringify(value))),value);
 for(const invalid of [{...value,days:[...value.days,...value.days]},{...value,departures:[...value.departures,...value.departures]},{...value,highlights:[...value.highlights,...value.highlights]},{...value,specialists:[value.specialists[0],value.specialists[0]]},{...value,unmappedField:'preserve separately'}])assert.equal(photoExpeditionSchema.safeParse(invalid).success,false);
});
test('departure date contracts reject impossible dates, backwards ranges and unsupported status',()=>{
 const good={id:'departure',date:'2028-02-29',endDate:'2028-03-04',status:'Full',availability:''};assert.equal(expeditionDepartureSchema.safeParse(good).success,true);
 for(const change of [{date:'2027-02-29'},{date:'2028-04-31'},{endDate:'2028-02-28'},{date:'29 February 2028'},{status:'Guaranteed'}])assert.equal(expeditionDepartureSchema.safeParse({...good,...change}).success,false);
});
test('expedition draft checks report missing copy and media without authorizing publication',()=>{
 const payload={...newPhotoExpedition(),image,heroImage:image,days:[{id:'one',label:'',title:'',copy:'',stay:''}],faqs:[{id:'question',question:'',answer:''}]};const record={type:'photoExpedition',path:'/photo-expeditions/new-expedition',locale:'en',payload};const before=structuredClone(record);
 const result=validateStoredContent(record,[{assetId:'photo',available:true},{assetId:'photo',available:false}]);assert.equal(result.contentChecksPass,false);assert.equal(result.validatorVersion,'expedition-1');
 for(const field of ['category','price','heroTitle','image.assetId','heroImage.assetId','days.0.title','faqs.0.answer','enquiry.form'])assert.ok(result.findings.some(item=>item.field===field),field);
 assert.deepEqual(record,before);assert.ok(validateStoredContent({...record,path:'/wrong',locale:'fr'}).findings.some(item=>item.code==='path_mismatch'));
});
test('expedition save rejects invalid contracts and mismatched identity before persistence',async()=>{
 const payload=newPhotoExpedition();const command={action:'save',site,record:null,expectedRevision:null,type:'photoExpedition',path:'/photo-expeditions/new-expedition',title:payload.title,locale:'en',payload};let saved;
 const result=await handleEditorCommand(request(command),async(_token,name,args)=>{assert.equal(name,'save_draft');saved=args;return {recordId:site};});assert.equal(result.status,200);assert.deepEqual(saved.p_payload,payload);
 for(const change of [{path:'/photo-expeditions/wrong'},{title:'Other title'},{payload:{...payload,days:[{title:'No stable ID'}]}}])assert.equal((await handleEditorCommand(request({...command,...change}),async()=>assert.fail('Invalid save must not persist'))).status,422);
 const calls=[];const checked=await handleEditorCommand(request({action:'validate',site,record:site,revision:site}),async(_token,name)=>{calls.push(name);return name==='get_editor_record'?{id:site,currentRevision:site,type:'photoExpedition',path:command.path,locale:'en',payload}:[];});assert.equal(checked.status,200);assert.deepEqual(calls,['get_editor_record','get_record_media_status','get_expedition_reference_status']);assert.equal((await checked.json()).result.publicationAuthorized,false);
});

test('expedition advisory checks fetch authenticated reference evidence without authorizing publication',async()=>{
 const id='00000000-0000-4000-8000-000000000002';const calls=[];
 const response=await handleEditorCommand(request({action:'validate',site,record:site,revision:id}),async(token,name,args)=>{
  assert.equal(token,'a.b.c');assert.equal(args.p_site,site);calls.push(name);
  if(name==='get_editor_record')return {id:site,type:'photoExpedition',path:'/photo-expeditions/new-expedition',currentRevision:id,locale:'en',payload:newPhotoExpedition()};
  if(name==='get_record_media_status')return [];
  if(name==='get_expedition_reference_status')return null;
  assert.fail(name);
 });
 assert.equal(response.status,200);const body=await response.json();assert.equal(body.result.publicationAuthorized,false);assert.equal(body.result.contentChecksPass,false);assert.ok(calls.includes('get_expedition_reference_status'));
});
