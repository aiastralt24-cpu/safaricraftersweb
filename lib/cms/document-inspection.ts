import {spawn} from 'node:child_process';
import {createHash} from 'node:crypto';
import {mkdtemp,writeFile,readFile,stat,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {z} from 'zod';
import type {MalwareScanner} from './image-inspection.ts';
export class DocumentInspectionError extends Error{code:string;constructor(code:string,message:string){super(message);this.code=code;this.name='DocumentInspectionError';}}
export type DocumentRuntime={python:string;script:string;parserVersion:string;temporaryRoot?:string};
function fail(code:string,message:string):never{throw new DocumentInspectionError(code,message);}
export function configuredDocumentRuntime(env:Record<string,string|undefined>=process.env):DocumentRuntime{
 const python=env.CMS_PDF_PYTHON_PATH,script=env.CMS_PDF_SCRIPT_PATH,parserVersion=env.CMS_PDF_PARSER_VERSION,temporaryRoot=env.CMS_PDF_TEMP_ROOT;
 if(!python||!script||!parserVersion||!path.isAbsolute(python)||!path.isAbsolute(script)||!/^\d+\.\d+\.\d+$/.test(parserVersion)||temporaryRoot&&!path.isAbsolute(temporaryRoot))return fail('runtime_configuration','Configure absolute PDF worker paths and a verified parser version.');
 return {python,script,parserVersion,...(temporaryRoot?{temporaryRoot}:{})};
}
async function scanFile(bytes:Buffer,scan:MalwareScanner){
 const controller=new AbortController();let timer:ReturnType<typeof setTimeout>|undefined;
 try{
  const verdict=await Promise.race([scan(Buffer.from(bytes),controller.signal),new Promise<never>((_,reject)=>{timer=setTimeout(()=>{controller.abort();reject(new DocumentInspectionError('scan_unavailable','Document scanning timed out.'));},30000);})]);
  if(verdict==='infected')fail('scan_rejected','The document failed malware inspection.');
  if(verdict!=='clean')fail('scan_unavailable','Document scanning is unavailable.');
 }catch(error){if(error instanceof DocumentInspectionError)throw error;fail('scan_unavailable','Document scanning is unavailable.');}finally{if(timer)clearTimeout(timer);}
}
function parse(runtime:DocumentRuntime,source:string,destination:string){
 return new Promise<unknown>((resolve,reject)=>{
  const child=spawn(runtime.python,['-I',runtime.script,source,destination],{shell:false,stdio:['ignore','pipe','pipe'],env:{NODE_ENV:'production',PATH:'/usr/bin:/bin',LANG:'C',LC_ALL:'C'}});
  let stdout='',count=0,failure:DocumentInspectionError|undefined;
  const stop=(code:string)=>{failure??=new DocumentInspectionError(code,'PDF inspection exceeded its processing limits.');child.kill('SIGKILL');};
  const timer=setTimeout(()=>stop('processing_timeout'),45000);
  child.stdout.on('data',(bytes:Buffer)=>{count+=bytes.length;if(count>1000000)stop('processing_output');else stdout+=bytes.toString('utf8');});
  child.stderr.on('data',(bytes:Buffer)=>{count+=bytes.length;if(count>1000000)stop('processing_output');});
  child.once('error',()=>{clearTimeout(timer);reject(new DocumentInspectionError('runtime_unavailable','The PDF processor could not start.'));});
  child.once('close',code=>{clearTimeout(timer);if(failure)return reject(failure);if(code!==0)return reject(new DocumentInspectionError('pdf_rejected','The PDF uses unsupported content or could not be parsed.'));try{resolve(JSON.parse(stdout));}catch{reject(new DocumentInspectionError('invalid_result','The PDF processor returned an invalid result.'));}});
 });
}
/** Structural inspection and malware scanning are separate required checks.
 * This result is not usage-rights approval, publication or download permission. */
export async function inspectDocument(upload:{bytes:Uint8Array;filename:string;mime:string},scan:MalwareScanner,runtime:DocumentRuntime){
 if(upload.bytes.byteLength<1||upload.bytes.byteLength>25000000)fail('file_size','Use a PDF no larger than 25 MB.');
 if(upload.mime!=='application/pdf'||!/^.+\.pdf$/i.test(upload.filename)||upload.filename.length>200||upload.filename.startsWith('.')||/[\x00-\x1f\x7f/\\]/.test(upload.filename))fail('file_type','Use a plain PDF filename and file type.');
 if(!path.isAbsolute(runtime.python)||!path.isAbsolute(runtime.script)||!/^\d+\.\d+\.\d+$/.test(runtime.parserVersion)||runtime.temporaryRoot&&!path.isAbsolute(runtime.temporaryRoot))fail('runtime_configuration','Invalid PDF worker configuration.');
 const original=Buffer.from(upload.bytes);
 if(!/^%PDF-(1\.[0-7]|2\.0)[\r\n]/.test(original.subarray(0,10).toString('latin1')))fail('signature','This file does not have a supported PDF header.');
 await scanFile(original,scan);
 const directory=await mkdtemp(path.join(runtime.temporaryRoot??tmpdir(),'cms-pdf-inspection-'));
 try{
  const source=path.join(directory,'source.pdf'),destination=path.join(directory,'delivery.pdf');await writeFile(source,original,{flag:'wx',mode:0o600});
  const raw=await parse(runtime,source,destination);
  const result=z.object({pages:z.number().int().min(1).max(300),parserVersion:z.literal(runtime.parserVersion),inspectionVersion:z.literal('pdf-structure-1')}).strict().safeParse(raw);
  if(!result.success)fail('invalid_result','The PDF processor version or result does not match the configured policy.');
  const info=await stat(destination);if(!info.isFile()||info.size<1||info.size>25000000)fail('delivery_size','The processed PDF exceeds its size limit.');
  const bytes=await readFile(destination);if(bytes.length!==info.size)fail('delivery_mismatch','The processed PDF changed during inspection.');
  await scanFile(bytes,scan);
  return {original:{sha256:createHash('sha256').update(original).digest('hex'),byteSize:original.length},delivery:{bytes,sha256:createHash('sha256').update(bytes).digest('hex'),byteSize:bytes.length,mime:'application/pdf' as const,pages:result.data.pages},parserVersion:result.data.parserVersion,inspectionVersion:'document-pdf-1' as const};
 }finally{await rm(directory,{recursive:true,force:true});}
}
