import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';
import {preflightHeroVideo,reviewHeroVideoMetadata,VideoPolicyError} from '../lib/cms/video-inspection-policy.ts';
import capture from '../docs/cms/homepage-rendered-inventory.json' with {type:'json'};
function mp4(){const bytes=Buffer.alloc(32);bytes.writeUInt32BE(24,0);bytes.write('ftyp',4);bytes.write('isom',8);bytes.write('isom',16);bytes.write('mp42',20);return bytes;}
const metadata=()=>({streams:[{index:0,codec_type:'video',codec_name:'h264',width:1920,height:1080,avg_frame_rate:'30000/1001',duration:'60.06',pix_fmt:'yuv420p',disposition:{attached_pic:0}},{index:1,codec_type:'audio',codec_name:'aac'}],format:{format_name:'mov,mp4,m4a,3gp,3g2,mj2',duration:'60.06',size:'32'}});
test('both captured hero originals pass only the bounded container preflight and retain their source fingerprints',async()=>{
 for(const source of capture.videoMedia){const bytes=await readFile(new URL(`../public${source.sourcePath}`,import.meta.url));const result=preflightHeroVideo({bytes,filename:source.sourcePath.split('/').at(-1),mime:'video/mp4'});assert.equal(result.sha256,source.sha256);assert.equal(result.byteSize,source.byteLength);assert.equal('inspectionVersion' in result,false);assert.equal('verified' in result,false);}
});
test('preflight owns source bytes and rejects misleading filenames, media types and file-type boxes',()=>{
 const bytes=mp4(),result=preflightHeroVideo({bytes,filename:'background.MP4',mime:'video/mp4'});bytes[0]=255;assert.equal(result.bytes[0],0);
 for(const change of [u=>u.filename='../background.mp4',u=>u.filename='background.mov',u=>u.mime='image/jpeg',u=>u.bytes=Buffer.from('<svg/>'),u=>u.bytes.writeUInt32BE(9000,0),u=>u.bytes.write('qt  ',8),u=>u.bytes.writeUInt32BE(25,0)]){const upload={bytes:mp4(),filename:'background.mp4',mime:'video/mp4'};change(upload);assert.throws(()=>preflightHeroVideo(upload),VideoPolicyError);}
});
test('bounded metadata retains source properties while requiring a separate silent delivery derivative',()=>{
 const result=reviewHeroVideoMetadata(metadata(),32);assert.equal(result.hasAudio,true);assert.equal(result.requiresSilentDerivative,true);assert.equal(result.width,1920);assert.equal(result.codec,'h264');assert.equal(result.framesPerSecond,30000/1001);assert.equal('inspectionVersion' in result,false);
 const silent=metadata();silent.streams.pop();assert.equal(reviewHeroVideoMetadata(silent,32).hasAudio,false);
});
test('unknown timing, multiple tracks, cover images, oversized frames, unsupported codecs and mismatched bytes are rejected',()=>{
 for(const change of [m=>m.format.size='31',m=>m.format.duration='Infinity',m=>m.format.duration='181',m=>m.streams[0].duration='NaN',m=>m.streams[0].duration='20',m=>m.streams[0].avg_frame_rate='0/0',m=>m.streams[0].avg_frame_rate='120/1',m=>m.streams[0].width=10000,m=>m.streams[0].codec_name='gif',m=>m.streams[0].disposition.attached_pic=1,m=>m.streams[1].codec_type='subtitle',m=>m.streams[1].index=0,m=>m.streams.push({...m.streams[0],index:2}),m=>m.format.format_name='matroska,webm']){const value=metadata();change(value);assert.throws(()=>reviewHeroVideoMetadata(value,32),VideoPolicyError);}
});
