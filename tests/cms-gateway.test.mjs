import test from 'node:test';
import assert from 'node:assert/strict';
import {cmsRpc,bearerToken,privateHeaders} from '../lib/cms/gateway.ts';
import {GET} from '../app/api/cms/preview/[id]/route.ts';
test('settings release and history failures return actionable messages without database details',async()=>{
 for(const [message,expected] of [['settings_reference_verification_required',/linked from it/],['settings_url_verification_required',/settings link/],['settings_route_not_ready',/English/],['invalid_history_cursor',/Reload the settings workspace/]]){
  await assert.rejects(cmsRpc({url:'https://cms.example.test',key:'anon'},'a.b.c','publish',{},async()=>Response.json({code:'P0001',message,details:'private row data',hint:'secret endpoint'},{status:400})),error=>error.status===422&&expected.test(error.message)&&!error.message.includes('private')&&!error.message.includes('secret'));
 }
});
test('gateway requires explicit bearer credentials, not legacy cookies',()=>{
 for(const header of [null,'Basic abc','legacy-admin-token','Bearer a.b.c extra'])assert.throws(()=>bearerToken(header),/Sign in/);
 assert.equal(bearerToken('Bearer a.b.c'),'a.b.c');
});
test('user JWT and cms schema are forwarded with caching and redirects disabled',async()=>{
 const value=await cmsRpc({url:'https://cms.example.test',key:'public-anon'},'user.jwt.sig','get_preview',{p_id:'id'},async(url,options)=>{
  assert.equal(url.pathname,'/rest/v1/rpc/get_preview');assert.equal(options.headers.Authorization,'Bearer user.jwt.sig');assert.equal(options.headers['Content-Profile'],'cms');assert.equal(options.cache,'no-store');assert.equal(options.redirect,'error');return Response.json({payload:{title:'Private'}});
 });assert.equal(value.payload.title,'Private');assert.match(privateHeaders['Cache-Control'],/no-store/);assert.match(privateHeaders['X-Robots-Tag'],/noindex/);
});
test('invalid configuration fails closed and upstream errors do not leak details',async()=>{
 await assert.rejects(cmsRpc({url:'http://cms.example.test',key:'anon'},'a.b.c','get_preview',{}),error=>error.status===503);
 await assert.rejects(cmsRpc({url:'https://cms.example.test',key:'anon'},'a.b.c','get_preview',{},async()=>new Response('secret database detail',{status:403})),error=>error.status===403&&!error.message.includes('secret'));
 await assert.rejects(cmsRpc({url:'https://cms.example.test',key:'anon'},'a.b.c','get_preview',{},async()=>{throw new Error('secret endpoint');}),error=>error.status===503&&!error.message.includes('secret'));
});
test('preview route denies anonymous and malformed requests with private headers',async()=>{
 const anonymous=await GET(new Request('https://site.test/api/cms/preview/id'),{params:Promise.resolve({id:'id'})});
 assert.equal(anonymous.status,401);assert.match(anonymous.headers.get('cache-control'),/no-store/);assert.equal(anonymous.headers.get('referrer-policy'),'no-referrer');
 const malformed=await GET(new Request('https://site.test/api/cms/preview/id',{headers:{Authorization:'Bearer a.b.c'}}),{params:Promise.resolve({id:'id'})});
 assert.equal(malformed.status,404);assert.match(malformed.headers.get('x-robots-tag'),/noindex/);
});
test('preview route fails closed when its separate CMS environment is not configured',async()=>{
 const savedUrl=process.env.CMS_SUPABASE_URL,savedKey=process.env.CMS_SUPABASE_ANON_KEY;
 delete process.env.CMS_SUPABASE_URL;delete process.env.CMS_SUPABASE_ANON_KEY;
 try{
 const result=await GET(new Request('https://site.test/api/cms/preview/id',{headers:{Authorization:'Bearer a.b.c'}}),{params:Promise.resolve({id:'00000000-0000-4000-8000-000000000001'})});
 assert.equal(result.status,503);assert.deepEqual(await result.json(),{error:'CMS connection is not configured.'});
 }finally{if(savedUrl!==undefined)process.env.CMS_SUPABASE_URL=savedUrl;if(savedKey!==undefined)process.env.CMS_SUPABASE_ANON_KEY=savedKey;}
});

test('homepage release and migration failures provide safe recovery guidance',async()=>{
 const failures=[['homepage_header_verification_required',/header.*validation/],['homepage_reference_verification_required',/publication status/],['homepage_link_verification_required',/homepage link/],['homepage_route_not_ready',/English root/],['migration_media_unavailable',/image or video/],['migration_media_mismatch',/reviewed mappings/],['migration_reference_unavailable',/content record/],['migration_reference_mismatch',/reviewed mappings/],['idempotency_key_reused',/Recover the earlier result/]];
 for(const [message,expected]of failures)await assert.rejects(cmsRpc({url:'https://cms.example.test',key:'anon'},'a.b.c','apply_homepage_migration',{},async()=>Response.json({code:'P0001',message,details:'PRIVATE_PAYLOAD',hint:'PRIVATE_ENDPOINT'},{status:400})),error=>error.status===422&&expected.test(error.message)&&!error.message.includes('PRIVATE_'));
});
