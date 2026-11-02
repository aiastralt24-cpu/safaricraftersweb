/** Real Next route/endpoints; local fixture provider only. Does not submit enquiries. */
import {chromium,expect} from '@playwright/test';import assert from 'node:assert/strict';import fs from 'node:fs/promises';
const origin=process.env.CMS_MICE_TEST_ORIGIN??'http://localhost:3002',state=process.env.CMS_MICE_FIXTURE_STATE;
if(!['localhost','127.0.0.1'].includes(new URL(origin).hostname)||!state?.startsWith('/private/tmp/'))throw Error('Use a local fixture server and temporary state file.');
const mode=async mode=>fs.writeFile(state,JSON.stringify({mode}));await mode('ready');
const browser=await chromium.launch(),context=await browser.newContext(),page=await context.newPage(),errors=[],writes=[];page.on('pageerror',e=>errors.push(e.message));
try{
 await context.route('https://challenges.cloudflare.com/**',r=>r.fulfill({contentType:'text/javascript',body:'window.turnstile={render:()=>"fixture",remove:()=>{}};'}));
 page.on('request',r=>{if(r.method()==='POST')writes.push(r.url());});
 for(const width of [1280,390]){
  await page.setViewportSize({width,height:900});const response=await page.goto(origin+'/mice');assert.equal(response.status(),200);
  const root=page.locator('.cms-mice-page');await root.waitFor();assert.equal(await root.locator('[data-cms-section]').count(),6);assert.equal(await root.locator('h1').count(),1);
  await page.getByRole('button',{name:'Plan Our Corporate Journey',exact:true}).waitFor();assert.equal(await root.locator('input[type="email"]').count(),1);
  const email=root.locator('input[type="email"]');await email.focus();
  assert.equal(await email.evaluate(el=>{const box=el.getBoundingClientRect(),label=el.parentElement.querySelector('label').getBoundingClientRect();return box.height>=48&&box.width>=250&&box.top>=label.bottom&&getComputedStyle(el).outlineStyle!=='none';}),true,'Readable full-width field with separate label and visible keyboard focus');
  await expect.poll(()=>root.locator('img').evaluateAll(images=>images.every(i=>i.complete&&i.naturalWidth>0))).toBe(true);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  assert.equal(await page.locator('link[rel="canonical"]').getAttribute('href'),'https://safaricrafters.com/mice');
  await page.screenshot({path:`/private/tmp/cms-mice-public-${width}.png`,fullPage:true});
 }
 const image=await page.locator('.cms-mice-page img').first().getAttribute('src');assert.equal((await context.request.get(origin+image)).status(),200);
 for(const value of ['form-withdrawn','rights-revoked','withdrawn']){await mode(value);const response=await page.goto(origin+'/mice');assert.equal(response.status(),404);assert.equal(await page.locator('.cms-mice-page').count(),0);assert.equal((await context.request.get(origin+image)).status(),404);}
 await mode('ready');await page.goto(origin+'/mice');await page.locator('.cms-mice-page').waitFor();
 await context.route('**/api/cms/forms/*',async r=>{const response=await r.fetch(),body=await response.json();body.form.revisionId='90000000-0000-4000-8000-000000000001';await r.fulfill({response,json:body});});
 await page.reload();await page.getByText('This enquiry form is currently unavailable.',{exact:true}).waitFor();assert.equal(await page.getByRole('button',{name:'Plan Our Corporate Journey',exact:true}).count(),0);
 assert.deepEqual(errors,[]);assert.deepEqual(writes,[]);console.log('PASS: enabled MICE route at desktop/mobile, real image/form endpoints, metadata, withdrawal/rights failure and pinned form revision (mocked provider; no submission).');
}finally{await mode('ready');await browser.close();}
