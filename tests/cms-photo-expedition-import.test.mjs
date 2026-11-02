import test from 'node:test';
import assert from 'node:assert/strict';
import {planExpeditionImport} from '../lib/cms/photo-expedition-import-plan.ts';
import {validateExpeditionImportTables,expeditionContentFields} from '../lib/cms/photo-expedition-import-contract.ts';
import {newPhotoExpedition,photoExpeditionSchema} from '../lib/cms/photo-expeditions.ts';
const uuid='00000000-0000-4000-8000-000000000001',revision='00000000-0000-4000-8000-000000000002';
const page={recordId:'forest',operation:'create',slug:'forest-expedition',title:'Forest expedition',locale:'en'};
const image={assetId:'forest',alt:'Forest',decorative:false};
const input=sheets=>({templateVersion:'1.0',pageType:'photoExpedition',sheets:{Pages:[page],...sheets}});
const content=(field,value)=>({recordId:'forest',field,value});
const media=(role,itemId='picture',position='1')=>({recordId:'forest',itemId,position,role,assetId:'forest',alt:'Forest',decorative:'false',credit:'Photographer'});
test('expedition tables create complete drafts with exact wording, ordered stable collections and typed references',()=>{
 const value=input({Content:[content('price','INR 1,20,000 + taxes'),content('dateLabel','Dates on request'),content('booking.button.newWindow','true'),content('labels.previewNote','Preview only')],Departures:[{recordId:'forest',itemId:'leap-day',position:1,date:'2028-02-29',endDate:'2028-03-02',status:'Full',availability:'Waitlist',homepageNote:'2028 is sold out\nBooking open for 2029'}],Days:[{recordId:'forest',itemId:'second',position:'2',title:'Second day',copy:'Photograph.'},{recordId:'forest',itemId:'first',position:'1',title:'Arrival',copy:'Settle in.',stay:'Forest lodge'}],Lists:[{recordId:'forest',itemId:'one',position:'1',collection:'highlights',text:'Patient photography'}],FAQs:[{recordId:'forest',itemId:'q-one',position:'1',question:'Equipment?',answer:'Camera.'}],Media:[media('image'),media('heroImage'),media('mobileHeroImage'),media('gallery','g-one'),media('video.poster'),media('seo.socialImage')],References:[{recordId:'forest',itemId:'mentor',position:'1',role:'mentor',targetId:uuid},{recordId:'forest',itemId:'guide',position:'2',role:'guide',targetId:uuid},{recordId:'forest',itemId:'form',position:'1',role:'enquiryForm',targetId:uuid}],Films:[{recordId:'forest',assetId:'film',title:'Field film',caption:'Caption',transcript:'Transcript',captionsAssetId:'captions'}]});
 const before=structuredClone(value),result=planExpeditionImport(value);assert.equal(result.valid,true,JSON.stringify(result.issues));assert.equal(result.changes.length,1);const change=result.changes[0],p=change.payload;
 assert.equal(change.path,'/photo-expeditions/forest-expedition');assert.equal(p.price,'INR 1,20,000 + taxes');assert.equal(p.dateLabel,'Dates on request');assert.deepEqual(p.days.map(day=>day.id),['first','second']);assert.equal(p.gallery[0].id,'g-one');assert.equal(p.video.poster.credit,'Photographer');assert.equal(p.specialists.length,2);assert.equal(p.enquiry.form.recordId,uuid);assert.equal(p.departures[0].status,'Full');assert.equal(p.departures[0].availability,'Waitlist');assert.equal(p.departures[0].homepageNote,'2028 is sold out\nBooking open for 2029');assert.equal(p.booking.button.newWindow,true);assert.deepEqual(photoExpeditionSchema.parse(p),p);assert.deepEqual(value,before);
});
test('updates retain omitted data, require revision and explicit replacements, and do not mutate stored content',()=>{
 const payload={...newPhotoExpedition(),slug:page.slug,title:page.title,price:'Original price',days:[{id:'day',label:'',title:'Original day',copy:'Original copy',stay:''}],image,heroImage:image,video:{assetId:'film',title:'Film',poster:image,caption:'Caption',transcript:'Transcript',captionsAssetId:'captions'}};
 const existing=[{recordId:uuid,revision,locale:'en',payload}],before=structuredClone(existing),pages=[{...page,recordId:uuid,operation:'update',expectedRevision:revision}];
 const value=input({Pages:pages,Content:[{recordId:uuid,field:'price',value:'Exact replacement'}]});let result=planExpeditionImport(value,existing);assert.equal(result.valid,true,JSON.stringify(result.issues));assert.deepEqual(result.changes[0].payload.days,payload.days);assert.deepEqual(result.changes[0].payload.video,payload.video);assert.equal(result.changes[0].payload.price,'Exact replacement');
 const rows=[{recordId:uuid,itemId:'new-day',position:'1',title:'New day',copy:'New copy'}];assert.equal(planExpeditionImport({...value,sheets:{...value.sheets,Days:rows}},existing).valid,false);
 result=planExpeditionImport(input({Pages:[{...pages[0],replaceCollections:'days,video'}]}),existing);assert.equal(result.valid,true,JSON.stringify(result.issues));assert.deepEqual(result.changes[0].payload.days,[]);assert.equal(result.changes[0].payload.video,undefined);
 for(const change of [{expectedRevision:uuid},{slug:'different'},{locale:'fr'},{replaceCollections:'days,days'},{replaceCollections:'unknown'},{replaceCollections:'video,video.poster'}])assert.equal(planExpeditionImport(input({Pages:[{...pages[0],...change}]}),existing).valid,false);
 assert.deepEqual(existing,before);
});
test('invalid dates, identities, positions, unused columns and orphan rows prevent all proposed changes',()=>{
 const departure={recordId:'forest',itemId:'departure',position:'1',date:'2028-02-29',status:'Available'};
 for(const sheets of [{Departures:[{...departure,date:'2027-02-29'}]},{Departures:[{...departure,endDate:'2028-02-28'}]},{Departures:[departure,departure]},{Departures:[{...departure,position:'0'}]},{Departures:[{...departure,status:'Confirmed'}]},{Departures:[{...departure,recordId:'missing'}]},{Content:[content('booking.button.newWindow','yes')]},{Content:[content('__proto__.polluted','true')]},{Content:[content('price',25)]},{Content:[content('price','a'),content('price','b')]},{Pages:[page,{...page,recordId:'second'}]},{Media:[media('heroImage'),media('heroImage','another','2')]},{References:[{recordId:'forest',itemId:'bad',position:'1',role:'mentor',targetId:'not-a-uuid'}]},{Films:[{recordId:'forest',assetId:'film',title:'Missing poster'}]},{Days:[{recordId:'forest',itemId:'day',position:'1',title:'Day',copy:'Copy',discarded:'Must not vanish'}]}]){
  const result=planExpeditionImport(input(sheets));assert.equal(result.valid,false,JSON.stringify(sheets));assert.deepEqual(result.changes,[]);
 }
 assert.equal({}.polluted,undefined);
});
test('template limits preserve Office row numbers, distinguish guidance and cover every scalar field',()=>{
 const result=validateExpeditionImportTables(input({Content:[{},content('description',Array(51).fill('word').join(' ')),content('heroTitle','x'.repeat(201))]}));assert.equal(result.valid,false);assert.ok(result.issues.some(item=>item.row===3&&item.severity==='warning'));assert.ok(result.issues.some(item=>item.row===4&&item.code==='character_limit'));assert.deepEqual(result.tables.Content[0],{});
 assert.equal(validateExpeditionImportTables(input({Content:Array(501).fill(content('price','a'))})).valid,false);
 const ignore=new Set(['schemaVersion','slug','title','image','heroImage','mobileHeroImage','gallery','video','departures','days','highlights','inclusions','exclusions','body','faqs','specialists']);
 const walk=(value,path='')=>{for(const [key,item] of Object.entries(value)){const next=path?`${path}.${key}`:key;if(key==='schemaVersion'||!path&&ignore.has(key))continue;if(item&&typeof item==='object')walk(item,next);else assert.ok(Object.hasOwn(expeditionContentFields,next),next);}};walk(newPhotoExpedition());
});
