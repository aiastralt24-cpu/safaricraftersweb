import test from 'node:test';
import assert from 'node:assert/strict';
import {handleEditorCommand,handleEditorRead} from '../lib/cms/editor-api.ts';
import {cmsRpc,CmsGatewayError} from '../lib/cms/gateway.ts';
const site='00000000-0000-4000-8000-000000000001',record='00000000-0000-4000-8000-000000000002',revision='00000000-0000-4000-8000-000000000003';
const save={action:'save',site,record,expectedRevision:revision,type:'journey',path:'/journeys/forest',title:'Forest journey',payload:{title:'Draft copy'}};
const request=(body,headers={})=>new Request('https://site.test/api/cms/content',{method:'POST',headers:{Authorization:'Bearer a.b.c','Content-Type':'application/json',...headers},body:JSON.stringify(body)});
test('advisory media checks use authorized site-scoped evidence, not browser asset claims',async()=>{
 const calls=[];const response=await handleEditorCommand(request({action:'validate',site,record,revision}),async(token,name,args)=>{
 calls.push({token,name,args});return name==='get_editor_record'?{id:record,currentRevision:revision,type:'journey',path:'/journeys/forest',payload:{slug:'forest',title:'Forest',description:'A forest trip',intro:'Walk with a guide',region:'India',duration:'5 days',bestMonths:'November',media:[{itemId:'hero',position:1,role:'hero',assetId:'image',alt:'Forest canopy'}]}}:[{assetId:'image',available:false}];
 });
 assert.equal(response.status,200);assert.equal((await response.json()).result.contentChecksPass,false);
 assert.deepEqual(calls[1],{token:'a.b.c',name:'get_record_media_status',args:{p_site:site,p_record:record,p_revision:revision}});
});
test('trusted validation status is read with user authority and bound to requested revision',async()=>{
 let called;const response=await handleEditorCommand(request({action:'validation_status',site,record,revision}),async(...args)=>{called=args;return {revision,valid:false};});
 assert.equal(response.status,200);assert.equal(called[0],'a.b.c');assert.equal(called[1],'get_validation');
 for(const [value,status]of [[null,404],[{revision:record},409]])assert.equal((await handleEditorCommand(request({action:'validation_status',site,record,revision}),async()=>value)).status,status);
});
test('validation reads only the authorized stored revision and cannot grant publication',async()=>{
 const calls=[];const stored={id:record,type:'journey',path:'/journeys/forest',currentRevision:revision,payload:{title:'Incomplete'}};
 const response=await handleEditorCommand(request({action:'validate',site,record,revision}),async(...args)=>{calls.push(args);return stored;});
 assert.equal(response.status,200);const body=await response.json();assert.equal(body.result.contentChecksPass,false);assert.equal(body.result.publicationAuthorized,false);assert.equal(body.result.revision,revision);
 assert.equal(calls.length,1);assert.equal(calls[0][1],'get_editor_record');assert.equal(calls[0][0],'a.b.c');
 for(const [value,status] of [[null,404],[{...stored,currentRevision:record},409]])assert.equal((await handleEditorCommand(request({action:'validate',site,record,revision}),async()=>value)).status,status);
 assert.equal((await handleEditorCommand(request({action:'validate',site,record,revision,payload:{}}),async()=>{throw Error('not reached');})).status,422);
});
test('save forwards only approved fields with user identity and expected revision',async()=>{
 let call;const result=await handleEditorCommand(request(save),async(...args)=>{call=args;return {revisionId:'new'};});assert.equal(result.status,200);assert.equal(call[0],'a.b.c');assert.equal(call[1],'save_draft');assert.equal(call[2].p_expected,revision);assert.equal(call[2].p_locale,'en');assert.match(result.headers.get('cache-control'),/no-store/);
});
test('unknown privileged fields, arbitrary actions and stale-write omissions never reach the RPC',async()=>{
 for(const body of [{...save,actor:'forged'},{...save,action:'execute_sql'},{...save,expectedRevision:null}]){
 let called=false;const result=await handleEditorCommand(request(body),async()=>{called=true;});assert.equal(result.status,422);assert.equal(called,false);
 }
});
test('cross-origin and oversized requests are rejected before database work',async()=>{
 const unavailable=async()=>{throw new Error('must not call');};assert.equal((await handleEditorCommand(request(save,{Origin:'https://other.test'}),unavailable)).status,403);
 assert.equal((await handleEditorCommand(request({...save,payload:{copy:'x'.repeat(1_100_001)}}),unavailable)).status,413);
});
test('all editorial actions map to fixed database functions with revision binding',async()=>{
 for(const [action,procedure] of [['submit','review'],['approve','review'],['request_changes','review'],['publish','publish'],['unpublish','unpublish'],['restore','restore_draft'],['preview','create_preview']]){
 let call;const body={action,site,record,revision,...(action==='restore'?{expectedRevision:revision}:{}),...(action==='preview'?{recipient:record}:{})};
 const response=await handleEditorCommand(request(body),async(...args)=>{call=args;return null;});assert.equal(response.status,200);assert.equal(call[1],procedure);assert.equal(call[2][action==='unpublish'?'p_expected_published':'p_revision'],revision);
 }
});
test('read APIs return unavailable for hidden records and reject unknown filters',async()=>{
 const headers={Authorization:'Bearer a.b.c'};
 assert.equal((await handleEditorRead(new Request(`https://site.test/api/cms/content?site=${site}&record=${record}`,{headers}),async()=>null)).status,404);
 assert.equal((await handleEditorRead(new Request(`https://site.test/api/cms/content?site=${site}&sql=select`,{headers}),async()=>[])).status,400);
});
test('conflict errors remain actionable and successful void RPCs do not look like failures',async()=>{
 const response=await handleEditorCommand(request(save),async()=>{throw new CmsGatewayError(409,'Reload before saving.');});assert.equal(response.status,409);
 const config={url:'https://cms.test',key:'anon'};assert.equal(await cmsRpc(config,'a.b.c','review',{},async()=>new Response(null,{status:204})),null);
 await assert.rejects(cmsRpc(config,'a.b.c','publish',{},async()=>Response.json({code:'P0001',message:'approved_revision_required'},{status:400})),error=>error.status===422&&error.message.includes('Approve'));
});

