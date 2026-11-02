export const recoveryStorageKey='safari-cms-recovery';
export function recoveryCallback(origin:string){
 const url=new URL(origin);
 if(url.username||url.password||url.pathname!=='/'||url.search||url.hash||(url.protocol!=='https:'&&!(url.protocol==='http:'&&['localhost','127.0.0.1','[::1]'].includes(url.hostname))))throw Error('Invalid recovery origin.');
 return `${url.origin}/cms/recover`;
}
export function recoveryCode(url:string):string|null{
 const value=new URL(url);if(value.hash||[...value.searchParams.keys()].some(key=>key!=='code')||value.searchParams.getAll('code').length>1)throw Error('Invalid recovery link.');
 const code=value.searchParams.get('code');if(code===null)return null;
 if(!/^[A-Za-z0-9_-]{16,512}$/.test(code))throw Error('Invalid recovery link.');return code;
}
/** Only the PKCE verifier persists. Recovery access/refresh tokens stay in memory,
 * isolated from the editor session and disappear when this page closes. */
export function recoveryStorage(persistent:Pick<Storage,'getItem'|'setItem'|'removeItem'>){
 const memory=new Map<string,string>();const verifier=`${recoveryStorageKey}-code-verifier`;
 return {getItem:(key:string)=>key===verifier?persistent.getItem(key):memory.get(key)??null,setItem:(key:string,value:string)=>{if(key===verifier)persistent.setItem(key,value);else memory.set(key,value);},removeItem:(key:string)=>{if(key===verifier)persistent.removeItem(key);else memory.delete(key);}};
}
export function passwordProblem(password:string,confirmation:string){
 if(password.length<12||password.length>128)return 'Use between 12 and 128 characters.';
 if(password!==confirmation)return 'The passwords do not match.';return null;
}
