'use client';
import type {FaqDraft} from '../../lib/cms/faqs';
import {compareFaqImport} from '../../lib/cms/faq-import-comparison';
const labels:Record<string,string>={question:'Question',answer:'Answer',topic:'Topic',keywords:'Search keywords',relationships:'Related records',reviewOn:'Review date',internalNotes:'Internal notes'};
function valueText(value:unknown){return value===null?'Not set':value===''?'Empty text':typeof value==='string'?value:JSON.stringify(value,null,2);}
export function FaqImportComparison({before,after}:{before:FaqDraft|null;after:FaqDraft}){
 const fields=compareFaqImport(before,after);
 return <section aria-label='Import content changes'><h4>{before?'Changes from saved draft':'New faq content'}</h4><p>{before?`${fields.length} changed fields. Unlisted fields remain unchanged.`:'This creates a new draft. There is no saved content to replace.'}</p>{fields.map(row=><details key={row.field}><summary>{labels[row.field]??row.field}</summary>{before&&<><h5>Currently saved</h5><pre style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere',maxHeight:'20rem',overflow:'auto'}}>{valueText(row.before)}</pre></>}<h5>After import</h5><pre style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere',maxHeight:'20rem',overflow:'auto'}}>{valueText(row.after)}</pre></details>)}</section>;
}
