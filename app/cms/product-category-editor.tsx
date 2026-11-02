'use client';
import type {ProductCategoryDraft} from '../../lib/cms/products';
import {PageSeoEditor} from './page-seo-editor';
import type {ImageEditorContext} from './section-image-editor';
type Group=ProductCategoryDraft['attributeGroups'][number];
type Attribute=Group['attributes'][number];
const key=(prefix:string)=>`${prefix}_${crypto.randomUUID().replaceAll('-','').slice(0,12)}`;
function move<T extends {position:number}>(rows:T[],index:number,offset:number){const copy=[...rows];[copy[index],copy[index+offset]]=[copy[index+offset],copy[index]];return copy.map((row,position)=>({...row,position}));}
export function ProductCategoryEditor({value,onChange,existing,context}:{value:ProductCategoryDraft;onChange:(v:ProductCategoryDraft)=>void;existing:boolean;context:ImageEditorContext}){
 const change=(patch:Partial<ProductCategoryDraft>)=>onChange({...value,...patch});
 const group=(index:number,patch:Partial<Group>)=>change({attributeGroups:value.attributeGroups.map((g,i)=>i===index?{...g,...patch}:g)});
 const attribute=(gi:number,ai:number,patch:Partial<Attribute>)=>group(gi,{attributes:value.attributeGroups[gi].attributes.map((a,i)=>i===ai?{...a,...patch}:a)});
 return <fieldset className="cms-product-category-editor" disabled={context.disabled}><legend>Product category draft</legend>
 <label>Category title<input maxLength={200} value={value.title} onChange={e=>change({title:e.target.value})}/></label>
 <label>Category URL slug<input disabled={existing} maxLength={100} value={value.slug} onChange={e=>change({slug:e.target.value})}/></label>
 <label>Category summary<textarea aria-label="Category summary" maxLength={2000} value={value.summary} onChange={e=>change({summary:e.target.value})}/></label>
 <p>Attribute keys stay stable when labels change. Products use the saved category revision; review affected products when definitions change.</p>
 {value.attributeGroups.map((g,gi)=><fieldset key={g.id}><legend>Specification group {gi+1}</legend>
 <label>Group title<input maxLength={200} value={g.title} onChange={e=>group(gi,{title:e.target.value})}/></label><small>Group key: {g.id}</small>
 <button type='button' disabled={gi===0} onClick={()=>change({attributeGroups:move(value.attributeGroups,gi,-1)})}>Move group up</button><button type='button' disabled={gi===value.attributeGroups.length-1} onClick={()=>change({attributeGroups:move(value.attributeGroups,gi,1)})}>Move group down</button>
 <button type='button' onClick={()=>{if(window.confirm('Remove this group and its definitions from this draft? Existing product revisions retain their earlier category reference.'))change({attributeGroups:value.attributeGroups.filter((_,i)=>i!==gi).map((row,position)=>({...row,position}))});}}>Remove group</button>
 {g.attributes.map((a,ai)=><fieldset key={a.id}><legend>Attribute {ai+1}: {a.label}</legend><small>Attribute key: {a.id}</small>
 <label>Attribute label<input maxLength={200} value={a.label} onChange={e=>attribute(gi,ai,{label:e.target.value})}/></label>
 <label>Value type<select aria-label="Value type" value={a.valueType} onChange={e=>{const next=e.target.value as Attribute['valueType'];if(window.confirm('Change this attribute type? Existing product values will need review. Incompatible units and choices will be cleared.'))attribute(gi,ai,{valueType:next,unit:next==='number'?a.unit:'',allowedValues:next==='choice'?a.allowedValues:[]});}}>{['text','number','boolean','choice'].map(v=><option key={v}>{v}</option>)}</select></label>
 {a.valueType==='number'&&<label>Unit<input maxLength={80} value={a.unit} onChange={e=>attribute(gi,ai,{unit:e.target.value})}/></label>}
 {a.valueType==='choice'&&<label>Allowed values, one per line<textarea aria-label="Allowed values, one per line" maxLength={20100} value={a.allowedValues.join('\n')} onChange={e=>attribute(gi,ai,{allowedValues:e.target.value.split('\n')})}/></label>}
 {([['required','Required specification'],['allowNotApplicable','Allow not applicable with a reason'],['filterEligible','Available as a filter'],['comparisonEligible','Available for comparison']] as const).map(([field,label])=><label key={field}><input type='checkbox' checked={a[field]} onChange={e=>attribute(gi,ai,{[field]:e.target.checked})}/>{label}</label>)}
 <p>{a.regions.length?'This definition applies to each listed region.':'This definition applies globally.'}</p>
 {a.regions.map((r,ri)=><div key={ri}><label>Country code<input maxLength={2} value={r.countryCode} onChange={e=>attribute(gi,ai,{regions:a.regions.map((old,i)=>i===ri?{...old,countryCode:e.target.value.toUpperCase()}:old)})}/></label><label>Region, blank for whole country<input maxLength={200} value={r.region} onChange={e=>attribute(gi,ai,{regions:a.regions.map((old,i)=>i===ri?{...old,region:e.target.value}:old)})}/></label><button type='button' onClick={()=>attribute(gi,ai,{regions:a.regions.filter((_,i)=>i!==ri)})}>Remove applicability region</button></div>)}
 <button type='button' disabled={a.regions.length>=100} onClick={()=>attribute(gi,ai,{regions:[...a.regions,{countryCode:'',region:''}]})}>Add applicability region</button>
 <button type='button' disabled={ai===0} onClick={()=>group(gi,{attributes:move(g.attributes,ai,-1)})}>Move attribute up</button><button type='button' disabled={ai===g.attributes.length-1} onClick={()=>group(gi,{attributes:move(g.attributes,ai,1)})}>Move attribute down</button>
 <button type='button' onClick={()=>{if(window.confirm('Remove this attribute definition from the draft?'))group(gi,{attributes:g.attributes.filter((_,i)=>i!==ai).map((row,position)=>({...row,position}))});}}>Remove attribute</button>
 </fieldset>)}
 <button type='button' disabled={g.attributes.length>=100} onClick={()=>group(gi,{attributes:[...g.attributes,{id:key('attribute'),label:'New attribute',valueType:'text',unit:'',allowedValues:[],required:false,allowNotApplicable:false,position:g.attributes.length,filterEligible:false,comparisonEligible:false,regions:[]}]})}>Add attribute</button>
 </fieldset>)}
 <button type='button' disabled={value.attributeGroups.length>=20} onClick={()=>change({attributeGroups:[...value.attributeGroups,{id:key('group'),title:'New group',position:value.attributeGroups.length,attributes:[]}]})}>Add specification group</button>
 <label>Category internal notes<textarea aria-label="Category internal notes" maxLength={2000} value={value.internalNotes} onChange={e=>change({internalNotes:e.target.value})}/></label>
 <PageSeoEditor value={value.seo} context={context} onChange={seo=>change({seo})}/>
 </fieldset>;
}
