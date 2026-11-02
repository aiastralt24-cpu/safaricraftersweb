import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,stat,mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {handleHeroVideoTransfer,putPrivateHeroVideo} from '../lib/cms/hero-video-transfer.ts';
const site='00000000-0000-4000-8000-000000000001',id='00000000-0000-4000-8000-000000000002';
const transfer={site,id,key:`${site}/${id}/original`,mime:'video/mp4',bytes:3};
const request=(body=new Uint8Array([1,2,3]),headers={},signal)=>new Request('https://site.test/api/cms/video-uploads/transfer',{method:'POST',headers:{Authorization:'Bearer a.b.c','x-cms-site':site,'x-cms-upload':id,'Content-Type':'video/mp4',...headers},body,duplex:'half',signal});
test('video transfer spools exact bytes privately, cleans up and only reports awaiting verification',async()=>{
 let file;const calls=[];
 const backend={authorize:async(...args)=>{calls.push(args);return transfer;},put:async(token,value,source)=>{file=source;assert.equal(token,'a.b.c');assert.deepEqual(value,transfer);assert.deepEqual(await readFile(source),Buffer.from([1,2,3]));assert.equal((await stat(source)).mode&0o777,0o600);}};
 const result=await handleHeroVideoTransfer(request(),backend,true);
 assert.equal(result.status,202);assert.equal((await result.json()).result.status,'awaiting_verification');assert.match(result.headers.get('cache-control'),/no-store/);
 assert.deepEqual(calls,[['a.b.c',site,id]]);await assert.rejects(stat(file),{code:'ENOENT'});
});
test('video transfer rejects disabled, unauthenticated, foreign, malformed and mismatched uploads before storage',async()=>{
 const backend={authorize:async()=>transfer,put:async()=>assert.fail('must not store')};
 assert.equal((await handleHeroVideoTransfer(request(),backend,false)).status,503);
 for(const [headers,status] of [[{Authorization:''},401],[{Origin:'https://other.test'},403],[{'x-cms-site':'bad'},400],[{'Content-Type':'image/png'},415],[{'Content-Length':'4'},413]])assert.equal((await handleHeroVideoTransfer(request(undefined,headers),backend,true)).status,status);
 for(const [value,status] of [[null,404],[{...transfer,key:'other/path'},503],[{...transfer,site:id},503]])assert.equal((await handleHeroVideoTransfer(request(),{...backend,authorize:async()=>value},true)).status,status);
 for(const [body,status] of [[new Uint8Array(4),413],[new Uint8Array(2),422]])assert.equal((await handleHeroVideoTransfer(request(body),backend,true)).status,status);
});
test('interrupted stream returns without waiting for uncooperative cancellation; storage failures clean private spool',async()=>{
 const controller=new AbortController();let cancelled=false;
 const body=new ReadableStream({pull(){controller.abort();},cancel(){cancelled=true;return new Promise(()=>{});}});
 const backend={authorize:async()=>transfer,put:async()=>assert.fail('must not store')};
 const response=await handleHeroVideoTransfer(request(body,{},controller.signal),backend,true);assert.equal(response.status,400);assert.equal(cancelled,true);
 let file;const failed=await handleHeroVideoTransfer(request(),{...backend,put:async(_token,_value,source)=>{file=source;throw new Error('private provider diagnostics');}},true);
 assert.equal(failed.status,500);assert.doesNotMatch(await failed.text(),/private provider diagnostics/);await assert.rejects(stat(file),{code:'ENOENT'});
});
test('private video storage streams caller identity and rejects overwrite, redirect and wrong file size',async()=>{
 const directory=await mkdtemp(path.join(tmpdir(),'cms-video-transfer-test-')),file=path.join(directory,'original.mp4');await writeFile(file,Buffer.from([1,2,3]));
 try{
 let input;await putPrivateHeroVideo({url:'https://cms.test',key:'public'},'user-token',transfer,file,new AbortController().signal,async(...args)=>{input=args;assert.deepEqual(Buffer.from(await new Response(args[1].body).arrayBuffer()),Buffer.from([1,2,3]));return Response.json({});});
 assert.equal(input[0].pathname,`/storage/v1/object/cms-video-originals/${transfer.key}`);assert.equal(input[1].headers.Authorization,'Bearer user-token');assert.equal(input[1].headers['x-upsert'],'false');assert.equal(input[1].headers['Content-Length'],'3');assert.equal(input[1].redirect,'error');
 await assert.rejects(putPrivateHeroVideo({url:'https://cms.test',key:'public'},'user-token',transfer,file,new AbortController().signal,async()=>Response.json({code:'Duplicate'},{status:400})),error=>error.status===409);
 await assert.rejects(putPrivateHeroVideo({url:'https://cms.test',key:'public'},'user-token',{...transfer,bytes:4},file,new AbortController().signal,async()=>assert.fail()),error=>error.status===422);
 }finally{await rm(directory,{recursive:true,force:true});}
});
