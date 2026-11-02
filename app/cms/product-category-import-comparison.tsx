'use client';
import type {ProductCategoryDraft} from '../../lib/cms/products';
import {compareProductCategoryImport} from '../../lib/cms/product-category-import-comparison';
const labels:Record<string,string>={title:'Title',slug:'URL slug',summary:'Summary',parent:'Parent category',attributeGroups:'Attribute groups and definitions',seo:'SEO settings',internalNotes:'Private notes'};
function valueText(value:unknown){return value===null?'Not set':value===''?'Empty text':typeof value==='string'?value:JSON.stringify(value,null,2);}
export function ProductCategoryImportComparison({before,after}:{before:ProductCategoryDraft|null;after:ProductCategoryDraft}){
 const fields=compareProductCategoryImport(before,after);
 return <section aria-label='Import content changes'><h4>{before?'Changes from saved draft':'New Category content'}</h4><p>{before?`${fields.length} changed fields. Unlisted fields remain unchanged.`:'This creates a new draft. There is no saved content to replace.'}</p>{fields.map(row=><details key={row.field}><summary>{labels[row.field]??row.field}</summary>{before&&<><h5>Currently saved</h5><pre style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere',maxHeight:'20rem',overflow:'auto'}}>{valueText(row.before)}</pre></>}<h5>After import</h5><pre style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere',maxHeight:'20rem',overflow:'auto'}}>{valueText(row.after)}</pre></details>)}</section>;
}
