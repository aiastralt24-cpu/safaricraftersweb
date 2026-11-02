import test from 'node:test';import assert from 'node:assert/strict';import {handleDocumentFileCommand} from '../lib/cms/document-file-api.ts';
const site='00000000-0000-4000-8000-000000000001',asset='00000000-0000-4000-8000-000000000002';
const file={id:asset,revision:1,filename:'Guide.pdf',bytes:100,pages:1,parserVersion:'6.10.0',inspectionVersion:'document-pdf-1',createdAt:'2026-10-23T00:00:00Z',rightsStatus:'pending',rightsExpiresAt:null,archivedAt:null,rightsEvidence:null,canManageRights:false,canArchive:false,eligible:false};
const request=(body,headers={})=>new Request('https://site.test/api/cms/document-files',{method:'POST',headers:{authorization:'Bearer a.b.c',origin:'https://site.test','content-type':'application/json',...headers},body:JSON.stringify({site,...body})});
test('document file list/get preserve caller scope and return only validated catalogue data',async()=>{
 const calls=[];const call=async(token,name,args)=>{calls.push({token,name,args});return name==='list_document_files'?[file]:file;};
 assert.deepEqual(await (await handleDocumentFileCommand(request({action:'list',search:'Guide'}),call)).json(),{result:[file]});
 const response=await handleDocumentFileCommand(request({action:'get',asset}),call);assert.deepEqual(await response.json(),{result:file});assert.match(response.headers.get('cache-control'),/no-store/);
 assert.deepEqual(calls[0],{token:'a.b.c',name:'list_document_files',args:{p_site:site,p_after:null,p_search:'Guide'}});
});
test('file catalogue rejects secrets, mismatched identities, duplicate rows and unauthorized evidence',async()=>{
 for(const value of [{...file,id:site},{...file,key:'private/path'},{...file,rightsEvidence:'private license'}])assert.equal((await handleDocumentFileCommand(request({action:'get',asset}),async()=>value)).status,503);
 for(const value of [[file,file],Array(51).fill(file),[{...file,rightsEvidence:'private license'}]])assert.equal((await handleDocumentFileCommand(request({action:'list'}),async()=>value)).status,503);
 assert.equal((await handleDocumentFileCommand(request({action:'get',asset}),async()=>null)).status,404);
});
test('document file rights changes require revision and evidence; uncertain results require reload',async()=>{
 const body={action:'rights',asset,revision:1,status:'approved',evidence:'Client license',expires:null};
 const response=await handleDocumentFileCommand(request(body),async(token,name,args)=>{assert.equal(name,'set_document_file_rights');assert.equal(token,'a.b.c');assert.deepEqual(args,{p_site:site,p_asset:asset,p_expected:1,p_status:'approved',p_evidence:'Client license',p_expires:null});return 2;});assert.deepEqual(await response.json(),{result:2});
 for(const patch of [{evidence:''},{expires:'2000-01-01T00:00:00Z'},{revision:0},{status:'ready'},{extra:true}])assert.equal((await handleDocumentFileCommand(request({...body,...patch}),()=>assert.fail('Invalid rights reached provider'))).status,422);
 for(const result of [1,3,null,'2'])assert.equal((await handleDocumentFileCommand(request(body),async()=>result)).status,503);
 assert.equal((await handleDocumentFileCommand(request(body,{origin:'https://foreign.test'}),()=>assert.fail())).status,403);
 assert.equal((await handleDocumentFileCommand(request(body,{authorization:''}),()=>assert.fail())).status,401);
});

test('file usage preserves scoped pagination and rejects malformed/private or duplicate rows',async()=>{
 const row={recordId:site,title:'Brochure',type:'document',path:null,draft:true,published:false,historical:true};
 const response=await handleDocumentFileCommand(request({action:'usage',asset,after:site}),async(token,name,args)=>{assert.equal(token,'a.b.c');assert.equal(name,'document_file_usage');assert.deepEqual(args,{p_site:site,p_asset:asset,p_after:site});return [row];});assert.deepEqual(await response.json(),{result:[row]});
 for(const result of [[row,row],[{...row,payload:'secret'}],[{...row,draft:false,historical:false}],null])assert.equal((await handleDocumentFileCommand(request({action:'usage',asset}),async()=>result)).status,503);
});

test('file archive commands preserve expected revision and require confirmed result or reload',async()=>{
 for(const archived of [true,false])for(const result of [1,2]){
  const response=await handleDocumentFileCommand(request({action:'archive',asset,revision:1,archived}),async(token,name,args)=>{assert.equal(token,'a.b.c');assert.equal(name,'archive_document_file');assert.deepEqual(args,{p_site:site,p_asset:asset,p_expected:1,p_archive:archived});return result;});assert.deepEqual(await response.json(),{result});
 }
 for(const result of [null,0,3,'2'])assert.equal((await handleDocumentFileCommand(request({action:'archive',asset,revision:1,archived:true}),async()=>result)).status,503);
 assert.equal((await handleDocumentFileCommand(request({action:'archive',asset,revision:1,archived:null}),()=>assert.fail())).status,422);
});
