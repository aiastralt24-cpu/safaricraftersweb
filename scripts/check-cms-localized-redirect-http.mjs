/** Real Next/proxy integration against the explicit local read-only fixture. */
import fs from 'node:fs/promises';import assert from 'node:assert/strict';
const origin=process.env.CMS_REDIRECT_TEST_ORIGIN??'http://localhost:3002',state=process.env.CMS_REDIRECT_FIXTURE_STATE;
if(!['localhost','127.0.0.1'].includes(new URL(origin).hostname)||!state?.startsWith('/private/tmp/'))throw Error('Local fixture origin and temporary state required.');
const mode=async value=>{await fs.writeFile(state,JSON.stringify({mode:value}));await fs.writeFile(state+'.calls','');};
const request=(path,method='GET')=>fetch(origin+path,{method,redirect:'manual',signal:AbortSignal.timeout(10000)});
const calls=async()=>{const text=await fs.readFile(state+'.calls','utf8');return text.trim()?text.trim().split('\n').map(JSON.parse):[];};
try{
 await mode('ready');
 if(process.env.CMS_LOCALIZED_REDIRECT_TEST_DISABLED==='true'){
  const response=await request('/languages/fr/former-page');assert.equal(response.status,404);assert.equal(response.headers.get('location'),null);assert.equal((await calls()).filter(call=>call.name==='get_public_page_redirect').length,0);console.log('PASS localized rollout disabled: no redirect lookup and no English fallback.');
 }else{
  for(const locale of ['fr','fr-CA'])for(const method of ['GET','HEAD']){
   await mode('ready');const response=await request(`/languages/${locale}/former-page?trip=forest%20walk&x=1`,method);assert.equal(response.status,308);const destination=new URL(response.headers.get('location'),origin);assert.equal(destination.origin,origin);assert.equal(destination.pathname,`/languages/${locale}/current-page`);assert.deepEqual([...destination.searchParams],[['trip','forest walk'],['x','1']]);assert.match(response.headers.get('cache-control'),/no-store/);assert.equal(response.headers.get('x-content-type-options'),'nosniff');if(method==='HEAD')assert.equal(await response.text(),'');else await response.text();const lookups=(await calls()).filter(call=>call.name==='get_public_page_redirect');assert.equal(lookups.length,1);assert.equal(lookups[0].args.p_locale,locale);assert.equal(lookups[0].args.p_path,'/former-page');
  }
  for(const value of ['external','mismatch','cycle','failure','timeout']){await mode(value);const before=Date.now(),response=await request('/languages/fr/former-page');assert.equal(response.status,503,value);assert.equal(response.headers.get('location'),null);assert.match(response.headers.get('x-robots-tag'),/noindex/);assert.equal(response.headers.get('retry-after'),'60');await response.text();if(value==='timeout')assert.ok(Date.now()-before<5000);}
  for(const value of ['withdrawn','ready']){await mode(value);const response=await request(value==='withdrawn'?'/languages/fr/former-page':'/languages/de/former-page');assert.equal(response.status,404);assert.equal(response.headers.get('location'),null);await response.text();const lookups=(await calls()).filter(call=>call.name==='get_public_page_redirect');assert.equal(lookups.length,1);assert.notEqual(lookups[0].args.p_locale,'en');}
  for(const [path,method] of [['/languages/en/former-page','GET'],['/languages/FR/former-page','GET'],['/languages/fr/cms','GET'],['/languages/fr/former-page','POST']]){await mode('ready');const response=await request(path,method);assert.notEqual(response.status,308);await response.arrayBuffer();assert.equal((await calls()).filter(call=>call.name==='get_public_page_redirect').length,0);}
  console.log('PASS localized HTTP: exact fr/fr-CA GET/HEAD, query preservation, missing/withdrawn language without fallback, unsafe/provider/timeout failures and excluded routes/methods.');
 }
}finally{await mode('ready');}
