import test from 'node:test';import assert from 'node:assert/strict';
import {newPartner,partnerSchema,partnerSaveCommand,partnerDraftFindings,partnerPath} from '../lib/cms/partners.ts';
const id=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
test('partner records distinguish businesses from premises and preserve service/geographic relationships',()=>{
 const draft={...newPartner(),title:'Example service partner',slug:'example-partner',kind:'both',summary:'Support and supply',services:['Repairs','Sales'],coverage:[{countryCode:'IN',regions:['Gujarat']}],contact:{email:'support@example.test',phone:'',website:''},relationships:{...newPartner().relationships,locations:[{recordId:id(1)}],certifications:[{recordId:id(2)}]}};
 assert.deepEqual(partnerSchema.parse(draft),draft);assert.equal(partnerPath(draft.slug),'/partners/example-partner');assert.deepEqual(partnerDraftFindings(draft).filter(i=>i.severity==='error'),[]);
 assert.equal(partnerSchema.safeParse(newPartner()).success,true);assert.ok(partnerDraftFindings(newPartner()).some(i=>i.field==='coverage'));
});
test('partner contracts reject duplicate services, ambiguous coverage, unsafe contact and forged approval',()=>{
 const invalid=[{services:['Repairs','repairs']},{coverage:[{countryCode:'IN',regions:['Gujarat','gujarat']}]},{coverage:[{countryCode:'IN',regions:[]},{countryCode:'IN',regions:[]}]},{coverage:[{countryCode:'india',regions:[]}]},{contact:{email:'',phone:'',website:'javascript:alert(1)'}},{approved:true},{relationships:{...newPartner().relationships,locations:[{recordId:id(1)},{recordId:id(1)}]}},{kind:'office'}];
 for(const patch of invalid)assert.equal(partnerSchema.safeParse({...newPartner(),...patch}).success,false,JSON.stringify(patch));
 assert.ok(partnerDraftFindings({...newPartner(),status:'inactive'}).some(i=>i.field==='status'));
});
test('partner saves pin updates and require recoverable create identities',()=>{
 const base={action:'save',site:id(1),record:null,expectedRevision:null,payload:newPartner()};assert.equal(partnerSaveCommand.safeParse(base).success,false);assert.equal(partnerSaveCommand.safeParse({...base,requestKey:id(2)}).success,true);assert.equal(partnerSaveCommand.safeParse({...base,record:id(3),expectedRevision:id(4)}).success,true);assert.equal(partnerSaveCommand.safeParse({...base,record:id(3),expectedRevision:id(4),requestKey:id(2)}).success,false);
});
