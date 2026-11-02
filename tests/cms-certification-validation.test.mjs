import test from 'node:test';import assert from 'node:assert/strict';
import {newCertification} from '../lib/cms/certifications.ts';
import {validateCertificationContent} from '../lib/cms/certification-validation.ts';
const id=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const payload={...newCertification(),summary:'Example certificate',issuer:'Example issuer',statement:'Synthetic claim',scope:'Example scope',issuedOn:'2020-01-01',validFrom:'2020-01-01',reviewOn:'2099-01-01',validity:'noExpiry',evidence:[{recordId:id(4)}]};
const input={site:id(1),record:id(2),revision:id(3),type:'certification',path:'/certifications/new-certification',locale:'en',payload};
const evidence={websiteId:id(1),recordId:id(2),revisionId:id(3),claimApproved:true,references:[],media:[]};
test('certification validation requires exact trusted evidence, approval and supported identity',()=>{
 assert.equal(validateCertificationContent(input,evidence).contentChecksPass,true);
 for(const value of [null,{...evidence,websiteId:id(9)},{...evidence,recordId:id(9)},{...evidence,revisionId:id(9)},{...evidence,claimApproved:false}])assert.equal(validateCertificationContent(input,value).contentChecksPass,false);
 for(const patch of [{locale:'fr'},{type:'page'},{path:'/elsewhere'},{payload:newCertification()}])assert.equal(validateCertificationContent({...input,...patch},evidence).contentChecksPass,false);
});
test('selected relationships and sharing images require exact current evidence',()=>{
 const value={...input,payload:{...payload,relationships:{locations:[{recordId:id(5)}],pages:[]},seo:{...payload.seo,socialImage:{assetId:'share',alt:'Example',decorative:false}}}};
 const valid={...evidence,references:[{type:'location',recordId:id(5),available:true,published:true,locale:'en'}],media:[{assetId:'share',available:true}]};
 assert.equal(validateCertificationContent(value,valid).contentChecksPass,true);
 for(const patch of [{published:false},{available:false},{locale:'fr'},{recordId:id(6)},{type:'page'}])assert.equal(validateCertificationContent(value,{...valid,references:[{...valid.references[0],...patch}]}).contentChecksPass,false);
 for(const media of [[],[{assetId:'other',available:true}],[{assetId:'share',available:false}]])assert.equal(validateCertificationContent(value,{...valid,media}).contentChecksPass,false);
 assert.equal(validateCertificationContent(input,valid).contentChecksPass,false);
});
