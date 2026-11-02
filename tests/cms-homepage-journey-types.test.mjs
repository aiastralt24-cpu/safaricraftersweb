import test from 'node:test';import assert from 'node:assert/strict';
import {validateComposition,editCompositionDraft} from '../lib/cms/composition.ts';
import {createHomepageJourneyTypesSection} from '../lib/cms/section-drafts.ts';
import {editorialCopySchema} from '../lib/cms/editorial-copy.ts';
const make=()=>({schemaVersion:1,title:'Homepage',sections:[createHomepageJourneyTypesSection('ways','bespoke')]});
test('journey types preserve inline brand emphasis, heading lines and independent image metadata',()=>{
 const value=make(),item=value.sections[0].data.items[0];item.image={assetId:'leopard',alt:'A black leopard photographed on a guided safari',credit:'Safari Crafters archive',decorative:false};
 item.heading={lines:[{runs:[{text:'Bespoke',emphasis:false}]},{runs:[{text:'Safaris',emphasis:false}]}]};
 item.copy={runs:[{text:'All the goodness of our private journeys, with the added benefit of a professional ',strong:false},{text:'Safari Crafters',strong:true},{text:' guide for the ultimate informed experience.',strong:false}]};item.link.href='/guided-bespoke-safaris';
 const result=validateComposition(value);assert.equal(result.valid,true);assert.deepEqual(result.page.sections[0].data.items[0],item);
});
test('journey type drafts remain editable before media selection but cannot save incomplete or unsafe content',()=>{
 const value=make();assert.equal(validateComposition(value).valid,false);assert.equal(editCompositionDraft(value,{type:'move',id:'ways',to:0}).sections.length,1);
 value.sections[0].data.items[0].image={assetId:'image',alt:'Meaningful image',decorative:false};assert.equal(validateComposition(value).valid,true);
 const duplicate=structuredClone(value);duplicate.sections[0].data.items.push(structuredClone(duplicate.sections[0].data.items[0]));assert.equal(validateComposition(duplicate).valid,false);
 value.sections[0].data.items[0].link.href='javascript:alert(1)';assert.equal(validateComposition(value).valid,false);
});
test('paragraph emphasis has a total bound and never accepts arbitrary formatting attributes',()=>{
 for(const runs of [[],[{text:' ',strong:false}],[{text:'x'.repeat(1001),strong:false},{text:'y'.repeat(1000),strong:true}],[{text:'Copy',strong:true,html:'<script>'}],[{text:'a\u0000b',strong:false}]])assert.equal(editorialCopySchema.safeParse({runs}).success,false);
 const literal={runs:[{text:'<b>Literal copy & spaces</b>',strong:false}]};assert.deepEqual(editorialCopySchema.parse(literal),literal);
});
