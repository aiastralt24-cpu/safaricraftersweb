import {chromium,expect} from '@playwright/test';import assert from 'node:assert/strict';import fs from 'node:fs/promises';
const origin=process.env.CMS_NEWS_TEST_ORIGIN??'http://localhost:3002',state=process.env.CMS_NEWS_FIXTURE_STATE;
if(!['localhost','127.0.0.1'].includes(new URL(origin).hostname)||!state?.startsWith('/private/tmp/'))throw Error('Local fixture only.');
const mode=async value=>{await fs.writeFile(`${state}.next`,JSON.stringify({mode:value}));await fs.rename(`${state}.next`,state);};
await mode('ready');const browser=await chromium.launch(),page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
try{
 for(const width of [1280,390]){
  await page.setViewportSize({width,height:900});assert.equal((await page.goto(origin+'/news')).status(),200);await page.getByRole('link',{name:'News landscape Synthetic news'}).click();const article=page.locator('.cms-public-news');await expect(article).toBeVisible();await expect(article.getByRole('heading',{level:1})).toHaveText('Synthetic news');await expect(article).toContainText('Literal <script> public copy.');await expect(article).toContainText('Press release');await expect(article).toContainText('Nairobi');assert.equal(await article.locator('script').count(),0);
  for(const image of await article.locator('img').all())await expect.poll(()=>image.evaluate(i=>i.complete&&i.naturalWidth>0)).toBe(true);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href','https://safaricrafters.com/news/synthetic-news');await page.screenshot({path:`/private/tmp/cms-news-public-${width}.png`,fullPage:true});await article.getByRole('link',{name:'All news',exact:true}).click();await expect(page.locator('h1')).toHaveText('News and press releases');
 }
 await mode('related');await page.goto(origin+'/news/synthetic-news');await expect(page.getByRole('region',{name:'Related content'}).getByRole('link',{name:'Related project'})).toHaveAttribute('href','/projects/example');
 await mode('text-only');await page.goto(origin+'/news/synthetic-news');await expect(page.locator('.cms-public-news h1')).toHaveText('Synthetic news');assert.equal(await page.locator('.cms-public-news img').count(),0);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 await mode('noindex');await page.goto(origin+'/news/synthetic-news');assert.match(await page.locator('meta[name="robots"]').getAttribute('content'),/noindex/);
 for(const value of ['withdrawn','rights-revoked']){await mode(value);assert.equal((await page.goto(origin+'/news/synthetic-news')).status(),404);await page.goto(origin+'/news');await expect(page.getByText('No news has been published yet.')).toBeVisible();}
 const sitemap=async()=>await(await page.request.get(origin+'/sitemap.xml')).text();
 const search=async()=>{await page.goto(origin+'/search');return page.locator('a.search-result[href="/news/synthetic-news"]');};
 await mode('ready');assert.equal((await sitemap()).split('<loc>https://safaricrafters.com/news/synthetic-news</loc>').length-1,1);await expect(await search()).toHaveCount(1);await page.getByRole('button',{name:'News',exact:true}).click();await page.getByRole('searchbox').fill('complete news');await expect(page.locator('a.search-result[href="/news/synthetic-news"]')).toHaveCount(1);
 for(const value of ['noindex','canonical','global-noindex','withdrawn','rights-revoked']){await mode(value);assert.doesNotMatch(await sitemap(),/<loc>https:\/\/safaricrafters.com\/news(?:<|\/)/);await expect(await search()).toHaveCount(0);}
 await mode('sitemap-exclude');assert.doesNotMatch(await sitemap(),/<loc>https:\/\/safaricrafters.com\/news(?:<|\/)/);await expect(await search()).toHaveCount(1);
 await mode('search-exclude');await expect(await search()).toHaveCount(0);
 assert.deepEqual(errors,[]);console.log('PASS: News list/detail, desktop/mobile, safe rich text, images, text-only articles, metadata and withdrawal; synthetic provider only.');
}finally{await mode('ready');await browser.close();}
