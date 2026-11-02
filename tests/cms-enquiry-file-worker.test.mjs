import test from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import {createHash} from 'node:crypto';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {mkdtemp,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {processEnquiryFile} from '../lib/cms/enquiry-file-worker.ts';
const id=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const scope={site:id(1),form:id(2),revision:id(3),request:id(4),field:'cv-upload'},upload=id(5);
const runtime={python:'/unconfigured/python',script:'/unconfigured/parser',parserVersion:'1.0.0'};
async function fixture(){
 const bytes=await sharp({create:{width:20,height:20,channels:3,background:'#fff'}}).png().toBuffer(),events=[];
 const base=`${scope.site}/enquiries/${scope.request}/${upload}`;
 const job={...scope,id:upload,leaseToken:id(6),filename:'cv.png',mime:'image/png',bytes:bytes.length,maxBytes:1_000_000,sha256:createHash('sha256').update(bytes).digest('hex'),storageKey:`${base}/original`,deliveryKey:`${base}/delivery.webp`};
 const adapter={claim:async()=>job,read:async()=>{events.push('read');return bytes;},scan:async()=>{events.push('scan');return 'clean';},putVerified:async(key,bytes,hash,mime)=>{assert.equal(key,job.deliveryKey);assert.equal(mime,'image/webp');assert.equal(createHash('sha256').update(bytes).digest('hex'),hash);events.push('stored');},finish:async(actual,result)=>{assert.deepEqual(actual,job);assert.equal(result.originalMime,'image/png');assert.equal(result.originalBytes,bytes.length);assert.equal(result.width,20);events.push('finished');return upload;},fail:async(job,code,retryable)=>events.push({code,retryable})};
 return {job,adapter,events};
}
test('private attachment processing pins the request and writes a verified image without catalog registration',async()=>{
 const f=await fixture();assert.deepEqual(await processEnquiryFile(f.adapter,scope,upload,runtime),{status:'ready',uploadId:upload});assert.deepEqual(f.events,['read','scan','stored','finished']);
});
test('attachment scope, storage, lease and size mismatches fail before reading private objects',async()=>{
 for(const mutate of [j=>j.site=id(9),j=>j.form=id(9),j=>j.revision=id(9),j=>j.request=id(9),j=>j.field='other',j=>j.id=id(9),j=>j.leaseToken='',j=>j.storageKey=`${scope.site}/${upload}/original`,j=>j.deliveryKey='public/file',j=>j.maxBytes=1,j=>j.mime='application/msword']){
  const f=await fixture();mutate(f.job);await assert.rejects(processEnquiryFile(f.adapter,scope,upload,runtime),/identity mismatch/);assert.deepEqual(f.events,[]);
 }
 const f=await fixture();f.adapter.claim=async()=>null;assert.equal((await processEnquiryFile(f.adapter,scope,upload,runtime)).status,'not_claimed');assert.deepEqual(f.events,[]);
});
test('changed bytes and infected attachments are rejected while inspection and storage outages can retry',async()=>{
 const changed=await fixture();changed.adapter.read=async()=>Buffer.from('changed');assert.equal((await processEnquiryFile(changed.adapter,scope,upload,runtime)).status,'rejected');assert.deepEqual(changed.events,[{code:'bytes_mismatch',retryable:false}]);
 for(const verdict of ['infected','unavailable']){const f=await fixture();f.adapter.scan=async()=>verdict;assert.equal((await processEnquiryFile(f.adapter,scope,upload,runtime)).status,verdict==='infected'?'rejected':'retry_pending');assert.equal(f.events.includes('stored'),false);}
 const f=await fixture();f.adapter.putVerified=async()=>{throw Error('Provider unavailable');};assert.equal((await processEnquiryFile(f.adapter,scope,upload,runtime)).status,'retry_pending');assert.deepEqual(f.events.at(-1),{code:'storage_unavailable',retryable:true});
});
test('uncertain completion or failure acknowledgements never trigger a competing state write',async()=>{
 for(const finish of [async()=>{throw Error('Response lost');},async()=>id(9)]){const f=await fixture();f.adapter.finish=finish;assert.equal((await processEnquiryFile(f.adapter,scope,upload,runtime)).status,'unacknowledged');assert.deepEqual(f.events,['read','scan','stored']);}
 const f=await fixture();f.adapter.read=async()=>{throw Error('Unavailable');};f.adapter.fail=async()=>{throw Error('Unknown outcome');};assert.equal((await processEnquiryFile(f.adapter,scope,upload,runtime)).status,'unacknowledged');
});
test('private PDF attachments undergo the real structural processor and both malware checks',{skip:!process.env.CMS_TEST_PDF_PYTHON},async()=>{
 const directory=await mkdtemp(path.join(tmpdir(),'cms-private-attachment-'));
 try{
  const file=path.join(directory,'cv.pdf'),python=process.env.CMS_TEST_PDF_PYTHON;
  const {stdout}=await promisify(execFile)(python,['-c','from pypdf import PdfWriter; import pypdf,sys; w=PdfWriter(); w.add_blank_page(595,842); w.write(sys.argv[1]); print(pypdf.__version__)',file]);
  const bytes=await readFile(file),f=await fixture();
  Object.assign(f.job,{filename:'cv.pdf',mime:'application/pdf',bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex'),deliveryKey:f.job.deliveryKey.replace('.webp','.pdf')});
  f.adapter.read=async()=>bytes;
  f.adapter.putVerified=async(key,delivery,hash,mime)=>{assert.equal(key,f.job.deliveryKey);assert.equal(mime,'application/pdf');assert.equal(createHash('sha256').update(delivery).digest('hex'),hash);f.events.push('stored');};
  f.adapter.finish=async(job,result)=>{assert.equal(result.pages,1);assert.equal(result.parserVersion,stdout.trim());assert.equal(result.originalMime,'application/pdf');assert.equal(result.inspectionVersion,'document-pdf-1');f.events.push('finished');return upload;};
  assert.equal((await processEnquiryFile(f.adapter,scope,upload,{python,script:path.resolve('scripts/cms/pdf/pdf_structure.py'),parserVersion:stdout.trim()})).status,'ready');
  assert.deepEqual(f.events,['scan','scan','stored','finished']);
 }finally{await rm(directory,{recursive:true,force:true});}
});
