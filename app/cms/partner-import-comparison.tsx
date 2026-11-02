'use client';
import type {PartnerDraft} from '../../lib/cms/partners';
import {comparePartnerImport} from '../../lib/cms/partner-import-comparison';
const labels:Record<string,string>={title:'Title',kind:'Partner kind',services:'Services',coverage:'Countries and regions',status:'Partner status',statusNote:'Status note',contact:'Contact details',timeZone:'Time zone',hours:'Opening hours',visiting:'Visitor policy',accessibilityNotes:'Accessibility notes',slug:'URL slug',summary:'Summary',body:'Page content',image:'Main image',relationships:'Related records',internalNotes:'Private notes',seo:'SEO settings'};
function valueText(value:unknown){return value===null?'Not set':value===''?'Empty text':typeof value==='string'?value:JSON.stringify(value,null,2);}
export function PartnerImportComparison({before,after}:{before:PartnerDraft|null;after:PartnerDraft}){
 const fields=comparePartnerImport(before,after);
 return <section aria-label='Import content changes'><h4>{before?'Changes from saved draft':'New partner content'}</h4><p>{before?`${fields.length} changed fields. Unlisted fields remain unchanged.`:'This creates a new draft. There is no saved content to replace.'}</p>{fields.map(row=><details key={row.field}><summary>{labels[row.field]??row.field}</summary>{before&&<><h5>Currently saved</h5><pre style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere',maxHeight:'20rem',overflow:'auto'}}>{valueText(row.before)}</pre></>}<h5>After import</h5><pre style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere',maxHeight:'20rem',overflow:'auto'}}>{valueText(row.after)}</pre></details>)}</section>;
}
