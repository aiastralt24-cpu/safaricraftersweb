import test from 'node:test';
import assert from 'node:assert/strict';
import { distinctTourFaqs, photoTourFaqs, uniqueTourCopy } from '../lib/tour-content.ts';

test('authored FAQs replace overlapping defaults and equipment appears only in its own panel', () => {
  const authored = [
    {question:'Can beginners and non-photographers join?',answer:'Beginners are welcome; discuss suitability for children.'},
    {question:'Are safari zones and wildlife sightings guaranteed?',answer:'No. Permits and weather affect the programme.'}
  ];
  assert.deepEqual(photoTourFaqs({faqs:authored,equipment:'Bring your camera kit.',intro:'A wildlife tour.',highlights:[]}),authored);
});

test('remove exact repetition while retaining extra operational details', () => {
  const faqs = [
    {question:'Where do we stay?',answer:'Three nights at the forest lodge.'},
    {question:'Where do we stay!',answer:'Three nights at the forest lodge.'},
    {question:'Can we stay longer?',answer:'Three nights at the forest lodge. Extra nights depend on availability.'}
  ];
  assert.deepEqual(distinctTourFaqs(faqs,['Three nights at the forest lodge.']),[faqs[2]]);
  assert.deepEqual(uniqueTourCopy(['Opening.','More detail.','More detail!'],['Opening.']),['More detail.']);
});

test('sparse tours retain useful preparation FAQs without duplicating departures', () => {
  const result=photoTourFaqs({intro:'Preview.',highlights:[]});
  assert.equal(result.length,3);
  assert.ok(result.some(item=>item.question.includes('equipment')));
  assert.ok(result.some(item=>item.question.includes('guaranteed')));
  assert.ok(!result.some(item=>item.question.includes('depart')));
});
