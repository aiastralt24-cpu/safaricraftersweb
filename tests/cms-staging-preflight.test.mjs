import test from 'node:test';
import assert from 'node:assert/strict';
import {stagingPreflight} from '../lib/cms/staging-preflight.ts';
const configured=()=>({CMS_SUPABASE_URL:'https://project.example',CMS_SUPABASE_ANON_KEY:'sb_publishable_abcdefghijkl',CMS_SUPABASE_SERVICE_ROLE_KEY:'sb_secret_abcdefghijkl',CMS_WEBSITE_ID:'11111111-1111-4111-8111-111111111111',CMS_PUBLIC_SITE_ORIGIN:'https://staging.example',CMS_VALIDATION_WORKER_ENABLED:'true',CMS_DELIVERY_WORKER_ENABLED:'true',CMS_VALIDATION_WORKER_SECRET:'v'.repeat(40),CMS_DELIVERY_WORKER_SECRET:'d'.repeat(40)});
test('empty setup fails closed and reports every required setting',()=>{
 const result=stagingPreflight({});assert.equal(result.configurationReady,false);assert.equal(result.checks.length,9);assert.ok(result.checks.every(check=>check.status==='missing'));
});
test('configured report never serializes credentials or claims deployed verification',()=>{
 const env=configured(),result=stagingPreflight(env),serialized=JSON.stringify(result);
 assert.equal(result.configurationReady,true);
 for(const key of ['CMS_SUPABASE_ANON_KEY','CMS_SUPABASE_SERVICE_ROLE_KEY','CMS_VALIDATION_WORKER_SECRET','CMS_DELIVERY_WORKER_SECRET'])assert.ok(!serialized.includes(env[key]));
 assert.ok(result.verificationRequired.length);assert.match(result.note,/do not verify connectivity/);
});
test('privileged browser key, invalid site, unsafe origins and disabled workers fail',()=>{
 const cases={CMS_SUPABASE_ANON_KEY:'sb_secret_abcdefghijkl',CMS_SUPABASE_SERVICE_ROLE_KEY:'sb_publishable_abcdefghijkl',CMS_WEBSITE_ID:'not-a-uuid',CMS_SUPABASE_URL:'https://user:password@project.example',CMS_PUBLIC_SITE_ORIGIN:'http://staging.example',CMS_DELIVERY_WORKER_ENABLED:'false',CMS_VALIDATION_WORKER_SECRET:'short'};
 for(const [key,value] of Object.entries(cases)){const result=stagingPreflight({...configured(),[key]:value});assert.equal(result.configurationReady,false,key);assert.equal(result.checks.find(check=>check.id===key).status,'invalid');if(key.includes('KEY')||key.includes('SECRET')||key.includes('URL'))assert.ok(!JSON.stringify(result).includes(value),key);}
});
test('legacy keys require the correct roles and malformed payloads are rejected',()=>{
 const jwt=role=>`header.${Buffer.from(JSON.stringify({role})).toString('base64url')}.signature`;
 assert.equal(stagingPreflight({...configured(),CMS_SUPABASE_ANON_KEY:jwt('anon'),CMS_SUPABASE_SERVICE_ROLE_KEY:jwt('service_role')}).configurationReady,true);
 for(const value of [jwt('anon'),'a.b.c'])assert.equal(stagingPreflight({...configured(),CMS_SUPABASE_SERVICE_ROLE_KEY:value}).configurationReady,false);
});
