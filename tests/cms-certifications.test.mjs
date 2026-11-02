import test from 'node:test';
import assert from 'node:assert/strict';
import {newCertification,certificationSchema,certificationDraftFindings,certificationTemporalState,certificationSaveCommand} from '../lib/cms/certifications.ts';
const id=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const complete=()=>({...newCertification(),summary:'Synthetic certification fixture.',issuer:'Example issuer',statement:'Fixture claim only.',scope:'Example location only.',issuedOn:'2026-01-01',validFrom:'2026-02-01',expiresOn:'2026-12-31',reviewOn:'2027-01-01',validity:'dated',evidence:[{recordId:id(1)}]});
test('incomplete certifications stay editable without becoming eligible claims',()=>{
 assert.equal(certificationSchema.safeParse(newCertification()).success,true);
 assert.ok(certificationDraftFindings(newCertification()).length>=9);
 assert.equal(certificationTemporalState(newCertification(),new Date()),'unavailable');
 assert.deepEqual(certificationDraftFindings(complete()),[]);
});
test('expiry is inclusive and due reviews block current editorial status at the exact UTC day',()=>{
 const draft=complete();
 for(const [date,state] of [['2026-01-31T23:59:59Z','scheduled'],['2026-02-01T00:00:00Z','current'],['2026-12-31T23:59:59Z','current'],['2027-01-01T00:00:00Z','expired']])assert.equal(certificationTemporalState(draft,new Date(date)),state);
 assert.equal(certificationTemporalState({...draft,reviewOn:'2026-06-01'},new Date('2026-06-01T00:00:00Z')),'reviewDue');
 assert.equal(certificationTemporalState({...draft,validity:'noExpiry',expiresOn:'',reviewOn:'2028-01-01'},new Date('2027-01-01')),'current');
 for(const status of ['revoked','suspended'])assert.equal(certificationTemporalState({...draft,status,statusNote:'Fixture change.'},new Date('2026-06-01')),status);
 assert.equal(certificationTemporalState(draft,new Date('invalid')),'unavailable');
});
test('invalid dates, repeated evidence, contradictory validity and forged approval fields fail closed',()=>{
 const draft=complete();
 for(const patch of [{issuedOn:'2026-02-30'},{validFrom:'2025-12-31'},{expiresOn:'2026-01-31'},{validity:'noExpiry'},{approved:true},{approvalOwner:id(2)},{evidence:[{recordId:id(1),approved:true}]},{evidence:[{recordId:id(1)},{recordId:id(1)}]},{schemaVersion:2}])assert.equal(certificationSchema.safeParse({...draft,...patch}).success,false,JSON.stringify(patch));
 assert.ok(certificationDraftFindings({...draft,expiresOn:''}).some(f=>f.field==='expiresOn'));
 assert.ok(certificationDraftFindings({...draft,status:'revoked'}).some(f=>f.field==='statusNote'));
});
test('creation needs an idempotency key and updates need the exact existing revision',()=>{
 const command={action:'save',site:id(1),record:null,expectedRevision:null,requestKey:id(2),payload:newCertification()};
 assert.equal(certificationSaveCommand.safeParse(command).success,true);
 assert.equal(certificationSaveCommand.safeParse({...command,requestKey:undefined}).success,false);
 assert.equal(certificationSaveCommand.safeParse({...command,record:id(3),expectedRevision:id(4)}).success,false);
 assert.equal(certificationSaveCommand.safeParse({...command,record:id(3),expectedRevision:id(4),requestKey:undefined}).success,true);
});
