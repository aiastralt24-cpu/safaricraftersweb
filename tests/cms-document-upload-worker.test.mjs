import test,{before} from 'node:test';import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';import {execFile} from 'node:child_process';import {promisify} from 'node:util';import {existsSync} from 'node:fs';import {mkdtemp,readFile,rm} from 'node:fs/promises';import {tmpdir} from 'node:os';import path from 'node:path';
import {dispatchDocuments} from '../lib/cms/document-dispatch.ts';
import {processDocumentUpload} from '../lib/cms/document-upload-worker.ts';
const runtime={python:process.env.CMS_TEST_PDF_PYTHON,script:path.resolve('scripts/cms/pdf/pdf_structure.py'),parserVersion:''},available=Boolean(runtime.python);
const site='00000000-0000-4000-8000-000000000001',id='00000000-0000-4000-8000-000000000002',lease='00000000-0000-4000-8000-000000000003';let bytes=Buffer.from('test input');
before(async()=>{if(!available)return;const dir=await mkdtemp(path.join(tmpdir(),'cms-pdf-worker-test-'));try{const file=path.join(dir,'guide.pdf');const {stdout}=await promisify(execFile)(runtime.python,['-c',"from pypdf import PdfWriter; import pypdf,sys; w=PdfWriter(); w.add_blank_page(595,842); w.write(sys.argv[1]); print(pypdf.__version__)",file]);runtime.parserVersion=stdout.trim();bytes=await readFile(file);}finally{await rm(dir,{recursive:true,force:true});}});
function fixture(){const events=[],job={site,id,filename:'guide.pdf',mime:'application/pdf',bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex'),storageKey:`${site}/${id}/original`,deliveryKey:`${site}/${id}/delivery.pdf`,leaseToken:lease};return {events,job,adapter:{claim:async()=>job,read:async()=>bytes,scan:async()=> 'clean',putVerified:async(key,data,sha,mime)=>{assert.equal(key,job.deliveryKey);assert.equal(mime,'application/pdf');assert.equal(createHash('sha256').update(data).digest('hex'),sha);events.push('stored');},finish:async(_job,result)=>{assert.equal(result.inspectionVersion,'document-pdf-1');assert.equal(result.pages,1);assert.equal(result.parserVersion,runtime.parserVersion);events.push('finished');return id;},fail:async(_job,code,retryable)=>events.push({code,retryable})}};}
test('document worker rejects changed source bytes before inspection or delivery writes',async()=>{const f=fixture();f.adapter.read=async()=>Buffer.from('changed');assert.equal((await processDocumentUpload(f.adapter,site,id,runtime)).status,'rejected');assert.deepEqual(f.events,[{code:'bytes_mismatch',retryable:false}]);});
test('wrong tenant, job key, MIME and lease identity never read an object; empty claims do no work',async()=>{
 for(const change of [j=>j.site=id,j=>j.deliveryKey=`${site}/${id}/delivery.webp`,j=>j.storageKey='foreign/object',j=>j.mime='image/png',j=>j.leaseToken='not-a-lease']){const f=fixture();change(f.job);f.adapter.read=async()=>{throw Error('Must not read');};await assert.rejects(processDocumentUpload(f.adapter,site,id,runtime),/identity mismatch/);assert.deepEqual(f.events,[]);}
 const f=fixture();f.adapter.claim=async()=>null;assert.equal((await processDocumentUpload(f.adapter,site,id,runtime)).status,'not_claimed');
});
test('real document processing writes verified derivative before registering its exact asset identity',{skip:!available},async()=>{const f=fixture();assert.deepEqual(await processDocumentUpload(f.adapter,site,id,runtime),{status:'ready',assetId:id});assert.deepEqual(f.events,['stored','finished']);});
test('scanner/storage outages retry without registering media; lost completion acknowledgements never record competing failures',{skip:!available},async()=>{
 const scanner=fixture();scanner.adapter.scan=async()=> 'unavailable';assert.equal((await processDocumentUpload(scanner.adapter,site,id,runtime)).status,'retry_pending');assert.deepEqual(scanner.events,[{code:'scan_unavailable',retryable:true}]);
 const storage=fixture();storage.adapter.putVerified=async()=>{throw Error('Private provider failure');};assert.equal((await processDocumentUpload(storage.adapter,site,id,runtime)).status,'retry_pending');assert.deepEqual(storage.events,[{code:'storage_unavailable',retryable:true}]);
 for(const finish of [async()=>{throw Error('Lost acknowledgement');},async()=>site]){const f=fixture();f.adapter.finish=finish;assert.equal((await processDocumentUpload(f.adapter,site,id,runtime)).status,'unacknowledged');assert.deepEqual(f.events,['stored']);}
});

test('dispatcher runs confirmed work through the real decoder to verified completion',{skip:!available},async()=>{
 const f=fixture();const adapter={...f.adapter,listWork:async()=>[{site,id}]};
 assert.deepEqual(await dispatchDocuments(adapter,runtime),[{site,id,status:'ready',assetId:id}]);assert.deepEqual(f.events,['stored','finished']);
});
