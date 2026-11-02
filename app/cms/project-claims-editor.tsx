'use client';
import type {ProjectDraft} from '../../lib/cms/projects';
import type {ImageEditorContext} from './section-image-editor';
import {RecordPicker} from './record-picker';

export function ProjectClaimsEditor({value,onChange,context}:{value:ProjectDraft['claims'];onChange:(value:ProjectDraft['claims'])=>void;context:ImageEditorContext}){
 const update=(id:string,patch:Partial<ProjectDraft['claims'][number]>)=>onChange(value.map(claim=>claim.id===id?{...claim,...patch}:claim));
 return <section aria-label='Project claim evidence'><h3>Claim evidence</h3><p>Keep supporting evidence for certification, warranty and performance claims. The approval contact is a planning note, not an approval or permission grant. Evidence and review notes are internal and are excluded from the page preview.</p>
 {value.map((claim,index)=><fieldset key={claim.id} disabled={context.disabled}><legend>Claim {index+1}</legend>
 <label>Claim statement<textarea maxLength={2000} value={claim.statement} onChange={e=>update(claim.id,{statement:e.target.value})}/><small>{claim.statement.length} / 2000 characters</small></label>
 <label>Intended approval contact<input maxLength={200} value={claim.approvalContact} onChange={e=>update(claim.id,{approvalContact:e.target.value})}/></label>
 <label>Claim review date<input type='date' value={claim.reviewOn} onChange={e=>update(claim.id,{reviewOn:e.target.value})}/></label>
 <h4>Supporting documents</h4><RecordPicker type='document' value={claim.evidence} max={30} context={context} onChange={evidence=>update(claim.id,{evidence})}/>
 <button type='button' onClick={()=>onChange(value.filter(row=>row.id!==claim.id))}>Remove claim {index+1}</button></fieldset>)}
 <button type='button' disabled={context.disabled||value.length>=30} onClick={()=>onChange([...value,{id:crypto.randomUUID(),statement:'',evidence:[],approvalContact:'',reviewOn:''}])}>Add claim</button></section>;
}
