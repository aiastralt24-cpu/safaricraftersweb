/** Optional analytics require a current explicit choice; essential storage is unaffected. */
let blockedAfterStorageFailure=false;
export const consentStorageKey='safari-cookie-preferences-v1';
export const consentChangedEvent='safari-cookie-preferences-changed';
export const consentLifetimeMs=180*24*60*60*1000;
export type CookieConsent={version:1;analytics:boolean;decidedAt:number};
export function parseCookieConsent(raw:string|null,now=Date.now()):CookieConsent|null{
 if(!raw)return null;
 try{
  const value=JSON.parse(raw);
  if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).sort().join(',')!=='analytics,decidedAt,version'||value.version!==1||typeof value.analytics!=='boolean'||!Number.isSafeInteger(value.decidedAt)||value.decidedAt<0||value.decidedAt>now||now-value.decidedAt>=consentLifetimeMs)return null;
  return value;
 }catch{return null;}
}
export function readCookieConsent():CookieConsent|null{
 if(typeof window==='undefined')return null;
 try{return parseCookieConsent(window.localStorage.getItem(consentStorageKey));}catch{return null;}
}
export function clearFunnelSession(storage:Storage){
 // Preserve unrelated cart, draft and authentication storage.
 const keys:string[]=[];
 for(let i=0;i<storage.length;i++){const key=storage.key(i);if(key==='safari-visit'||key?.startsWith('safari-event:'))keys.push(key);}
 for(const key of keys)storage.removeItem(key);
}
/** A storage failure is reported to the UI, never represented as saved consent. */
export function saveCookieConsent(analytics:boolean):boolean{
 if(typeof window==='undefined')return false;
 blockedAfterStorageFailure=true;
 try{clearFunnelSession(window.sessionStorage);}catch{}
 try{
  window.localStorage.setItem(consentStorageKey,JSON.stringify({version:1,analytics,decidedAt:Date.now()} satisfies CookieConsent));
  if(!analytics){try{clearFunnelSession(window.sessionStorage);}catch{}}
  blockedAfterStorageFailure=false;
  window.dispatchEvent(new Event(consentChangedEvent));
  return true;
 }catch{return false;}
}
export function analyticsConsentGranted(){
 return !blockedAfterStorageFailure&&typeof navigator!=='undefined'&&navigator.doNotTrack!=='1'&&readCookieConsent()?.analytics===true;
}
