import test from 'node:test';import assert from 'node:assert/strict';
import {validateComposition} from '../lib/cms/composition.ts';import {createHomepageCorporateSection} from '../lib/cms/section-drafts.ts';
const make=()=>{const section=createHomepageCorporateSection('corporate','intro','format');section.data.mainImage={assetId:'main',alt:'Forest drive',caption:'India · Shared discoveries',decorative:false};section.data.insetImage={assetId:'inset',alt:'Arctic fjord',caption:'International · Beyond borders',decorative:false};return {schemaVersion:1,title:'Homepage',sections:[section]};};
test('corporate section retains two separate images/captions and ordered introductory paragraphs and links',()=>{
 const value=make();value.sections[0].data.paragraphs.push({id:'intro-two',text:'Bring people together.'});value.sections[0].data.formats.push({id:'retreat',label:'Company retreats & partner meets',title:'Make room for new ideas',href:'/mice'});const result=validateComposition(value);assert.equal(result.valid,true);assert.deepEqual(result.page.sections[0].data,value.sections[0].data);
});
test('corporate drafts cannot save missing images, duplicate collection identities, empty copy or unsafe format links',()=>{
 for(const change of [d=>d.mainImage.assetId='',d=>d.insetImage.alt='',d=>d.paragraphs.push({...d.paragraphs[0]}),d=>d.formats.push({...d.formats[0]}),d=>d.paragraphs[0].text='',d=>d.formats[0].href='javascript:alert(1)']){const value=make();change(value.sections[0].data);assert.equal(validateComposition(value).valid,false);}
});
test('corporate crops retain independent responsive positions and reject invalid or unrelated fields',()=>{
 const value=make(),data=value.sections[0].data;
 Object.assign(data,{mainFocalPoint:{x:50,y:60},mainMobileFocalPoint:{x:40,y:70},insetFocalPoint:{x:42,y:50},insetMobileFocalPoint:{x:35,y:55}});
 const result=validateComposition(value);assert.equal(result.valid,true);assert.deepEqual(result.page.sections[0].data,data);
 for(const invalid of [{x:-1,y:50},{x:50,y:101},{x:NaN,y:50},{x:50,y:50,shape:'wide'},{x:'50',y:50}]){
  const bad=structuredClone(value);bad.sections[0].data.mainMobileFocalPoint=invalid;assert.equal(validateComposition(bad).valid,false);
 }
});
