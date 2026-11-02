/** Local acceptance only: real tabs and storage, mocked auth/CMS APIs. */
import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
const target=new URL(process.env.CMS_RECOVERY_TEST_URL??'http://localhost:3002/cms');
if(!['localhost','127.0.0.1','[::1]'].includes(target.hostname))throw Error('Use a local fixture server.');
const ids=Array.from({length:6},(_,i)=>`00000000-0000-4000-8000-${String(i+1).padStart(12,'0')}`),site=ids[0],user={id:ids[1],aud:'authenticated',role:'authenticated'};
const browser=await chromium.launch({headless:true}),context=await browser.newContext();
const receipts=new Map(),cancelled=new Set(),requests=[],records=[];let lost=false,denied=false,cancelAttempts=0;const errors=[];
try{
 await context.addInitScript(user=>localStorage.setItem('safari-cms-auth',JSON.stringify({access_token:'a.b.c',refresh_token:'fixture',expires_at:Math.floor(Date.now()/1000)+3600,token_type:'bearer',user})),user);
 await context.route('**/auth/v1/**',route=>route.fulfill({json:user}));
 await context.route('**/api/cms/**',route=>{
  const request=route.request(),url=new URL(request.url());
  if(url.pathname!=='/api/cms/content')return route.fulfill({json:{result:[],records:[],assets:[]}});
  if(request.method()==='POST'){
   const body=request.postDataJSON();
   if(body.action==='cancel_create'){
    cancelAttempts++;const existing=receipts.get(body.requestKey);if(!existing)cancelled.add(body.requestKey);
    // Lose the first cancellation response; the pending request must survive.
    if(cancelAttempts===1)return route.abort();
    return route.fulfill({json:{site,requestKey:body.requestKey,result:existing?{status:'created',result:existing}:{status:'cancelled'}}});
   }
   assert.equal(body.action,'save');assert.equal(body.record,null);assert.equal(body.type,'form');requests.push(body);
   if(cancelled.has(body.requestKey))return route.fulfill({status:409,json:{error:'create_request_cancelled'}});
   if(body.title==='Cancel this form'&&!denied){denied=true;return route.fulfill({status:403,json:{error:'Fixture create rejected.'}});}
   let result=receipts.get(body.requestKey);
   if(!result){const id=ids[records.length+2];result={recordId:id,revisionId:ids[5]};receipts.set(body.requestKey,result);records.push({id,type:'form',path:null,title:body.title,locale:body.locale,currentRevision:ids[5],payload:body.payload,reviewStatus:'draft',publishedRevision:null,permissions:{edit:true},history:[]});}
   if(!lost){lost=true;return route.abort();}
   return route.fulfill({json:{site,requestKey:body.requestKey,result}});
  }
  return route.fulfill({json:url.searchParams.has('record')?{record:records.find(row=>row.id===url.searchParams.get('record'))}:url.searchParams.has('site')?{records}:{sites:[{id:site,name:'Fixture'}]}});
 });
 async function tab(){const page=await context.newPage();page.on('pageerror',e=>errors.push(String(e)));page.on('dialog',d=>d.accept());await page.goto(target.href);await page.getByRole('navigation',{name:'CMS'}).getByRole('button',{name:'Forms',exact:true}).click();return page;}
 async function create(page,title){await page.getByRole('button',{name:'New form',exact:true}).click();await page.getByLabel('Form title',{exact:true}).fill(title);}
 async function save(page){await page.getByRole('button',{name:'Save form draft',exact:true}).click();}
 const first=await tab(),second=await tab();await create(first,'Two tabs same draft');
 await first.getByText('New draft recovery',{exact:true}).click();await first.getByLabel('Enable recovery for this new draft').check();await first.getByRole('button',{name:'Copy new draft to browser',exact:true}).click();await first.getByText('New draft copied to this browser.',{exact:false}).waitFor();
 await second.getByText('New draft recovery',{exact:true}).click();await second.getByRole('button',{name:'Find new draft copies',exact:true}).click();await second.getByRole('button',{name:'Restore new draft copy',exact:true}).click();await second.getByText('New form restored locally.',{exact:false}).waitFor();
 await save(first);await first.getByText('Failed to fetch',{exact:false}).waitFor();
 await save(second);await second.getByText('Form draft saved.',{exact:false}).waitFor();
 assert.equal(await first.evaluate(()=>Object.keys(localStorage).filter(k=>k.startsWith('cms-create-pending-v1:')).length),0);
 await save(first);await first.getByText('Form draft saved.',{exact:false}).waitFor();
 assert.equal(requests.length,3);assert.equal(new Set(requests.map(r=>r.requestKey)).size,1);assert.equal(records.length,1);
 await create(first,'Cancel this form');await save(first);await first.getByText('Fixture create rejected.',{exact:false}).waitFor();
 const key=requests.at(-1).requestKey;
 const panel=first.getByRole('region',{name:'First save recovery'});
 await panel.getByRole('button',{name:'Resolve or cancel first save'}).click();await panel.getByText('Failed to fetch',{exact:false}).waitFor();
 assert.equal(await first.evaluate(()=>Object.keys(localStorage).filter(k=>k.startsWith('cms-create-pending-v1:')).length),1);
 await panel.getByRole('button',{name:'Resolve or cancel first save'}).click();await panel.getByText('Pending save cancelled.',{exact:false}).waitFor();
 assert.ok(cancelled.has(key));assert.equal(records.length,1);
 await first.getByLabel('Form title',{exact:true}).fill('Replacement form');await save(first);await first.getByText('Form draft saved.',{exact:false}).waitFor();
 assert.notEqual(requests.at(-1).requestKey,key);assert.equal(records.length,2);assert.ok(records.every(r=>r.publishedRevision===null));assert.deepEqual(errors,[]);
 console.log('PASS: stale-tab retry reuses the original identity after another tab acknowledges; lost cancellation response remains recoverable; confirmed cancellation permits a fresh draft (mocked APIs).');
}finally{await browser.close();}
