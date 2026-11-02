'use client';
import {useEffect,useMemo,useRef,useState} from 'react';
import {createClient} from '@supabase/supabase-js';
type Factor={id:string;friendly_name?:string;status:string;factor_type:string};
type Setup={id:string;secret:string;qr:string};
export function AccountSecurity({config}:{config:{url:string;key:string}|null}){
 const auth=useMemo(()=>config?createClient(config.url,config.key,{auth:{storageKey:'safari-cms-auth',persistSession:true,autoRefreshToken:true,detectSessionInUrl:false}}):null,[config]);
 const actor=useRef<string|null>(null),locked=useRef(false);
 const [account,setAccount]=useState<string|null>(null),[checking,setChecking]=useState(true),[busy,setBusy]=useState(false),[ready,setReady]=useState(false);
 const signed=Boolean(account);
 const [factors,setFactors]=useState<Factor[]>([]),[level,setLevel]=useState<string|null>(null),[setup,setSetup]=useState<Setup|null>(null),[selected,setSelected]=useState(''),[code,setCode]=useState(''),[name,setName]=useState(''),[remove,setRemove]=useState<Factor|null>(null),[error,setError]=useState(''),[message,setMessage]=useState('');
 useEffect(()=>{if(!auth)return;let active=true;
  const {data}=auth.auth.onAuthStateChange((_event,session)=>{if(!active)return;const id=session?.user.id??null;if(actor.current!==id){actor.current=id;locked.current=false;setBusy(false);setSetup(null);setFactors([]);setLevel(null);setSelected('');setCode('');setRemove(null);setReady(false);setError('');setMessage('');}setAccount(id);setChecking(false);});
  return()=>{active=false;actor.current=null;data.subscription.unsubscribe();};
 },[auth]);
 async function run(work:(id:string)=>Promise<void>){if(locked.current||!auth||!actor.current)return;locked.current=true;setBusy(true);setError('');setMessage('');const id=actor.current;
  try{const current=await auth.auth.getUser();if(current.error||current.data.user?.id!==id||actor.current!==id)throw Error();await work(id);}catch{if(actor.current===id)setError('The account security action could not be confirmed. Reload security status before trying again.');}finally{if(actor.current===id){locked.current=false;setBusy(false);}}
 }
 async function load(id:string){if(!auth)return;setReady(false);const [listing,assurance]=await Promise.all([auth.auth.mfa.listFactors(),auth.auth.mfa.getAuthenticatorAssuranceLevel()]);if(listing.error||assurance.error)throw Error();if(actor.current!==id)return;
  setFactors(listing.data.all);setLevel(assurance.data.currentLevel);setSelected(listing.data.totp[0]?.id??'');setRemove(null);setReady(true);
 }
 useEffect(()=>{if(signed)void run(load);},[account]); // eslint-disable-line react-hooks/exhaustive-deps
 async function enroll(id:string){if(!auth)return;setSetup(null);const result=await auth.auth.mfa.enroll({factorType:'totp',friendlyName:name.trim()||'CMS authenticator'});if(result.error)throw Error();if(actor.current!==id)return;
  const qr=result.data.totp.qr_code;setSetup({id:result.data.id,secret:result.data.totp.secret,qr:qr.startsWith('data:image/svg+xml;')?qr:''});setSelected(result.data.id);setCode('');setMessage('Add this authenticator, then enter its current six-digit code. Setup is not complete until verification succeeds.');
 }
 async function verify(id:string){if(!auth||!/^\d{6}$/.test(code)||!selected)return;const result=await auth.auth.mfa.challengeAndVerify({factorId:selected,code});setCode('');if(result.error)throw Error();if(actor.current!==id)return;setSetup(null);await load(id);if(actor.current===id)setMessage('Authenticator verified for this session.');}
 async function removeFactor(id:string){if(!auth||!remove)return;const result=await auth.auth.mfa.unenroll({factorId:remove.id});if(result.error)throw Error();if(actor.current!==id)return;setSetup(null);setCode('');const refresh=await auth.auth.refreshSession();if(refresh.error)throw Error();await load(id);if(actor.current===id)setMessage('Authenticator removed. Session status refreshed.');}
 return <div className='cms-workspace' style={{display:'block',minHeight:'100vh'}}><main className='cms-login' style={{maxWidth:640,margin:'0 auto',padding:24}}><h1>Account security</h1>{!config?<p>Account security is unavailable until the CMS connection is configured.</p>:checking?<p role='status'>Checking your session…</p>:!signed?<p>Sign in to the CMS before managing authenticators.</p>:<>
 <p>Use an authenticator app to verify your identity with a six-digit code. Save any unfinished content before changing authenticators.</p><button disabled={busy} onClick={()=>{setSetup(null);setCode('');void run(load);}}>Reload security status</button>
 {error&&<p role='alert'>{error}</p>}{message&&<p role='status'>{message}</p>}
 {ready&&<><p>Session verification: {level==='aal2'?'Password and second factor verified':'Second factor not verified for this session'}</p>
 <h2>Your authenticators</h2>{factors.length?<ul>{factors.map(factor=><li key={factor.id}>{factor.friendly_name||'Authenticator'} · {factor.factor_type} · {factor.status}<button disabled={busy||Boolean(setup)||factor.status==='verified'&&level!=='aal2'} onClick={()=>setRemove(factor)}>Remove {factor.friendly_name||'authenticator'}</button></li>)}</ul>:<p>No authenticators enrolled.</p>}
 {remove?<section aria-label='Confirm authenticator removal'><h3>Remove {remove.friendly_name||'authenticator'}?</h3><p>You will no longer be able to use this authenticator. Removing your last verified factor may prevent access where MFA is required. Keep another verified authenticator available.</p><button disabled={busy} onClick={()=>setRemove(null)}>Keep authenticator</button><button disabled={busy} onClick={()=>void run(removeFactor)}>Confirm removal</button></section>:<>
 {!setup&&<form onSubmit={event=>{event.preventDefault();void run(enroll);}}><label>Authenticator name<input maxLength={64} value={name} onChange={event=>setName(event.target.value)} disabled={busy}/></label><button disabled={busy||factors.length>=10}>Set up authenticator</button></form>}
 {setup&&<section aria-label='Authenticator setup'><h3>Add to your authenticator app</h3>{setup.qr&&<img src={setup.qr} alt='Scan this QR code with your authenticator app' width={200} height={200}/>}<p>Or enter this setup key manually:</p><code style={{overflowWrap:'anywhere'}}>{setup.secret}</code><p>Keep this key private. It is shown only during setup.</p><button disabled={busy} onClick={()=>{setSetup(null);setCode('');void run(load);}}>Hide setup and reload</button></section>}
 {(setup||factors.some(factor=>factor.factor_type==='totp'&&factor.status==='verified'))&&<form onSubmit={event=>{event.preventDefault();void run(verify);}}>{!setup&&<label>Authenticator<select value={selected} onChange={event=>{setSelected(event.target.value);setCode('');}} disabled={busy}>{factors.filter(factor=>factor.factor_type==='totp'&&factor.status==='verified').map(factor=><option key={factor.id} value={factor.id}>{factor.friendly_name||'Authenticator'}</option>)}</select></label>}<label>Six-digit code<input autoComplete='one-time-code' inputMode='numeric' pattern='[0-9]{6}' maxLength={6} required value={code} onChange={event=>setCode(event.target.value.replace(/\D/g,''))} disabled={busy}/></label><button disabled={busy||!/^\d{6}$/.test(code)}>Verify authenticator</button></form>}
 </>}</>}
 </>}<p><a href='/cms'>Back to CMS</a></p></main></div>;
}
