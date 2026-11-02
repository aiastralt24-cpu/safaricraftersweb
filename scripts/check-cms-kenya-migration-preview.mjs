/** Source-backed browser preview with synthetic provider/auth/media responses; no writes. */
import {readFile} from 'node:fs/promises';import {chromium,expect} from '@playwright/test';import assert from 'node:assert/strict';
import inventory from '../docs/cms/kenya-source-inventory.json' with {type:'json'};
import {planKenyaMigration,kenyaMigrationDependencies} from '../lib/cms/kenya-migration.ts';
import sharp from 'sharp';

const target=new URL(process.env.CMS_RECOVERY_TEST_URL??'http://localhost:3002/cms');if(!['localhost','127.0.0.1'].includes(target.hostname))throw Error('Local fixture only.');
const [site,actor,id,revision]=Array.from({length:4},(_,i)=>`00000000-0000-4000-8000-${String(i+1).padStart(12,'0')}`),user={id:actor,aud:'authenticated',role:'authenticated'};
const browser=await chromium.launch();
try{for(const width of [1280,390]){
 const context=await browser.newContext({viewport:{width,height:900}}),page=await context.newPage(),errors=[];const canEdit=true;
 const bindings=inventory.media.map((m,i)=>({sourcePath:m.sourcePath,sourceSha256:m.sha256,assetId:`source-${i}`})),proposal=planKenyaMigration(kenyaMigrationDependencies,bindings),sections=proposal.previewPayload.composition.sections;
 const images=new Map(await Promise.all(bindings.map(async b=>[b.assetId,await sharp(await readFile(new URL('../public'+b.sourcePath,import.meta.url))).resize({width:1280,withoutEnlargement:true}).webp().toBuffer()])));
 let record={id,type:'page',path:'/destinations/kenya',title:'Kenya fixture',locale:'en',currentRevision:revision,payload:{composition:{schemaVersion:1,title:'Kenya',sections}},reviewStatus:'draft',publishedRevision:null,permissions:{edit:true,submit:true,approve:true,publish:true},history:[]};
 page.on('pageerror',e=>errors.push(String(e)));page.on('dialog',d=>d.accept());await context.addInitScript(user=>localStorage.setItem('safari-cms-auth',JSON.stringify({access_token:'a.b.c',refresh_token:'fixture',expires_at:Math.floor(Date.now()/1000)+3600,token_type:'bearer',user})),user);
 await context.route('**/auth/v1/**',r=>r.fulfill({json:user}));await context.route('**/api/cms/**',r=>{const req=r.request(),url=new URL(req.url());
  if(url.pathname==='/api/cms/mfa-policy')return r.fulfill({json:{policy:{websiteId:site,required:false,version:0,verified:false,canManage:false}}});
  if(url.pathname==='/api/cms/media/preview'){const bytes=images.get(url.searchParams.get('asset'));assert.ok(bytes);return r.fulfill({contentType:'image/webp',body:bytes});}
  if(url.pathname==='/api/cms/content'){
   assert.equal(req.method(),'GET','Source preview must not save or publish');
   return r.fulfill({json:url.searchParams.has('record')?{record:{...record,permissions:{...record.permissions,edit:canEdit}}}:url.searchParams.has('site')?{records:url.searchParams.get('type')==='page'?[record]:[]}:{sites:[{id:site,name:'Fixture'}]}});
  }
  return r.fulfill({json:{result:[],records:[],assets:[]}});
 });
 const open=async()=>{await page.goto(target.href);await page.getByRole('navigation',{name:'CMS'}).getByRole('button',{name:'Pages',exact:true}).click();await page.getByRole('button',{name:/^Kenya fixture/}).first().click();};await open();

 await page.getByRole('button',{name:'Preview draft layout',exact:true}).click();await page.getByLabel(/^Preview size/).selectOption(width===1280?'desktop':'mobile');
 const preview=page.frameLocator('iframe[title="Responsive draft preview"]');await expect(preview.locator('[data-cms-section]')).toHaveCount(10);
 for(const [i,source]of inventory.views[0].content.entries()){
  const section=preview.locator(`[data-cms-section="kenya-section-${i+1}"]`);
  if(source.images.length)await expect(section.locator('img').first()).toBeVisible();
  assert.deepEqual(await section.locator('h1,h2,h3,h4').evaluateAll(nodes=>nodes.map(n=>({level:n.tagName.toLowerCase(),text:n.textContent}))),source.headings.map(h=>({level:h.level,text:h.lines.flatMap(l=>l.runs).map(r=>r.text).join('')})));
  assert.deepEqual(await section.locator('p').allTextContents(),source.paragraphs,`Section ${i+1} paragraphs`);
  assert.deepEqual(await section.locator('a').evaluateAll(nodes=>nodes.map(n=>({label:n.textContent,href:n.getAttribute('href'),ariaLabel:n.getAttribute('aria-label')}))),source.links,`Section ${i+1} links`);
  const pictures=i===4?section.locator('.gallery-grid img'):section.locator('img');await expect(pictures).toHaveCount(source.images.length);assert.deepEqual(await pictures.evaluateAll(nodes=>nodes.map(n=>n.alt)),source.images.map(m=>m.alt));
 }
 assert.equal(await preview.locator('html').evaluate(el=>el.scrollWidth<=el.clientWidth+1),true);
 for(const n of [1,4,5,6,7,8]){await preview.locator(`[data-cms-section="kenya-section-${n}"]`).scrollIntoViewIfNeeded();await page.locator('.cms-preview-viewport-scroll').evaluate(el=>el.scrollLeft=0);await page.screenshot({path:`/private/tmp/cms-kenya-source-preview-${width}-${n}.png`});}
 assert.deepEqual(errors,[]);await context.close();console.log(`Kenya source proposal ${width}: all ten sections match captured headings, paragraphs, links, image alternatives; no overflow or writes.`);
}}finally{await browser.close();}
