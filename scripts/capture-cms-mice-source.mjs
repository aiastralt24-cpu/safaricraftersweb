/** Read-only local legacy-page capture. Never submit the enquiry form. */
import {chromium} from '@playwright/test';import {readFile,writeFile} from 'node:fs/promises';import {createHash} from 'node:crypto';
const origin=new URL(process.env.CMS_SOURCE_URL??'http://localhost:3002');if(!['localhost','127.0.0.1','[::1]'].includes(origin.hostname))throw Error('Use a local legacy source.');
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const sourcePaths=['app/mice/page.tsx','app/mice/LegacyMicePage.tsx','app/mice/mice.css','components/PageHero.tsx','components/PageHero.css','components/Breadcrumbs.tsx','components/ContactForm.tsx','components/EnquiryHoneypot.tsx','app/forms.css','lib/enquiry-client.ts','lib/enquiry-service.ts','app/layout.tsx'];
const sources=await Promise.all(sourcePaths.map(async sourcePath=>({sourcePath,sha256:hash(await readFile(sourcePath))})));
const browser=await chromium.launch();const views=[];
try{for(const width of [1280,390]){const page=await browser.newPage({viewport:{width,height:900}});await page.goto(new URL('/mice',origin).href);await page.locator('.mice-page .mice-enquiry').waitFor();
 views.push(await page.evaluate(width=>{
 const main=document.querySelector('.mice-page');if(!main)throw Error('Missing legacy MICE page');
 const text=node=>node?.textContent?.trim()??'';
 const heading=node=>{const lines=[{runs:[]}];const walk=(n,emphasis=false)=>{if(n.nodeType===3){if(n.textContent)lines.at(-1).runs.push({text:n.textContent,emphasis});return;}if(n.nodeName==='BR'){lines.push({runs:[]});return;}n.childNodes.forEach(child=>walk(child,emphasis||n.nodeName==='EM'));};walk(node);return {lines};};
 const image=node=>{let src=new URL(node.getAttribute('src'),location.origin);const sourcePath=src.pathname==='/_next/image'?new URL(src.searchParams.get('url'),location.origin).pathname:src.pathname;const pos=getComputedStyle(node).objectPosition.split(' ').map(Number.parseFloat);return {sourcePath,alt:node.alt,focalPoint:{x:pos[0],y:pos[1]}};};
 const link=node=>({label:text(node),href:node.getAttribute('href')});
 const title=node=>({eyebrow:text(node.querySelector('.eyebrow')),heading:heading(node.querySelector('h2'))});
 const hero=main.querySelector('.page-hero'),intro=main.querySelector('.mice-intro'),formats=main.querySelector('.mice-formats'),dest=main.querySelector('.mice-destinations'),process=main.querySelector('.mice-process'),enquiry=main.querySelector('.mice-enquiry');
 const data=[
 {eyebrow:text(hero.querySelector('.page-hero-meta')),heading:heading(hero.querySelector('h1')),copy:text(hero.querySelector('.page-hero-description')),image:image(hero.querySelector('img')),credit:text(hero.querySelector('.page-hero-credit')),breadcrumbs:[...hero.querySelectorAll('nav li')].map((node,i)=>({id:`crumb-${i+1}`,label:text(node.querySelector('a,span')??node),...(node.querySelector('a')?{href:node.querySelector('a').getAttribute('href')}:{})}))},
 {...title(intro),paragraphs:[...intro.querySelectorAll('div:last-child>p')].map((p,i)=>({id:`paragraph-${i+1}`,text:text(p)})),button:link(intro.querySelector('a'))},
 {accessibleLabel:formats.getAttribute('aria-label'),items:[...formats.querySelectorAll('article')].map((node,i)=>({id:`format-${i+1}`,title:text(node.querySelector('h2')),copy:text(node.querySelector('p'))}))},
 {...title(dest),copy:text(dest.querySelector('header>p:not(.eyebrow)')),items:[...dest.querySelectorAll('article')].map((node,i)=>({id:`destination-${i+1}`,title:text(node.querySelector('h3')),copy:text(node.querySelector('p')),image:image(node.querySelector('img')),button:link(node.querySelector('a'))}))},
 {...title(process),items:[...process.querySelectorAll('li')].map((node,i)=>({id:`step-${i+1}`,title:text(node.querySelector('h3')),copy:text(node.querySelector('p'))}))},
 {...title(enquiry),copy:text(enquiry.querySelector(':scope>div>p:not(.eyebrow)')),formNote:text(enquiry.querySelector('.corporate-form-note'))},
 ];
 return {width,h1Count:main.querySelectorAll('h1').length,overflow:document.documentElement.scrollWidth>innerWidth,data,metadata:{title:document.title,description:document.querySelector('meta[name="description"]')?.content,canonical:document.querySelector('link[rel="canonical"]')?.href,tags:[...document.querySelectorAll('meta[property],meta[name="robots"],meta[name^="twitter:"]')].map(n=>({name:n.getAttribute('property')??n.getAttribute('name'),content:n.content}))},form:{fields:[...enquiry.querySelectorAll('[name]')].filter(n=>n.name!=='website').map(n=>({name:n.name,required:n.required,defaultValue:n.value,options:n.tagName==='SELECT'?[...n.options].map(o=>({value:o.value,label:o.text})):undefined})),submitLabel:text(enquiry.querySelector('button[type="submit"]'))}};
 },width));await page.close();}}finally{await browser.close();}
const paths=[...new Set(views.flatMap(v=>[v.data[0].image.sourcePath,...v.data[3].items.map(i=>i.image.sourcePath)]))];
const media=await Promise.all(paths.map(async sourcePath=>{if(!sourcePath.startsWith('/assets/')||sourcePath.includes('..'))throw Error('Unexpected source asset');const bytes=await readFile('public'+sourcePath);return {sourcePath,sha256:hash(bytes),bytes:bytes.length};}));
await writeFile(process.env.CMS_CAPTURE_OUTPUT??'docs/cms/mice-migration-inventory.json',JSON.stringify({schemaVersion:1,mode:'legacy-read-only',path:'/mice',capturedAt:new Date().toISOString(),origin:origin.origin,sources,media,views,limitations:['Browser content and media capture only; no enquiry submitted.','Existing contact-form migration retains the corporate form definition.','Source hashes are proof inputs, not media rights or publication approval.']},null,2)+'\n');
console.log('Captured MICE sections, metadata, original media and form controls at desktop/mobile widths.');
