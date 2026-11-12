import test from 'node:test';
import assert from 'node:assert/strict';
import {copyAlreadyCovered, distinctDestinationFaqs, uniqueDestinationParagraphs} from '../lib/destination-content.ts';
const destination={intro:'A landscape of open grassland and river forest.',habitat:'Open grassland and river forest',safariRhythm:'Morning boat outings along the river.',wildlife:'Otters and waterbirds',bestMonths:'July to October',idealStay:'Four nights'};
test('repeated facts are omitted but useful qualification is retained',()=>{
 const faqs=[{question:'When?',answer:'July to October'},{question:'What is a day like?',answer:'Morning boat outings along the river.'},{question:'How do boats operate?',answer:'Morning boat outings along the river. Trips may be cancelled when water levels are unsafe.'}];
 assert.deepEqual(distinctDestinationFaqs(destination,faqs),[faqs[2]]);
});
test('duplicate question or answer appears once without fuzzy topic matching',()=>{
 const faqs=[{question:'Are boats private?',answer:'Private boats are available on request.'},{question:'Are boats private!',answer:'Private boats can be requested.'},{question:'Can I have a private boat?',answer:'Private boats are available on request.'},{question:'Are boats accessible?',answer:'Access depends on the landing and boat.'}];
 assert.deepEqual(distinctDestinationFaqs(destination,faqs),[faqs[0],faqs[3]]);
});
test('copy comparison only suppresses text already present, not related topics',()=>{
 assert.ok(copyAlreadyCovered(destination.habitat,[destination.intro]));
 assert.equal(copyAlreadyCovered('River forest access requires a boat.',[destination.intro]),false);
 assert.equal(uniqueDestinationParagraphs('An opening.\n\nUnique advice.\n\nUnique advice.',['An opening.']),'Unique advice.');
});
