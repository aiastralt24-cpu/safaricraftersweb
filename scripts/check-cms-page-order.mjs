/** Local browser workflow; controlled transport exercises failed and uncertain saves. */
import {chromium,expect} from '@playwright/test';import assert from 'node:assert/strict';
const target=new URL(process.env.CMS_RECOVERY_TEST_URL??'http://localhost:3002/cms');if(!['localhost','127.0.0.1','[::1]'].includes(target.hostname))throw Error('Local fixture only.');
const ids=Array.from({length:5},(_,i)=>`00000000-0000-4000-8000-${String(i+1).padStart(12,'0')}`),[site,actor,a,b,rev]=ids,user={id:actor,aud:'authenticated',role:'authenticated'};
const browser=await chromium.launch();
try{for(const width of [1280,390]){
 const context=await browser.newContext({viewport:{width,height:900}}),page=await context.newPage();let order=[a,b],version=0,writes=0,lose=true,stale=false;const errors=[];page.on('pageerror',e=>errors.push(String(e)));
 const snapshot=()=>String(version).padStart(32,'0'),title=id=>id===a?'Alpha page':'Beta page';
 await context.addInitScript(user=>localStorage.setItem('safari-cms-auth',JSON.stringify({access_token:'a.b.c',refresh_token:'fixture',expires_at:Math.floor(Date.now()/1000)+3600,token_type:'bearer',user})),user);
 await context.route('**/auth/v1/**',r=>r.fulfill({json:user}));
 await context.route('**/api/cms/**',async r=>{const req=r.request(),url=new URL(req.url());
  if(url.pathname==='/api/cms/mfa-policy')return r.fulfill({json:{policy:{websiteId:site,required:false,version:0,verified:false,canManage:false}}});
  if(url.pathname==='/api/cms/page-hierarchy')return r.fulfill({json:{result:{site,locale:'en',parentId:null,snapshot:snapshot(),nextCursor:null,items:order.map(id=>({id,title:title(id),path:`/${id===a?'alpha':'beta'}`,type:'page',revisionId:rev,parentRestricted:false,published:false,hasChildren:false}))}}});
  if(url.pathname==='/api/cms/page-order'){const body=req.postDataJSON();assert.equal(body.site,site);assert.equal(body.parent,null);
   if(body.action==='read')return r.fulfill({json:{result:{site,locale:'en',parentId:null,version,snapshot:snapshot(),items:order.map(id=>({id,title:title(id),path:`/${id===a?'alpha':'beta'}`,revisionId:rev,hierarchyVersion:0}))}}});
   assert.equal(body.action,'save');if(stale){stale=false;return r.fulfill({status:409,json:{error:'Page order changed. Refresh.'}});}assert.equal(body.snapshot,snapshot());order=body.ids;version++;writes++;
   if(lose){lose=false;return r.abort('failed');}return r.fulfill({json:{result:{site,locale:'en',parentId:null,version,orderedIds:order,requestKey:body.requestKey}}});
  }
  if(url.pathname==='/api/cms/content')return r.fulfill({json:url.searchParams.has('site')?{records:[]}:{sites:[{id:site,name:'Fixture'}]}});
  return r.fulfill({json:{result:[],records:[],assets:[]}});
 });
 await page.goto(target.href);await page.getByRole('navigation',{name:'CMS'}).getByRole('button',{name:'Pages',exact:true}).click();await page.getByRole('button',{name:'Browse page tree',exact:true}).click();
 const panel=page.getByRole('region',{name:'Sibling page order'});
 await panel.getByRole('button',{name:'Arrange pages in this branch'}).click();await panel.getByRole('button',{name:'Move Beta page up'}).click();await panel.getByRole('button',{name:'Review page order',exact:true}).click();assert.equal(writes,0);await panel.getByRole('button',{name:'Back to arranging'}).click();assert.equal(writes,0);
 await panel.getByRole('button',{name:'Review page order',exact:true}).click();await panel.getByRole('button',{name:'Save page order',exact:true}).click();await expect(panel.getByRole('alert')).toContainText('Refresh the saved order');assert.equal(writes,1);await expect(panel.getByRole('button',{name:'Review page order',exact:true})).toBeDisabled();
 await panel.getByRole('button',{name:'Refresh saved order'}).click();await expect(panel.locator('ol li').first()).toContainText('Beta page');await panel.getByRole('button',{name:'Move Alpha page up'}).click();await panel.getByRole('button',{name:'Review page order',exact:true}).click();stale=true;await panel.getByRole('button',{name:'Save page order',exact:true}).click();await expect(panel.getByRole('alert')).toContainText('Page order changed');assert.equal(writes,1);
 await panel.getByRole('button',{name:'Refresh saved order'}).click();await panel.getByRole('button',{name:'Move Alpha page up'}).click();await panel.getByRole('button',{name:'Review page order',exact:true}).click();await page.screenshot({path:`/private/tmp/cms-page-order-${width}.png`,fullPage:true});await panel.getByRole('button',{name:'Save page order',exact:true}).click();await panel.getByRole('button',{name:'Arrange pages in this branch'}).waitFor();assert.equal(writes,2);assert.deepEqual(order,[a,b]);
 await expect(page.getByRole('region',{name:'Page tree'}).getByRole('button',{name:/^Open .* page$/}).first()).toHaveText('Open Alpha page');assert.deepEqual(errors,[]);await context.close();console.log(`Page ordering ${width}: review, lost response, stale save, refresh and saved tree passed.`);
}}finally{await browser.close();}
