import test from 'node:test';import assert from 'node:assert/strict';
import {validateComposition} from '../lib/cms/composition.ts';import {createHomepagePartnersSection} from '../lib/cms/section-drafts.ts';
import source from '../content/preferred-partners.json' with {type:'json'};
const make=()=>{const section=createHomepagePartnersSection('partners','region-0','logo-0');section.data.regions=source.map((group,index)=>({id:`region-${index}`,label:group.region,items:group.partners.map((partner,i)=>({id:`partner-${index}-${i}`,name:partner.name,image:{assetId:`image-${index}-${i}`,alt:partner.name,decorative:false}}))}));return {schemaVersion:1,title:'Homepage',sections:[section]};};
test('partner groups represent all existing logos without flattening or truncating regions',()=>{
 const input=make(),result=validateComposition(input);assert.equal(result.valid,true);
 assert.deepEqual(result.page.sections[0].data.regions.map(group=>group.items.length),[17,38,23]);
 assert.deepEqual(result.page.sections[0].data.regions.map(group=>group.items.map(item=>item.name)),source.map(group=>group.partners.map(partner=>partner.name)));
});
test('partner composition rejects invalid defaults, duplicate identities and incomplete images',()=>{
 const badDefault=make();badDefault.sections[0].data.defaultRegionId='missing';assert.equal(validateComposition(badDefault).valid,false);
 const duplicate=make();duplicate.sections[0].data.regions[0].items[1].id=duplicate.sections[0].data.regions[0].items[0].id;assert.equal(validateComposition(duplicate).valid,false);
 const missing=make();missing.sections[0].data.regions[0].items[0].image.assetId='';assert.equal(validateComposition(missing).valid,false);
 const empty=make();empty.sections[0].data.regions[0].items=[];assert.equal(validateComposition(empty).valid,false);
});
