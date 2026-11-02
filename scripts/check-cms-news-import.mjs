/** Local synthetic provider: actual Office review logic, simulated persistence failures. */
import {chromium,expect} from '@playwright/test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {zip} from '../tests/office-fixtures.mjs';
import {handleNewsImportUpload} from '../lib/cms/news-import-api.ts';
const url=new URL(process.env.CMS_RECOVERY_TEST_URL??'http://localhost:3002/cms');
if(!['localhost','127.0.0.1'].includes(url.hostname))throw Error('Local fixture only.');
const uuid=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`,site=uuid(1),actor=uuid(2),user={id:actor,aud:'authenticated',role:'authenticated'};
const browser=await chromium.launch();try{for(const width of [1280,390]){
 const context=await browser.newContext({viewport:{width,height:900}}),page=await context.newPage(),errors=[];let writes=0,record=null,savedPayload=null,receipt=null,lose=true,failList=false,badReceipt=false,dropNext=false,cancelled=null,loseCancel=true;
 page.on('pageerror',e=>errors.push(String(e)));
 await context.addInitScript(user=>localStorage.setItem('safari-cms-auth',JSON.stringify({access_token:'a.b.c',refresh_token:'fixture',expires_at:Math.floor(Date.now()/1000)+3600,token_type:'bearer',user})),user);
 const rpc=async(_token,name,args)=>{
  if(name==='list_editor_sites')return [{id:site}];
  if(name==='get_editor_record')return {...record,payload:savedPayload};
  if(name==='review_news_import_links')return {assets:args.p_assets.map(assetId=>({assetId,available:true})),references:args.p_references.map(r=>({...r,available:true,revision:uuid(9)}))};
  if(name==='get_news_import_receipt'){const found=receipt?.requestKey===args.p_request?receipt:cancelled?.requestKey===args.p_request?cancelled:null;return badReceipt&&found?{...found,requestKey:uuid(99)}:found;}
  if(name==='cancel_news_import'){if(receipt?.requestKey===args.p_request)return receipt;cancelled={status:'cancelled',requestKey:args.p_request,sourceDigest:args.p_source,reviewDigest:args.p_review};return cancelled;}
  if(name==='apply_news_import'){
   writes++;const item=args.p_items[0],id=uuid(3),revision=randomUUID();
   record={id,type:'news',title:item.payload.title,path:`/news/${item.payload.slug}`,locale:item.locale,currentRevision:revision,reviewStatus:'draft',publishedRevision:null,ownerId:actor};
   savedPayload=item.payload;
   const result=[{recordId:id,revisionId:revision,sourceKey:item.sourceKey}];receipt={requestKey:args.p_request,sourceDigest:args.p_source,reviewDigest:args.p_review,result};return result;
  }throw Error(`Unexpected RPC ${name}`);
 };
 await context.route('**/auth/v1/**',r=>r.fulfill({json:user}));
 await context.route('**/api/cms/**',async r=>{const req=r.request(),u=new URL(req.url());
  if(u.pathname==='/api/cms/import/news'){
   if(req.headers()['x-cms-action']==='apply'&&dropNext){dropNext=false;return r.abort('failed');}
   const response=await handleNewsImportUpload(new Request(req.url(),{method:'POST',headers:req.headers(),body:req.postDataBuffer()??undefined}),rpc);
   if(req.headers()['x-cms-action']==='apply'&&lose){lose=false;return r.abort('failed');}
   if(req.headers()['x-cms-action']==='cancel'&&loseCancel&&cancelled){loseCancel=false;return r.abort('failed');}
   return r.fulfill({status:response.status,contentType:'application/json',body:await response.text()});
  }
  if(u.pathname==='/api/cms/news'){if(failList){failList=false;return r.fulfill({status:503,json:{error:'Synthetic list refresh failure'}});}return r.fulfill({json:{records:record?[record]:[],next:null}});}
  if(u.pathname==='/api/cms/content')return r.fulfill({json:u.searchParams.has('site')?{records:[]}:{sites:[{id:site,name:'Fixture'}]}});
  if(u.pathname==='/api/cms/mfa-policy')return r.fulfill({json:{policy:{websiteId:site,required:false,version:0,verified:false,canManage:false}}});
  return r.fulfill({json:{records:[],result:[]}});
 });
 const open=async()=>{await page.goto(url.href);await page.getByRole('navigation',{name:'CMS'}).getByRole('button',{name:'News and press releases',exact:true}).click();await page.getByText('Import Word or Excel content',{exact:true}).click();};
 await open().catch(async error=>{await page.screenshot({path:'/private/tmp/cms-news-import-failure.png'});console.log(await page.locator('body').innerText());throw error;});const panel=page.locator('details').filter({has:page.locator('summary').filter({hasText:/^Import Word or Excel content$/})});
 
 const createRow=values=>'<w:tr>'+values.map(value=>'<w:tc><w:p><w:r><w:t>'+value+'</w:t></w:r></w:p></w:tc>').join('')+'</w:tr>';
 const createFile=zip({'[Content_Types].xml':'<Types/>','word/document.xml':`<w:document xmlns:w="urn:w"><w:body><w:tbl>${createRow(['CMSNews','1.0','news'])}</w:tbl><w:tbl>${createRow(['Pages'])}${createRow(['recordId','operation','slug','title','locale'])}${createRow(['forest','create','forest-restoration','Forest restoration','en'])}</w:tbl><w:tbl>${createRow(['Blocks'])}${createRow(['recordId','itemId','position','kind','text'])}${createRow(['forest','intro','1','paragraph','Example outcomes text.'])}</w:tbl></w:body></w:document>`});
 await panel.getByLabel('News content file').setInputFiles({name:'news-create.docx',mimeType:'application/vnd.openxmlformats-officedocument.wordprocessingml.document',buffer:createFile});await expect(page.getByRole('button',{name:'New news or press release'})).toBeDisabled();
 await panel.getByRole('button',{name:'Review file',exact:true}).click();await expect(panel).toContainText('1 proposed news drafts.');assert.equal(writes,0);
 await panel.getByText('Create Forest restoration',{exact:true}).click();await panel.getByRole('button',{name:'Preview proposed news'}).click();await expect(panel.getByRole('article',{name:'News draft preview'})).toContainText('Example outcomes text.');
 await expect(panel.getByRole('button',{name:'Save reviewed drafts'})).toBeDisabled();
 await panel.getByRole('checkbox').check();
 // Simulate another tab owning the import lock. No request or recovery ID is created.
 await page.evaluate(key=>{window.importLockReady=false;void navigator.locks.request(key,()=>new Promise(resolve=>{window.importLockReady=true;window.releaseImportLock=resolve;}));},`cms-news-import:${site}:${actor}`);
 await page.waitForFunction(()=>window.importLockReady);await panel.getByRole('button',{name:'Save reviewed drafts'}).click();await expect(panel).toContainText('already running in another tab');assert.equal(writes,0);await page.evaluate(()=>window.releaseImportLock());
 await panel.getByRole('button',{name:'Save reviewed drafts'}).click();await expect(panel.getByRole('button',{name:'Check saved import result'})).toBeVisible();assert.equal(writes,1);
 const key=`cms-news-import:${site}:${actor}`,stored=await page.evaluate(key=>localStorage.getItem(key),key);assert.ok(stored);assert.ok(!stored.includes('Example outcomes'));assert.equal(record.publishedRevision,null);
 await open();badReceipt=true;await panel.getByRole('button',{name:'Check saved import result'}).click();await expect(panel.getByRole('alert')).toBeVisible();assert.equal(await page.evaluate(key=>localStorage.getItem(key),key),stored);
 badReceipt=false;failList=true;page.once('dialog',d=>d.accept());await panel.getByRole('button',{name:'Cancel unresolved import'}).click();await expect(panel).toContainText('Synthetic list refresh failure');assert.equal(await page.evaluate(key=>localStorage.getItem(key),key),stored);
 await panel.getByRole('button',{name:'Check saved import result'}).click();await expect(panel).toContainText('1 news draft saved. Nothing was published.');assert.equal(await page.evaluate(key=>localStorage.getItem(key),key),null);assert.equal(writes,1);
 await expect(page.locator('.cms-list')).toContainText('Forest restoration');
 await expect(page.getByRole('button',{name:'New news or press release'})).toBeEnabled();assert.deepEqual(errors,[]);

 const row=values=>'<w:tr>'+values.map(value=>'<w:tc><w:p><w:r><w:t>'+value+'</w:t></w:r></w:p></w:tc>').join('')+'</w:tr>';
 const update=zip({'[Content_Types].xml':'<Types/>','word/document.xml':`<w:document xmlns:w="urn:w"><w:body><w:tbl>${row(['CMSNews','1.0','news'])}</w:tbl><w:tbl>${row(['Pages'])}${row(['recordId','operation','expectedRevision','slug','title','locale'])}${row([record.id,'update',record.currentRevision,'forest-restoration','Updated forest news','en'])}</w:tbl></w:body></w:document>`});
 await panel.getByLabel('News content file').setInputFiles({name:'news-update.docx',mimeType:'application/vnd.openxmlformats-officedocument.wordprocessingml.document',buffer:update});
 await panel.getByRole('button',{name:'Review file',exact:true}).click();await panel.getByText('Update Updated forest news',{exact:true}).click();
 const comparison=panel.getByRole('region',{name:'Import content changes'});await expect(comparison).toContainText('1 changed fields.');await comparison.getByText('Title',{exact:true}).click();await expect(comparison).toContainText('Currently saved');await expect(comparison).toContainText('Forest restoration');await expect(comparison).toContainText('Updated forest news');assert.equal(writes,1);

 dropNext=true;await panel.getByRole('checkbox').check();await panel.getByRole('button',{name:'Save reviewed drafts'}).click();await expect(panel.getByRole('button',{name:'Cancel unresolved import'})).toBeVisible();
 const pendingCancel=await page.evaluate(key=>localStorage.getItem(key),key);assert.ok(pendingCancel);page.once('dialog',d=>d.accept());await panel.getByRole('button',{name:'Cancel unresolved import'}).click();
 await expect(panel.getByRole('alert')).toBeVisible();assert.equal(await page.evaluate(key=>localStorage.getItem(key),key),pendingCancel);
 await panel.getByRole('button',{name:'Check saved import result'}).click();await expect(panel).toContainText('Import cancelled. No drafts were saved');assert.equal(await page.evaluate(key=>localStorage.getItem(key),key),null);assert.equal(writes,1);await expect(page.getByRole('button',{name:'New news or press release'})).toBeEnabled();
 await page.screenshot({path:`/private/tmp/cms-news-import-${width}.png`,fullPage:true});await context.close();console.log(`News import ${width}: review, preview, consent, cross-tab lock, lost response, invalid receipt, failed refresh and recovery passed.`);
}}finally{await browser.close();}
