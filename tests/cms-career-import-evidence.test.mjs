import test from 'node:test';
import assert from 'node:assert/strict';
import {newCareer} from '../lib/cms/careers.ts';
import {careerImportLinks,verifyCareerImportEvidence} from '../lib/cms/career-import-evidence.ts';
import {compareCareerImport} from '../lib/cms/career-import-comparison.ts';
const id=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
function fixture(){
 const payload=newCareer();payload.image={assetId:'photo',alt:'Team',decorative:false};
 payload.body=[{kind:'image',id:'photo-block',image:payload.image}];payload.seo.socialImage={...payload.image,assetId:'social'};
 payload.application={mode:'form',label:'Apply',formId:id(1)};
 for(const group of Object.keys(payload.relationships))payload.relationships[group]=[{recordId:id(2)}];
 const changes=[{importId:'job',payload}],links=careerImportLinks(changes);
 return {changes,links,evidence:{assets:links.assets.map(assetId=>({assetId,available:true})),references:links.references.map(ref=>({...ref,available:true,revision:id(3)}))}};
}
test('career import collects complete preserved media and typed relationships including application forms',()=>{
 const {changes,links,evidence}=fixture();
 assert.deepEqual(links.assets,['photo','social']);assert.deepEqual(links.references.map(ref=>ref.type),['form','location','document','page']);
 assert.deepEqual(verifyCareerImportEvidence(changes,evidence).issues,[]);
 const duplicate=[...changes,{...changes[0],importId:'second'}];assert.deepEqual(careerImportLinks(duplicate),links);
 changes[0].payload.application={mode:'external',label:'Apply',url:'https://example.test/apply'};
 assert.equal(careerImportLinks(changes).references.some(ref=>ref.type==='form'),false);
 assert.equal(verifyCareerImportEvidence(changes,evidence),null);
});
test('career evidence refuses missing, duplicate, foreign, reordered and contradictory responses',()=>{
 const {changes,evidence}=fixture();
 const cases=[
  e=>e.assets.pop(),e=>e.assets.push(e.assets[0]),e=>e.assets.reverse(),e=>e.assets[0].assetId='foreign',
  e=>e.references.pop(),e=>e.references.push(e.references[0]),e=>e.references.reverse(),
  e=>e.references[0].recordId=id(9),e=>e.references[0].type='product',e=>e.references[0].revision=null,
  e=>e.references[0].available=false,e=>e.unknown=true,
 ];
 for(const mutate of cases){const value=structuredClone(evidence);mutate(value);assert.equal(verifyCareerImportEvidence(changes,value),null);}
});
test('unavailable dependencies become attributable findings for every affected job',()=>{
 const {changes,evidence}=fixture();
 for(const asset of evidence.assets)asset.available=false;
 for(const ref of evidence.references){ref.available=false;ref.revision=null;}
 const second={...changes[0],importId:'second'};
 const checked=verifyCareerImportEvidence([...changes,second],evidence);
 assert.equal(checked.issues.length,12);
 assert.equal(checked.issues.filter(issue=>issue.field==='application.formId').length,2);
 assert.equal(checked.issues.filter(issue=>issue.message.startsWith('second:')).length,6);
 assert.ok(checked.issues.every(issue=>issue.severity==='error'));
});
test('career review comparisons expose removals, application changes and private notes without object-order noise',()=>{
 const before=newCareer();before.compensation={currency:'INR',minimum:0,maximum:100,unit:'month'};
 before.application={mode:'form',label:'Apply',formId:id(1)};before.remoteRegions=['India'];before.internalNotes='Private';
 const after=structuredClone(before);delete after.compensation;after.application={mode:'none'};after.remoteRegions=[];after.internalNotes='';
 const rows=compareCareerImport(before,after);
 assert.deepEqual(new Set(rows.map(row=>row.field)),new Set(['compensation','application','remoteRegions','internalNotes']));
 assert.equal(rows.find(row=>row.field==='compensation').after,null);
 assert.deepEqual(compareCareerImport(before,{...before,compensation:{unit:'month',maximum:100,minimum:0,currency:'INR'}}),[]);
 assert.ok(compareCareerImport(null,before).some(row=>row.field==='application'&&row.before===null));
 assert.throws(()=>compareCareerImport(before,{...after,application:{mode:'external',url:'javascript:alert(1)',label:'Apply'}}));
});
