import test from 'node:test';
import assert from 'node:assert/strict';
import {parseCookieConsent,consentLifetimeMs,consentStorageKey,consentChangedEvent,saveCookieConsent,readCookieConsent,clearFunnelSession} from '../lib/cookie-consent.ts';
import {trackFunnel} from '../lib/funnel-client.ts';
function storage(){const map=new Map();return {get length(){return map.size;},key:i=>[...map.keys()][i]??null,getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v),removeItem:k=>map.delete(k)};}
test('consent requires explicit boolean, current version and unexpired nonfuture decision',()=>{
 const now=consentLifetimeMs*2,valid={version:1,analytics:true,decidedAt:now-1};
 assert.deepEqual(parseCookieConsent(JSON.stringify(valid),now),valid);
 for(const raw of [null,'bad','[]','null',JSON.stringify({...valid,version:2}),JSON.stringify({...valid,analytics:'yes'}),JSON.stringify({...valid,extra:1}),JSON.stringify({...valid,decidedAt:now+1}),JSON.stringify({...valid,decidedAt:now-consentLifetimeMs})])assert.equal(parseCookieConsent(raw,now),null);
 assert.equal(parseCookieConsent(JSON.stringify({...valid,analytics:false}),now).analytics,false);
});
test('revocation clears only analytics session keys',()=>{
 const s=storage();for(const k of ['safari-visit','safari-event:a','cart','cms-draft'])s.setItem(k,'saved');clearFunnelSession(s);assert.equal(s.getItem('safari-visit'),null);assert.equal(s.getItem('safari-event:a'),null);assert.equal(s.getItem('cart'),'saved');assert.equal(s.getItem('cms-draft'),'saved');
});
test('tracking sends nothing until acceptance, honours revocation and fails closed on unavailable storage',async()=>{
 const oldWindow=globalThis.window,oldSession=globalThis.sessionStorage,oldFetch=globalThis.fetch,oldFlag=process.env.NEXT_PUBLIC_FUNNEL_ENABLED,oldNavigator=Object.getOwnPropertyDescriptor(globalThis,'navigator');
 const local=storage(),session=storage(),events=[],requests=[];
 globalThis.window={localStorage:local,sessionStorage:session,location:{pathname:'/journeys/forest'},dispatchEvent:e=>events.push(e.type)};globalThis.sessionStorage=session;Object.defineProperty(globalThis,'navigator',{configurable:true,value:{doNotTrack:'0'}});globalThis.fetch=async(...args)=>{requests.push(args);return new Response(null,{status:204});};process.env.NEXT_PUBLIC_FUNNEL_ENABLED='true';
 try{
  trackFunnel('trip_viewed');assert.equal(requests.length,0);assert.equal(session.length,0);
  assert.equal(saveCookieConsent(true),true);assert.equal(readCookieConsent().analytics,true);assert.deepEqual(events,[consentChangedEvent]);
  trackFunnel('trip_viewed');assert.equal(requests.length,1);assert.equal(JSON.parse(requests[0][1].body).path,'/journeys/forest');trackFunnel('trip_viewed');assert.equal(requests.length,1);
  assert.equal(saveCookieConsent(false),true);assert.equal(session.length,0);trackFunnel('planner_started');assert.equal(requests.length,1);
  saveCookieConsent(true);globalThis.navigator.doNotTrack='1';trackFunnel('planner_started');assert.equal(requests.length,1);
  globalThis.navigator.doNotTrack='0';local.setItem(consentStorageKey,'malformed');trackFunnel('planner_started');assert.equal(requests.length,1);
  saveCookieConsent(true);window.localStorage={getItem:k=>local.getItem(k),setItem(){throw Error('denied');}};assert.equal(saveCookieConsent(false),false);trackFunnel('planner_started');assert.equal(requests.length,1);
  window.localStorage={getItem(){throw Error('denied');},setItem(){throw Error('denied');}};assert.equal(saveCookieConsent(true),false);trackFunnel('planner_started');assert.equal(requests.length,1);
 }finally{
  if(oldWindow===undefined)delete globalThis.window;else globalThis.window=oldWindow;
  if(oldSession===undefined)delete globalThis.sessionStorage;else globalThis.sessionStorage=oldSession;
  globalThis.fetch=oldFetch;if(oldNavigator)Object.defineProperty(globalThis,'navigator',oldNavigator);else delete globalThis.navigator;
  if(oldFlag===undefined)delete process.env.NEXT_PUBLIC_FUNNEL_ENABLED;else process.env.NEXT_PUBLIC_FUNNEL_ENABLED=oldFlag;
 }
});
