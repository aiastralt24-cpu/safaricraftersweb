'use client';
import type {ProductCategoryDraft,ProductDraft} from '../../lib/cms/products';
import {regionKey} from '../../lib/cms/product-attributes';
type Rows=ProductDraft['specifications'];
export function ProductSpecificationsEditor({groups,value,onChange,inherited=[]}:{groups:ProductCategoryDraft['attributeGroups'];value:Rows;onChange:(v:Rows)=>void;inherited?:Rows}){
 const identities=new Set<string>();
 const key=(row:Rows[number])=>`${row.attributeId}/${regionKey(row.region)}`;
 const put=(row:Rows[number])=>onChange([...value.filter(old=>key(old)!==key(row)),row]);
 return <section aria-label='Product specifications'>{groups.map(g=><section key={g.id}><h4>{g.title}</h4>{[...g.attributes].sort((a,b)=>a.position-b.position).flatMap(a=>(a.regions.length?a.regions:[null]).map(region=>{
 const base={attributeId:a.id,region},identity=key({...base,value:{state:'blank'}});identities.add(identity);const row=value.find(v=>key(v)===identity),fallback=inherited.find(v=>key(v)===identity),current=row?.value;
 return <fieldset key={identity}><legend>{a.label}{a.unit?` (${a.unit})`:''} · {regionKey(region)}</legend>
 {fallback&&!row&&<p>Inherited value: {fallback.value.state==='known'?String(fallback.value.value):fallback.value.state}</p>}
 <label>Value status<select aria-label={`${a.label} value status`} value={current?.state??'unset'} onChange={e=>{const state=e.target.value;if(state==='unset')onChange(value.filter(v=>key(v)!==identity));else if(state==='known')put({...base,value:{state,value:a.valueType==='number'?0:a.valueType==='boolean'?false:''}});else if(state==='notApplicable')put({...base,value:{state,reason:''}});else put({...base,value:{state:state as 'blank'|'unknown'}});}}><option value='unset'>{fallback?'Inherit product value':'Not entered'}</option><option value='known'>Known value</option><option value='blank'>Blank</option><option value='unknown'>Unknown</option><option value='notApplicable' disabled={!a.allowNotApplicable}>Not applicable</option></select></label>
 {current?.state==='known'&&((a.valueType==='number'&&typeof current.value!=='number')||(a.valueType==='boolean'&&typeof current.value!=='boolean'))&&<p role='alert'>Saved value has a different type: {String(current.value)}. Enter a corrected value explicitly.</p>}
 {current?.state==='known'&&(a.valueType==='boolean'?<label>{a.label}<select aria-label={`${a.label} value`} value={String(current.value)} onChange={e=>put({...base,value:{state:'known',value:e.target.value==='true'}})}><option value='false'>No</option><option value='true'>Yes</option></select></label>:a.valueType==='choice'?<label>{a.label}<select aria-label={`${a.label} value`} value={String(current.value)} onChange={e=>put({...base,value:{state:'known',value:e.target.value}})}><option value=''>Choose a value</option>{!a.allowedValues.includes(String(current.value))&&current.value!==''&&<option value={String(current.value)}>Saved value: {String(current.value)} (not allowed)</option>}{a.allowedValues.map(v=><option key={v}>{v}</option>)}</select></label>:<label>{a.label}<input aria-label={`${a.label} value`} type={a.valueType==='number'?'number':'text'} step='any' maxLength={2000} value={String(current.value)} onChange={e=>put({...base,value:a.valueType==='number'?(e.target.value===''?{state:'blank'}:{state:'known',value:e.target.valueAsNumber}):{state:'known',value:e.target.value}})}/></label>)}
 {current?.state==='notApplicable'&&<label>Reason<textarea aria-label={`${a.label} not applicable reason`} maxLength={1000} value={current.reason} onChange={e=>put({...base,value:{state:'notApplicable',reason:e.target.value}})}/></label>}
 {a.required&&<small>Required before publication. Blank and unknown need resolution.</small>}
 </fieldset>;
 }))}</section>)}
 {value.filter(row=>!identities.has(key(row))).map(row=><aside key={key(row)} role='alert'><p>Unmatched saved specification: {row.attributeId} · {regionKey(row.region)} · {JSON.stringify(row.value)}</p><button type='button' onClick={()=>{if(window.confirm('Remove this unmatched specification?'))onChange(value.filter(v=>key(v)!==key(row)));}}>Remove unmatched specification</button></aside>)}
 </section>;
}
