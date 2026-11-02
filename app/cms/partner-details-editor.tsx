'use client';
import type {PartnerDraft} from '../../lib/cms/partners';
export function PartnerDetailsEditor({value,onChange}:{value:PartnerDraft;onChange:(patch:Partial<PartnerDraft>)=>void}){
 return <section aria-label='Partner details'>
 <label>Partner status<select value={value.status} onChange={e=>onChange({status:e.target.value as PartnerDraft['status']})}><option value='active'>Active</option><option value='inactive'>Inactive</option></select></label>
 <label>Status explanation<textarea maxLength={2000} value={value.statusNote} onChange={e=>onChange({statusNote:e.target.value})}/></label>
 {(['email','phone','website'] as const).map(field=><label key={field}>Contact {field}<input type={field==='email'?'email':field==='website'?'url':'tel'} maxLength={field==='email'?254:field==='phone'?60:2048} value={value.contact[field]} onChange={e=>onChange({contact:{...value.contact,[field]:e.target.value}})}/></label>)}
 <h3>Services offered</h3><p>List each service or dealer activity once.</p>
 {value.services.map((service,i)=><div key={i}><label>Service {i+1}<input maxLength={200} value={service} onChange={e=>onChange({services:value.services.map((v,n)=>n===i?e.target.value:v)})}/></label><button type='button' onClick={()=>onChange({services:value.services.filter((_,n)=>n!==i)})}>Remove service {i+1}</button></div>)}
 <button type='button' disabled={value.services.length>=30} onClick={()=>onChange({services:[...value.services,'']})}>Add service</button>
 <h3>Geographic coverage</h3><p>Add each country once. Leave regions empty if all regions in that country are served.</p>
 {value.coverage.map((area,i)=><fieldset key={i}><legend>Coverage {i+1}</legend><label>Country code {i+1}<input maxLength={2} value={area.countryCode} placeholder='IN' onChange={e=>onChange({coverage:value.coverage.map((v,n)=>n===i?{...v,countryCode:e.target.value.toUpperCase()}:v)})}/></label>
 {area.regions.map((region,j)=><div key={j}><label>Region {i+1}.{j+1}<input maxLength={200} value={region} onChange={e=>onChange({coverage:value.coverage.map((v,n)=>n===i?{...v,regions:v.regions.map((r,k)=>k===j?e.target.value:r)}:v)})}/></label><button type='button' onClick={()=>onChange({coverage:value.coverage.map((v,n)=>n===i?{...v,regions:v.regions.filter((_,k)=>k!==j)}:v)})}>Remove region {i+1}.{j+1}</button></div>)}
 <button type='button' disabled={area.regions.length>=30} onClick={()=>onChange({coverage:value.coverage.map((v,n)=>n===i?{...v,regions:[...v.regions,'']}:v)})}>Add region to coverage {i+1}</button><button type='button' onClick={()=>onChange({coverage:value.coverage.filter((_,n)=>n!==i)})}>Remove coverage {i+1}</button></fieldset>)}
 <button type='button' disabled={value.coverage.length>=100} onClick={()=>onChange({coverage:[...value.coverage,{countryCode:'',regions:[]}]})}>Add country coverage</button>
 </section>;
}
