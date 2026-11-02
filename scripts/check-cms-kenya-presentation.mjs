/** Public presentation controls against the local fixture only. */
import {chromium,expect} from '@playwright/test';import assert from 'node:assert/strict';import fs from 'node:fs/promises';
const origin=process.env.CMS_KENYA_TEST_ORIGIN??'http://localhost:3002',state=process.env.CMS_KENYA_FIXTURE_STATE;
if(!['localhost','127.0.0.1'].includes(new URL(origin).hostname)||!state?.startsWith('/private/tmp/'))throw Error('Local fixture required.');
const mode=mode=>fs.writeFile(state,JSON.stringify({mode})),browser=await chromium.launch(),context=await browser.newContext({reducedMotion:'reduce'}),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
const colors={paper:'rgb(244, 240, 231)',white:'rgb(255, 255, 255)',forest:'rgb(25, 39, 31)',ink:'rgb(21, 27, 23)'};
try{
 for(const width of [1280,390])for(const [background,color]of Object.entries(colors))for(const mediaAlign of ['start','end'])for(const mobileOrder of ['textFirst','mediaFirst']){
  await mode(`presentation:${background}:${mediaAlign}:${mobileOrder}`);await page.setViewportSize({width,height:900});assert.equal((await page.goto(origin+'/destinations/kenya')).status(),200);const root=page.locator('.cms-kenya-page');await root.waitFor();
  const sections=root.locator('[data-kenya-background]');assert.equal(await sections.count(),9);for(const section of await sections.all())await expect(section).toHaveCSS('background-color',color);
  const contrast=await sections.evaluateAll(sections=>{const l=color=>{const rgb=color.match(/[\d.]+/g).slice(0,3).map(Number).map(v=>v/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);return rgb[0]*.2126+rgb[1]*.7152+rgb[2]*.0722;};return sections.flatMap(s=>Array.from(s.querySelectorAll('h2,h3,p,small,figcaption')).filter(el=>!el.closest('.itinerary-copy')).map(el=>{const a=l(getComputedStyle(el).color),b=l(getComputedStyle(s).backgroundColor);return {text:el.textContent.slice(0,45),ratio:(Math.max(a,b)+.05)/(Math.min(a,b)+.05)};}));});assert.ok(contrast.every(c=>c.ratio>=4.5),JSON.stringify(contrast.filter(c=>c.ratio<4.5)));
  for(const pair of [{rows:'.kenya-place-body',image:'.kenya-place-image',copy:'.kenya-place-copy'},{rows:'.kenya-luxury-grid',image:'figure',copy:'.kenya-prose'}])for(const row of await root.locator(pair.rows).all()){
   const image=await row.locator(pair.image).boundingBox(),copy=await row.locator(pair.copy).boundingBox();assert.ok(image&&copy);if(width>760)assert.equal(image.x<copy.x,mediaAlign==='start');else assert.equal(image.y<copy.y,mobileOrder==='mediaFirst');
  }
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  if(mediaAlign==='end'&&mobileOrder==='textFirst'){for(const image of await root.locator('img').all()){await image.scrollIntoViewIfNeeded();await expect.poll(()=>image.evaluate(el=>el.complete&&el.naturalWidth>0)).toBe(true);}await page.screenshot({path:`/private/tmp/cms-kenya-presentation-${width}-${background}.png`,fullPage:true});}
 }
 await mode('ready');await page.goto(origin+'/destinations/kenya');assert.equal(await page.locator('[data-kenya-background],[data-kenya-media],[data-kenya-mobile]').count(),0,'Original layout has no overrides');assert.deepEqual(errors,[]);
 console.log('PASS: four palettes, desktop image sides and mobile image/text ordering across both viewport sizes; text contrast, original layout and no overflow.');
}finally{await mode('ready');await browser.close();}
