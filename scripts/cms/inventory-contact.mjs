/** Read-only capture of contact/corporate content and native form constraints. */
import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {chromium} from 'playwright';
const origin=process.argv[2]??'http://localhost:3001';
const url=new URL(origin);
if(!['localhost','127.0.0.1'].includes(url.hostname)||!['http:','https:'].includes(url.protocol)||url.username||url.password)throw Error('Use a local preview origin.');
const sourcePaths=['app/contact/LegacyContactPage.tsx','app/contact/contact.module.css','components/ContactForm.tsx','app/mice/page.tsx','app/mice/LegacyMicePage.tsx','app/forms.css','components/EnquiryHoneypot.tsx','lib/enquiry-client.ts','app/api/enquiry/route.ts','lib/enquiry-service.ts','app/layout.tsx','lib/cms/root-seo-metadata.ts','lib/cms/seo-settings.ts','lib/cms/brand-metadata.ts','lib/cms/brand-settings.ts'];
const sources=await Promise.all(sourcePaths.map(async sourcePath=>({sourcePath,sha256:createHash('sha256').update(await fs.readFile(sourcePath)).digest('hex')})));
const browser=await chromium.launch({headless:true});const routes=[];
try{
 for(const route of ['/contact','/mice']){
  const page=await browser.newPage({viewport:{width:1280,height:900},reducedMotion:'reduce'});const errors=[],consoleErrors=[];page.on('console',message=>{if(message.type()==='error')consoleErrors.push(message.text());});page.on('pageerror',error=>errors.push(error.message));
  // Never allow this inventory operation to submit a visitor enquiry.
  await page.route('**/api/enquiry',request=>request.abort());
  await page.goto(new URL(route,url).href,{waitUntil:'networkidle'});await page.locator('form.contact-form').waitFor();
  const captured=await page.evaluate((route)=>{
   const form=document.querySelector('form.contact-form');if(!form)throw Error('Missing form');
   const region=route==='/contact'?document.querySelector('main')??document.body:document.querySelector('#corporate-enquiry');
   const fields=[...form.querySelectorAll('input,select,textarea')].filter(el=>el.name!=='website').map(el=>({name:el.name,tag:el.tagName.toLowerCase(),type:el.type,label:el.closest('label')?.childNodes[0]?.textContent?.trim()??'',required:el.required,placeholder:el.getAttribute('placeholder'),minLength:el.getAttribute('minlength'),maxLength:el.getAttribute('maxlength'),autoComplete:el.getAttribute('autocomplete'),defaultValue:el.value,help:el.getAttribute('aria-describedby')?document.getElementById(el.getAttribute('aria-describedby'))?.textContent:null,options:el.tagName==='SELECT'?[...el.options].map(o=>({value:o.value,label:o.textContent})):undefined,consentText:el.type==='checkbox'?el.closest('label')?.querySelector('span')?.textContent:undefined}));
   const copy=region.cloneNode(true);copy.querySelectorAll('form,script,style').forEach(el=>el.remove());
   const image=route==='/contact'?region.querySelector('figure img'):null;
   const src=image?new URL(image.getAttribute('src'),location.origin):null;
   const heading=node=>{const lines=[{runs:[]}];const walk=(n,emphasis=false)=>{if(n.nodeType===Node.TEXT_NODE){if(n.textContent)lines.at(-1).runs.push({text:n.textContent,emphasis});return;}if(n.nodeName==='BR'){lines.push({runs:[]});return;}for(const child of n.childNodes)walk(child,emphasis||n.nodeName==='EM');};walk(node);return {lines};};
   let contactContent=null;
   if(route==='/contact'){
    const intro=image.closest('figure').parentElement,panel=form.parentElement,header=panel.querySelector('header');
    const paragraphs=[...intro.querySelectorAll(':scope > p')];if(paragraphs.length!==4)throw Error('Contact intro structure changed');
    const direct=intro.querySelector(':scope > div'),corporate=paragraphs[3],privacy=panel.querySelector(':scope > p');
    const linkedCopy=node=>{const a=node.querySelector('a'),clone=node.cloneNode(true);clone.querySelector('a').remove();return {copy:clone.textContent,link:{label:a.textContent,href:a.getAttribute('href')}};};
    contactContent={intro:{eyebrow:paragraphs[0].textContent,heading:heading(intro.querySelector('h1')),lead:paragraphs[1].textContent,scope:paragraphs[2].textContent,image:{sourcePath:src.searchParams.get('url')??src.pathname,alt:image.alt,caption:intro.querySelector('figcaption').textContent},focalPoint:{x:50,y:62},showImageOnMobile:false,direct:{prompt:direct.querySelector('span').textContent,label:direct.querySelector('a').textContent,email:direct.querySelector('a').getAttribute('href').slice(7)},corporate:linkedCopy(corporate)},enquiry:{eyebrow:header.querySelector('.eyebrow').textContent,heading:heading(header.querySelector('h2')),copy:header.querySelector('p:not(.eyebrow)').textContent,requiredHint:header.querySelector('span').textContent,privacy:linkedCopy(privacy)}};
   }
   return {path:route,metadata:{canonical:document.querySelector('link[rel="canonical"]')?.href??null,robots:[...document.querySelectorAll('meta[name="robots"],meta[name="googlebot"]')].map(meta=>({name:meta.name,content:meta.content})),openGraph:[...document.querySelectorAll('meta[property^="og:"]')].map(meta=>({property:meta.getAttribute('property'),content:meta.content})),twitter:[...document.querySelectorAll('meta[name^="twitter:"]')].map(meta=>({name:meta.name,content:meta.content}))},contactContent,surroundingText:copy.textContent,title:document.title,description:document.querySelector('meta[name="description"]')?.content,headings:[...region.querySelectorAll('h1,h2')].map(h=>({level:h.tagName,text:h.textContent,html:h.innerHTML})),paragraphs:[...region.querySelectorAll('p,figcaption,header>span')].filter(p=>!p.closest('form')).map(p=>p.textContent),links:[...region.querySelectorAll('a')].map(a=>({label:a.textContent,href:a.getAttribute('href')})),image:image?{sourcePath:src.searchParams.get('url')??src.pathname,alt:image.alt}:null,form:{note:form.querySelector('.corporate-form-note')?.textContent??null,fields,submitLabel:form.querySelector('button[type="submit"]').textContent}};
  },route);
  if(captured.form.fields.length!==(route==='/contact'?8:7))throw Error(`Unexpected fields on ${route}`);
  const select=page.locator('form.contact-form select');await select.selectOption({index:1});if(await select.inputValue()===captured.form.fields.find(f=>f.tag==='select').defaultValue)throw Error('Select did not change');
  const viewports=[];
  for(const width of [1280,390]){await page.setViewportSize({width,height:900});const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);await page.screenshot({path:`/private/tmp/cms-contact-inventory-${route.slice(1)}-${width}.png`,fullPage:true});viewports.push({width,overflow});}
  if(errors.length)throw Error(errors.join('\n'));routes.push({...captured,checks:{pageErrors:errors,consoleErrors,viewports,selectInteraction:true}});await page.close();
 }
}finally{await browser.close();}
const image=routes[0].image;if(!image.sourcePath.startsWith('/assets/')||image.sourcePath.includes('..'))throw Error('Unexpected image path');
image.sha256=createHash('sha256').update(await fs.readFile(`public${image.sourcePath}`)).digest('hex');
const media=[{sourcePath:image.sourcePath,sha256:image.sha256}];
for(const meta of routes[0].metadata.openGraph.filter(meta=>meta.property==='og:image')){
 const asset=new URL(meta.content);const canonical=new URL(routes[0].metadata.canonical);
 if(asset.origin!==canonical.origin||asset.search||asset.hash||!asset.pathname.startsWith('/assets/')||asset.pathname.includes('..'))throw Error('Social image needs manual source inventory.');
 if(!media.some(item=>item.sourcePath===asset.pathname))media.push({sourcePath:asset.pathname,sha256:createHash('sha256').update(await fs.readFile(`public${asset.pathname}`)).digest('hex')});
}
await fs.writeFile('docs/cms/contact-migration-inventory.json',JSON.stringify({schemaVersion:1,mode:'legacy-read-only',sources,media,routes,limitations:['No enquiry was submitted; API delivery, failure and success states require separate verification.','Header/footer/navigation are global inventory responsibilities.','Native field constraints are captured, not changed or assumed to match server validation.','Corporate form content shares ContactForm; changes must preserve both variants.','No CMS draft, deployment or configuration was changed.']},null,2)+'\n');
console.log(`Captured ${routes.length} form variants and ${sources.length} source dependencies.`);
