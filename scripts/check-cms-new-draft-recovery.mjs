/** Local browser acceptance. Run against a built fixture server; all CMS/auth
 * requests are intercepted. This is not a hosted-provider or durability test. */
import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';

const target=new URL(process.env.CMS_RECOVERY_TEST_URL??'http://localhost:3002/cms');
if(!['localhost','127.0.0.1','[::1]'].includes(target.hostname)||!['http:','https:'].includes(target.protocol))throw Error('Use a local fixture server.');
const profile=await mkdtemp(join(tmpdir(),'cms-new-draft-recovery-'));
const ids=Array.from({length:5},(_,i)=>`00000000-0000-4000-8000-${String(i+1).padStart(12,'0')}`);
const site=ids[0],user={id:ids[1],aud:'authenticated',role:'authenticated'};
let context,page,record=null,attempts=0,firstRequest=null,failLoad=false;
const errors=[];
async function launch(){
 context=await chromium.launchPersistentContext(profile,{headless:true});
 page=await context.newPage();
 page.on('pageerror',error=>errors.push(String(error)));
 page.on('dialog',dialog=>dialog.accept());
 await context.addInitScript(user=>localStorage.setItem('safari-cms-auth',JSON.stringify({access_token:'a.b.c',refresh_token:'fixture',expires_at:Math.floor(Date.now()/1000)+3600,token_type:'bearer',user})),user);
 await context.route('**/auth/v1/**',route=>route.fulfill({json:user}));
 await context.route('**/api/cms/**',route=>{
  const request=route.request(),url=new URL(request.url());
  if(url.pathname!=='/api/cms/content')return route.fulfill({json:{result:[],records:[],assets:[]}});
  if(request.method()==='POST'){
   attempts++;
   const body=request.postDataJSON();
   assert.equal(body.action,'save');assert.equal(body.type,'form');
   assert.equal(body.record,null);assert.equal(body.expectedRevision,null);
   assert.match(body.requestKey,/^[0-9a-f-]{36}$/);if(firstRequest)assert.deepEqual(body,firstRequest);else firstRequest=body;
   // A known rejection is different from an ambiguous response after commit.
   if(attempts===1)return route.fulfill({status:403,json:{error:'Fixture creation denied.'}});
   record={id:ids[2],type:'form',path:null,title:body.title,locale:body.locale,currentRevision:ids[3],payload:body.payload,reviewStatus:'draft',publishedRevision:null,permissions:{edit:true},history:[]};
   if(attempts===2)return route.abort();
   if(attempts===3)failLoad=true;
   return route.fulfill({json:{site,requestKey:body.requestKey,result:{recordId:record.id,revisionId:ids[3]}}});
  }
  if(url.searchParams.has('record')&&failLoad){failLoad=false;return route.fulfill({status:503,json:{error:'Fixture reload unavailable.'}});}
  return route.fulfill({json:url.searchParams.has('record')?{record}:url.searchParams.has('site')?{records:record?[record]:[]}:{sites:[{id:site,name:'Fixture'}]}});
 });
}
async function openForms(){
 await page.goto(target.href);
 await page.getByRole('navigation',{name:'CMS'}).getByRole('button',{name:'Forms',exact:true}).click();
}
const stored=()=>page.evaluate(()=>Object.keys(localStorage).filter(key=>key.startsWith('cms-new-draft-v1:')).map(key=>({key,raw:localStorage.getItem(key)})));
try{
 await launch();await openForms();
 await page.getByRole('button',{name:'New form',exact:true}).click();
 await page.getByLabel('Form title',{exact:true}).fill('Restart recovery enquiry');
 await page.locator('.cms-form-editor').getByLabel('Field label',{exact:true}).fill('Your full name');
 await page.getByText('New draft recovery',{exact:true}).click();
 await page.getByLabel('Enable recovery for this new draft').check();
 await page.getByLabel('Automatically copy this new draft').check();
 await page.getByText('New draft copied to this browser. Nothing was saved to the server.').waitFor();
 const checkpoint=await stored();assert.equal(checkpoint.length,1);assert.equal(attempts,0);
 // Close the entire browser process, then reopen the same persistent profile.
 await context.close();context=null;await launch();await openForms();
 assert.deepEqual(await stored(),checkpoint);
 await page.getByText('New draft recovery',{exact:true}).click();
 assert.equal(await page.getByLabel('Enable recovery for this new draft').isChecked(),false);
 assert.equal(await page.getByLabel('Automatically copy this new draft').isChecked(),false);
 await page.getByRole('button',{name:'Find new draft copies',exact:true}).click();
 await page.getByRole('button',{name:'Restore new draft copy',exact:true}).click();
 await page.getByText('New form restored locally.',{exact:false}).waitFor();
 assert.equal(await page.getByLabel('Form title',{exact:true}).inputValue(),'Restart recovery enquiry');
 assert.equal(await page.locator('.cms-form-editor').getByLabel('Field label',{exact:true}).inputValue(),'Your full name');
 assert.equal(await page.getByLabel('Autosave this form after a short pause').isChecked(),false);
 assert.equal(attempts,0);
 const save=page.getByRole('button',{name:'Save form draft',exact:true});
 await save.click();await page.getByText('Fixture creation denied.',{exact:false}).waitFor();
 assert.equal(record,null);assert.equal(attempts,1);assert.deepEqual(await stored(),checkpoint);
 assert.equal(await page.getByLabel('Form title',{exact:true}).inputValue(),'Restart recovery enquiry');
 assert.equal(await save.isEnabled(),true);
 // Lose the response after committing, then restart the browser with recovery intact.
 await save.click();await page.getByText('Failed to fetch',{exact:false}).waitFor();
 assert.equal(attempts,2);await context.close();context=null;await launch();await openForms();
 await page.getByText('New draft recovery',{exact:true}).click();
 await page.getByRole('button',{name:'Find new draft copies',exact:true}).click();
 await page.getByRole('button',{name:'Restore new draft copy',exact:true}).click();
 await page.getByText('New form restored locally.',{exact:false}).waitFor();
 await page.getByRole('button',{name:'Save form draft',exact:true}).click();
 await page.getByText('Fixture reload unavailable.',{exact:false}).waitFor();
 const pending=await page.evaluate(()=>Object.keys(localStorage).filter(key=>key.startsWith('cms-create-pending-v1:')).map(key=>JSON.parse(localStorage.getItem(key))));
 assert.equal(pending.length,1);assert.equal(pending[0].confirmed.recordId,record.id);
 await page.getByRole('button',{name:'Save form draft',exact:true}).click();await page.getByText('Form draft saved.',{exact:false}).waitFor();
 assert.equal(await page.evaluate(()=>Object.keys(localStorage).filter(key=>key.startsWith('cms-create-pending-v1:')).length),0);
 assert.equal(attempts,4);assert.equal(record.payload.fields[0].label,'Your full name');assert.equal(record.publishedRevision,null);
 assert.deepEqual(await stored(),checkpoint);
 await page.getByText('New draft recovery',{exact:true}).click();
 await page.getByRole('button',{name:'Find new draft copies',exact:true}).click();
 await page.getByRole('button',{name:'Remove new draft copy',exact:true}).click();
 await page.getByRole('button',{name:'Remove new draft copy',exact:true}).waitFor({state:'detached'});
 assert.deepEqual(await stored(),[]);
 // New records use a separate namespace from saved-record checkpoints.
 const first=page,second=await context.newPage();
 second.on('pageerror',error=>errors.push(String(error)));second.on('dialog',dialog=>dialog.accept());
 await second.goto(target.href);await second.getByRole('navigation',{name:'CMS'}).getByRole('button',{name:'Forms',exact:true}).click();
 async function copyNewForm(tab,title){
  await tab.getByRole('button',{name:'New form',exact:true}).click();
  await tab.getByLabel('Form title',{exact:true}).fill(title);
  await tab.getByText('New draft recovery',{exact:true}).click();
  await tab.getByLabel('Enable recovery for this new draft').check();
  await tab.getByRole('button',{name:'Copy new draft to browser',exact:true}).click();
  await tab.getByText('New draft copied to this browser. Nothing was saved to the server.').waitFor();
 }
 await Promise.all([copyNewForm(first,'First tab form'),copyNewForm(second,'Second tab form')]);
 let entries=(await stored()).map(entry=>JSON.parse(entry.raw));
 assert.equal(entries.length,2);assert.equal(new Set(entries.map(entry=>entry.id)).size,2);
 await first.getByRole('button',{name:'Find new draft copies',exact:true}).click();
 const order=entries.sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt)||a.id.localeCompare(b.id));
 const secondId=entries.find(entry=>entry.draft.title==='Second tab form').id;
 await second.getByLabel('Form title',{exact:true}).fill('Second tab newer form');
 await second.getByRole('button',{name:'Copy new draft to browser',exact:true}).click();
 await second.getByText('New draft copied to this browser. Nothing was saved to the server.').waitFor();
 await first.getByRole('button',{name:'Remove new draft copy',exact:true}).nth(order.findIndex(entry=>entry.id===secondId)).click();
 await first.getByText('The local draft changed. Refresh before removing it.',{exact:true}).waitFor();
 entries=(await stored()).map(entry=>JSON.parse(entry.raw));
 assert.equal(entries.length,2);assert.equal(entries.find(entry=>entry.id===secondId).draft.title,'Second tab newer form');assert.equal(attempts,4);
 assert.deepEqual(errors,[]);
 console.log('PASS: new-form browser restart, opt-in reset, rejected-create preservation, lost-response restart retry, failed reload retry, unpublished save, copy removal and two-tab stale-deletion protection (mocked APIs).');
}finally{
 if(context)await context.close();
 await rm(profile,{recursive:true,force:true});
}
