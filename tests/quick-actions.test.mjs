import test from 'node:test';
import assert from 'node:assert/strict';
import {quickActionLinks, showQuickActions} from '../lib/quick-actions.ts';

test('WhatsApp uses the approved number and safely encodes page context', () => {
  const links=quickActionLinks('/destinations/kamchatka','Kamchatka & the wild');
  const url=new URL(links.whatsapp);
  assert.equal(url.origin+url.pathname,'https://wa.me/919274479186');
  assert.match(url.searchParams.get('text'),/Kamchatka & the wild/);
  assert.equal(links.enquiry,'/plan?destination=kamchatka');
});
test('journeys preserve planner context and tours use their own enquiry form', () => {
  assert.equal(quickActionLinks('/journeys/royal-rajasthan-safari').enquiry,'/plan?journey=royal-rajasthan-safari');
  assert.equal(quickActionLinks('/photo-expeditions/the-pantanal-wetlands').enquiry,'#expedition-enquiry');
  assert.equal(quickActionLinks('/journal').enquiry,'/plan');
});
test('visitor controls stay out of admin and enquiry flows', () => {
  for(const path of ['/admin','/admin/enquiries','/cms','/studio/editor','/preview/page','/plan','/enquire/form']) assert.equal(showQuickActions(path),false);
  for(const path of ['/','/destinations','/destinations/kamchatka','/journeys']) assert.equal(showQuickActions(path),true);
});
