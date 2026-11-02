import test from 'node:test';import assert from 'node:assert/strict';
import {newLocation} from '../lib/cms/locations.ts';
import {locationImportLinks,verifyLocationImportEvidence} from '../lib/cms/location-import-evidence.ts';
import {compareLocationImport} from '../lib/cms/location-import-comparison.ts';
const id='00000000-0000-4000-8000-000000000001',revision='00000000-0000-4000-8000-000000000002';
test('location import evidence covers preserved nested images and all typed relationship groups exactly',()=>{
 const payload=newLocation();payload.image={assetId:'photo',alt:'Office',decorative:false};payload.body=[{kind:'image',id:'photo-block',image:payload.image}];
 for(const group of Object.keys(payload.relationships))payload.relationships[group]=[{recordId:id}];
 const changes=[{importId:'office',payload}],links=locationImportLinks(changes);assert.deepEqual(links.assets,['photo']);assert.deepEqual(links.references.map(r=>r.type),['application','project','product','journalArticle','document']);
 const evidence={assets:[{assetId:'photo',available:true}],references:links.references.map(r=>({...r,available:true,revision}))};assert.deepEqual(verifyLocationImportEvidence(changes,evidence).issues,[]);
 assert.equal(verifyLocationImportEvidence(changes,{...evidence,references:evidence.references.slice(1)}),null);
 assert.equal(verifyLocationImportEvidence(changes,{...evidence,assets:[...evidence.assets,...evidence.assets]}),null);
 assert.equal(verifyLocationImportEvidence(changes,{...evidence,references:evidence.references.map(r=>({...r,revision:null}))}),null);
 const revoked=verifyLocationImportEvidence(changes,{assets:[{assetId:'photo',available:false}],references:evidence.references.map(r=>({...r,available:false,revision:null}))});assert.equal(revoked.issues.length,6);
});
test('location comparisons expose changed and removed address, hours and coordinates without false object-order changes',()=>{
 const before=newLocation();before.address.lines=['Old address'];before.coordinates={latitude:0,longitude:0};before.hours=[{day:7,intervals:[]}];const after=structuredClone(before);after.address.lines=['New address'];delete after.coordinates;after.hours=[];
 const rows=compareLocationImport(before,after);assert.deepEqual(rows.map(r=>r.field),['address','coordinates','hours']);assert.equal(rows.find(r=>r.field==='coordinates').after,null);
 const reordered={...before,coordinates:{longitude:0,latitude:0}};assert.deepEqual(compareLocationImport(before,reordered),[]);
});