test('composition commands use stored payload and optimistic revision while retaining other page fields',async()=>{
 const section=id=>({id,kind:'text',controls:{label:id},data:{body:[{kind:'paragraph',text:id}]}});
 const stored={id:record,type:'page',path:'/about',locale:'en',title:'About',currentRevision:revision,payload:{seo:{title:'Retained SEO'},composition:{schemaVersion:1,title:'About',sections:[section('one'),section('two')]}}};
 const calls=[];
 const response=await handleEditorCommand(request({action:'compose',site,record,revision,command:{type:'move',id:'two',to:0}}),async(token,name,args)=>{calls.push({token,name,args});return name==='get_editor_record'?stored:{recordId:record};});
 assert.equal(response.status,200);assert.equal(calls[1].token,'a.b.c');assert.equal(calls[1].name,'save_draft');assert.equal(calls[1].args.p_expected,revision);
 assert.deepEqual(calls[1].args.p_payload.seo,stored.payload.seo);assert.deepEqual(calls[1].args.p_payload.composition.sections.map(s=>s.id),['two','one']);assert.equal(stored.payload.composition.sections[0].id,'one');
 for(const [value,status]of [[{...stored,currentRevision:record},409],[{...stored,type:'journey'},422],[{...stored,payload:{}},422]]){
 let saves=0;const result=await handleEditorCommand(request({action:'compose',site,record,revision,command:{type:'remove',id:'one'}}),async(_token,name)=>{if(name==='save_draft')saves++;return value;});assert.equal(result.status,status);assert.equal(saves,0);
 }
});
test('composition rejects browser payload substitution and propagates concurrent-save conflicts',async()=>{
 const input={action:'compose',site,record,revision,command:{type:'remove',id:'one'},payload:{}};
 assert.equal((await handleEditorCommand(request(input),async()=>{throw Error('must not call');})).status,422);
 const stored={id:record,type:'page',path:'/about',locale:'en',title:'About',currentRevision:revision,payload:{composition:{schemaVersion:1,title:'About',sections:[{id:'one',kind:'text',controls:{label:'One'},data:{body:[]}}]}}};
 delete input.payload;
 const response=await handleEditorCommand(request(input),async(_token,name)=>{if(name==='get_editor_record')return stored;throw new CmsGatewayError(409,'Concurrent edit');});assert.equal(response.status,409);
});

