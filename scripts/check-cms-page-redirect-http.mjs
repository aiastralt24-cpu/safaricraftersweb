/** Real Next HTTP/proxy checks against an explicitly local fixture provider. */
import fs from 'node:fs/promises';import assert from 'node:assert/strict';
const origin=process.env.CMS_REDIRECT_TEST_ORIGIN??'http://localhost:3002',state=process.env.CMS_REDIRECT_FIXTURE_STATE;
if(!['localhost','127.0.0.1'].includes(new URL(origin).hostname)||!state?.startsWith('/private/tmp/'))throw Error('Local fixture origin and temporary state required.');
const mode=async value=>{await fs.writeFile(state,JSON.stringify({mode:value}));await fs.writeFile(state+'.calls','');};
const request=(path,method='GET')=>fetch(origin+path,{method,redirect:'manual',signal:AbortSignal.timeout(10000)});
const calls=async()=>{const text=await fs.readFile(state+'.calls','utf8');return text.trim()?text.trim().split('\n').map(JSON.parse):[];};
try{
 await mode('ready');
 if(process.env.CMS_REDIRECT_TEST_DISABLED==='true'){
  const result=await request('/former-page');assert.equal(result.status,404);assert.equal(result.headers.get('location'),null);assert.equal((await calls()).filter(c=>c.name==='get_public_page_redirect').length,0);console.log('PASS: disabled redirect rollout performs no redirect RPC and preserves route 404.');
 }else{
  for(const method of ['GET','HEAD']){const result=await request('/former-page?trip=forest%20walk&x=1',method);assert.equal(result.status,308);const location=new URL(result.headers.get('location'),origin);assert.equal(location.origin,origin);assert.equal(location.pathname,'/current-page');assert.deepEqual([...location.searchParams],[['trip','forest walk'],['x','1']]);assert.match(result.headers.get('cache-control'),/no-store/);assert.equal(result.headers.get('x-content-type-options'),'nosniff');const body=await result.text();if(method==='HEAD')assert.equal(body,'');else assert.equal(body,result.headers.get('location'));}
  for(const path of ['/older-page','/former-page']){const result=await request(path);assert.equal(new URL(result.headers.get('location'),origin).href,origin+'/current-page');}
  for(const value of ['external','mismatch','cycle','failure','timeout']){await mode(value);const start=Date.now(),result=await request('/former-page');assert.equal(result.status,503,value);assert.equal(result.headers.get('location'),null);assert.match(result.headers.get('cache-control'),/no-store/);assert.match(result.headers.get('x-robots-tag'),/noindex/);assert.equal(result.headers.get('retry-after'),'60');assert.equal(await result.text(),'Page routing is temporarily unavailable.');if(value==='timeout')assert.ok(Date.now()-start<5000,'Bounded routing timeout');}
  await mode('withdrawn');const gone=await request('/former-page');assert.equal(gone.status,404);assert.equal(gone.headers.get('location'),null);
  await mode('ready');assert.equal((await request('/missing-page')).status,404);
  for(const [path,method] of [['/cms','GET'],['/api/cms/browser-config','GET'],['/former-page','POST']]){await mode('ready');const result=await request(path,method);assert.notEqual(result.status,308);await result.arrayBuffer();assert.equal((await calls()).filter(c=>c.name==='get_public_page_redirect').length,0,`${method} ${path} bypasses redirect lookup`);}
  console.log('PASS: real Next HTTP GET/HEAD redirects, query preservation, direct aliases, unsafe/provider/timeout failures, withdrawn/missing destinations and excluded methods/routes (local fixture provider).');
 }
}finally{await mode('ready');}
