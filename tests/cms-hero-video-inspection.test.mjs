import test,{before,after} from 'node:test';import assert from 'node:assert/strict';
import {execFile} from 'node:child_process';import {promisify} from 'node:util';import {existsSync} from 'node:fs';
import {mkdtemp,readFile,rm,readdir} from 'node:fs/promises';import {tmpdir} from 'node:os';import path from 'node:path';
import {inspectHeroVideo,configuredHeroVideoRuntime} from '../lib/cms/hero-video-inspection.ts';
const executable=(env,name)=>env||[`/opt/homebrew/bin/${name}`,`/usr/local/bin/${name}`,`/usr/bin/${name}`].find(existsSync);
const runtime={ffmpeg:executable(process.env.CMS_FFMPEG_PATH,'ffmpeg'),ffprobe:executable(process.env.CMS_FFPROBE_PATH,'ffprobe')};
const available=Boolean(runtime.ffmpeg&&runtime.ffprobe),run=promisify(execFile);
let privateRoot;before(async()=>{privateRoot=await mkdtemp(path.join(tmpdir(),'cms-inspection-test-root-'));runtime.temporaryRoot=privateRoot;});after(async()=>{await rm(privateRoot,{recursive:true,force:true});});
async function fixture(){const dir=await mkdtemp(path.join(tmpdir(),'cms-video-test-'));try{const file=path.join(dir,'source.mp4');await run(runtime.ffmpeg,['-nostdin','-v','error','-f','lavfi','-i','testsrc=size=320x180:rate=24','-f','lavfi','-i','sine=frequency=440:sample_rate=44100','-t','1','-c:v','libx264','-pix_fmt','yuv420p','-c:a','aac','-metadata','title=PRIVATE_SOURCE_METADATA','-movflags','+faststart',file]);return await readFile(file);}finally{await rm(dir,{recursive:true,force:true});}}
test('real video processing fully decodes and re-encodes a silent H.264 derivative while removing source metadata',{skip:!available},async()=>{
 const bytes=await fixture(),before=(await readdir(privateRoot)).filter(name=>name.startsWith('cms-hero-video-'));let scans=0;
 const result=await inspectHeroVideo({bytes,filename:'background.mp4',mime:'video/mp4'},async input=>{scans++;assert.deepEqual(input,bytes);return 'clean';},runtime);
 assert.equal(scans,1);assert.equal(result.inspectionVersion,'hero-video-1');assert.equal(result.original.hasAudio,true);assert.equal(result.delivery.hasAudio,false);assert.equal(result.delivery.framesPerSecond,30);assert.equal(result.delivery.width,320);assert.equal(result.delivery.height,180);assert.notEqual(result.original.sha256,result.delivery.sha256);assert.equal(result.delivery.bytes.includes(Buffer.from('PRIVATE_SOURCE_METADATA')),false);
 assert.deepEqual((await readdir(privateRoot)).filter(name=>name.startsWith('cms-hero-video-')),before);
});
test('malware rejection/unavailability and damaged containers never create inspected delivery',{skip:!available},async()=>{
 const bytes=await fixture(),upload={bytes,filename:'background.mp4',mime:'video/mp4'};
 for(const verdict of ['infected','unavailable'])await assert.rejects(inspectHeroVideo(upload,async()=>verdict,runtime),error=>error.code===`scan_${verdict==='infected'?'rejected':'unavailable'}`);
 const damaged=Buffer.from(bytes.subarray(0,100));await assert.rejects(inspectHeroVideo({...upload,bytes:damaged},async()=> 'clean',runtime),error=>error.code==='decode_rejected'||error.code==='metadata');
});
test('video processor requires explicit executable paths and refuses missing runtimes',async()=>{
 assert.throws(()=>configuredHeroVideoRuntime({}),/Configure absolute/);assert.throws(()=>configuredHeroVideoRuntime({CMS_FFMPEG_PATH:'ffmpeg',CMS_FFPROBE_PATH:'ffprobe'}),/Configure absolute/);assert.deepEqual(configuredHeroVideoRuntime({CMS_FFMPEG_PATH:'/worker/ffmpeg',CMS_FFPROBE_PATH:'/worker/ffprobe'}),{ffmpeg:'/worker/ffmpeg',ffprobe:'/worker/ffprobe'});
 const bytes=Buffer.alloc(24);bytes.writeUInt32BE(24);bytes.write('ftyp',4);bytes.write('isom',8);bytes.write('isom',16);bytes.write('mp42',20);
 const upload={bytes,filename:'background.mp4',mime:'video/mp4'};
 await assert.rejects(inspectHeroVideo(upload,async()=> 'clean',{ffmpeg:'ffmpeg',ffprobe:'ffprobe'}),error=>error.code==='runtime_configuration');
 await assert.rejects(inspectHeroVideo(upload,async()=> 'clean',{ffmpeg:'/nonexistent/cms-ffmpeg',ffprobe:'/nonexistent/cms-ffprobe'}),error=>error.code==='runtime_unavailable');
});
