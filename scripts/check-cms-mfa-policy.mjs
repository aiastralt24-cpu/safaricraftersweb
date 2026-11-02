/** Local workspace acceptance with mocked Auth and MFA-policy APIs. */
import {chromium,expect} from '@playwright/test';import assert from 'node:assert/strict';
const origin=process.env.CMS_POLICY_ORIGIN??'http://localhost:3002';if(!['localhost','127.0.0.1'].includes(new URL(origin).hostname))throw Error('Use localhost.');
const browser=await chromium.launch({headless:true});
try{for(const width of [1280,390]){
 const context=await browser.newContext({viewport:{width,height:900}}),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 const site='00000000-0000-4000-8000-000000000001',user={id:'00000000-0000-4000-8000-000000000002',aud:'authenticated',role:'authenticated',factors:[]};
 let policy={websiteId:site,required:false,version:0,verified:true,canManage:true},writes=0,lose=true,stale=false;
 const part=x=>Buffer.from(JSON.stringify(x)).toString('base64url'),token=`${part({alg:'HS256',typ:'JWT'})}.${part({sub:user.id,exp:Math.floor(Date.now()/1000)+3600,aal:'aal2'})}.fixture`;
 await context.addInitScript(({user,token})=>localStorage.setItem('safari-cms-auth',JSON.stringify({access_token:token,refresh_token:'fixture',expires_at:Math.floor(Date.now()/1000)+3600,token_type:'bearer',user})),{user,token});
 await context.route('https://cms-fixture.test/auth/v1/user',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify(user)}));
 await context.route('**/api/cms/**',async route=>{const request=route.request(),url=new URL(request.url());let body={};
  if(url.pathname==='/api/cms/mfa-policy'){const c=request.postDataJSON();assert.equal(c.site,site);if(c.action==='set'){writes++;assert.equal(c.version,policy.version);if(stale){policy.version++;stale=false;await route.fulfill({status:409,contentType:'application/json',body:JSON.stringify({error:'Changed'})});return;}policy={...policy,required:c.required,version:policy.version+1};if(lose){lose=false;await route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({error:'Unconfirmed'})});return;}}body={policy};}
  else if(url.pathname==='/api/cms/content')body=url.searchParams.has('site')?{records:[]}:{sites:[{id:site,name:'Fixture website'}]};
  else throw Error(`Unexpected CMS API ${url.pathname}`);
  await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(body)});
 });
 await page.goto(`${origin}/cms`);const panel=page.getByRole('region',{name:'Website MFA policy'});
 await expect(panel.getByText('MFA is not required by this website policy.')).toBeVisible();await panel.getByText('Manage website MFA requirement',{exact:true}).click();await panel.getByRole('button',{name:'Review enabling MFA requirement'}).click();await expect(panel.getByText(/Pending and running publication schedules/)).toBeVisible();await panel.getByRole('button',{name:'Cancel policy change'}).click();assert.equal(writes,0);
 await panel.getByRole('button',{name:'Review enabling MFA requirement'}).click();await panel.getByRole('button',{name:'Confirm enabling MFA requirement'}).click();await expect(panel.getByRole('alert')).toContainText('could not be confirmed');await expect(panel.getByRole('button',{name:'Review enabling MFA requirement'})).toBeDisabled();assert.equal(writes,1);
 await panel.getByRole('button',{name:'Reload MFA policy'}).click();await expect(panel.getByText('MFA is required for privileged actions.')).toBeVisible();assert.equal(writes,1);
 stale=true;await panel.getByRole('button',{name:'Review disabling MFA requirement'}).click();await panel.getByRole('button',{name:'Confirm disabling MFA requirement'}).click();await expect(panel.getByRole('alert')).toContainText('could not be confirmed');await panel.getByRole('button',{name:'Reload MFA policy'}).click();await expect(panel.getByRole('button',{name:'Review disabling MFA requirement'})).toBeEnabled();
 await panel.getByRole('button',{name:'Review disabling MFA requirement'}).click();await panel.getByRole('button',{name:'Confirm disabling MFA requirement'}).click();await expect(panel.getByRole('status')).toHaveText('Website MFA policy updated.');assert.equal(writes,3);
 policy={...policy,required:true,verified:false,canManage:false};await panel.getByRole('button',{name:'Reload MFA policy'}).click();await expect(panel.getByRole('status')).toContainText('Verify your authenticator');assert.equal(await panel.getByText('Manage website MFA requirement',{exact:true}).count(),0);
 await page.screenshot({path:`/private/tmp/cms-mfa-policy-${width}.png`,fullPage:true});await panel.getByRole('button',{name:'Set up or verify authenticator'}).click();await expect(page.getByRole('heading',{name:'Account security',exact:true})).toBeVisible();assert.deepEqual(errors,[]);await context.close();console.log(`PASS ${width}px: review/cancel, unconfirmed save reconciliation, stale version, explicit disable, verification guidance and navigation`);
}}finally{await browser.close();}
