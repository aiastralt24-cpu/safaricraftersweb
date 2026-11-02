// Capture the existing local About page without saving or publishing CMS records.
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {chromium} from 'playwright';
const root=fileURLToPath(new URL('../../',import.meta.url));
const origin=process.env.CMS_LOCAL_PREVIEW_ORIGIN||'http://localhost:3001';
const url=new URL(origin);
if(!['localhost','127.0.0.1'].includes(url.hostname)||url.protocol!=='http:'||url.username||url.password||url.pathname!=='/'||url.search||url.hash)throw Error('Use a local HTTP origin only.');
const dependencies=['app/about/page.tsx','app/about/AboutMotion.tsx','app/simple.css','components/PageHero.tsx','components/PageHero.css'];
const sources=await Promise.all(dependencies.map(async sourcePath=>({sourcePath,sha256:createHash('sha256').update(await fs.readFile(path.join(root,sourcePath))).digest('hex')})));
const browser=await chromium.launch({headless:true});
try{
 const tab=await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
 const response=await tab.goto(`${origin}/about`);if(response?.status()!==200)throw Error('About page unavailable.');
 if(await tab.locator('.cms-about').count())throw Error('Legacy capture requires About CMS delivery disabled.');
 const content=await tab.locator('#main').evaluate(root=>{
  const clean=value=>value.replace(/\s+/g,' ').trim();
  const one=(scope,selector)=>{const all=scope.querySelectorAll(selector);if(all.length!==1)throw Error(`Expected exactly one ${selector}, found ${all.length}`);return all[0];};
  const text=node=>clean(node.textContent||'');
  const heading=node=>({level:Number(node.tagName.slice(1)),text:text(node),parts:Array.from(node.childNodes).map(child=>{
   if(child.nodeType===Node.TEXT_NODE)return {text:child.textContent||'',emphasis:false};
   if(child instanceof HTMLElement&&child.tagName==='EM')return {text:child.textContent||'',emphasis:true};
   throw Error(`Unsupported heading markup: ${child.nodeName}`);
  })});
  const image=node=>{const src=node.getAttribute('src');const original=src?.startsWith('/_next/image?')?new URL(src,location.origin).searchParams.get('url'):src;if(!original?.startsWith('/assets/'))throw Error('Expected a local About image.');return {sourcePath:original,alt:node.getAttribute('alt'),objectPosition:getComputedStyle(node).objectPosition};};
  const links=scope=>Array.from(scope.querySelectorAll('a')).map(node=>({label:text(node),href:node.getAttribute('href')}));
  const paragraphs=scope=>Array.from(scope.querySelectorAll('p:not(.eyebrow)')).map(text);
  const hero=one(root,'.page-hero'),story=one(root,'.simple-grid'),leadership=one(root,'.founder-leadership'),principles=one(root,'.about-principles');
  const profiles=Array.from(leadership.querySelectorAll('.founder-profiles>article')).map(profile=>({name:text(one(profile,'.eyebrow')),role:heading(one(profile,'h3')),image:image(one(profile,'img')),paragraphs:paragraphs(profile)}));
  const entries=Array.from(principles.querySelectorAll('.about-principles-list>article')).map(entry=>({number:text(one(entry,':scope>span')),eyebrow:text(one(entry,'.eyebrow')),heading:heading(one(entry,'h3')),paragraphs:paragraphs(entry),links:links(entry)}));
  return {hero:{eyebrow:text(one(hero,'.page-hero-meta')),heading:heading(one(hero,'h1')),copy:text(one(hero,'.page-hero-description')),image:image(one(hero,'img')),credit:text(one(hero,'.page-hero-credit'))},story:{eyebrow:text(one(story,'.eyebrow')),heading:heading(one(story,'h2')),paragraphs:paragraphs(story),links:links(story)},leadership:{eyebrow:text(one(leadership,'.founder-leadership-heading .eyebrow')),heading:heading(one(leadership,'h2')),intro:text(one(leadership,'.about-leadership-intro')),profiles},principles:{eyebrow:text(one(principles,'.about-principles-heading .eyebrow')),heading:heading(one(principles,'h2')),intro:text(one(principles,'.about-principles-heading p:not(.eyebrow)')),entries}};
 });
 await tab.evaluate(async()=>{await document.fonts.ready;await Promise.all(Array.from(document.querySelectorAll('#main img')).map(img=>img.decode()));});
 const desktopMedia=await tab.locator('#main img').evaluateAll(nodes=>nodes.map(node=>({alt:node.getAttribute('alt'),width:node.getBoundingClientRect().width,height:node.getBoundingClientRect().height,objectPosition:getComputedStyle(node).objectPosition,objectFit:getComputedStyle(node).objectFit})));
 await tab.setViewportSize({width:390,height:844});
 await tab.reload();
 await tab.evaluate(async()=>{await document.fonts.ready;await Promise.all(Array.from(document.querySelectorAll('#main img')).map(img=>img.decode()));});
 const mobileMedia=await tab.locator('#main img').evaluateAll(nodes=>nodes.map(node=>({alt:node.getAttribute('alt'),width:node.getBoundingClientRect().width,height:node.getBoundingClientRect().height,objectPosition:getComputedStyle(node).objectPosition,objectFit:getComputedStyle(node).objectFit})));
 const assets=[content.hero.image,...content.leadership.profiles.map(profile=>profile.image)];
 const media=await Promise.all(assets.map(async image=>({sourcePath:image.sourcePath,sha256:createHash('sha256').update(await fs.readFile(path.join(root,'public',image.sourcePath))).digest('hex')})));
 const inventory={schemaVersion:1,mode:'legacy-read-only',path:'/about',origin,sources,media,metadata:{title:await tab.title(),description:await tab.locator('meta[name="description"]').getAttribute('content')},content,presentation:{desktop:{viewport:1440,media:desktopMedia},mobile:{viewport:390,media:mobileMedia},motionSource:'app/about/AboutMotion.tsx',captureReducedMotion:true}};
 await fs.writeFile(path.join(root,'docs/cms/about-migration-inventory.json'),JSON.stringify(inventory,null,2)+'\n');
 console.log(JSON.stringify({path:inventory.path,profiles:content.leadership.profiles.length,principles:content.principles.entries.length,assets:media.length,sourceDependencies:sources.length}));
}finally{await browser.close();}
