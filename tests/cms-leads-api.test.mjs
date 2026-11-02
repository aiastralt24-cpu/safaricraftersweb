import test from 'node:test';
import assert from 'node:assert/strict';
import {handleLeadCommand} from '../lib/cms/leads-api.ts';
const site='00000000-0000-4000-8000-000000000001',lead='00000000-0000-4000-8000-000000000002';
const request=(body,headers={})=>new Request('https://site.test/api/cms/leads',{method:'POST',headers:{Authorization:'Bearer a.b.c','Content-Type':'application/json',...headers},body:JSON.stringify(body)});
test('lead API binds user identity and expected version to fixed operations',async()=>{
 const commands=[['list',{action:'list',site},'list_leads'],['get',{action:'get',site,lead},'get_lead'],['note',{action:'note',site,lead,expected:4,note:'Called'},'add_lead_note'],['update',{action:'update',site,lead,expected:4,status:'contacted',priority:'high',assignedTo:null,nextFollowUp:null,outcome:'',externalCrmReference:null},'update_lead']];
 for(const [action,body,name]of commands){let args;const response=await handleLeadCommand(request(body),async(...input)=>{args??=input;return input[1]==='get_lead'?{id:lead}:{};});assert.equal(response.status,200);assert.equal(args[0],'a.b.c');assert.equal(args[1],name);assert.equal(args[2].p_site,site);if(['note','update'].includes(action))assert.equal(args[2].p_expected,4);assert.match(response.headers.get('cache-control'),/no-store/);}
});
test('lead API rejects hidden records, overposting, invalid notes and cross-origin writes',async()=>{
 assert.equal((await handleLeadCommand(request({action:'get',site,lead}),async()=>null)).status,404);
 const note={action:'note',site,lead,expected:1,note:'Note'},never=async()=>assert.fail('unexpected RPC');
 for(const patch of [{note:' '},{note:'x'.repeat(5001)},{expected:0},{answers:{name:'overwrite'}},{action:'delete'}])assert.equal((await handleLeadCommand(request({...note,...patch}),never)).status,422);
 assert.equal((await handleLeadCommand(request(note,{Origin:'https://other.test'}),never)).status,403);
 assert.equal((await handleLeadCommand(request(note,{Authorization:''}),never)).status,401);
});

test('attachment metadata is user-scoped and rejects private paths or duplicate identities',async()=>{
 const file={uploadId:lead,fieldId:'cv',filename:'CV.pdf',mime:'application/pdf',bytes:100,canDownload:false};
 const response=await handleLeadCommand(request({action:'attachments',site,lead}),async(token,name,args)=>{assert.equal(token,'a.b.c');assert.equal(name,'list_lead_attachments');assert.deepEqual(args,{p_site:site,p_lead:lead});return [file];});assert.equal(response.status,200);assert.deepEqual((await response.json()).result,[file]);
 for(const result of [null,[{...file,key:'private/path'}],[file,file]])assert.notEqual((await handleLeadCommand(request({action:'attachments',site,lead}),async()=>result)).status,200);
});
