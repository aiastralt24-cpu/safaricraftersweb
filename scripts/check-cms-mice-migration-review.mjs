/** Real browser and review handler; mocked auth, media catalogue and database calls. */
import {chromium,expect} from '@playwright/test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';
import {handleMiceMigrationReview} from '../lib/cms/mice-migration-api.ts';
const target=new URL(process.env.CMS_RECOVERY_TEST_URL??'http://localhost:3002/cms');if(!['localhost','127.0.0.1','[::1]'].includes(target.hostname))throw Error('Use a local fixture server.');
const site='00000000-0000-4000-8000-000000000001',user={id:'00000000-0000-4000-8000-000000000002',aud:'authenticated',role:'authenticated'};
const assets=['India original','Kenya original'].map((title,i)=>({id:`verified-${i}`,title,mime:'image/webp',alt:title,caption:'',inspectionStatus:'ready',rightsStatus:'approved',rightsExpiresAt:null,archivedAt:null}));
const bytes=await readFile(new URL('../public/assets/store/ghosts-book-interior-lounge.webp',import.meta.url));
const formId='00000000-0000-4000-8000-000000000003',formRevision='00000000-0000-4000-8000-000000000004';
const savedId='70000000-0000-4000-8000-000000000001',savedRevision='80000000-0000-4000-8000-000000000001';
let receipt=null,savedPayload=null,loseResponse=true,failLoad=true,dbWrites=0;const applyCommands=[];
let reviews=0,available=true,formAvailable=true;const writes=[],errors=[];const browser=await chromium.launch(),context=await browser.newContext(),page=await context.newPage();page.on('pageerror',e=>errors.push(String(e)));
try{
 await context.addInitScript(user=>localStorage.setItem('safari-cms-auth',JSON.stringify({access_token:'a.b.c',refresh_token:'fixture',expires_at:Math.floor(Date.now()/1000)+3600,token_type:'bearer',user})),user);
 await context.route('**/auth/v1/**',r=>r.fulfill({json:user}));
 await context.route('**/api/cms/**',async r=>{const req=r.request(),url=new URL(req.url());
  if(url.pathname==='/api/cms/media/preview')return r.fulfill({contentType:'image/webp',body:bytes});
  if(url.pathname==='/api/cms/migrations/mice'){
   const body=req.postDataJSON();if(body.action==='review')reviews++;if(body.action==='apply')applyCommands.push(body);
   const response=await handleMiceMigrationReview(new Request(req.url(),{method:'POST',headers:req.headers(),body:JSON.stringify(body)}),async(token,name,args)=>{assert.equal(token,'a.b.c');if(name==='can')return true;if(name==='get_mice_migration_result')return receipt;if(name==='apply_mice_migration'){if(!receipt){dbWrites++;savedPayload=args.p_manifest.payload;receipt={requestKey:args.p_request,sourceDigest:args.p_source,reviewDigest:args.p_review,createdAt:new Date().toISOString(),result:{recordId:savedId,revisionId:savedRevision}};}else assert.equal(args.p_request,receipt.requestKey);return receipt.result;}if(name==='review_mice_migration_form'){assert.equal(args.p_form,formId);return {recordId:formId,revisionId:formAvailable?formRevision:null,locale:formAvailable?'en':null,available:formAvailable};}assert.equal(name,'review_contact_migration_media');return args.p_bindings.map(binding=>({...binding,sourceMatches:true,revision:1,processedSha256:'a'.repeat(64),available}));});
   if(body.action==='apply'&&loseResponse){loseResponse=false;return r.abort('failed');}
   return r.fulfill({status:response.status,headers:Object.fromEntries(response.headers),body:await response.text()});
  }
  if(url.pathname==='/api/cms/content'&&url.searchParams.get('record')===savedId){if(failLoad)return r.fulfill({status:503,json:{error:'Synthetic reload failure'}});return r.fulfill({json:{record:{id:savedId,type:'page',path:'/mice',locale:'en',title:'Corporate Travel & MICE',currentRevision:savedRevision,publishedRevision:null,reviewStatus:'draft',payload:savedPayload,permissions:{edit:true},history:[]}}});}
  if(url.pathname==='/api/cms/media'){const body=req.postDataJSON();assert.ok(['get','list'].includes(body.action));return r.fulfill({json:{result:body.action==='list'?assets:assets.find(a=>a.id===body.asset)}});}
  if(url.pathname==='/api/cms/references')return r.fulfill({json:{result:[{id:formId,title:'Corporate enquiries',available:true,published:true}]}});
  if(req.method()==='POST')writes.push(url.pathname);
  return r.fulfill({json:{sites:[{id:site,name:'Fixture'}],records:[],result:[]}});
 });
 await page.goto(target.href);await page.getByRole('navigation',{name:'CMS'}).getByRole('button',{name:'Pages',exact:true}).click();await page.getByRole('button',{name:'Review existing MICE content',exact:true}).click();
 const panel=page.getByRole('region',{name:'MICE content migration'}),check=panel.getByRole('button',{name:'Check MICE migration',exact:true});assert.equal(await check.isEnabled(),false);
 for(const [index,label]of ['India heritage image','Kenya landscape image'].entries()){const group=panel.getByRole('group',{name:label,exact:true});await group.getByRole('button',{name:'Choose library image',exact:true}).click();await group.getByRole('button',{name:`Use ${assets[index].title}`,exact:true}).click();}
 await expect(check).toBeEnabled();await check.click();await panel.getByText('Both original images passed current source, processing and rights checks.',{exact:true}).waitFor();
 await panel.getByText('Proposed MICE page',{exact:true}).click();await panel.getByRole('heading',{name:'Together, beyond the everyday.',exact:true}).waitFor();assert.equal(await panel.locator('[data-cms-section]').count(),6);await expect(panel.getByRole('button',{name:'Apply reviewed MICE draft',exact:true})).toBeDisabled();
 const formGroup=panel.getByRole('group',{name:'Corporate enquiry form (optional during review)',exact:true});await formGroup.getByRole('button',{name:'Search records',exact:true}).click();await formGroup.getByRole('button',{name:'Select Corporate enquiries',exact:true}).click();await expect(check).toBeEnabled();await check.click();
 await panel.getByText('The selected published corporate form passed current field-mapping checks. Enquiries use the CMS inbox; email notifications remain disabled.',{exact:true}).waitFor();
 formAvailable=false;await check.click();await panel.getByText('Select a compatible, published English corporate form before applying this migration.',{exact:true}).waitFor();
 available=false;await check.click();await panel.getByText('Some images failed verification. Review their processing and rights.',{exact:true}).waitFor();assert.equal(reviews,4);
 await panel.getByRole('group',{name:'India heritage image',exact:true}).getByRole('button',{name:'Replace image',exact:true}).click();await panel.getByRole('button',{name:'Use India original',exact:true}).click();await expect(panel.getByText('Proposed MICE page',{exact:true})).toHaveCount(0);
 available=true;formAvailable=true;await expect(check).toBeEnabled();await check.click();await panel.getByText('The selected published corporate form passed current field-mapping checks. Enquiries use the CMS inbox; email notifications remain disabled.',{exact:true}).waitFor();
 const apply=panel.getByRole('button',{name:'Apply reviewed MICE draft',exact:true});await expect(apply).toBeDisabled();await panel.getByRole('checkbox').check();await apply.click();
 await panel.getByRole('button',{name:'Check MICE migration result',exact:true}).waitFor();await expect(panel.getByRole('alert')).toBeVisible();assert.equal(dbWrites,1);
 const recoveryKey=`cms-mice-migration:${site}:${user.id}`,stored=await page.evaluate(key=>localStorage.getItem(key),recoveryKey);assert.ok(stored);assert.doesNotMatch(stored,/composition|Bearer|proposal/);
 await page.reload();await page.getByRole('navigation',{name:'CMS'}).getByRole('button',{name:'Pages',exact:true}).click();
 await panel.getByRole('button',{name:'Check MICE migration result',exact:true}).click();await panel.getByText('Synthetic reload failure',{exact:true}).waitFor();assert.equal(await page.evaluate(key=>localStorage.getItem(key),recoveryKey),stored);
 const second=await context.newPage();second.on('pageerror',e=>errors.push(String(e)));await second.goto(target.href);await second.getByRole('navigation',{name:'CMS'}).getByRole('button',{name:'Pages',exact:true}).click();const secondPanel=second.getByRole('region',{name:'MICE content migration'});await secondPanel.getByRole('button',{name:'Retry same MICE migration',exact:true}).waitFor();
 failLoad=false;await panel.getByRole('button',{name:'Retry same MICE migration',exact:true}).click();await panel.getByText('MICE draft saved and loaded. Nothing was published.',{exact:true}).waitFor();
 assert.equal(dbWrites,1);assert.equal(applyCommands.length,2);assert.deepEqual(applyCommands[1],applyCommands[0]);assert.equal(await page.evaluate(key=>localStorage.getItem(key),recoveryKey),null);
 await secondPanel.getByRole('button',{name:'Retry same MICE migration',exact:true}).click();await secondPanel.getByText('MICE draft saved and loaded. Nothing was published.',{exact:true}).waitFor();assert.equal(dbWrites,1);assert.equal(applyCommands.length,3);assert.deepEqual(applyCommands[2],applyCommands[0]);await second.close();
 assert.deepEqual(writes,[]);assert.deepEqual(errors,[]);console.log('PASS: MICE verified review, consent to apply, lost-response refresh recovery, failed-load retention and exact retry across tabs with one draft save (mocked database).');
}finally{await browser.close();}
