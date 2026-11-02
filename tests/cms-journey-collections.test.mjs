import test from 'node:test';
import assert from 'node:assert/strict';
import {editJourneyCollection,readJourneyItems} from '../lib/cms/journey-collections.ts';
import {reviewJourneyImport} from '../lib/cms/import-review.ts';
const items=[{itemId:'first',position:1,question:'When?',answer:'November.',metadata:{source:'retained'}},{itemId:'second',position:2,question:'Where?',answer:'India.'}];
test('edits preserve stable IDs, unknown fields and the original payload',()=>{
 const original=structuredClone(items),updated=editJourneyCollection('faqs',items,{action:'edit',id:'first',field:'answer',value:'December.'});
 assert.deepEqual(items,original);assert.equal(updated[0].itemId,'first');assert.deepEqual(updated[0].metadata,items[0].metadata);assert.equal(updated[0].answer,'December.');
});
test('add, move and remove maintain deterministic contiguous positions without changing IDs',()=>{
 const added=editJourneyCollection('faqs',items,{action:'add',id:'third'});assert.equal(added[2].answer,'');
 const moved=editJourneyCollection('faqs',added,{action:'move',id:'third',direction:-1});assert.deepEqual(moved.map(i=>[i.itemId,i.position]),[['first',1],['third',2],['second',3]]);
 const removed=editJourneyCollection('faqs',moved,{action:'remove',id:'first'});assert.deepEqual(removed.map(i=>[i.itemId,i.position]),[['third',1],['second',2]]);
});
test('malformed existing collections and identity edits are never silently repaired or discarded',()=>{
 for(const bad of [null,{},[{}],[items[0],items[0]],[items[0],{...items[1],position:1}]])assert.throws(()=>readJourneyItems(bad));
 assert.throws(()=>editJourneyCollection('faqs',items,{action:'edit',id:'first',field:'itemId',value:'replaced'}));assert.throws(()=>editJourneyCollection('faqs',items,{action:'move',id:'first',direction:-1}));
});
test('an import after editor reordering still updates the same stable FAQ item',()=>{
 const reordered=editJourneyCollection('faqs',items,{action:'move',id:'second',direction:-1});
 const record={id:'journey',revision:'revision',slug:'forest',path:'/journeys/forest',locale:'en',title:'Forest',payload:{title:'Forest',faqs:reordered}};
 const result=reviewJourneyImport({templateVersion:'1.0',pageType:'journey',sheets:{Pages:[{recordId:'journey',operation:'update',expectedRevision:'revision'}],FAQs:[{recordId:'journey',itemId:'first',position:2,question:'When?',answer:'December.'}]}},[record]);
 assert.equal(result.valid,true);assert.equal(result.manifest[0].payload.faqs.length,2);assert.equal(result.manifest[0].payload.faqs[1].itemId,'first');assert.equal(result.manifest[0].payload.faqs[1].answer,'December.');
});

test('media replacement preserves page-specific copy and stable identity',()=>{
 const media=[{itemId:'hero',position:1,role:'hero',assetId:'old',alt:'Page description',caption:'Page caption',credit:'Photographer',crop:{x:0.2}}];
 const replaced=editJourneyCollection('media',media,{action:'edit',id:'hero',field:'assetId',value:'new'});
 assert.deepEqual(replaced,[{...media[0],assetId:'new'}]);assert.equal(media[0].assetId,'old');
 const added=editJourneyCollection('media',replaced,{action:'add',id:'gallery'});
 assert.equal(added[1].alt,'');assert.equal(added[1].assetId,'');assert.equal(added[1].position,2);
});
