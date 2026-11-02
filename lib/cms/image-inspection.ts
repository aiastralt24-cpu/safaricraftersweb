import sharp from 'sharp';
import {createHash} from 'node:crypto';

export class ImageInspectionError extends Error {
  code:string;
  constructor(code:string,message:string){super(message);this.code=code;this.name='ImageInspectionError';}
}
export type MalwareScanner=(bytes:Buffer,signal:AbortSignal)=>Promise<'clean'|'infected'|'unavailable'>;
export const IMAGE_LIMITS={bytes:25_000_000,pixels:40_000_000,dimension:20_000} as const;
const formats={jpeg:{mime:'image/jpeg',extensions:['jpg','jpeg']},png:{mime:'image/png',extensions:['png']},webp:{mime:'image/webp',extensions:['webp']},avif:{mime:'image/avif',extensions:['avif']}};
type Format=keyof typeof formats;
const fail=(code:string,message:string):never=>{throw new ImageInspectionError(code,message);};
function signature(bytes:Buffer):Format{
  if(bytes.length>=3&&bytes[0]===255&&bytes[1]===216&&bytes[2]===255)return 'jpeg';
  if(bytes.length>=8&&bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))return 'png';
  if(bytes.length>=12&&bytes.toString('ascii',0,4)==='RIFF'&&bytes.toString('ascii',8,12)==='WEBP')return 'webp';
  if(bytes.length>=16&&bytes.toString('ascii',4,8)==='ftyp'&&bytes.toString('ascii',8,12)==='avif')return 'avif';
  return fail('unsupported_signature','Upload a JPEG, PNG, WebP or AVIF image. Active formats are not accepted.');
}

/** Server worker only. Originals remain private; only re-encoded derivatives may
 * be served. A successful return proves neither usage rights nor publication. */
export async function inspectImage(upload:{bytes:Uint8Array;filename:string;mime:string},scan:MalwareScanner){
  if(!upload.bytes.byteLength||upload.bytes.byteLength>IMAGE_LIMITS.bytes)fail('file_size','Use an image between 1 byte and 25 MB.');
  if(!upload.filename||upload.filename.length>255||/[\x00-\x1f\/\\]/.test(upload.filename))fail('filename','Use a plain filename without directory paths.');
  const bytes=Buffer.from(upload.bytes); // Own the immutable input during async work.
  const format=signature(bytes),definition=formats[format];
  const extension=upload.filename.split('.').at(-1)?.toLowerCase()||'';
  if(!definition.extensions.includes(extension))fail('extension_mismatch','The filename extension does not match the actual image.');
  if(upload.mime.toLowerCase()!==definition.mime)fail('mime_mismatch','The declared file type does not match the actual image.');
  const controller=new AbortController();let timeout:ReturnType<typeof setTimeout>|undefined;
  try{
    const verdict=await Promise.race([
      scan(Buffer.from(bytes),controller.signal),
      new Promise<never>((_,reject)=>{timeout=setTimeout(()=>{controller.abort();reject(new ImageInspectionError('scan_unavailable','File inspection timed out. Keep this upload quarantined and retry.'));},30_000);}),
    ]);
    if(verdict==='infected')fail('scan_rejected','This file failed inspection.');
    if(verdict!=='clean')fail('scan_unavailable','File inspection is unavailable. Keep this upload quarantined and retry.');
  }catch(error){if(error instanceof ImageInspectionError)throw error;fail('scan_unavailable','File inspection is unavailable. Keep this upload quarantined and retry.');}
  finally{if(timeout)clearTimeout(timeout);}
  try{
    const image=sharp(bytes,{failOn:'warning',limitInputPixels:IMAGE_LIMITS.pixels,animated:true});
    const metadata=await image.metadata();
    const decodedFormat=metadata.format==='heif'&&metadata.compression==='av1'?'avif':metadata.format;
    if(decodedFormat!==format)fail('decode_mismatch','The decoded image does not match its file signature.');
    if((metadata.pages??1)!==1)fail('animated_image','Use a single-frame image. Animated images require a separate workflow.');
    if(!metadata.width||!metadata.height||metadata.width>IMAGE_LIMITS.dimension||metadata.height>IMAGE_LIMITS.dimension)fail('dimensions','This image exceeds the supported dimensions.');
    // Re-encode to remove original metadata and trailing/container content from delivery.
    const {data,info}=await image.rotate().resize({width:2400,height:2400,fit:'inside',withoutEnlargement:true}).webp({quality:85}).timeout({seconds:20}).toBuffer({resolveWithObject:true});
    return {original:{bytes,sha256:createHash('sha256').update(bytes).digest('hex'),mime:definition.mime,byteSize:bytes.length,width:metadata.width,height:metadata.height},
      delivery:{bytes:data,sha256:createHash('sha256').update(data).digest('hex'),mime:'image/webp' as const,byteSize:data.length,width:info.width,height:info.height},inspectionVersion:'image-1'};
  }catch(error){if(error instanceof ImageInspectionError)throw error;return fail('invalid_image','The image could not be fully decoded within the processing limits.');}
}
