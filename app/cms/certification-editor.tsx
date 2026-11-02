'use client';
import type {CertificationDraft} from '../../lib/cms/certifications';
import {RecordPicker} from './record-picker';
import type {ImageEditorContext} from './section-image-editor';
import {PageSeoEditor} from './page-seo-editor';
export function CertificationEditor({value,onChange,context,existing}:{value:CertificationDraft;onChange:(v:CertificationDraft)=>void;context:ImageEditorContext;existing:boolean}){
 const change=(patch:Partial<CertificationDraft>)=>onChange({...value,...patch});
 return <fieldset disabled={context.disabled}><legend>Certification draft</legend>
 {([['title','Title',200],['issuer','Issuing organization',200],['certificateNumber','Certificate number',200],['summary','Summary',2000],['statement','Certification claim',2000],['scope','Scope of certification',2000],['statusNote','Status explanation',2000],['internalNotes','Internal notes',2000]] as const).map(([field,label,max])=><label key={field}>{label}{max>200?<textarea rows={4} maxLength={max} value={value[field]} onChange={e=>change({[field]:e.target.value})}/>:<input maxLength={max} value={value[field]} onChange={e=>change({[field]:e.target.value})}/>}<small>{value[field].length} / {max} characters</small></label>)}
 <label>URL slug<input maxLength={100} disabled={existing} value={value.slug} onChange={e=>change({slug:e.target.value})}/></label>
 <label>Certificate status<select value={value.status} onChange={e=>change({status:e.target.value as CertificationDraft['status']})}>{['active','suspended','revoked'].map(v=><option key={v}>{v}</option>)}</select></label>
 <label>Validity type<select value={value.validity} onChange={e=>change({validity:e.target.value as CertificationDraft['validity'],...(e.target.value==='noExpiry'?{expiresOn:''}:{})})}><option value='unspecified'>Choose validity</option><option value='dated'>Has an expiry date</option><option value='noExpiry'>No expiry stated on certificate</option></select></label>
 <p>Dates use UTC. Expiry includes the selected day. Review is due at the start of its selected day.</p>
 {([['issuedOn','Issue date'],['validFrom','Valid from'],['expiresOn','Expiry date'],['reviewOn','Next review date']] as const).map(([field,label])=><label key={field}>{label}<input type='date' disabled={field==='expiresOn'&&value.validity==='noExpiry'} value={value[field]} onChange={e=>change({[field]:e.target.value})}/></label>)}
 <section aria-label='Certificate evidence'><h3>Supporting evidence</h3><p>Select certificate documents. Selection alone does not approve the claim.</p><RecordPicker type='document' max={30} value={value.evidence} context={context} onChange={evidence=>change({evidence})}/></section>
 <details><summary>Related content</summary>{([['locations','location'],['pages','page']] as const).map(([group,type])=><section key={group}><h3>{group}</h3><RecordPicker type={type} max={30} value={value.relationships[group]} context={context} onChange={rows=>change({relationships:{...value.relationships,[group]:rows}})}/></section>)}</details>
 <PageSeoEditor value={value.seo} context={context} onChange={seo=>change({seo})}/>
 </fieldset>;
}
