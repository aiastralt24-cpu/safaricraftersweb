import {spawn} from 'node:child_process';
import {createHash} from 'node:crypto';
import {access,mkdtemp,writeFile,readFile,stat,rm} from 'node:fs/promises';
import {constants} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {preflightHeroVideo,reviewHeroVideoMetadata,HERO_VIDEO_LIMITS,VideoPolicyError} from './video-inspection-policy.ts';
import type {MalwareScanner} from './image-inspection.ts';
export type HeroVideoRuntime={ffmpeg:string;ffprobe:string;temporaryRoot?:string};
const fail=(code:string,message:string):never=>{throw new VideoPolicyError(code,message);};
export function configuredHeroVideoRuntime(env:Record<string,string|undefined>=process.env):HeroVideoRuntime{
 const ffmpeg=env.CMS_FFMPEG_PATH,ffprobe=env.CMS_FFPROBE_PATH;
 if(!ffmpeg||!ffprobe||!path.isAbsolute(ffmpeg)||!path.isAbsolute(ffprobe))throw new VideoPolicyError('runtime_configuration','Configure absolute FFmpeg and FFprobe paths for the video worker.');
 const temporaryRoot=env.CMS_VIDEO_TEMP_ROOT;
 if(temporaryRoot&&!path.isAbsolute(temporaryRoot))throw new VideoPolicyError('runtime_configuration','Configure an absolute private video working directory.');
 return {ffmpeg,ffprobe,...(temporaryRoot?{temporaryRoot}:{})};
}

/** No shell, user arguments, inherited application credentials or network inputs. */
function run(executable:string,args:string[],timeoutMs:number){
 return new Promise<string>((resolve,reject)=>{
  const child=spawn(executable,args,{shell:false,stdio:['ignore','pipe','pipe'],env:{NODE_ENV:'production',PATH:'/usr/bin:/bin',LANG:'C',LC_ALL:'C'}});
  let output='',total=0,reason:VideoPolicyError|undefined;
  const stop=(code:string,message:string)=>{reason??=new VideoPolicyError(code,message);child.kill('SIGKILL');};
  const timeout=setTimeout(()=>stop('processing_timeout','Video processing exceeded its time limit.'),timeoutMs);
  child.stdout.on('data',(bytes:Buffer)=>{total+=bytes.length;if(total>1_000_000)stop('processing_output','Video processor output exceeded its limit.');else output+=bytes.toString('utf8');});
  child.stderr.on('data',(bytes:Buffer)=>{total+=bytes.length;if(total>1_000_000)stop('processing_output','Video processor output exceeded its limit.');});
  child.once('error',()=>{clearTimeout(timeout);reject(new VideoPolicyError('runtime_unavailable','The video processor could not be started.'));});
  child.once('close',code=>{clearTimeout(timeout);if(reason)reject(reason);else if(code!==0)reject(new VideoPolicyError('decode_rejected','The video could not be fully decoded or processed.'));else resolve(output);});
 });
}
const inputOptions=['-protocol_whitelist','file','-enable_drefs','0','-use_absolute_path','0','-f','mov'];
async function probe(runtime:HeroVideoRuntime,file:string){
 const result=await run(runtime.ffprobe,['-v','error',...inputOptions,'-i',file,'-show_streams','-show_format','-of','json'],30_000);
 try{return JSON.parse(result);}catch{return fail('metadata','The video processor returned malformed metadata.');}
}
async function scanSource(bytes:Buffer,scan:MalwareScanner){
 const controller=new AbortController();let timeout:ReturnType<typeof setTimeout>|undefined;
 try{
  const verdict=await Promise.race([scan(Buffer.from(bytes),controller.signal),new Promise<never>((_,reject)=>{timeout=setTimeout(()=>{controller.abort();reject(new VideoPolicyError('scan_unavailable','Video malware inspection timed out.'));},30_000);})]);
  if(verdict==='infected')fail('scan_rejected','The video failed malware inspection.');
  if(verdict!=='clean')fail('scan_unavailable','Video malware inspection is unavailable.');
 }catch(error){if(error instanceof VideoPolicyError)throw error;fail('scan_unavailable','Video malware inspection is unavailable.');}
 finally{if(timeout)clearTimeout(timeout);}
}
/** Worker-only. Returns a decoded, re-encoded silent derivative, not usage-rights
 * approval or publication permission. Storage/completion integration is separate. */
