/** Local browser-only provider fixture; never submits a real enquiry. */
import {chromium,expect} from '@playwright/test';import assert from 'node:assert/strict';
const target=new URL(process.env.CMS_RECOVERY_TEST_URL??'http://localhost:3002/cms');if(!['localhost','127.0.0.1'].includes(target.hostname))throw Error('Local fixture only.');
const uuid=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`,site=uuid(1),source=uuid(3),user={id:uuid(2),aud:'authenticated',role:'authenticated'};
const row=id=>({id,status:'new',priority:'normal',createdAt:'2026-01-01T00:00:00Z',nextFollowUp:null,version:1});
const browser=await chromium.launch();try{for(const width of [1280,390]){
 const context=await browser.newContext({viewport:{width,height:900}}),page=await context.newPage(),errors=[],actions=[];let mode='matches';
 page.on('pageerror',e=>errors.push(String(e)));await context.addInitScript(user=>localStorage.setItem('safari-cms-auth',JSON.stringify({access_token:'a.b.c',refresh_token:'fixture',expires_at:Math.floor(Date.now()/1000)+3600,token_type:'bearer',user})),user);
 await context.route('**/auth/v1/**',r=>r.fulfill({json:user}));await context.route('**/api/cms/**',r=>{const req=r.request(),url=new URL(req.url());
 if(url.pathname==='/api/cms/mfa-policy')return r.fulfill({json:{policy:{websiteId:site,required:false,version:0,verified:false,canManage:false}}});
 if(url.pathname==='/api/cms/content')return r.fulfill({json:url.searchParams.has('site')?{records:[]}:{sites:[{id:site,name:'Fixture'}]}});
 if(url.pathname==='/api/cms/leads'){const body=req.postDataJSON();actions.push(body.action);assert.equal(body.site,site);
 if(body.action==='list')return r.fulfill({json:{result:[row(source)]}});
 if(body.action==='get')return r.fulfill({json:{result:{...row(body.lead),assignedTo:null,outcome:'',externalCrmReference:null,canEdit:true,answers:{contact:'client@example.test'},consents:[],attribution:{},events:[],notifications:[]}}});
 if(body.action==='duplicates'){
 if(mode==='failed')return r.fulfill({status:503,json:{error:'Duplicate check unavailable'}});
 const items=mode==='empty'?[]:Array.from({length:body.after?1:20},(_,i)=>({...row(uuid(body.after?30:i+4)),reason:'matching_email'})).map(({priority,nextFollowUp,...item})=>item);
 return r.fulfill({json:{result:{websiteId:site,leadId:mode==='mismatch'?uuid(999):body.lead,hasEmail:mode!=='empty',items,nextCursor:!body.after&&items.length===20?items.at(-1).id:null}}});
 }throw Error('Unexpected mutation '+body.action);}
 return r.fulfill({json:{result:[],records:[],assets:[]}});
 });
 await page.goto(target.href);await page.getByRole('navigation',{name:'CMS'}).getByRole('button',{name:'Enquiries',exact:true}).click();await page.getByRole('complementary',{name:'Enquiries'}).getByRole('button').first().click();
 const panel=page.getByRole('region',{name:'Possible duplicate enquiries'});await panel.getByRole('button',{name:'Check possible duplicates'}).click();await expect(panel.getByRole('button',{name:/Review enquiry/})).toHaveCount(20);await panel.getByRole('button',{name:'Load more possible duplicates'}).click();await expect(panel.getByRole('button',{name:/Review enquiry/})).toHaveCount(21);
 await page.getByRole('textbox',{name:'Outcome',exact:true}).fill('Unsaved follow-up');page.once('dialog',d=>d.dismiss());await panel.getByRole('button',{name:/Review enquiry/}).first().click();await expect(page.getByRole('textbox',{name:'Outcome',exact:true})).toHaveValue('Unsaved follow-up');page.once('dialog',d=>d.accept());await panel.getByRole('button',{name:/Review enquiry/}).first().click();await expect(page.getByRole('textbox',{name:'Outcome',exact:true})).toHaveValue('');await expect(panel.getByRole('button',{name:/Review enquiry/})).toHaveCount(0);
 mode='empty';await panel.getByRole('button',{name:'Check possible duplicates'}).click();await expect(panel.getByRole('status')).toHaveText('This submission has no usable email field to compare.');
 mode='mismatch';await panel.getByRole('button',{name:'Check possible duplicates'}).click();await expect(panel.getByRole('alert')).toHaveText('Duplicate enquiry response mismatch.');
 mode='failed';await panel.getByRole('button',{name:'Check possible duplicates'}).click();await expect(panel.getByRole('alert')).toBeVisible();assert.equal(actions.some(action=>!['list','get','duplicates'].includes(action)),false);assert.deepEqual(errors,[]);await context.close();console.log(`Lead duplicates ${width}: pagination, review, unsaved-change protection, empty/error/mismatch states and zero writes passed.`);
}}finally{await browser.close();}
