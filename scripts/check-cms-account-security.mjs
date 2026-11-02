/** TOTP UI acceptance using a local server and intercepted Auth provider. */
import {chromium,expect} from '@playwright/test';import assert from 'node:assert/strict';
const origin=process.env.CMS_SECURITY_ORIGIN??'http://localhost:3002';if(!['localhost','127.0.0.1'].includes(new URL(origin).hostname))throw Error('Use localhost.');
const browser=await chromium.launch({headless:true});
try{for(const width of [1280,390]){
 const context=await browser.newContext({viewport:{width,height:844}}),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 const id='00000000-0000-4000-8000-000000000001',factorId='00000000-0000-4000-8000-000000000002';let factors=[],level='aal1',enrolls=0,verifies=0,deletes=0,reject=false;
 const user=()=>({id,aud:'authenticated',role:'authenticated',email:'fixture@example.test',app_metadata:{},user_metadata:{},created_at:'2026-01-01T00:00:00Z',factors});
 const part=x=>Buffer.from(JSON.stringify(x)).toString('base64url');
 const session=()=>({access_token:`${part({alg:'HS256',typ:'JWT'})}.${part({sub:id,aal:level,exp:Math.floor(Date.now()/1000)+3600,role:'authenticated'})}.fixture`,refresh_token:'fixture-refresh',expires_in:3600,expires_at:Math.floor(Date.now()/1000)+3600,token_type:'bearer',user:user()});
 await context.route('https://cms-fixture.test/auth/v1/**',async route=>{const request=route.request(),url=new URL(request.url());let body={};
  if(url.pathname.endsWith('/user'))body=user();
  else if(url.pathname.endsWith('/factors')&&request.method()==='POST'){enrolls++;assert.equal(request.postDataJSON().factor_type,'totp');factors=[{id:factorId,friendly_name:'My phone',status:'unverified',factor_type:'totp'}];body={id:factorId,type:'totp',totp:{secret:'FIXTURE-SETUP-SECRET',uri:'otpauth://totp/fixture',qr_code:'<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><rect width="200" height="200" fill="black"/></svg>'}};}
  else if(url.pathname.endsWith('/challenge'))body={id:'challenge-id',expires_at:Math.floor(Date.now()/1000)+60};
  else if(url.pathname.endsWith('/verify')){verifies++;assert.equal(request.postDataJSON().code,'123456');if(reject){await route.fulfill({status:422,contentType:'application/json',body:JSON.stringify({msg:'Invalid code'})});return;}factors[0].status='verified';level='aal2';body=session();}
  else if(request.method()==='DELETE'){deletes++;assert.ok(url.pathname.endsWith(factorId));factors=[];level='aal1';body={id:factorId};}
  else if(url.pathname.endsWith('/token'))body=session();else throw Error(`Unexpected Auth operation ${request.method()} ${url.pathname}`);
  await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(body)});
 });
 await page.goto(`${origin}/cms/security`);await expect(page.getByText('Sign in to the CMS before managing authenticators.')).toBeVisible();assert.equal(enrolls,0);
 await page.evaluate(value=>localStorage.setItem('safari-cms-auth',JSON.stringify(value)),session());await page.reload();await expect(page.getByText('No authenticators enrolled.')).toBeVisible();
 await page.getByLabel('Authenticator name').fill('My phone');await page.getByRole('button',{name:'Set up authenticator',exact:true}).click();await expect(page.getByText('FIXTURE-SETUP-SECRET',{exact:true})).toBeVisible();assert.equal(enrolls,1);await expect.poll(()=>page.getByRole('img',{name:'Scan this QR code with your authenticator app'}).evaluate(img=>img.naturalWidth)).toBeGreaterThan(0);await page.screenshot({path:`/private/tmp/cms-account-setup-${width}.png`,fullPage:true});
 assert.equal(await page.evaluate(()=>JSON.stringify(localStorage).includes('FIXTURE-SETUP-SECRET')),false);
 await page.getByLabel('Six-digit code').fill('123456');reject=true;await page.getByRole('button',{name:'Verify authenticator',exact:true}).click();await expect(page.locator('main').getByRole('alert')).toContainText('could not be confirmed');await expect(page.getByLabel('Six-digit code')).toHaveValue('');reject=false;
 await page.getByLabel('Six-digit code').fill('123456');await page.getByRole('button',{name:'Verify authenticator',exact:true}).click();await expect(page.getByText('Session verification: Password and second factor verified')).toBeVisible();assert.equal(await page.getByText('FIXTURE-SETUP-SECRET',{exact:true}).count(),0);
 await page.screenshot({path:`/private/tmp/cms-account-security-${width}.png`,fullPage:true});
 await page.getByRole('button',{name:'Remove My phone',exact:true}).click();await page.getByRole('button',{name:'Keep authenticator'}).click();assert.equal(deletes,0);
 await page.getByRole('button',{name:'Remove My phone',exact:true}).click();await page.getByRole('button',{name:'Confirm removal',exact:true}).click();await expect(page.getByText('No authenticators enrolled.')).toBeVisible();assert.equal(deletes,1);await expect(page.getByText('Session verification: Second factor not verified for this session')).toBeVisible();assert.equal(verifies,2);assert.deepEqual(errors,[]);
 await context.close();console.log(`PASS ${width}px: sign-in requirement, enroll, rejected code, verify, secret clearing, removal confirmation and assurance refresh`);
}}finally{await browser.close();}