test('page validation fetches nested image evidence even without a journey media array',async()=>{
 const calls=[];const response=await handleEditorCommand(request({action:'validate',site,record,revision}),async(_token,name,args)=>{calls.push({name,args});return name==='get_editor_record'?{id:record,currentRevision:revision,type:'page',path:'/about',payload:{composition:{schemaVersion:1,title:'About',sections:[]}}}:[];});
 assert.equal(response.status,200);assert.equal(calls[1].name,'get_record_media_status');assert.deepEqual(calls[1].args,{p_site:site,p_record:record,p_revision:revision});
 const body=await response.json();assert.equal(body.result.publicationAuthorized,false);assert.equal(body.result.contentChecksPass,false);
});

test('navigation drafts reject invalid trees and page paths before persistence',async()=>{
 const value={action:'save',site,record:null,expectedRevision:null,type:'navigation',path:null,title:'Main menu',payload:{schemaVersion:1,title:'Main menu',items:[]}};
 assert.equal((await handleEditorCommand(request(value),async()=>({recordId:record}))).status,200);
 for(const invalid of [{...value,path:'/menu'},{...value,payload:{...value.payload,items:[{id:'a',parentId:'a',label:'Cycle',target:{kind:'group'},visibility:{visible:true}}]}}])assert.equal((await handleEditorCommand(request(invalid),async()=>assert.fail('unexpected RPC'))).status,422);
});
test('trusted check requests retain user authority and cannot include certified results',async()=>{
 let called;const response=await handleEditorCommand(request({action:'request_validation',site,record,revision}),async(...args)=>{called=args;return revision;});
 assert.equal(response.status,200);assert.deepEqual(called,['a.b.c','request_validation',{p_site:site,p_record:record,p_revision:revision}]);
 assert.equal((await handleEditorCommand(request({action:'request_validation',site,record,revision,valid:true}),async()=>{throw Error('must not run');})).status,422);
});
test('navigation advisory validation binds current revision and caller-scoped published evidence',async()=>{
 const calls=[],target='00000000-0000-4000-8000-000000000004';
 const stored={id:record,type:'navigation',path:null,locale:'en',currentRevision:revision,payload:{schemaVersion:1,title:'Menu',items:[{id:'journey',parentId:null,label:'Forest',target:{kind:'record',recordId:target,contentType:'journey'},visibility:{visible:true}}]}};
 const rpc=async(token,name,args)=>{calls.push({token,name,args});return name==='get_editor_record'?stored:[{recordId:target,available:true,type:'journey',title:'Forest',path:'/journeys/forest',locale:'en'}];};
 const response=await handleEditorCommand(request({action:'validate',site,record,revision}),rpc);assert.equal(response.status,200);const result=(await response.json()).result;assert.deepEqual(result.findings,[]);assert.equal(result.contentChecksPass,true);assert.equal(result.publicationAuthorized,false);assert.deepEqual(calls[1],{token:'a.b.c',name:'get_navigation_reference_status',args:{p_site:site,p_record:record,p_revision:revision}});
 calls.length=0;assert.equal((await handleEditorCommand(request({action:'validate',site,record,revision:target}),rpc)).status,409);assert.equal(calls.length,1);
});
test('settings advisory validation fetches nested image evidence and retains locale',async()=>{
 const {newGlobalSettings}=await import('../lib/cms/global-settings.ts');const payload=newGlobalSettings();payload.brand.logo={assetId:'logo',alt:'Brand',decorative:false};const calls=[];
 const response=await handleEditorCommand(request({action:'validate',site,record,revision}),async(token,name,args)=>{calls.push({token,name,args});return name==='get_editor_record'?{id:record,type:'settings',path:null,locale:'en',currentRevision:revision,payload}:name==='get_settings_reference_status'?[]:[{assetId:'logo',available:true}];});
 assert.equal(response.status,200);assert.equal(calls[1].name,'get_record_media_status');assert.equal(calls[2].name,'get_settings_reference_status');const result=(await response.json()).result;assert.equal(result.findings.some(f=>f.code==='asset_verification_required'||f.code==='settings_locale_not_ready'),false);assert.equal(result.contentChecksPass,false);
});
test('homepage saves require root identity and valid composition while retaining unrelated migration data',async()=>{
 const payload={legacySource:{keep:'original'},composition:{schemaVersion:1,title:'Homepage',sections:[]}};
 const command={...save,type:'homepage',path:'/',title:'Homepage',payload};let called;
 const response=await handleEditorCommand(request(command),async(...args)=>{called=args;return {recordId:record,revisionId:revision};});
 assert.equal(response.status,200);assert.equal(called[1],'save_draft');assert.equal(called[2].p_type,'homepage');assert.equal(called[2].p_path,'/');assert.equal(called[2].p_expected,revision);assert.deepEqual(called[2].p_payload.legacySource,payload.legacySource);
 for(const patch of [{path:'/home'},{path:null},{title:'Different title'},{payload:{legacySource:'not yet migrated'}},{payload:{composition:{schemaVersion:1,title:'Homepage',sections:[{id:'bad',kind:'unknown',controls:{label:'Bad'},data:{}}]}}}]){
  const invalid=await handleEditorCommand(request({...command,...patch}),async()=>{assert.fail('Invalid homepage must not reach storage');});assert.equal(invalid.status,422);
 }
});

