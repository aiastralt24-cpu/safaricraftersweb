'use client';
import type {ProductCategoryDraft} from '../../lib/cms/products';
import {productCategorySchema} from '../../lib/cms/products';
import type {LoadMediaPreview} from './media-image';
export function ProductCategoryPreview({value}:{value:ProductCategoryDraft;loadPreview:LoadMediaPreview}){
 const parsed=productCategorySchema.safeParse(value);if(!parsed.success)return <p role="alert">Category preview needs valid content.</p>;
 const d=parsed.data;
 return <section aria-label="Proposed category preview"><p>Private category definition preview. Imports save drafts only.</p><h3>{d.title}</h3><p>{d.summary}</p><p>{d.parent?'Child category; parent eligibility is checked during import review.':'Top-level category'}</p>{[...d.attributeGroups].sort((a,b)=>a.position-b.position).map(group=><section key={group.id}><h4>{group.title}</h4>{[...group.attributes].sort((a,b)=>a.position-b.position).map(attribute=><div key={attribute.id}><h5>{attribute.label}{attribute.unit?` (${attribute.unit})`:''}</h5><p>{attribute.valueType} · {attribute.required?'Required':'Optional'} · {attribute.allowNotApplicable?'Not applicable allowed':'Not applicable disallowed'} · {attribute.filterEligible?'Filtering enabled':'Filtering disabled'} · {attribute.comparisonEligible?'Comparison enabled':'Comparison disabled'}</p>{attribute.allowedValues.length>0&&<p>Choices: {attribute.allowedValues.join(', ')}</p>}<p>Applies to: {attribute.regions.length?attribute.regions.map(r=>[r.countryCode,r.region].filter(Boolean).join(' — ')).join('; '):'All regions'}</p></div>)}</section>)}</section>;
}
