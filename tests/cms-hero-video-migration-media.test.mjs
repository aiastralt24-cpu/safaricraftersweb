import test from 'node:test';import assert from 'node:assert/strict';
import {verifyHeroVideoMigrationMedia} from '../lib/cms/hero-video-migration-media.ts';
const id='00000000-0000-4000-8000-000000000001',other='00000000-0000-4000-8000-000000000002';
const bindings=[{assetId:id,sourceSha256:'a'.repeat(64)}],evidence=[{...bindings[0],sourceMatches:true,revision:1,processedSha256:'b'.repeat(64),available:true}];
test('video review preserves unavailable evidence without claiming overall readiness',()=>{
 assert.equal(verifyHeroVideoMigrationMedia(bindings,evidence).verified,true);
 const result=verifyHeroVideoMigrationMedia(bindings,[{...evidence[0],available:false}]);assert.equal(result.verified,false);assert.deepEqual(result.unavailable,[id]);
});
test('video evidence requires complete exact identities, source digests and consistent availability',()=>{
 for(const value of [[],[{...evidence[0],assetId:other}],[{...evidence[0],sourceSha256:'c'.repeat(64)}],[{...evidence[0],sourceMatches:false}],[{...evidence[0],revision:null}],[{...evidence[0],processedSha256:null}]])assert.throws(()=>verifyHeroVideoMigrationMedia(bindings,value));
 assert.throws(()=>verifyHeroVideoMigrationMedia([...bindings,...bindings],[...evidence,...evidence]));
});
