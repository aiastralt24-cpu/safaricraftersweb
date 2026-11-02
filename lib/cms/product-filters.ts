import type {PublicProductAttribute} from './product-comparison.ts';
export function productFilterToken(value:PublicProductAttribute['value']){
 if(value===null)return 'unset';
 // Reasons explain individual products, not different not-applicable states.
 return value.state==='known'?JSON.stringify(['known',typeof value.value,value.value]):value.state;
}
export function productFilterOptions(items:{attributes:PublicProductAttribute[]}[]){
 const options=new Map<string,{key:string;label:string;category:string;unit:string;region:string;values:Map<string,string>}>();
 for(const item of items)for(const a of item.attributes){if(!a.filterEligible)continue;let entry=options.get(a.key);if(!entry){entry={key:a.key,label:a.label,category:a.category,unit:a.unit,region:a.region,values:new Map()};options.set(a.key,entry);}entry.values.set(productFilterToken(a.value),a.value?.state==='notApplicable'?'Not applicable':a.display);}
 return [...options.values()].map(({values,...entry})=>({...entry,values:[...values].map(([token,label])=>({token,label})).sort((a,b)=>a.label.localeCompare(b.label))}));
}
export function matchesProductFilters(item:{attributes:PublicProductAttribute[]},selected:Record<string,string>){
 return Object.entries(selected).every(([key,token])=>item.attributes.some(a=>a.filterEligible&&a.key===key&&productFilterToken(a.value)===token));
}
