'use client';
import {useEffect,useMemo,useRef,useState} from 'react';
import {createClient} from '@supabase/supabase-js';
import './download.css';
export function DocumentDownloadPage({record,revision,config}:{record:string;revision?:string;config:{url:string;key:string}|null}){
 const auth=useMemo(()=>config?createClient(config.url,config.key,{auth:{storageKey:'safari-document-visitor',persistSession:false,autoRefreshToken:true,detectSessionInUrl:false}}):null,[config]);
 const [signed,setSigned]=useState(false),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[error,setError]=useState('');
 const controller=useRef<AbortController|null>(null),generation=useRef(0),locked=useRef(false);
 useEffect(()=>{const current=++generation.current;setSigned(false);setMessage('');setError('');const subscription=auth?.auth.onAuthStateChange((_event,session)=>{if(current===generation.current)setSigned(Boolean(session));});return()=>{generation.current++;controller.current?.abort();subscription?.data.subscription.unsubscribe();auth?.auth.stopAutoRefresh();};},[auth,record,revision]);
 async function download(){
  if(locked.current)return;locked.current=true;setBusy(true);setMessage('');setError('');const current=generation.current,abort=new AbortController();controller.current=abort;
  try{
   const session=await auth?.auth.getSession();if(session?.error)throw Error('Sign in again before downloading.');
   const token=session?.data.session?.access_token;
   const response=await fetch(`/api/documents/download?record=${encodeURIComponent(record)}${revision?`&revision=${encodeURIComponent(revision)}`:''}`,{headers:token?{Authorization:`Bearer ${token}`}:{},cache:'no-store',credentials:'omit',redirect:'error',signal:abort.signal});
   if(!response.ok)throw Error(response.status===401?'Your session has expired. Sign in again.':response.status===403?'Access changed. Try the download again.':response.status===409?'This document version has been replaced. Ask for an updated link.':response.status===404?'This document is unavailable or requires sign-in.':'The download is temporarily unavailable. Try again.');
   if(response.headers.get('content-type')?.split(';')[0].trim()!=='application/pdf')throw Error('The file could not be verified.');
   const length=response.headers.get('content-length');if(length!==null&&(!/^\d+$/.test(length)||Number(length)<1||Number(length)>25_000_000))throw Error('The file could not be verified.');
   const reader=response.body?.getReader();if(!reader)throw Error('The file is empty.');let total=0;const chunks:Uint8Array<ArrayBuffer>[]=[];
   try{while(true){const part=await reader.read();if(part.done)break;total+=part.value.length;if(total>25_000_000)throw Error('The file is too large.');chunks.push(new Uint8Array(part.value));}}catch(e){void reader.cancel().catch(()=>{});throw e;}finally{reader.releaseLock();}
   if(total<1||length!==null&&total!==Number(length))throw Error('The download was incomplete. Try again.');
   if(current!==generation.current||abort.signal.aborted)return;
   let filename='document.pdf';const encoded=/filename\*=UTF-8''([^;]+)/i.exec(response.headers.get('content-disposition')||'')?.[1];
   if(encoded){try{const value=decodeURIComponent(encoded);if(value.length<=200&&/\.pdf$/i.test(value)&&!/[\\/\u0000-\u001f\u007f]/.test(value)&&!value.startsWith('.'))filename=value;}catch{}}
   const url=URL.createObjectURL(new Blob(chunks,{type:'application/pdf'}));const link=document.createElement('a');link.href=url;link.download=filename;link.rel='noopener';document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);setMessage('Download started. Check your browser’s downloads.');
  }catch(e){if(current===generation.current)setError(abort.signal.aborted?'Download cancelled.':e instanceof Error?e.message:'Download unavailable.');}
  finally{if(current===generation.current){setBusy(false);controller.current=null;}locked.current=false;}
 }
 async function signIn(event:React.FormEvent<HTMLFormElement>){event.preventDefault();if(!auth||locked.current)return;locked.current=true;setBusy(true);setError('');setMessage('');const current=generation.current,form=event.currentTarget,data=new FormData(form);try{const result=await auth.auth.signInWithPassword({email:String(data.get('email')),password:String(data.get('password'))});if(result.error)throw Error('Sign-in failed. Check your email and password.');if(current===generation.current){form.reset();setMessage('Signed in. You can now request the download.');}}catch(e){if(current===generation.current)setError(e instanceof Error?e.message:'Sign-in failed.');}finally{locked.current=false;if(current===generation.current)setBusy(false);}}
 async function signOut(){if(!auth||locked.current)return;locked.current=true;setBusy(true);setError('');try{const result=await auth.auth.signOut({scope:'local'});if(result.error)throw Error('Sign-out failed. Try again.');setSigned(false);setMessage('Signed out.');}catch(e){setError(e instanceof Error?e.message:'Sign-out failed.');}finally{locked.current=false;setBusy(false);}}
 return <section className='document-download-page'><p className='eyebrow'>Safari Crafters resources</p><h1>Your document</h1><p>{revision?'This link requests a specific document version. If it has been replaced or withdrawn, you will need an updated link.':'Download the currently published PDF.'} Some documents require an account provided by Safari Crafters.</p><button disabled={busy} onClick={()=>void download()}>Download PDF</button>{busy&&controller.current&&<button onClick={()=>controller.current?.abort()}>Cancel download</button>}{message&&<p role='status'>{message}</p>}{error&&<p role='alert'>{error}</p>}{auth&&(signed?<div><p>You are signed in for document access.</p><button disabled={busy} onClick={()=>void signOut()}>Sign out</button></div>:<form onSubmit={signIn}><h2>Sign in for restricted documents</h2><p>Use your visitor account. Signing in does not grant CMS editing access.</p><label>Email<input name='email' type='email' autoComplete='username' required disabled={busy}/></label><label>Password<input name='password' type='password' autoComplete='current-password' required disabled={busy}/></label><button disabled={busy} type='submit'>Sign in</button></form>)}</section>;
}
