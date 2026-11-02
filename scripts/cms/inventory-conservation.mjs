/** Read-only website/source inventory. No CMS or source-content writes. */
import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {chromium} from 'playwright';
const origin=process.argv[2]??'http://localhost:3001';
if(!['localhost','127.0.0.1'].includes(new URL(origin).hostname))throw Error('Inventory only a local preview.');
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const sources=await Promise.all(['app/conservation-commitment/page.tsx','app/conservation-commitment/LegacyConservationPage.tsx','app/conservation-commitment/ConservationMotion.tsx','app/conservation-commitment/conservation-commitment.css'].map(async sourcePath=>({sourcePath,sha256:sha(await fs.readFile(sourcePath))})));
const browser=await chromium.launch({headless:true});let content,metadata;
try{
 const page=await browser.newPage({viewport:{width:1280,height:900},reducedMotion:'reduce'});
 await page.goto(`${origin}/conservation-commitment`,{waitUntil:'networkidle'});
 await page.locator('.conservation-record').last().waitFor();
 ({content,metadata}=await page.evaluate(()=>{
  const one=(selector,root=document)=>{const found=root.querySelectorAll(selector);if(found.length!==1)throw Error(`Expected one ${selector}, got ${found.length}`);return found[0];};
  const text=(selector,root=document)=>one(selector,root).textContent.trim();
  const heading=(selector)=>{const lines=[{runs:[]}];const walk=(node,emphasis=false)=>{if(node.nodeType===Node.TEXT_NODE){if(node.textContent)lines.at(-1).runs.push({text:node.textContent,emphasis});return;}if(node.nodeName==='BR'){lines.push({runs:[]});return;}for(const child of node.childNodes)walk(child,emphasis||node.nodeName==='EM');};walk(one(selector));return {lines};};
  const picture=(selector,root=document)=>{const image=one(selector,root),url=new URL(image.getAttribute('src'),location.origin);return {sourcePath:url.searchParams.get('url')??url.pathname,alt:image.getAttribute('alt')??''};};
  const link=one('.conservation-source-link');
  const impactIntro=one('.conservation-impact-heading>p:last-child').cloneNode(true);impactIntro.querySelector('a').remove();
  const metrics=[...document.querySelectorAll('.conservation-impact dl>div')].map((item,index)=>({id:`impact-${index+1}`,value:text('dt',item),label:text('dd',item),tier:index<3?'primary':'secondary'}));
  const records=[...document.querySelectorAll('.conservation-record')].map((item,index)=>({id:`record-${index+1}`,place:text('.conservation-record-meta',item),title:text('h3',item),copy:text('.conservation-record-copy>p',item),image:picture('img',item)}));
  const regions=[...document.querySelectorAll('.conservation-footprint-grid>p')].map((item,index)=>({id:`region-${index+1}`,title:text('strong',item),copy:text('span',item)}));
  return {metadata:{title:document.title,description:one('meta[name="description"]').content,canonical:one('link[rel="canonical"]').href,openGraph:{title:one('meta[property="og:title"]').content,description:one('meta[property="og:description"]').content,image:one('meta[property="og:image"]').content}},content:{hero:{eyebrow:text('.conservation-hero .conservation-eyebrow'),heading:heading('#conservation-title'),copy:text('.conservation-hero-copy>p:last-child'),image:picture('.conservation-hero>img'),credit:text('.conservation-credit')},intro:{label:text('.conservation-index'),heading:heading('.conservation-intro h2'),paragraphs:[...document.querySelectorAll('.conservation-intro-copy>p')].map(p=>p.textContent.trim())},impact:{eyebrow:text('.conservation-impact-heading .conservation-eyebrow'),heading:heading('#impact-title'),copy:impactIntro.textContent.trim(),source:{label:link.textContent.trim(),href:link.getAttribute('href'),newWindow:link.target==='_blank'},primaryLabel:one('.conservation-impact-primary').getAttribute('aria-label'),secondaryLabel:one('.conservation-impact-secondary').getAttribute('aria-label'),metrics},fieldRecords:{eyebrow:text('.conservation-record-heading .conservation-eyebrow'),heading:heading('#field-record-title'),copy:text('.conservation-record-heading>p'),items:records},footprint:{eyebrow:text('.conservation-footprint>.conservation-eyebrow'),heading:heading('.conservation-footprint h2'),regions,species:{label:text('.conservation-species strong'),copy:text('.conservation-species span')}}}};
 }));
 if(content.impact.metrics.length!==8||content.fieldRecords.items.length!==4||content.footprint.regions.length!==3)throw Error('Conservation source structure changed; review inventory expectations.');
 await page.screenshot({path:'/private/tmp/cms-conservation-inventory-desktop.png',fullPage:true});
 await page.setViewportSize({width:390,height:844});await page.screenshot({path:'/private/tmp/cms-conservation-inventory-mobile.png',fullPage:true});
}finally{await browser.close();}
const imagePaths=[...new Set([content.hero.image.sourcePath,...content.fieldRecords.items.map(item=>item.image.sourcePath)])];
const media=await Promise.all(imagePaths.map(async sourcePath=>{if(!sourcePath.startsWith('/assets/')||sourcePath.includes('..'))throw Error('Unexpected media source');return {sourcePath,sha256:sha(await fs.readFile(`public${sourcePath}`))};}));
const inventory={schemaVersion:1,mode:'legacy-read-only',path:'/conservation-commitment',origin,sources,media,metadata,content,limitations:['Source claims are preserved, not independently verified. Client/source-owner approval and current claim evidence are required before migration publication.','Header, footer and shared navigation are owned by the global inventory.','No CMS media mappings, draft writes, publication or rollout flags were changed.']};
await fs.writeFile('docs/cms/conservation-migration-inventory.json',JSON.stringify(inventory,null,2)+'\n');
console.log(`Captured ${sources.length} source files, ${media.length} images, ${content.impact.metrics.length} metrics and ${content.fieldRecords.items.length} field records.`);
