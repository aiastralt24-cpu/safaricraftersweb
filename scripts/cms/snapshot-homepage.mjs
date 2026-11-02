// Read-only local legacy capture. Never calls the CMS write APIs or publishes.
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {chromium} from 'playwright';
import {readDefaultHomepageHeroLines,resolveCapturedHomepageHeroLines} from './static-homepage-hero.mjs';
const root=fileURLToPath(new URL('../../',import.meta.url));
const origin=process.env.CMS_LOCAL_PREVIEW_ORIGIN||'http://localhost:3001';
const originUrl=new URL(origin);
if(!['localhost','127.0.0.1'].includes(originUrl.hostname)||originUrl.protocol!=='http:'||originUrl.username||originUrl.password||originUrl.pathname!=='/'||originUrl.search||originUrl.hash)throw Error('Use a local HTTP origin only.');
const inventory=JSON.parse(await fs.readFile(process.env.CMS_CAPTURE_SOURCE_INVENTORY||path.join(root,'docs/cms/homepage-editability-inventory.json'),'utf8'));
async function verifySources(){
 for(const source of inventory.sourceProof){
  if(path.isAbsolute(source.path)||source.path.split(/[\\/]/).includes('..'))throw Error('Invalid source path.');
  const digest=createHash('sha256').update(await fs.readFile(path.join(root,source.path))).digest('hex');
  if(digest!==source.sha256)throw Error(`Reinspect changed source before capture: ${source.path}`);
 }
}
await verifySources();
const heroFrames=resolveCapturedHomepageHeroLines(readDefaultHomepageHeroLines(await fs.readFile(path.join(root,'app/concept/ConceptExperience.tsx'),'utf8')),JSON.parse(await fs.readFile(path.join(root,'content/site-content.json'),'utf8')).homepage);
const browser=await chromium.launch({headless:true});
const capturedAt=new Date().toISOString();
try{
 const tab=await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
 const errors=[];tab.on('pageerror',error=>errors.push(error.message));
 async function open(){const response=await tab.goto(`${origin}/`);if(response?.status()!==200)throw Error('Homepage unavailable.');await tab.locator('.concept-hero h1').waitFor();await tab.evaluate(()=>document.fonts.ready);}
 async function snapshot(selector){return tab.locator(selector).evaluate(scope=>{
  const clean=value=>(value||'').replace(/\s+/g,' ').trim();
  const accessibleText=node=>{if(!node)return '';const clone=node.cloneNode(true);clone.querySelectorAll?.('[aria-hidden="true"],[hidden]').forEach(child=>child.remove());return clean(clone.textContent);};
  const parts=node=>Array.from(node.childNodes).map(child=>child.nodeType===Node.TEXT_NODE?{text:child.textContent||''}:{tag:child.nodeName.toLowerCase(),children:parts(child)});
  const image=node=>{const src=node.getAttribute('src');return {sourcePath:src?.startsWith('/_next/image?')?new URL(src,location.origin).searchParams.get('url'):src,alt:node.getAttribute('alt'),objectPosition:getComputedStyle(node).objectPosition};};
  return {label:scope.getAttribute('data-nav-label'),className:scope.className,
   migration:{
    anchor:scope.id||null,
    smallLabels:Array.from(scope.querySelectorAll('small')).map(accessibleText),
    buttons:Array.from(scope.querySelectorAll('button')).map(node=>({label:node.getAttribute('aria-label')||accessibleText(node)})),
    journeys:Array.from(scope.querySelectorAll('.journey-bento-card')).map(node=>({href:node.getAttribute('href'),kicker:accessibleText(node.querySelector('.journey-bento-kicker')),action:accessibleText(node.querySelector('.journey-bento-action'))})),
    departureBoardLabel:scope.querySelector('.concept-expedition-board')?.getAttribute('aria-label')||null,
    departures:Array.from(scope.querySelectorAll('.concept-expedition-board-card')).map(node=>({href:node.getAttribute('href'),title:accessibleText(node.querySelector('h3')),metadata:accessibleText(node.querySelector('.concept-expedition-board-meta')),action:accessibleText(node.querySelector('strong'))})),
    benefitsLabel:scope.querySelector('.concept-private-aviation-points')?.getAttribute('aria-label')||null,
    benefits:Array.from(scope.querySelectorAll('.concept-private-aviation-points>span')).map(accessibleText),
   },
   headings:Array.from(scope.querySelectorAll('h1,h2,h3,h4')).filter(node=>!node.closest('[hidden]')).map(node=>({tag:node.tagName.toLowerCase(),text:clean(node.textContent),parts:parts(node)})),
   paragraphs:Array.from(scope.querySelectorAll('p')).filter(node=>!node.closest('[hidden]')).map(node=>({text:clean(node.textContent),parts:parts(node)})),
   links:Array.from(scope.querySelectorAll('a')).filter(node=>!node.closest('[hidden]')).map(node=>({label:clean(node.textContent),href:node.getAttribute('href')})),
   images:Array.from(scope.querySelectorAll('img')).filter(node=>!node.closest('[aria-hidden="true"],[hidden]')).map(image),
   figures:Array.from(scope.querySelectorAll('figcaption')).map(node=>clean(node.textContent)),
   statistics:Array.from(scope.querySelectorAll('dl>div')).map(node=>({term:accessibleText(node.querySelector('dt')),description:accessibleText(node.querySelector('dd'))})),
   quotes:Array.from(scope.querySelectorAll('blockquote')).map(node=>clean(node.textContent)),
   dates:Array.from(scope.querySelectorAll('time')).map(node=>({text:clean(node.textContent),dateTime:node.getAttribute('datetime')}))};
 });}
 await open();
 const sectionLabels=await tab.locator('section[data-nav-label]').evaluateAll(nodes=>nodes.map(node=>node.getAttribute('data-nav-label')));
 if(new Set(sectionLabels).size!==sectionLabels.length)throw Error('Duplicate section labels need explicit capture selectors.');
 const sections=[];
 for(const label of sectionLabels){sections.push(await snapshot(`section[data-nav-label=${JSON.stringify(label)}]`));}
 const partners=[];
 const regionButtons=tab.getByRole('group',{name:'Partner regions'}).getByRole('button');
 for(let index=0;index<await regionButtons.count();index++){
  const button=regionButtons.nth(index);await button.click();
  partners.push({region:await button.textContent(),content:await snapshot('section[data-nav-label="Preferred partners"]')});
 }
 const guestNotes=[];
 if(await tab.locator('section[data-nav-label="Guest Notes"]').count()){
  const next=tab.getByRole('button',{name:'Next guest note',exact:true});
  const counter=tab.locator('section[data-nav-label="Guest Notes"] [aria-label^="Guest note "]');
  const match=(await counter.getAttribute('aria-label'))?.match(/^Guest note 1 of (\d+)$/);
  if(!match||Number(match[1])>100)throw Error('Guest note capture count is unavailable or exceeds its bound.');
  for(let index=0;index<Number(match[1]);index++){
   if(await counter.getAttribute('aria-label')!==`Guest note ${index+1} of ${match[1]}`)throw Error('Guest note order changed while capturing.');
   guestNotes.push(await snapshot('section[data-nav-label="Guest Notes"]'));await next.click();
  }
 }
 const menu=await snapshot('.concept-full-menu');
 const metadata={title:await tab.title(),description:await tab.locator('meta[name="description"]').getAttribute('content'),canonical:await tab.locator('link[rel="canonical"]').getAttribute('href')};
 await tab.setViewportSize({width:390,height:844});await open();
 const mobileLabels=await tab.locator('section[data-nav-label]').evaluateAll(nodes=>nodes.map(node=>node.getAttribute('data-nav-label')));
 if(JSON.stringify(mobileLabels)!==JSON.stringify(sectionLabels))throw Error('Mobile section structure differs; review before migration.');
 const mobileSections=[];for(const label of mobileLabels)mobileSections.push(await snapshot(`section[data-nav-label=${JSON.stringify(label)}]`));
 // Capture video declarations separately: reduced-motion content snapshots intentionally omit them.
 await tab.emulateMedia({reducedMotion:'no-preference'});
 await tab.setViewportSize({width:1440,height:1000});await open();
 const heroVideo=tab.locator('.concept-hero video');
 await heroVideo.waitFor({state:'attached'});
 const heroVideoDeclaration=await heroVideo.evaluate(video=>({
  poster:video.getAttribute('poster'),label:video.getAttribute('aria-label'),
  autoplay:video.autoplay,muted:video.muted,loop:video.loop,playsInline:video.playsInline,
  sources:Array.from(video.querySelectorAll('source')).map(source=>({sourcePath:source.getAttribute('src'),type:source.getAttribute('type'),media:source.getAttribute('media')}))
 }));
 const videoMedia=[];
 for(const sourcePath of [...new Set(heroVideoDeclaration.sources.map(source=>source.sourcePath))].sort()){
  if(typeof sourcePath!=='string'||!/^\/assets\/[a-zA-Z0-9_./-]+\.mp4$/.test(sourcePath)||sourcePath.split('/').includes('..'))throw Error(`Unexpected nonlocal source video: ${sourcePath}`);
  const bytes=await fs.readFile(path.join(root,'public',sourcePath));
  videoMedia.push({sourcePath,byteLength:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')});
 }
 const mediaPaths=new Set([...sections,...mobileSections,menu,...guestNotes,...partners.map(item=>item.content)].flatMap(section=>section.images.map(image=>image.sourcePath)));
 const media=[];
 for(const sourcePath of [...mediaPaths].sort()){
  if(typeof sourcePath!=='string'||!sourcePath.startsWith('/assets/')||sourcePath.split('/').includes('..'))throw Error(`Unexpected nonlocal source image: ${sourcePath}`);
  const bytes=await fs.readFile(path.join(root,'public',sourcePath));media.push({sourcePath,sha256:createHash('sha256').update(bytes).digest('hex')});
 }
 await verifySources();if(errors.length)throw Error(`Browser errors: ${errors.join('; ')}`);
 const result={version:1,mode:'legacy-read-only',route:'/',capturedAt,origin,sourceProof:inventory.sourceProof,metadata,heroFrames,heroVideoDeclaration,videoMedia,sections,mobileSections,partners,guestNotes,menu,media,
  limitations:['Browser capture shows the reduced-motion initial hero frame; heroFrames separately contains source-resolved text for every frame. Rotation and background video still require validation.','Disabled source sections are not rendered or captured.','Navigation image stack is decorative and excluded from image capture; source inventory still tracks its dependencies.','Normalized text is provided alongside text-node parts; automatic whitespace rewriting is not authorized.','Dates and upcoming departures reflect capture time; this is not a timeless departure inventory.','This captures content, not visual acceptance, consent, media rights or public-release approval.','Hashes declared hero video files, but not all transitive source files, guest films, fonts or styles. Video decoding/playback is not verified.']};
 await fs.writeFile(process.env.CMS_CAPTURE_OUTPUT||path.join(root,'docs/cms/homepage-rendered-inventory.json'),JSON.stringify(result,null,2)+'\n');
 console.log(JSON.stringify({sections:sections.length,partnerRegions:partners.length,guestNotes:guestNotes.length,images:media.length,sourceFiles:inventory.sourceProof.length}));
}finally{await browser.close();}
