/** Local browser acceptance with mocked Auth responses; never sends an email. */
import {chromium,expect} from '@playwright/test';import assert from 'node:assert/strict';
const origin=process.env.CMS_RECOVERY_ORIGIN??'http://localhost:3002';if(!['localhost','127.0.0.1'].includes(new URL(origin).hostname))throw Error('Use a local fixture server.');
const browser=await chromium.launch({headless:true});
try{for(const width of [1280,390]){
 const context=await browser.newContext({viewport:{width,height:844}}),page=await context.newPage(),errors=[];page.on('pageerror',error=>errors.push(error.message));
 let requests=0,exchanges=0,updates=0,failUpdate=false,expire=false;const user={id:'00000000-0000-4000-8000-000000000001',aud:'authenticated',role:'authenticated',email:'fixture@example.test',app_metadata:{},user_metadata:{},created_at:'2026-01-01T00:00:00Z'};
 const part=x=>Buffer.from(JSON.stringify(x)).toString('base64url'),token=`${part({alg:'HS256',typ:'JWT'})}.${part({sub:user.id,exp:Math.floor(Date.now()/1000)+3600,role:'authenticated'})}.fixture`;
 await context.route('https://cms-fixture.test/auth/v1/**',async route=>{const req=route.request(),url=new URL(req.url());let body={};
  if(url.pathname.endsWith('/recover')){requests++;const input=req.postDataJSON();assert.equal(input.email,user.email);assert.ok(input.code_challenge);assert.equal(url.searchParams.get('redirect_to'),`${origin}/cms/recover`);}
  else if(url.pathname.endsWith('/token')){exchanges++;assert.equal(url.searchParams.get('grant_type'),'pkce');assert.ok(req.postDataJSON().code_verifier);if(expire){await route.fulfill({status:400,contentType:'application/json',body:JSON.stringify({error:'invalid_grant',error_description:'Expired'})});return;}body={access_token:token,refresh_token:'fixture-refresh',expires_in:3600,token_type:'bearer',user};}
  else if(url.pathname.endsWith('/user')){if(req.method()==='PUT'){updates++;assert.equal(req.postDataJSON().password,'A long fixture password');if(failUpdate){await route.fulfill({status:422,contentType:'application/json',body:JSON.stringify({msg:'provider rejected password'})});return;}}body=user;}
  else if(!url.pathname.endsWith('/logout'))throw Error('Unexpected Auth request');
  await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(body)});
 });
 await page.goto(`${origin}/cms`);await page.getByRole('link',{name:'Forgot password?'}).click();await expect(page.getByRole('heading',{name:'Recover CMS access'})).toBeVisible();
 await page.getByLabel('Email',{exact:true}).fill(user.email);await page.getByRole('button',{name:'Send recovery email'}).click();await expect(page.getByRole('status')).toContainText('If an account exists');assert.equal(requests,1);
 await page.goto(`${origin}/cms/recover?code=${'a'.repeat(32)}`);await expect(page.getByLabel('New password',{exact:true})).toBeVisible();assert.equal(page.url(),`${origin}/cms/recover`);assert.equal(exchanges,1);
 assert.equal(await page.evaluate(()=>localStorage.getItem('safari-cms-recovery')),null);
 await page.getByLabel('New password',{exact:true}).fill('A long fixture password');await page.getByLabel('Confirm new password').fill('A mismatched password');await page.getByRole('button',{name:'Update password',exact:true}).click();await expect(page.locator('main').getByRole('alert')).toContainText('do not match');assert.equal(updates,0);
 await page.getByLabel('Confirm new password').fill('A long fixture password');failUpdate=true;await page.getByRole('button',{name:'Update password',exact:true}).click();await expect(page.locator('main').getByRole('alert')).toContainText('Could not confirm');await expect(page.getByLabel('New password',{exact:true})).toHaveValue('');failUpdate=false;
 await page.getByLabel('New password',{exact:true}).fill('A long fixture password');await page.getByLabel('Confirm new password').fill('A long fixture password');await page.getByRole('button',{name:'Update password',exact:true}).click();await expect(page.getByRole('status')).toContainText('Password updated');assert.equal(updates,2);assert.equal(await page.getByLabel('New password',{exact:true}).count(),0);
 await page.screenshot({path:`/private/tmp/cms-password-recovery-${width}.png`,fullPage:true});
 await page.reload();await expect(page.getByRole('button',{name:'Send recovery email'})).toBeVisible();assert.equal(await page.getByLabel('New password',{exact:true}).count(),0);
 await page.getByLabel('Email',{exact:true}).fill(user.email);await page.getByRole('button',{name:'Send recovery email'}).click();await expect(page.getByRole('status')).toContainText('If an account exists');expire=true;
 await page.goto(`${origin}/cms/recover?code=${'b'.repeat(32)}`);await expect(page.locator('main').getByRole('alert')).toContainText('invalid, expired');assert.equal(await page.getByLabel('New password',{exact:true}).count(),0);
 const before=exchanges;await page.goto(`${origin}/cms/recover?code=${'c'.repeat(32)}&next=https://example.test`);await expect(page.locator('main').getByRole('alert')).toContainText('invalid, expired');assert.equal(exchanges,before);assert.equal(page.url(),`${origin}/cms/recover`);assert.deepEqual(errors,[]);
 await context.close();console.log(`PASS ${width}px: request, PKCE exchange, confirmation, provider rejection, success, reload, expiry, redirect rejection; no real email`);
}}finally{await browser.close();}
