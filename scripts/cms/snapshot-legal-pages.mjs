// Read-only capture of local legacy legal copy. Does not save or publish CMS data.
import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {chromium} from 'playwright';
const root=fileURLToPath(new URL('../../',import.meta.url));
const origin=process.env.CMS_LOCAL_PREVIEW_ORIGIN||'http://localhost:3001';
const parsed=new URL(origin);if(!['localhost','127.0.0.1'].includes(parsed.hostname)||parsed.protocol!=='http:')throw Error('Use the local development server only.');
const browser=await chromium.launch({headless:true});
try{
 const pages=[];
 for(const slug of ['privacy','terms','cookies']){
  const sourcePath=`app/legal/${slug}/page.tsx`,source=await fs.readFile(path.join(root,sourcePath),'utf8');
  const tab=await browser.newPage();const response=await tab.goto(`${origin}/legal/${slug}`);if(response?.status()!==200)throw Error(`Legal page unavailable: ${slug}`);
  if(await tab.locator('.cms-legal-page').count())throw Error('Legacy capture requires the legal CMS rollout disabled.');
  const selector=slug==='privacy'?'.privacy-page':'#main > section';
  const target=tab.locator(selector);if(await target.count()!==1)throw Error(`Ambiguous legacy content: ${slug}`);
  const content=await target.evaluate(root=>{
   const clean=value=>value.replace(/\s+/g,' ').trim();
   const fragments=node=>Array.from(node.childNodes).flatMap(child=>{
    if(child.nodeType===Node.TEXT_NODE)return [{kind:'text',text:child.textContent||''}];
    if(child instanceof HTMLAnchorElement)return [{kind:'link',text:child.textContent||'',href:child.getAttribute('href')}];
    throw Error(`Unsupported inline element in legal copy: ${child.nodeName}`);
   });
   return Array.from(root.querySelectorAll('h1,h2,h3,h4,p,ul,ol,a')).filter(node=>!node.closest('ul,ol')||node.matches('ul,ol')).filter(node=>!node.matches('a')||!node.closest('p')).map(node=>{
    const sourceAnchor=node.closest('[id]')?.id||null;
    if(node.matches('ul,ol'))return {kind:'list',ordered:node.tagName==='OL',items:Array.from(node.children).map(item=>({text:clean(item.textContent||''),fragments:fragments(item)})),sourceAnchor};
    if(node.matches('a'))return {kind:'link',text:clean(node.textContent||''),href:node.getAttribute('href'),sourceAnchor};
    return {kind:node.tagName==='P'?'paragraph':'heading',...(node.tagName==='P'?{}:{level:Number(node.tagName.slice(1))}),text:clean(node.textContent||''),fragments:fragments(node),sourceAnchor};
   });
  });
  pages.push({path:`/legal/${slug}`,sourcePath,sourceSha256:createHash('sha256').update(source).digest('hex'),title:await tab.title(),description:await tab.locator('meta[name="description"]').getAttribute('content'),blocks:content});await tab.close();
 }
 await fs.writeFile(path.join(root,'docs/cms/legal-migration-inventory.json'),JSON.stringify({schemaVersion:1,origin,mode:'legacy-read-only',pages},null,2)+'\n');
 console.log(JSON.stringify(pages.map(page=>({path:page.path,blocks:page.blocks.length,inlineLinks:page.blocks.flatMap(block=>block.fragments||[]).filter(fragment=>fragment.kind==='link').length}))));
}finally{await browser.close();}
