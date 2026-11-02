import {productSchema,type ProductDraft} from './products.ts';
import {productCategoryRevisionSchema,type ProductCategoryRevision} from './product-category-revision.ts';
import {regionKey} from './product-attributes.ts';
type Spec=ProductDraft['specifications'][number];
export type ProductPreviewSpecification={label:string;region:string;unit:string;state:string;display:string;inherited:boolean;unresolved:boolean};
const identity=(row:Pick<Spec,'attributeId'|'region'>)=>`${row.attributeId}/${regionKey(row.region)}`;
export function specificationDisplay(value:Spec['value']|undefined):string{
 if(!value)return 'Not entered';
 if(value.state==='known')return typeof value.value==='boolean'?(value.value?'Yes':'No'):String(value.value);
 if(value.state==='blank')return 'Blank';if(value.state==='unknown')return 'Unknown';return `Not applicable: ${value.reason}`;
}
/** Explicit private-preview projection. Never pass the original draft to a visitor-style renderer. */
export function productPreview(input:unknown,categoryInputs:unknown[],scope:{site:string;locale:string}){
 const d=productSchema.parse(input),pins=[d.category,d.subcategory].filter((v):v is NonNullable<typeof v>=>v!==null);
 const categories:ProductCategoryRevision[]=categoryInputs.map(input=>productCategoryRevisionSchema.parse(input));
 if(new Set(categories.map(c=>c.recordId)).size!==categories.length||categories.some(c=>c.site!==scope.site||c.locale!==scope.locale||!pins.some(p=>p.recordId===c.recordId&&p.revisionId===c.revisionId)))throw Error('Preview categories must match the selected website, language and saved revisions.');
 const ordered=pins.flatMap(pin=>categories.filter(c=>c.recordId===pin.recordId));
 const definitions=ordered.flatMap(c=>[...c.payload.attributeGroups].sort((a,b)=>a.position-b.position).flatMap(g=>[...g.attributes].sort((a,b)=>a.position-b.position)));
 if(new Set(definitions.map(a=>a.id)).size!==definitions.length)throw Error('Category definitions have conflicting attribute identities.');
 function rows(values:ProductDraft['specifications'],base:ProductDraft['specifications']=[]):ProductPreviewSpecification[]{
  const effective=new Map(base.map(row=>[identity(row),row]));for(const row of values)effective.set(identity(row),row);
  const own=new Set(values.map(identity)),result:ProductPreviewSpecification[]=[];
  for(const definition of definitions)for(const region of definition.regions.length?definition.regions:[null]){
   const key=identity({attributeId:definition.id,region}),row=effective.get(key);effective.delete(key);
   result.push({label:definition.label,region:regionKey(region),unit:definition.unit,state:row?.value.state??'unset',display:specificationDisplay(row?.value),inherited:Boolean(row&&!own.has(key)),unresolved:false});
  }
  for(const [key,row]of effective)result.push({label:'Unmatched specification',region:regionKey(row.region),unit:'',state:row.value.state,display:specificationDisplay(row.value),inherited:!own.has(key),unresolved:true});
  return result;
 }
 return {title:d.title,code:d.code,brand:d.brand,summary:d.summary,body:d.body,benefits:d.benefits,features:d.features,suitableUses:d.suitableUses,unsuitableUses:d.unsuitableUses,gallery:d.gallery,
 videos:d.videos.map(v=>({title:v.title,url:v.url,transcript:v.transcript})),packaging:d.packaging,colours:d.colours,finishes:d.finishes,installation:d.installation,precautions:d.precautions,warranty:d.warranty,
 availability:d.availability,lifecycle:d.lifecycle,lifecycleNote:d.lifecycleNote,enquiry:d.enquiry,
 categories:ordered.map(c=>({title:c.payload.title,newerRevisionAvailable:c.currentRevision!==c.revisionId})),definitionsUnavailable:categories.length!==pins.length,
 specifications:rows(d.specifications),variants:d.variants.map(v=>({title:v.title,code:v.code,size:v.size,colour:v.colour,finish:v.finish,packaging:v.packaging,specifications:rows(v.specifications,d.specifications)})),
 relatedCounts:Object.entries(d.relationships).map(([kind,refs])=>({kind,count:refs.length})).filter(v=>v.count>0),
 seo:{title:d.seo.title,description:d.seo.description,canonical:d.seo.canonical,indexing:d.seo.indexing,sitemap:d.seo.sitemap},
 };
}
