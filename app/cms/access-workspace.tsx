'use client';
import {useEffect,useRef,useState} from 'react';
import {AccessHistoryPanel} from './access-history-panel';
import {RoleEditor} from './role-editor';
import type {AccessPermission} from '../../lib/cms/access-role-draft';
type Member={userId:string;email:string|null;roleId:string;version:number;expiresAt:string|null;revokedAt:string|null;status:'active'|'expired'|'revoked'};
type Role={id:string;name:string;version:number;permissions:AccessPermission[]};
type Props={site:string;api:(path:string,options?:RequestInit)=>Promise<any>;busy:boolean;run:(work:()=>Promise<void>)=>Promise<void>;onDirty:(value:boolean)=>void};
export function AccessWorkspace({site,api,busy:externalBusy,run,onDirty}:Props){
 const [members,setMembers]=useState<Member[]>([]),[roles,setRoles]=useState<Role[]>([]),[cursor,setCursor]=useState<string|null>(null),[ready,setReady]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState('');
 const [selected,setSelected]=useState<Member|null>(null),[roleId,setRoleId]=useState(''),[expiry,setExpiry]=useState(''),[revoked,setRevoked]=useState(false),[dirty,setDirty]=useState(false),[review,setReview]=useState(false),[uncertain,setUncertain]=useState(false);
 const [roleDirty,setRoleDirty]=useState(false);
 const busy=externalBusy||roleDirty;
 const alive=useRef(true),apiRef=useRef(api);apiRef.current=api;
 useEffect(()=>onDirty(dirty||roleDirty),[dirty,roleDirty,onDirty]);
 async function load(append=false){
  setError('');
  try{
   const memberPage=await apiRef.current(`/api/cms/access?site=${site}&kind=members&limit=50${append&&cursor?`&after=${cursor}`:''}`);
   let allRoles:Role[]=[];
   if(!append){let after:string|null=null;const seen=new Set<string>();do{
    const page=await apiRef.current(`/api/cms/access?site=${site}&kind=roles&limit=100${after?`&after=${after}`:''}`);
    allRoles.push(...page.items);after=page.nextCursor;
    if(after&&(seen.has(after)||seen.size>=100))throw new Error('The role list could not be loaded completely. Please try again.');
    if(after)seen.add(after);
   }while(after);}
   if(!alive.current)return;
   setMembers(previous=>append?[...previous,...memberPage.items]:memberPage.items);setCursor(memberPage.nextCursor);
   if(!append){setRoles(allRoles);setRoleDirty(false);setSelected(null);setDirty(false);setReview(false);setUncertain(false);}
   setReady(true);
  }catch(reason){if(alive.current){setError(reason instanceof Error?reason.message:'Access settings could not be loaded.');if(!append){setReady(false);setRoleDirty(false);setMembers([]);setRoles([]);setSelected(null);setDirty(false);}}}
 }
 useEffect(()=>{alive.current=true;run(()=>load());return()=>{alive.current=false;};},[site]); // eslint-disable-line react-hooks/exhaustive-deps
 function choose(member:Member){if(dirty&&!window.confirm('Discard unsaved access changes?'))return;setSelected(member);setRoleId(member.roleId);setExpiry(member.expiresAt?new Date(member.expiresAt).toISOString().slice(0,19):'');setRevoked(Boolean(member.revokedAt));setDirty(false);setReview(false);setUncertain(false);setMessage('');setError('');}
 function change(){setDirty(true);setReview(false);setMessage('');}
 const chosenRole=roles.find(role=>role.id===roleId);
 const expiryValid=!expiry||(Number.isFinite(Date.parse(`${expiry}Z`))&&Date.parse(`${expiry}Z`)>Date.now());
 async function save(){
  if(!selected||!chosenRole||!expiryValid)return;
  setError('');
  try{
   const result=await apiRef.current('/api/cms/access',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({site,userId:selected.userId,expectedVersion:selected.version,expectedRoleVersion:chosenRole.version,roleId,expiresAt:expiry?new Date(`${expiry}Z`).toISOString():null,revoked})});
   if(!alive.current)return;
   setMembers(previous=>previous.map(item=>item.userId===selected.userId?{...item,...result.member}:item));setSelected({...selected,...result.member});setDirty(false);setReview(false);setMessage('Access updated. The change has been recorded in the audit history.');
  }catch(reason){if(alive.current){setError(`${reason instanceof Error?reason.message:'The update could not be verified.'} Reload access before making another change.`);setUncertain(true);setReview(false);}}
 }
 return <section className='cms-access'><div className='cms-actions'><button disabled={externalBusy} onClick={()=>{if(!(dirty||roleDirty)||window.confirm('Reload access and discard unsaved changes?'))run(()=>load());}}>Reload access</button></div><p>Manage existing website memberships. An explicit access-administration permission is required. Account emails identify existing members; invitations are not available here yet.</p>{error&&<p role='alert'>{error}</p>}{message&&<p role='status'>{message}</p>}{ready&&<RoleEditor key={roles.map(role=>`${role.id}:${role.version}`).join(',')} site={site} roles={roles} disabled={externalBusy||dirty||uncertain} api={api} run={run} onDirty={setRoleDirty} onSaved={()=>load()}/>}{ready&&<div className='cms-library-grid'><aside aria-label='Website members'>{members.map(member=><button key={member.userId} disabled={busy||uncertain} aria-pressed={selected?.userId===member.userId} onClick={()=>choose(member)}><span className='cms-access-id'>{member.email??'Account without email'}</span><small className='cms-access-id'>{member.userId}</small><small>{roles.find(role=>role.id===member.roleId)?.name??'Unknown role'} · {member.status}</small></button>)}{members.length===0&&<p>No memberships found.</p>}{cursor&&<button disabled={busy||uncertain} onClick={()=>run(()=>load(true))}>Load more members</button>}</aside><div>{selected?<><h2>Website access</h2><p>{selected.email??'Account without email'}</p><p className='cms-access-id'>{selected.userId}</p><p>Current status: {selected.status} · Version {selected.version}</p><fieldset disabled={busy||uncertain||review}><legend>Membership settings</legend><label>Role<select value={roleId} onChange={e=>{setRoleId(e.target.value);change();}}>{roles.map(role=><option key={role.id} value={role.id}>{role.name}</option>)}</select></label><label>Access expires (UTC)<input type='datetime-local' step='1' value={expiry} onChange={e=>{setExpiry(e.target.value);change();}}/></label><p>Leave expiry empty for ongoing access.</p><label><input type='checkbox' checked={revoked} onChange={e=>{setRevoked(e.target.checked);change();}}/>Revoke this website membership</label></fieldset>{!expiryValid&&<p role='alert'>Choose a future expiry time in UTC, or clear the field.</p>}{chosenRole&&<details><summary>Permissions in {chosenRole.name} (version {chosenRole.version})</summary>{chosenRole.permissions.length?<ul>{chosenRole.permissions.map((permission,index)=><li key={index}>{permission.action} · {permission.contentType}{permission.recordId?` · Record ${permission.recordId}`:' · All records in scope'}</li>)}</ul>:<p>This role has no permissions.</p>}</details>}{review?<section aria-label='Review access change'><h3>Review access change</h3><p>Role: {roles.find(role=>role.id===selected.roleId)?.name} → {chosenRole?.name}</p><p>Expiry: {selected.expiresAt??'No expiry'} → {expiry?`${expiry.replace('T',' ')} UTC`:'No expiry'}</p><p>{revoked?'This member will lose access to this website.':'This membership will be active until its expiry, if set.'}</p><p>At least one permanent access administrator must remain. Changes to your own membership can remove your access.</p><button disabled={busy} onClick={()=>setReview(false)}>Back to editing</button><button className='primary' disabled={busy||!expiryValid} onClick={()=>run(save)}>Confirm access change</button></section>:<button disabled={busy||!dirty||uncertain||!expiryValid||!chosenRole} onClick={()=>setReview(true)}>Review change</button>}</>:<p>Select a member to inspect or change their access.</p>}</div></div>}{ready&&<AccessHistoryPanel site={site} revisionKey={[...roles.map(role=>`${role.id}:${role.version}`),...members.map(member=>`${member.userId}:${member.version}`)].join(',')} members={members} roles={roles} disabled={busy||dirty||uncertain} api={api}/>}</section>;
}
