import test from 'node:test';import assert from 'node:assert/strict';
import {newCareer} from '../lib/cms/careers.ts';
import {handleCareerSave} from '../lib/cms/career-editor-api.ts';
import {handleCareerLibrary} from '../lib/cms/career-library-api.ts';
const id=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const command=()=>({action:'save',site:id(1),record:null,expectedRevision:null,requestKey:id(2),payload:newCareer()});
const request=(body,headers={})=>new Request('https://cms.test/api/cms/careers',{method:'POST',headers:{authorization:'Bearer a.b.c','content-type':'application/json',...headers},body:JSON.stringify(body)});
test('career create uses a scoped recovery key and verifies receipts',async()=>{
 const c=command();const response=await handleCareerSave(request(c),async(token,name,args)=>{assert.equal(token,'a.b.c');assert.equal(name,'create_draft_once');assert.deepEqual(args,{p_site:c.site,p_type:'career',p_path:'/careers/new-job',p_title:c.payload.title,p_payload:c.payload,p_locale:'en',p_request:c.requestKey});return {recordId:id(3),revisionId:id(4)};});
 assert.equal(response.status,200);assert.match(response.headers.get('cache-control'),/no-store/);assert.equal((await response.json()).requestKey,c.requestKey);
 assert.equal((await handleCareerSave(request(c),async()=>({unexpected:true}))).status,503);
 for(const [body,headers,status] of [[{...c,payload:{...c.payload,application:{mode:'external',label:'Apply',url:'javascript:alert(1)'}}},{},422],[{...c,requestKey:undefined},{},422],[c,{origin:'https://other.test'},403],[c,{authorization:''},401],[c,{'content-type':'career/json'},415]])assert.equal((await handleCareerSave(request(body,headers),async()=>assert.fail('Invalid request reached persistence'))).status,status);
});
test('career updates check type, current revision and immutable URL/language before saving',async()=>{
 const c={...command(),record:id(3),expectedRevision:id(4),requestKey:undefined};const stored={id:id(3),type:'career',currentRevision:id(4),path:'/careers/new-job',locale:'en'};
 for(const [patch,status] of [[{type:'destination'},404],[{currentRevision:id(8)},409],[{path:'/careers/different'},422],[{locale:'fr'},422]])assert.equal((await handleCareerSave(request(c),async(_,name)=>{assert.equal(name,'get_editor_record');return {...stored,...patch};})).status,status);
 const calls=[];assert.equal((await handleCareerSave(request(c),async(_,name,args)=>{calls.push(name);if(name==='get_editor_record')return stored;assert.equal(args.p_expected,id(4));return {recordId:id(3),revisionId:id(5)};})).status,200);assert.deepEqual(calls,['get_editor_record','save_draft']);
 assert.equal((await handleCareerSave(request(c),async(_,name)=>name==='get_editor_record'?stored:{recordId:id(9),revisionId:id(5)})).status,503);
});
test('career cancellation preserves unresolved requests and returns verified creation results',async()=>{
 const c={action:'cancel_create',site:id(1),requestKey:id(2)};
 for(const result of [{status:'cancelled'},{status:'created',result:{recordId:id(3),revisionId:id(4)}}]){const response=await handleCareerSave(request(c),async(_,name,args)=>{assert.equal(name,'cancel_draft_creation');assert.equal(args.p_type,'career');return result;});assert.equal(response.status,200);assert.deepEqual((await response.json()).result,result);}
 assert.equal((await handleCareerSave(request(c),async()=>({status:'unknown'}))).status,503);
});
test('career search validates filters, cursor ordering and server responses',async()=>{
 const get=q=>new Request('https://cms.test/api/cms/careers?site='+id(1)+q,{headers:{authorization:'Bearer a.b.c'}});
 assert.equal((await handleCareerLibrary(get('&employment=fullTime&owned=mine&search=Example'),async(_,name,args)=>{assert.equal(name,'search_career_library');assert.equal(args.p_employment,'fullTime');assert.equal(args.p_owned,true);assert.equal(args.p_search,'Example');return {records:[],next:null};})).status,200);
 for(const q of ['&employment=industry','&employment=fullTime&employment=other','&limit=101','&unknown=true'])assert.equal((await handleCareerLibrary(get(q),async()=>assert.fail())).status,400);
 assert.equal((await handleCareerLibrary(get(''),async()=>({records:[],next:id(9)}))).status,500);
});
