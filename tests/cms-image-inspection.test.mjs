import test from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import {inspectImage,IMAGE_LIMITS} from '../lib/cms/image-inspection.ts';
const clean=async()=> 'clean';
const make=async(format='png')=>sharp({create:{width:80,height:40,channels:3,background:'#234638'}}).toFormat(format).toBuffer();
const upload=async()=>({bytes:await make(),filename:'forest.png',mime:'image/png'});
test('actual supported formats decode, retain private originals and produce metadata-free delivery',async()=>{
 for(const [format,extension,mime]of [['png','png','image/png'],['jpeg','jpg','image/jpeg'],['webp','webp','image/webp'],['avif','avif','image/avif']]){
  const bytes=await make(format),result=await inspectImage({bytes,filename:`forest.${extension}`,mime},clean);
  assert.deepEqual(result.original.bytes,bytes);assert.equal(result.original.width,80);assert.equal(result.delivery.width,80);assert.match(result.original.sha256,/^[a-f0-9]{64}$/);
  const meta=await sharp(result.delivery.bytes).metadata();assert.equal(meta.format,'webp');assert.equal(meta.exif,undefined);assert.equal(meta.xmp,undefined);
 }
});
test('extension, type, paths, active formats and byte limits reject before scanning',async()=>{
 const valid=await upload();let scans=0;const scanner=async()=>{scans++;return 'clean';};
 for(const candidate of [{...valid,filename:'image.jpg'},{...valid,mime:'text/html'},{...valid,filename:'../forest.png'},{...valid,bytes:Buffer.from('<svg/>'),filename:'image.svg',mime:'image/svg+xml'},{...valid,bytes:Buffer.alloc(IMAGE_LIMITS.bytes+1)}])await assert.rejects(inspectImage(candidate,scanner),error=>error.name==='ImageInspectionError');
 assert.equal(scans,0);
});
test('scanner failures never become successful inspections or leak upstream errors',async()=>{
 for(const scanner of [async()=> 'infected',async()=> 'unavailable',async()=>{throw Error('private scanner credential');}])await assert.rejects(inspectImage(await upload(),scanner),error=>error.code.startsWith('scan_')&&!error.message.includes('credential'));
});
test('corrupt image body fails full decode even with correct signature',async()=>{
 const valid=await upload();valid.bytes=valid.bytes.subarray(0,40);await assert.rejects(inspectImage(valid,clean),error=>error.code==='invalid_image');
});
test('input and scanner mutations cannot change the private original',async()=>{
 const valid=await upload(),expected=Buffer.from(valid.bytes);
 const result=await inspectImage(valid,async bytes=>{bytes.fill(0);valid.bytes.fill(0);return 'clean';});assert.deepEqual(result.original.bytes,expected);
});
test('oversized dimensions fail and source EXIF is retained privately but stripped from delivery',async()=>{
 const wide=await sharp({create:{width:20001,height:1,channels:3,background:'#fff'}}).png().toBuffer();
 await assert.rejects(inspectImage({bytes:wide,filename:'wide.png',mime:'image/png'},clean),error=>error.code==='dimensions');
 const bytes=await sharp(await make()).withMetadata({orientation:6}).jpeg().toBuffer();
 assert.ok((await sharp(bytes).metadata()).exif);
 const result=await inspectImage({bytes,filename:'oriented.jpg',mime:'image/jpeg'},clean);
 assert.deepEqual(result.original.bytes,bytes);const meta=await sharp(result.delivery.bytes).metadata();assert.equal(meta.exif,undefined);assert.equal(meta.width,40);assert.equal(meta.height,80);
});
