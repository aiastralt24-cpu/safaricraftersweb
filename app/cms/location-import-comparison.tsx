'use client';
import type {LocationDraft} from '../../lib/cms/locations';
import {compareLocationImport} from '../../lib/cms/location-import-comparison';
const labels:Record<string,string>={title:'Title',kind:'Location kind',address:'Address',coordinates:'Coordinates',contact:'Contact details',timeZone:'Time zone',hours:'Opening hours',visiting:'Visitor policy',accessibilityNotes:'Accessibility notes',slug:'URL slug',summary:'Summary',body:'Page content',image:'Main image',relationships:'Related records',internalNotes:'Private notes',seo:'SEO settings'};
function valueText(value:unknown){return value===null?'Not set':value===''?'Empty text':typeof value==='string'?value:JSON.stringify(value,null,2);}
export function LocationImportComparison({before,after}:{before:LocationDraft|null;after:LocationDraft}){
 const fields=compareLocationImport(before,after);
 return <section aria-label='Import content changes'><h4>{before?'Changes from saved draft':'New location content'}</h4><p>{before?`${fields.length} changed fields. Unlisted fields remain unchanged.`:'This creates a new draft. There is no saved content to replace.'}</p>{fields.map(row=><details key={row.field}><summary>{labels[row.field]??row.field}</summary>{before&&<><h5>Currently saved</h5><pre style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere',maxHeight:'20rem',overflow:'auto'}}>{valueText(row.before)}</pre></>}<h5>After import</h5><pre style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere',maxHeight:'20rem',overflow:'auto'}}>{valueText(row.after)}</pre></details>)}</section>;
}
