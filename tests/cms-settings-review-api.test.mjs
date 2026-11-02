import test from 'node:test';
import assert from 'node:assert/strict';
import {newGlobalSettings} from '../lib/cms/global-settings.ts';
import {handleSettingsReview} from '../lib/cms/settings-review-api.ts';
const site='00000000-0000-4000-8000-000000000001',record='00000000-0000-4000-8000-000000000002',revision='00000000-0000-4000-8000-000000000003';
const request=body=>new Request('https://site.test/api/cms/settings/review',{method:'POST',headers:{Authorization:'Bearer a.b.c','Content-Type':'application/json'},body:JSON.stringify(body)});
test('settings impact reads authorized baseline and does not write or grant publication',async()=>{
 const candidate=newGlobalSettings();candidate.seo.indexing='noindex';const calls=[];
 const response=await handleSettingsReview(request({site,record,revision,payload:candidate}),async(...args)=>{calls.push(args);return {id:record,type:'settings',currentRevision:revision,payload:newGlobalSettings()};});
 assert.equal(response.status,200);assert.deepEqual(calls,[['a.b.c','get_editor_record',{p_site:site,p_record:record}]]);
 const result=(await response.json()).result;assert.equal(result.publicationAuthorized,false);assert.ok(result.impact.some(i=>i.field==='seo.indexing'&&i.requiresElevatedApproval));assert.match(response.headers.get('cache-control'),/no-store/);
});
test('settings review rejects forged baseline, stale identity and inaccessible records',async()=>{
 const body={site,record,revision,payload:newGlobalSettings()};
 assert.equal((await handleSettingsReview(request({...body,before:body.payload}),async()=>assert.fail('unexpected RPC'))).status,422);
 for(const [value,status]of [[null,404],[{id:record,type:'settings',currentRevision:record,payload:body.payload},409],[{id:record,type:'settings',currentRevision:revision,payload:{}},422]])assert.equal((await handleSettingsReview(request(body),async()=>value)).status,status);
});
