import test from 'node:test';import assert from 'node:assert/strict';
import {mkdtemp,readFile,rm,readdir} from 'node:fs/promises';import {tmpdir} from 'node:os';import path from 'node:path';import {execFile} from 'node:child_process';import {promisify} from 'node:util';import {fileURLToPath} from 'node:url';
import {inspectDocument,configuredDocumentRuntime} from '../lib/cms/document-inspection.ts';
const runtime={python:'/not/configured/python',script:'/not/configured/script.py',parserVersion:'6.10.0'},upload={bytes:Buffer.from('%PDF-1.7\ninvalid'),filename:'guide.pdf',mime:'application/pdf'};
test('PDF preflight rejects invalid inputs before malware or parser work',async()=>{
 for(const patch of [{bytes:Buffer.alloc(0)},{bytes:Buffer.alloc(25000001)},{filename:'../guide.pdf'},{filename:'.guide.pdf'},{mime:'image/png'},{bytes:Buffer.from('not pdf')}])await assert.rejects(inspectDocument({...upload,...patch},()=>assert.fail('Invalid preflight reached scanner'),runtime));
 assert.throws(()=>configuredDocumentRuntime({}),/Configure/);
 assert.throws(()=>configuredDocumentRuntime({CMS_PDF_PYTHON_PATH:'relative',CMS_PDF_SCRIPT_PATH:'/script',CMS_PDF_PARSER_VERSION:'6.10.0'}));
});
test('malware and scanner outages prevent any PDF parser execution',async()=>{
 for(const [verdict,code] of [['infected','scan_rejected'],['unavailable','scan_unavailable']])await assert.rejects(inspectDocument(upload,async()=>verdict,runtime),error=>error.code===code);
 await assert.rejects(inspectDocument(upload,async()=>{throw Error('private scanner message');},runtime),error=>error.code==='scan_unavailable'&&!error.message.includes('private scanner message'));
});
test('actual PDF parser preserves source text, scans both versions and cleans temporary files',{skip:!process.env.CMS_TEST_PDF_PYTHON},async()=>{
 const python=process.env.CMS_TEST_PDF_PYTHON,script=fileURLToPath(new URL('../scripts/cms/pdf/pdf_structure.py',import.meta.url));const folder=await mkdtemp(path.join(tmpdir(),'cms-pdf-integration-'));
 try{
  const source=path.join(folder,'fixture.pdf');
  const fixture="from pypdf import PdfWriter\nfrom pypdf.generic import DictionaryObject,NameObject,DecodedStreamObject\nimport sys\nw=PdfWriter();p=w.add_blank_page(595,842)\nfont=DictionaryObject({NameObject('/Type'):NameObject('/Font'),NameObject('/Subtype'):NameObject('/Type1'),NameObject('/BaseFont'):NameObject('/Helvetica')})\np[NameObject('/Resources')]=DictionaryObject({NameObject('/Font'):DictionaryObject({NameObject('/F1'):w._add_object(font)})})\ns=DecodedStreamObject();s.set_data(b'BT /F1 16 Tf 40 780 Td (Client brochure) Tj ET');p[NameObject('/Contents')]=w._add_object(s)\nw.write(sys.argv[1])";
  await promisify(execFile)(python,['-c',fixture,source]);const bytes=await readFile(source);
  const {stdout}=await promisify(execFile)(python,['-c','import pypdf; print(pypdf.__version__)']);
  const actual={python,script,parserVersion:stdout.trim(),temporaryRoot:folder};let scans=0;
  const result=await inspectDocument({...upload,bytes},async value=>{scans++;value.fill(0);return 'clean';},actual);
  assert.equal(scans,2);assert.equal(result.delivery.pages,1);assert.equal(result.inspectionVersion,'document-pdf-1');
  const repeated=await inspectDocument({...upload,bytes},async()=> 'clean',actual);assert.equal(repeated.delivery.sha256,result.delivery.sha256);
  const {writeFile}=await import('node:fs/promises');const delivery=path.join(folder,'result.pdf');await writeFile(delivery,result.delivery.bytes);
  const text=await promisify(execFile)(python,['-c','from pypdf import PdfReader; import sys; print(PdfReader(sys.argv[1]).pages[0].extract_text())',delivery]);assert.match(text.stdout,/Client brochure/);
  await assert.rejects(inspectDocument({...upload,bytes},async()=> 'clean',{...actual,parserVersion:'0.0.0'}),e=>e.code==='invalid_result');
  let stage=0;await assert.rejects(inspectDocument({...upload,bytes},async()=>++stage===1?'clean':'infected',actual),e=>e.code==='scan_rejected');
  assert.deepEqual((await readdir(folder)).sort(),['fixture.pdf','result.pdf']);
 }finally{await rm(folder,{recursive:true,force:true});}
});
