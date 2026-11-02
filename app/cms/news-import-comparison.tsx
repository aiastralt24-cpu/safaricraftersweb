'use client';
import type {NewsDraft} from '../../lib/cms/news';
import {compareNewsImport} from '../../lib/cms/news-import-comparison';
const labels:Record<string,string>={kind:'Classification',title:'Title',slug:'URL slug',summary:'Summary',author:'Author',date:'Editorial date',topic:'Topic',dateline:'Dateline',body:'Article body',image:'Listing image',heroImage:'Hero image',gallery:'Gallery',relationships:'Related records',internalNotes:'Private notes',seo:'SEO settings'};
function valueText(value:unknown){return value===null?'Not set':value===''?'Empty text':typeof value==='string'?value:JSON.stringify(value,null,2);}
export function NewsImportComparison({before,after}:{before:NewsDraft|null;after:NewsDraft}){
 const fields=compareNewsImport(before,after);
 return <section aria-label='Import content changes'><h4>{before?'Changes from saved draft':'New news content'}</h4><p>{before?`${fields.length} changed fields. Unlisted fields remain unchanged.`:'This creates a new draft. There is no saved content to replace.'}</p>{fields.map(row=><details key={row.field}><summary>{labels[row.field]??row.field}</summary>{before&&<><h5>Currently saved</h5><pre style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere',maxHeight:'20rem',overflow:'auto'}}>{valueText(row.before)}</pre></>}<h5>After import</h5><pre style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere',maxHeight:'20rem',overflow:'auto'}}>{valueText(row.after)}</pre></details>)}</section>;
}