export async function inspectHeroVideo(upload:{bytes:Uint8Array;filename:string;mime:string},scan:MalwareScanner,runtime:HeroVideoRuntime){
 const original=preflightHeroVideo(upload);
 for(const executable of [runtime.ffmpeg,runtime.ffprobe]){
  if(!path.isAbsolute(executable))fail('runtime_configuration','Configure absolute video processor executable paths.');
  try{await access(executable,constants.X_OK);}catch{fail('runtime_unavailable','The configured video processor is unavailable.');}
 }
 await scanSource(original.bytes,scan);
 if(runtime.temporaryRoot&&!path.isAbsolute(runtime.temporaryRoot))fail('runtime_configuration','Configure an absolute private video working directory.');
 const directory=await mkdtemp(path.join(runtime.temporaryRoot??tmpdir(),'cms-hero-video-'));
 try{
  const source=path.join(directory,'source.mp4'),delivery=path.join(directory,'delivery.mp4');
  await writeFile(source,original.bytes,{flag:'wx',mode:0o600});
  const sourceMetadata=reviewHeroVideoMetadata(await probe(runtime,source),original.byteSize);
  await run(runtime.ffmpeg,['-nostdin','-hide_banner','-loglevel','error','-xerror','-err_detect','explode',...inputOptions,'-threads','2','-i',source,'-map','0:v:0','-an','-sn','-dn','-map_metadata','-1','-map_chapters','-1','-vf',"scale=w='min(1920,iw)':h='min(1920,ih)':force_original_aspect_ratio=decrease:force_divisible_by=2,setsar=1",'-r','30','-c:v','libx264','-preset','medium','-crf','23','-pix_fmt','yuv420p','-threads','2','-movflags','+faststart','-fs',String(HERO_VIDEO_LIMITS.bytes+1),delivery],300_000);
  const size=(await stat(delivery)).size;if(size<1||size>HERO_VIDEO_LIMITS.bytes)fail('delivery_size','The processed video exceeds its allowed size.');
  const raw=await probe(runtime,delivery),metadata=reviewHeroVideoMetadata(raw,size);
  if(metadata.hasAudio||metadata.codec!=='h264'||metadata.width>1920||metadata.height>1920||metadata.framesPerSecond!==30||raw.streams[0].pix_fmt!=='yuv420p'||Math.abs(metadata.durationSeconds-sourceMetadata.durationSeconds)>0.1)fail('delivery_mismatch','The processed video does not preserve the supported source duration and delivery format.');
  // Decode the complete derivative again. Successful metadata probing alone is
  // insufficient evidence that every frame can be delivered.
  await run(runtime.ffmpeg,['-nostdin','-hide_banner','-loglevel','error','-xerror','-err_detect','explode',...inputOptions,'-threads','2','-i',delivery,'-map','0:v:0','-f','null','-'],120_000);
  const bytes=await readFile(delivery);if(bytes.length!==size)fail('delivery_mismatch','The processed video changed during inspection.');
  return {original:{sha256:original.sha256,mime:original.mime,byteSize:original.byteSize,...sourceMetadata},delivery:{bytes,sha256:createHash('sha256').update(bytes).digest('hex'),mime:'video/mp4' as const,byteSize:bytes.length,width:metadata.width,height:metadata.height,durationSeconds:metadata.durationSeconds,framesPerSecond:metadata.framesPerSecond,hasAudio:false as const},inspectionVersion:'hero-video-1' as const};
 }finally{await rm(directory,{recursive:true,force:true});}
}
