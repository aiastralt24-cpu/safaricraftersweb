/** Local public-route motion acceptance. No hosted writes or form submission. */
import {chromium,expect} from '@playwright/test';import assert from 'node:assert/strict';import fs from 'node:fs/promises';
const origin=process.env.CMS_KENYA_TEST_ORIGIN??'http://localhost:3002',state=process.env.CMS_KENYA_FIXTURE_STATE;
if(!['localhost','127.0.0.1'].includes(new URL(origin).hostname)||!state?.startsWith('/private/tmp/'))throw Error('Local fixture required.');
const mode=mode=>fs.writeFile(state,JSON.stringify({mode})),browser=await chromium.launch();
try{
 for(const width of [1280,390])for(const variant of ['fade','reveal']){
  await mode(`motion:${variant}`);const context=await browser.newContext({viewport:{width,height:900},reducedMotion:'no-preference'}),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(origin+'/destinations/kenya');const root=page.locator('.cms-kenya-page');await root.waitFor();
  await expect.poll(()=>root.evaluate(el=>el.getAnimations({subtree:true}).filter(a=>a.playState==='paused').length)).toBeGreaterThan(0);
  const frames=await root.evaluate(el=>el.getAnimations({subtree:true}).filter(a=>a.playState==='paused').map(a=>a.effect.getKeyframes()));assert.ok(frames.every(f=>f[0].opacity==='0'&&f[1].opacity==='1'));assert.ok(frames.every(f=>f[0].transform===(variant==='reveal'?'translateY(16px)':'none')));
  assert.equal(await root.locator('.cms-kenya-hero-image').evaluate(el=>el.getAnimations().length),0,'Hero crop must not be animated or overwritten');
  // Keyboard focus must make an offscreen entrance visible immediately.
  const link=root.locator('.kenya-related a').first();await link.focus();await expect(link).toBeFocused();await expect(root.locator('.kenya-related > .container')).toHaveCSS('opacity','1');
  await page.emulateMedia({reducedMotion:'reduce'});await expect.poll(()=>root.evaluate(el=>el.getAnimations({subtree:true}).length)).toBe(0);
  await page.reload();await root.waitFor();assert.equal(await root.evaluate(el=>el.getAnimations({subtree:true}).length),0);assert.equal(await root.locator('[data-cms-section]').count(),10);
  assert.deepEqual(errors,[]);await context.close();
 }
 await mode('motion:reveal');
 for(const fallback of ['no-javascript','no-observer']){
  const context=await browser.newContext({javaScriptEnabled:fallback!=='no-javascript'});if(fallback==='no-observer')await context.addInitScript(()=>{delete window.IntersectionObserver;});
  const page=await context.newPage();assert.equal((await page.goto(origin+'/destinations/kenya')).status(),200);const root=page.locator('.cms-kenya-page');await root.waitFor();assert.equal(await root.locator('[data-cms-section]').count(),10);
  assert.ok(await root.evaluate(el=>Array.from(el.querySelectorAll('[data-cms-section] > *')).every(child=>getComputedStyle(child).opacity==='1')),'Fallback content stays visible');await context.close();
 }
 console.log('PASS: Kenya fade/reveal at desktop/mobile, paused entrances, focus reveal, live reduced-motion cancellation and no-JS/no-observer visible content.');
}finally{await mode('ready');await browser.close();}
