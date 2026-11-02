import test from 'node:test';
import assert from 'node:assert/strict';
import {planCertificationImport} from '../lib/cms/certification-import-plan.ts';
const uuid=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const input=()=>({templateVersion:'1.0',pageType:'certification',sheets:{Pages:[{recordId:'cert_1',operation:'create',slug:'quality',title:'Quality certificate',locale:'en'}],Content:[['issuer','Independent issuer'],['issuedOn','2026-01-01'],['validFrom','2026-01-01'],['validity','noExpiry'],['statement','Exact claim'],['scope','Defined scope']].map(([field,value])=>({recordId:'cert_1',field,value})),Evidence:[{recordId:'cert_1',itemId:'proof',position:'1',targetId:uuid(5)}]}});
test('certification plans preserve exact claims and references without mutating source or granting approval',()=>{
 const source=input(),before=structuredClone(source),plan=planCertificationImport(source);assert.equal(plan.valid,true,JSON.stringify(plan.issues));assert.deepEqual(source,before);assert.equal(plan.changes[0].path,'/certifications/quality');assert.equal(plan.changes[0].payload.statement,'Exact claim');assert.deepEqual(plan.changes[0].payload.evidence,[{recordId:uuid(5)}]);assert.equal(plan.changes[0].payload.approved,undefined);
});
test('updates require current revision and explicit collection replacement, preserving omitted content',()=>{
 const base=planCertificationImport(input()).changes[0].payload,existing=[{recordId:uuid(1),revision:uuid(2),locale:'en',payload:base}],before=structuredClone(existing);
 const update={templateVersion:'1.0',pageType:'certification',sheets:{Pages:[{recordId:uuid(1),operation:'update',expectedRevision:uuid(2),slug:'quality',title:'Revised title',locale:'en'}]}};
 assert.deepEqual(planCertificationImport(update,existing).changes[0].payload,{...base,title:'Revised title'});
 update.sheets.Evidence=[{recordId:uuid(1),itemId:'new',position:1,targetId:uuid(6)}];assert.equal(planCertificationImport(update,existing).valid,false);
 update.sheets.Pages[0].replaceCollections='evidence';assert.deepEqual(planCertificationImport(update,existing).changes[0].payload.evidence,[{recordId:uuid(6)}]);delete update.sheets.Evidence;assert.deepEqual(planCertificationImport(update,existing).changes[0].payload.evidence,[]);
 update.sheets.Pages[0].expectedRevision=uuid(3);assert.equal(planCertificationImport(update,existing).valid,false);assert.deepEqual(existing,before);
});
test('unsafe, ambiguous, incomplete identity and invalid dates reject the whole batch',()=>{
 const mutations=[v=>v.sheets.Content.push({recordId:'cert_1',field:'approved',value:'true'}),v=>v.sheets.Content.push({recordId:'cert_1',field:'__proto__.polluted',value:'yes'}),v=>v.sheets.Content.push({recordId:'cert_1',field:'expiresOn',value:'2025-01-01'}),v=>v.sheets.Content[1].value='2026-02-30',v=>v.sheets.Evidence[0].targetId='bad',v=>v.sheets.Evidence.push({...v.sheets.Evidence[0],itemId:'duplicate',position:'2'}),v=>v.sheets.Evidence[0].recordId='missing',v=>v.sheets.Evidence[0].position='1e2',v=>v.sheets.Pages.push({...v.sheets.Pages[0],recordId:'second'}),v=>v.sheets.Content[0].value=123,v=>v.sheets.Content[0].value='x'.repeat(201),v=>v.sheets.Pages[0].replaceCollections='approval'];
 for(const mutate of mutations){const value=input();mutate(value);const plan=planCertificationImport(value);assert.equal(plan.valid,false,JSON.stringify(value));assert.deepEqual(plan.changes,[]);}
});
test('limits and warnings preserve Office row numbers',()=>{
 const value=input();value.sheets.Content.unshift({});value.sheets.Content[1].value='x'.repeat(201);assert.ok(planCertificationImport(value).issues.some(i=>i.row===3&&i.code==='character_limit'));
 const warning=input();warning.sheets.Content.push({recordId:'cert_1',field:'summary',value:Array(81).fill('word').join(' ')});assert.equal(planCertificationImport(warning).valid,true);assert.ok(planCertificationImport(warning).issues.some(i=>i.severity==='warning'));
 const batch=input();batch.sheets.Pages=Array.from({length:26},(_,i)=>({...batch.sheets.Pages[0],recordId:`cert_${i}`,slug:`cert-${i}`}));assert.equal(planCertificationImport(batch).valid,false);
});
