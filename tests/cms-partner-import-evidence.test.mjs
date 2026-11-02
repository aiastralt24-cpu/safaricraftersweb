import test from 'node:test';import assert from 'node:assert/strict';
import {newPartner} from '../lib/cms/partners.ts';
import {partnerImportLinks,verifyPartnerImportEvidence} from '../lib/cms/partner-import-evidence.ts';
import {comparePartnerImport} from '../lib/cms/partner-import-comparison.ts';
const id='00000000-0000-4000-8000-000000000001',revision='00000000-0000-4000-8000-000000000002';
test('partner import evidence covers preserved nested images and all typed relationship groups exactly',()=>{
 const payload=newPartner();payload.image={assetId:'photo',alt:'Office',decorative:false};payload.body=[{kind:'image',id:'photo-block',image:payload.image}];
 for(const group of Object.keys(payload.relationships))payload.relationships[group]=[{recordId:id}];
 const changes=[{importId:'office',payload}],links=partnerImportLinks(changes);assert.deepEqual(links.assets,['photo']);assert.deepEqual(links.references.map(r=>r.type),['application','location','product','certification','document']);
 const evidence={assets:[{assetId:'photo',available:true}],references:links.references.map(r=>({...r,available:true,revision}))};assert.deepEqual(verifyPartnerImportEvidence(changes,evidence).issues,[]);
 assert.equal(verifyPartnerImportEvidence(changes,{...evidence,references:evidence.references.slice(1)}),null);
 assert.equal(verifyPartnerImportEvidence(changes,{...evidence,assets:[...evidence.assets,...evidence.assets]}),null);
 assert.equal(verifyPartnerImportEvidence(changes,{...evidence,references:evidence.references.map(r=>({...r,revision:null}))}),null);
 const revoked=verifyPartnerImportEvidence(changes,{assets:[{assetId:'photo',available:false}],references:evidence.references.map(r=>({...r,available:false,revision:null}))});assert.equal(revoked.issues.length,6);
});
test('partner comparison shows complete coverage and service replacement',()=>{
 const before=newPartner();before.services=['Old'];before.coverage=[{countryCode:'IN',regions:['Gujarat']}];const after={...before,services:['New'],coverage:[]};
 assert.deepEqual(comparePartnerImport(before,after).map(row=>row.field),['services','coverage']);
 assert.deepEqual(comparePartnerImport(before,{...before,coverage:[{regions:['Gujarat'],countryCode:'IN'}]}),[]);
});
