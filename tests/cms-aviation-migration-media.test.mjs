import test from 'node:test';import assert from 'node:assert/strict';
import {verifyAviationMigrationMedia} from '../lib/cms/aviation-migration-media.ts';
const bindings=Array.from({length:5},(_,i)=>({kind:i===4?'video':'image',assetId:'asset-'+i,sourceSha256:String(i).repeat(64)}));
const evidence=()=>bindings.map(b=>({...b,sourceMatches:true,revision:1,processedSha256:'a'.repeat(64),available:true}));
test('Aviation mixed-media evidence preserves exact kind, identity, order and source binding',()=>{
 assert.equal(verifyAviationMigrationMedia(bindings,evidence()).verified,true);
 for(const mutate of [e=>e.reverse(),e=>e[4].kind='image',e=>e[0].assetId='other',e=>e[0].sourceSha256='f'.repeat(64),e=>e.pop(),e=>e[0].privatePath='/private']){const e=evidence();mutate(e);assert.throws(()=>verifyAviationMigrationMedia(bindings,e));}
});
test('Aviation media evidence rejects contradictions and refuses incomplete or duplicated original mappings',()=>{
 for(const mutate of [e=>e[0].sourceMatches=false,e=>e[0].revision=null,e=>e[4].processedSha256=null]){const e=evidence();mutate(e);assert.throws(()=>verifyAviationMigrationMedia(bindings,e));}
 const e=evidence();e[4]={...e[4],available:false,sourceMatches:false,revision:null,processedSha256:null};assert.deepEqual(verifyAviationMigrationMedia(bindings,e).unavailable,['asset-4']);assert.equal(verifyAviationMigrationMedia(bindings,e).verified,false);
 for(const maps of [bindings.slice(0,4),bindings.map(b=>({...b,kind:'image'})),bindings.map(b=>({...b,assetId:'same'}))])assert.throws(()=>verifyAviationMigrationMedia(maps,evidence()));
});