test('new-record request identities use atomic creation and cannot be attached to updates',async()=>{
 const requestKey='00000000-0000-4000-8000-000000000004';let calls=[];
 const create={...save,record:null,expectedRevision:null,requestKey};
 const response=await handleEditorCommand(request(create),async(...args)=>{calls.push(args);return {recordId:record,revisionId:revision};});
 assert.equal(response.status,200);assert.deepEqual(await response.json(),{site,requestKey,result:{recordId:record,revisionId:revision}});assert.equal(calls[0][0],'a.b.c');assert.equal(calls[0][1],'create_draft_once');assert.equal(calls[0][2].p_request,requestKey);assert.equal(calls[0][2].p_record,undefined);
 for(const invalid of [{...save,requestKey},{...create,requestKey:'bad'},{...create,expectedRevision:revision}]){calls=[];assert.equal((await handleEditorCommand(request(invalid),async(...args)=>{calls.push(args);})).status,422);assert.equal(calls.length,0);}
});

test('creation cancellation forwards identity and rejects extra or malformed input',async()=>{
 const command={action:'cancel_create',site,requestKey:revision,type:'journey'};let calls=[];
 const response=await handleEditorCommand(request(command),async(...args)=>{calls.push(args);return {status:'cancelled'};});
 assert.equal(response.status,200);assert.deepEqual(await response.json(),{site,requestKey:revision,result:{status:'cancelled'}});
 assert.deepEqual(calls,[['a.b.c','cancel_draft_creation',{p_site:site,p_request:revision,p_type:'journey'}]]);
 for(const invalid of [{...command,requestKey:'bad'},{...command,record},{...command,type:'unknown'}])assert.equal((await handleEditorCommand(request(invalid),async()=>{throw Error('Must not call');})).status,422);
});
