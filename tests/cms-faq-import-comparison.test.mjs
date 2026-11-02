import test from 'node:test';
import assert from 'node:assert/strict';
import {newFaq} from '../lib/cms/faqs.ts';
import {compareFaqImport} from '../lib/cms/faq-import-comparison.ts';
test('FAQ import comparisons expose clearing and preserve unchanged fields',()=>{
 const before={...newFaq(),question:'Original?',topic:'Keep this',answer:[{kind:'paragraph',text:'Original answer'}],keywords:['Planning'],internalNotes:'Private note'};
 const after={...before,question:'Replacement?',answer:[],internalNotes:''};
 const rows=compareFaqImport(before,after);
 assert.deepEqual(rows.map(row=>row.field),['question','answer','internalNotes']);
 assert.deepEqual(rows.find(row=>row.field==='answer').after,[]);
 assert.equal(rows.find(row=>row.field==='internalNotes').before,'Private note');
 assert.deepEqual(compareFaqImport(before,structuredClone(before)),[]);
 assert.ok(compareFaqImport(null,after).some(row=>row.field==='topic'&&row.after==='Keep this'));
});
