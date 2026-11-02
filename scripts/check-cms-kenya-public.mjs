import sourceInventory from '../docs/cms/kenya-source-inventory.json' with {type:'json'};
/** Real Next route and image endpoint with local provider fixtures; no publication writes. */
import {chromium,expect} from '@playwright/test';import assert from 'node:assert/strict';import fs from 'node:fs/promises';
const origin=process.env.CMS_KENYA_TEST_ORIGIN??'http://localhost:3002',state=process.env.CMS_KENYA_FIXTURE_STATE;
if(!['localhost','127.0.0.1'].includes(new URL(origin).hostname)||!state?.startsWith('/private/tmp/'))throw Error('Use a local fixture server and temporary state file.');
const mode=async mode=>fs.writeFile(state,JSON.stringify({mode}));await mode('ready');
const browser=await chromium.launch(),context=await browser.newContext(),page=await context.newPage(),errors=[],writes=[];page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(r.method()==='POST')writes.push(r.url());});
try{
 for(const width of [1280,390]){
  await page.setViewportSize({width,height:900});const response=await page.goto(origin+'/destinations/kenya');assert.equal(response.status(),200);
  const root=page.locator('.cms-kenya-page');await root.waitFor();assert.equal(await root.locator('[data-cms-section]').count(),10);assert.equal(await root.locator('h1').count(),1);
  const sourceHero=sourceInventory.views.find(view=>view.width===width).heroPresentation;for(const [property,value] of Object.entries(sourceHero))await expect(root.locator('.cms-kenya-hero-image img')).toHaveCSS(property==='objectPosition'?'object-position':property,value);
  for(const image of await root.locator('img').all()){await image.scrollIntoViewIfNeeded();await expect.poll(()=>image.evaluate(i=>i.complete&&i.naturalWidth>0)).toBe(true);}await expect.poll(()=>root.locator('img').evaluateAll(images=>images.every(i=>i.complete&&i.naturalWidth>0))).toBe(true);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  assert.equal(await page.locator('link[rel="canonical"]').getAttribute('href'),'https://safaricrafters.com/destinations/kenya');
  assert.equal(await root.locator('.kenya-plan a').getAttribute('href'),'/plan?destination=kenya');
  await root.locator('summary').first().click();assert.equal(await root.locator('details').first().getAttribute('open'),'');
  const trigger=root.locator('.gallery-trigger').first();await trigger.click();await page.locator('.media-lightbox').waitFor();await page.keyboard.press('ArrowRight');await page.keyboard.press('Escape');await expect(trigger).toBeFocused();
  await page.screenshot({path:`/private/tmp/cms-kenya-public-${width}.png`,fullPage:true});
 }
 for(const viewport of [1280,390])for(const width of ['reading','full'])for(const spacing of ['compact','generous']){
  await mode(`layout:${width}:${spacing}:center`);await page.setViewportSize({width:viewport,height:900});assert.equal((await page.goto(origin+'/destinations/kenya')).status(),200);
  for(const section of await page.locator('.cms-kenya-page [data-cms-section]').all()){
   await expect(section).toHaveCSS('text-align','center');for(const heading of await section.locator('h1,h2,h3,h4').all())await expect(heading).toHaveCSS('text-align','center');await expect(section).toHaveCSS('padding-top',spacing==='compact'?'32px':viewport===390?'56px':'96px');
   const content=section.locator(':scope.container, :scope > .container');const actual=await content.first().evaluate(el=>el.getBoundingClientRect().width);assert.ok(actual<=viewport&&actual>0);if(width==='reading')assert.ok(actual<=780.5,'Reading width is capped');else assert.ok(actual>=viewport-33,'Full width retains a 16px gutter');
  }
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await page.screenshot({path:`/private/tmp/cms-kenya-layout-${viewport}-${width}-${spacing}.png`,fullPage:true});
 }
 await mode('ready');await page.goto(origin+'/destinations/kenya');
 const image=await page.locator('.cms-kenya-page img').first().getAttribute('src');assert.equal((await context.request.get(origin+image)).status(),200);
 const sitemap=async()=>await (await context.request.get(origin+'/sitemap.xml')).text();assert.equal((await sitemap()).split('<loc>https://safaricrafters.com/destinations/kenya</loc>').length-1,1);
 await mode('noindex');await page.goto(origin+'/destinations/kenya');assert.match(await page.locator('meta[name="robots"]').getAttribute('content'),/noindex/);assert.doesNotMatch(await sitemap(),/<loc>https:\/\/safaricrafters.com\/destinations\/kenya<\/loc>/);
 for(const value of ['rights-revoked','withdrawn']){await mode(value);const response=await page.goto(origin+'/destinations/kenya');assert.equal(response.status(),404);assert.equal(await page.locator('.cms-kenya-page').count(),0);assert.equal((await context.request.get(origin+image)).status(),404);assert.doesNotMatch(await sitemap(),/<loc>https:\/\/safaricrafters.com\/destinations\/kenya<\/loc>/);}
 assert.deepEqual(errors,[]);assert.deepEqual(writes,[]);console.log('PASS: Kenya desktop/mobile rendering, images, FAQ/gallery keyboard, metadata/sitemap, width/spacing/alignment across all sections and withdrawal (local provider fixture).');
}finally{await mode('ready');await browser.close();}
