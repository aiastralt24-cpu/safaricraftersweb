import test from 'node:test';
import assert from 'node:assert/strict';
import {conceptNavigationFindings} from '../lib/cms/concept-navigation-validation.ts';
import {newConceptNavigation} from '../lib/cms/concept-navigation.ts';
const menu=()=>({...newConceptNavigation(),contextLabel:'Concept',cta:{label:'Plan',href:'/plan',newWindow:false},primary:[{id:'journeys',label:'Journeys',href:'/journeys',newWindow:false,image:{assetId:'photo',alt:'Landscape',decorative:false}}],secondary:[{id:'contact',label:'Contact',href:'/contact',newWindow:false}]});
test('Concept menu verifies all destination groups and rejects missing/unsafe data',()=>{
 assert.deepEqual(conceptNavigationFindings(menu()),[]);
 for(const group of ['cta','primary','secondary']){const value=menu(),link=group==='cta'?value.cta:value[group][0];link.href='/missing';assert.equal(conceptNavigationFindings(value)[0].code,'concept_menu_link_unverified');link.href='javascript:alert(1)';assert.ok(conceptNavigationFindings(value).some(f=>f.code==='concept_menu_field'));}
 assert.ok(conceptNavigationFindings(null).length);
});
test('dynamic evidence is exact and does not authorize unknown anchors or encoded paths',()=>{
 const value=menu();value.primary[0].href='/journeys/new';assert.ok(conceptNavigationFindings(value).length);assert.deepEqual(conceptNavigationFindings(value,['/journeys/new']),[]);
 for(const href of ['/journeys/new#unknown','/journeys/new?x=1','/journeys/%2e%2e/private']){value.primary[0].href=href;assert.ok(conceptNavigationFindings(value,[href]).length);}
 value.primary[0].href='https://safaricrafters.com/private';assert.ok(conceptNavigationFindings(value).length);
 value.primary[0].href='https://example.org/resource';assert.deepEqual(conceptNavigationFindings(value),[]); // Syntax, not external reachability.
});

test('stored Concept checks include menu links and require unique available image evidence',async()=>{
 const {validateStoredContent}=await import('../lib/cms/content-validation.ts');
 const navigation=menu();navigation.secondary[0].href='/unavailable';
 const record={type:'page',path:'/concept',locale:'en',payload:{navigation,composition:{schemaVersion:1,title:'Concept',sections:[]}}};
 for(const evidence of [undefined,[],[{assetId:'photo',available:false}],[{assetId:'photo',available:true},{assetId:'photo',available:true}]]){
  const result=validateStoredContent(record,evidence);
  assert.ok(result.findings.some(f=>f.field==='navigation.primary.0.image.assetId'&&f.code==='asset_verification_required'));
  assert.ok(result.findings.some(f=>f.field==='navigation.secondary.0.href'&&f.code==='concept_menu_link_unverified'));
  assert.equal(result.contentChecksPass,false);
 }
 const result=validateStoredContent(record,[{assetId:'photo',available:true}]);
 assert.ok(!result.findings.some(f=>f.code==='asset_verification_required'));
 assert.equal(result.contentChecksPass,false);
});
