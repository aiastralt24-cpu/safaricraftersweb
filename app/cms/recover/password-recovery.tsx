'use client';
import {useEffect,useRef,useState} from 'react';
import {createClient,type SupabaseClient} from '@supabase/supabase-js';
import {passwordProblem,recoveryCallback,recoveryCode,recoveryStorage,recoveryStorageKey} from '../../../lib/cms/password-recovery';
type Stage='checking'|'request'|'sent'|'password'|'done'|'invalid';
export function PasswordRecovery({config}:{config:{url:string;key:string}|null}){
 const started=useRef(false),client=useRef<SupabaseClient|null>(null),working=useRef(false);
 const [stage,setStage]=useState<Stage>('checking'),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
 const [password,setPassword]=useState(''),[confirmation,setConfirmation]=useState('');
 useEffect(()=>{if(started.current||!config)return;started.current=true;
  const original=window.location.href;window.history.replaceState(null,'','/cms/recover');
  void(async()=>{try{
   const code=recoveryCode(original);
   const auth=createClient(config.url,config.key,{auth:{storageKey:recoveryStorageKey,storage:recoveryStorage(window.localStorage),flowType:'pkce',persistSession:true,autoRefreshToken:false,detectSessionInUrl:false}});client.current=auth;
   if(!code){setStage('request');return;}
   let recovered=false;const {data:listener}=auth.auth.onAuthStateChange(event=>{if(event==='PASSWORD_RECOVERY')recovered=true;});
   try{const result=await auth.auth.exchangeCodeForSession(code);
    if(result.error||!result.data.session||!recovered)throw Error('Invalid recovery session.');
   }finally{listener.subscription.unsubscribe();}
   setStage('password');
  }catch{client.current=null;setStage('invalid');setMessage('This recovery link is invalid, expired, or was opened in another browser. Request a new link and open the newest email in this browser.');}})();
 },[config]);
 async function request(form:HTMLFormElement){if(working.current||!client.current)return;working.current=true;setBusy(true);setMessage('');try{
  const email=String(new FormData(form).get('email')??'').trim();
  const result=await client.current.auth.resetPasswordForEmail(email,{redirectTo:recoveryCallback(window.location.origin)});
  if(result.error)throw Error('Request failed.');setStage('sent');
 }catch{setMessage('Could not request a recovery email. Please try again later.');}finally{working.current=false;setBusy(false);}}
 async function update(){if(working.current||stage!=='password'||!client.current)return;const problem=passwordProblem(password,confirmation);if(problem){setMessage(problem);return;}
  working.current=true;setBusy(true);setMessage('');try{
   const result=await client.current.auth.updateUser({password});if(result.error||!result.data.user)throw Error('Update failed.');
   setPassword('');setConfirmation('');setStage('done');
   // The client is isolated and memory-only; a failed logout never persists its session.
   const completed=client.current;client.current=null;void completed.auth.signOut({scope:'local'}).catch(()=>{});
  }catch{setPassword('');setConfirmation('');setMessage('Could not confirm the password change. If the link expired, request a new one; if the connection failed, try signing in before repeating it.');}finally{working.current=false;setBusy(false);}
 }
 return <div className='cms-workspace' style={{display:'block',minHeight:'100vh'}}><main className='cms-login' style={{maxWidth:520,margin:'0 auto',padding:24}}><h1>Recover CMS access</h1>
 {!config?<p>Password recovery is unavailable until the CMS connection is configured.</p>:<>
 {stage==='checking'&&<p role='status'>Checking recovery link…</p>}
 {stage==='request'&&<form onSubmit={event=>{event.preventDefault();void request(event.currentTarget);}}><p>Enter your workspace email. Open the newest recovery email in this same browser and device.</p><label>Email<input name='email' type='email' autoComplete='username' maxLength={254} required disabled={busy}/></label><button className='primary' disabled={busy}>{busy?'Requesting…':'Send recovery email'}</button></form>}
 {stage==='sent'&&<p role='status'>If an account exists for that email, you’ll receive a recovery link. Check your inbox and spam folder.</p>}
 {stage==='password'&&<form onSubmit={event=>{event.preventDefault();void update();}}><p>Choose a new password with 12–128 characters. Your provider may require additional strength.</p><label>New password<input type='password' autoComplete='new-password' minLength={12} maxLength={128} value={password} onChange={event=>setPassword(event.target.value)} disabled={busy} required/></label><label>Confirm new password<input type='password' autoComplete='new-password' minLength={12} maxLength={128} value={confirmation} onChange={event=>setConfirmation(event.target.value)} disabled={busy} required/></label><button className='primary' disabled={busy}>{busy?'Updating…':'Update password'}</button></form>}
 {stage==='done'&&<p role='status'>Password updated. Sign in to the CMS with your new password.</p>}
 {message&&<p role='alert'>{message}</p>}{(stage==='invalid'||stage==='password'||stage==='sent')&&<p><a href='/cms/recover'>Request a new recovery link</a></p>}
 </>}<p><a href='/cms'>Back to CMS sign-in</a></p></main></div>;
}
