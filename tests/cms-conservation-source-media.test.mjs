import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs/promises';import path from 'node:path';import {createHash} from 'node:crypto';import sharp from 'sharp';
import inventory from '../docs/cms/conservation-migration-inventory.json' with {type:'json'};
import {processUpload} from '../lib/cms/upload-worker.ts';
import {planConservationMigration,conservationMigrationDependencies} from '../lib/cms/conservation-migration.ts';
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
test('all original conservation photographs pass actual decoding and bind unchanged sources to distinct delivery derivatives',async()=>{
 const site='00000000-0000-4000-8000-000000000001',bindings=[],report=[];
 for(const [index,source]of inventory.media.entries()){
  const bytes=await fs.readFile(new URL(`../public${source.sourcePath}`,import.meta.url));assert.equal(hash(bytes),source.sha256);
  const id=`source-image-${index}`,job={id,site,filename:path.basename(source.sourcePath),mime:'image/jpeg',bytes:bytes.length,sha256:source.sha256,storageKey:`${site}/${id}/original`,deliveryKey:`${site}/${id}/delivery.webp`,leaseToken:'fixture-lease'};
  let output,registered,scanned=false;
  const result=await processUpload({claim:async()=>job,read:async(key,max)=>{assert.equal(key,job.storageKey);assert.equal(max,bytes.length);return bytes;},
   // Scanner is deliberately a test double. This test proves decoding/provenance,
   // not malware clearance, storage-provider delivery or permission to use images.
   scan:async(input)=>{assert.equal(hash(input),source.sha256);scanned=true;return 'clean';},
   putVerified:async(key,data,digest,mime)=>{assert.equal(key,job.deliveryKey);assert.equal(mime,'image/webp');assert.equal(hash(data),digest);output=Buffer.from(data);},
   finish:async(_job,value)=>{assert.ok(scanned&&output);registered=value;return id;},fail:async(_job,code)=>{assert.fail(`${source.sourcePath}: ${code}`);}
  },site,id);
  assert.deepEqual(result,{status:'ready',assetId:id});assert.equal(registered.originalSha256,source.sha256);assert.equal(registered.sha256,hash(output));assert.notEqual(registered.sha256,source.sha256);
  const metadata=await sharp(output).metadata();await sharp(output).raw().toBuffer();assert.equal(metadata.format,'webp');assert.equal(metadata.exif,undefined);assert.equal(metadata.xmp,undefined);assert.equal(metadata.width,registered.width);assert.equal(metadata.height,registered.height);assert.ok(metadata.width<=2400&&metadata.height<=2400);assert.equal(hash(await fs.readFile(new URL(`../public${source.sourcePath}`,import.meta.url))),source.sha256);assert.equal(registered.bytes,output.length);assert.equal(registered.inspectionVersion,'image-1');
  bindings.push({sourcePath:source.sourcePath,sourceSha256:source.sha256,assetId:id});report.push({sourcePath:source.sourcePath,sourceSha256:source.sha256,processedSha256:registered.sha256,sourceBytes:bytes.length,deliveryBytes:output.length,width:metadata.width,height:metadata.height});
  if(process.env.CMS_TEST_EXPORT_CONSERVATION_MEDIA){await fs.mkdir(process.env.CMS_TEST_EXPORT_CONSERVATION_MEDIA,{recursive:true});await fs.writeFile(path.join(process.env.CMS_TEST_EXPORT_CONSERVATION_MEDIA,`${index+1}.webp`),output);}
 }
 const proposal=planConservationMigration(conservationMigrationDependencies,bindings);assert.equal(proposal.missingMedia.length,0);assert.equal(proposal.readyToApply,false);assert.equal(proposal.previewPayload.seo.socialImage.assetId,bindings[0].assetId);assert.deepEqual(proposal.content.fieldRecords.items.map(item=>item.image.assetId),bindings.slice(1).map(item=>item.assetId));
 if(process.env.CMS_TEST_EXPORT_CONSERVATION_MEDIA)await fs.writeFile(path.join(process.env.CMS_TEST_EXPORT_CONSERVATION_MEDIA,'report.json'),JSON.stringify({scope:'Local decode/provenance test only; scanner mocked; no upload, rights approval or publication',images:report},null,2));
});
