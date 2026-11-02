import test from 'node:test';import assert from 'node:assert/strict';
import {evaluateValidationInput} from '../lib/cms/validation-worker.ts';
import {localizedPublicationPaths} from '../lib/cms/localized-publication-validation.ts';
const id=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
function input(){return {site:id(1),record:id(2),revision:id(3),locale:'fr',type:'page',path:'/notre-histoire',payload:{composition:{schemaVersion:1,title:'Notre histoire',sections:[{id:'intro',kind:'text',controls:{label:'Introduction',headingLevel:'h1'},data:{title:'Notre histoire',body:[{kind:'paragraph',text:'Notre récit.'},{kind:'link',label:'Lire',href:'/autre-page?view=1#main'}]}}]}},downloadStatus:[],mediaStatus:[],localizedEvidence:{websiteId:id(1),recordId:id(2),revisionId:id(3),locale:'fr',path:'/notre-histoire',registry:{websiteId:id(1),locale:'fr',routes:[{path:'/autre-page',available:true,recordId:id(4),revisionId:id(5)},{path:'/notre-histoire',available:true,recordId:id(2),revisionId:id(3)}]}}};}
test('trusted translated-page validation requires complete exact saved-revision evidence',()=>{
 assert.equal(evaluateValidationInput(input()).contentChecksPass,true);
 for(const change of [v=>delete v.localizedEvidence,v=>v.localizedEvidence.revisionId=id(9),v=>v.localizedEvidence.locale='en',v=>v.localizedEvidence.registry.routes.reverse(),v=>v.localizedEvidence.registry.routes.pop(),v=>v.localizedEvidence.registry.routes[0]={path:'/autre-page',available:false},v=>v.localizedEvidence.registry.routes[1].revisionId=id(9)]){
  const value=input();change(value);const result=evaluateValidationInput(value);assert.equal(result.contentChecksPass,false);assert.ok(result.findings.some(f=>f.code==='localized_publication_unverified'));
 }
});
test('localized validation preserves composition, media and download rejection and cannot enable reserved families',()=>{
 const value=input();value.payload.composition.sections.push({id:'image',kind:'imageText',controls:{label:'Image'},data:{title:'Portrait',body:[{kind:'paragraph',text:'Texte'}],image:{assetId:id(8),alt:'Portrait',decorative:false}}});
 const result=evaluateValidationInput(value);assert.equal(result.contentChecksPass,false);assert.ok(result.findings.some(f=>f.code==='asset_verification_required'));
 const invalid=input();invalid.payload.composition.sections[0].controls.headingLevel='h2';assert.equal(evaluateValidationInput(invalid).contentChecksPass,false);
 const reserved=input();reserved.path='/about';assert.equal(evaluateValidationInput(reserved).contentChecksPass,false);
 const downloads=input();downloads.payload.composition.sections.push({id:'downloads',kind:'downloads',controls:{label:'Documents'},data:{title:'Guides',items:[{id:'guide',label:'Guide',document:{recordId:id(6)},versionId:id(7)}]}});assert.equal(evaluateValidationInput(downloads).contentChecksPass,false);
 downloads.downloadStatus=[{recordId:id(6),versionId:id(7),available:true}];assert.equal(evaluateValidationInput(downloads).contentChecksPass,true);
});
test('publication link candidates normalize owned absolute links and preserve complete sorted paths',()=>{
 assert.deepEqual(localizedPublicationPaths({a:{href:'https://www.safaricrafters.com./z?x=1#main'},b:{href:'/a#main'},c:{href:'https://external.test/page'},d:{href:'mailto:hello@example.com'},e:{href:'#main'}},'/a'),['/a','/z']);
});
test('localized publication resolves owned absolute custom links without accepting unsupported owned hosts',()=>{
 const value=input();value.payload.composition.sections[0].data.body[1].href='https://www.safaricrafters.com/autre-page?view=1#main';assert.equal(evaluateValidationInput(value).contentChecksPass,true);
 for(const href of ['https://admin.safaricrafters.com/autre-page','https://www.safaricrafters.com:444/autre-page']){value.payload.composition.sections[0].data.body[1].href=href;assert.equal(evaluateValidationInput(value).contentChecksPass,false);}
});
