import test from 'node:test';import assert from 'node:assert/strict';
import {newPartner} from '../lib/cms/partners.ts';
import {handlePartnerSave} from '../lib/cms/partner-editor-api.ts';
import {handlePartnerLibrary} from '../lib/cms/partner-library-api.ts';
const id=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const command=()=>({action:'save',site:id(1),record:null,expectedRevision:null,requestKey:id(2),payload:newPartner()});
const request=(body,headers={})=>new Request('https://cms.test/api/cms/partners',{method:'POST',headers:{authorization:'Bearer a.b.c','content-type':'application/json',...headers},body:JSON.stringify(body)});
test('partner create uses a scoped recovery key and verifies receipts',async()=>{
 const c=command();const response=await handlePartnerSave(request(c),async(token,name,args)=>{assert.equal(token,'a.b.c');assert.equal(name,'create_draft_once');assert.deepEqual(args,{p_site:c.site,p_type:'partner',p_path:'/partners/new-partner',p_title:c.payload.title,p_payload:c.payload,p_locale:'en',p_request:c.requestKey});return {recordId:id(3),revisionId:id(4)};});
 assert.equal(response.status,200);assert.match(response.headers.get('cache-control'),/no-store/);assert.equal((await response.json()).requestKey,c.requestKey);
 assert.equal((await handlePartnerSave(request(c),async()=>({unexpected:true}))).status,503);
 for(const [body,headers,status] of [[{...c,payload:{...c.payload,coverage:[{countryCode:'invalid',regions:[]}]}},{},422],[{...c,requestKey:undefined},{},422],[c,{origin:'https://other.test'},403],[c,{authorization:''},401],[c,{'content-type':'partner/json'},415]])assert.equal((await handlePartnerSave(request(body,headers),async()=>assert.fail('Invalid request reached persistence'))).status,status);
});
test('partner updates check type, current revision and immutable URL/language before saving',async()=>{
 const c={...command(),record:id(3),expectedRevision:id(4),requestKey:undefined};const stored={id:id(3),type:'partner',currentRevision:id(4),path:'/partners/new-partner',locale:'en'};
 for(const [patch,status] of [[{type:'destination'},404],[{currentRevision:id(8)},409],[{path:'/partners/different'},422],[{locale:'fr'},422]])assert.equal((await handlePartnerSave(request(c),async(_,name)=>{assert.equal(name,'get_editor_record');return {...stored,...patch};})).status,status);
 const calls=[];assert.equal((await handlePartnerSave(request(c),async(_,name,args)=>{calls.push(name);if(name==='get_editor_record')return stored;assert.equal(args.p_expected,id(4));return {recordId:id(3),revisionId:id(5)};})).status,200);assert.deepEqual(calls,['get_editor_record','save_draft']);
 assert.equal((await handlePartnerSave(request(c),async(_,name)=>name==='get_editor_record'?stored:{recordId:id(9),revisionId:id(5)})).status,503);
});
test('partner cancellation preserves unresolved requests and returns verified creation results',async()=>{
 const c={action:'cancel_create',site:id(1),requestKey:id(2)};
 for(const result of [{status:'cancelled'},{status:'created',result:{recordId:id(3),revisionId:id(4)}}]){const response=await handlePartnerSave(request(c),async(_,name,args)=>{assert.equal(name,'cancel_draft_creation');assert.equal(args.p_type,'partner');return result;});assert.equal(response.status,200);assert.deepEqual((await response.json()).result,result);}
 assert.equal((await handlePartnerSave(request(c),async()=>({status:'unknown'}))).status,503);
});
test('partner search validates filters, cursor ordering and server responses',async()=>{
 const get=q=>new Request('https://cms.test/api/cms/partners?site='+id(1)+q,{headers:{authorization:'Bearer a.b.c'}});
 assert.equal((await handlePartnerLibrary(get('&kind=dealer&owned=mine&search=Example'),async(_,name,args)=>{assert.equal(name,'search_partner_library');assert.equal(args.p_kind,'dealer');assert.equal(args.p_owned,true);assert.equal(args.p_search,'Example');return {records:[],next:null};})).status,200);
 for(const q of ['&kind=industry','&kind=dealer&kind=other','&limit=101','&unknown=true'])assert.equal((await handlePartnerLibrary(get(q),async()=>assert.fail())).status,400);
 assert.equal((await handlePartnerLibrary(get(''),async()=>({records:[],next:id(9)}))).status,500);
});
