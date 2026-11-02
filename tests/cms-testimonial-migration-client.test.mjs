import test from 'node:test';
import assert from 'node:assert/strict';
import {parseTestimonialSnapshot,verifyMigrationReceipt} from '../lib/cms/testimonial-migration-client.ts';
const source=[{name:'Synthetic guest',quote:'Forest trip'}],id='00000000-0000-4000-8000-000000000001',digest='a'.repeat(64);
test('snapshot reader accepts explicit collections and rejects invalid oversized or empty inputs',()=>{
 assert.deepEqual(parseTestimonialSnapshot(JSON.stringify(source)),source);assert.deepEqual(parseTestimonialSnapshot(JSON.stringify({testimonials:source})),source);
 for(const text of ['{}','[]','null','not json',JSON.stringify([null]),' '.repeat(1_000_001),JSON.stringify(Array(101).fill(source[0]))])assert.throws(()=>parseTestimonialSnapshot(text));
});
test('receipt verifies every reviewed identity before declaring the import successful',()=>{
 const item={recordId:id,revisionId:id,sourceKey:`testimonial_${digest}`};assert.deepEqual(verifyMigrationReceipt({result:[item]},[digest]),[item]);
 for(const result of [[],[item,item],[{...item,sourceKey:'other'}],[{...item,recordId:'bad'}]])assert.throws(()=>verifyMigrationReceipt({result},[digest]));
});

test('a receipt cannot map separate source records to the same created record',()=>{const first={recordId:id,revisionId:id,sourceKey:`testimonial_${digest}`};const second={...first,sourceKey:`testimonial_${'b'.repeat(64)}`};assert.throws(()=>verifyMigrationReceipt({result:[first,second]},[digest,'b'.repeat(64)]));});
