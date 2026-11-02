import test from 'node:test';import assert from 'node:assert/strict';
import {reviewHomepageMigrationMedia} from '../lib/cms/homepage-migration-media.ts';
const sources=[...Array.from({length:21},(_,index)=>({sourcePath:`/assets/image-${index}.png`,sha256:'a'.repeat(64),kind:'image',proposedAssetId:`image-${index}`})),{sourcePath:'/assets/hero.mp4',sha256:'b'.repeat(64),kind:'video',proposedAssetId:'video-1'}];
const evidence=bindings=>bindings.map(item=>({...item,sourceMatches:true,available:true,revision:1,processedSha256:'c'.repeat(64)}));
test('homepage image verification preserves source order across bounded batches and never certifies unsupported videos',async()=>{
 let active=0,max=0;const sizes=[];
 const review=await reviewHomepageMigrationMedia(sources,async bindings=>{active++;max=Math.max(max,active);sizes.push(bindings.length);await new Promise(resolve=>setTimeout(resolve,bindings[0].assetId==='image-0'?15:1));active--;return evidence(bindings);});
 assert.deepEqual(sizes,[4,4,4,4,4,1]);assert.ok(max<=4);assert.equal(review.imagesVerified,true);assert.equal(review.verified,false);
 assert.deepEqual(review.images.map(item=>item.assetId),sources.slice(0,-1).map(item=>item.proposedAssetId));assert.deepEqual(review.videos,[{sourcePath:'/assets/hero.mp4',assetId:'video-1',code:'video_verification_pending'}]);
});
test('source or rights failures remain visible and missing or contradictory evidence fails the complete review',async()=>{
 const unavailable=await reviewHomepageMigrationMedia(sources,async bindings=>evidence(bindings).map(item=>({...item,available:item.assetId!=='image-8'})));assert.equal(unavailable.imagesVerified,false);assert.equal(unavailable.images.find(item=>item.assetId==='image-8').available,false);
 for(const read of [async()=>[],async bindings=>evidence(bindings).reverse(),async bindings=>evidence(bindings).map(item=>({...item,sourceMatches:false})),async()=>{throw Error('Provider unavailable');}])await assert.rejects(reviewHomepageMigrationMedia(sources,read));
});
test('duplicate, absent and incomplete mappings never reach the provider',async()=>{
 let calls=0;const read=async()=>{calls++;return [];};
 for(const input of [[],sources.slice(0,-1),[...sources,sources[0]],sources.map((item,index)=>index===0?{...item,proposedAssetId:null}:item)])await assert.rejects(reviewHomepageMigrationMedia(input,read));assert.equal(calls,0);
});
