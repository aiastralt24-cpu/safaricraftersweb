import test from 'node:test';
import assert from 'node:assert/strict';
import { distinctListingImages, listingHeroImage, distinctLocationLabel } from '../lib/listing-content.ts';
const image = src => ({src,alt:src,credit:'Archive'});

test('replacement images do not take another card’s primary image', () => {
  const shared=image('/shared'), other=image('/other'), alternate=image('/alternate');
  const items=[{image:shared},{image:shared,gallery:[other,alternate]},{image:other}];
  assert.deepEqual(distinctListingImages(items).map(item=>item.image.src),['/shared','/alternate','/other']);
  assert.equal(items[1].image,shared);
});

test('reserved hero images are avoided using only the item’s gallery', () => {
  const hero=image('/hero'), alternate=image('/alternate');
  assert.equal(distinctListingImages([{image:hero,gallery:[alternate]}],['/hero'])[0].image,alternate);
  assert.equal(listingHeroImage(hero,[alternate],[hero]),alternate);
});

test('missing alternatives preserve a valid image instead of hiding the item', () => {
  const shared=image('/shared');
  assert.equal(distinctListingImages([{image:shared},{image:shared}]).length,2);
  assert.equal(listingHeroImage(shared,[],[shared]),shared);
});

test('location labels do not repeat the same country', () => {
  assert.equal(distinctLocationLabel('Brazil, Brazil'), 'Brazil');
  assert.equal(distinctLocationLabel('Delhi, Rajasthan'), 'Delhi, Rajasthan');
});
