'use client';
import type {LeadershipDraft} from '../../lib/cms/leadership';
import {compareLeadershipImport} from '../../lib/cms/leadership-import-comparison';
const labels:Record<string,string>={title:'Name',slug:'URL slug',role:'Role',department:'Department',status:'Current or former',sortOrder:'Display order',summary:'Summary',body:'Biography',image:'Portrait',links:'Profile links',relationships:'Related records',internalNotes:'Private notes',seo:'SEO settings'};
function valueText(value:unknown){return value===null?'Not set':value===''?'Empty text':typeof value==='string'?value:JSON.stringify(value,null,2);}
export function LeadershipImportComparison({before,after}:{before:LeadershipDraft|null;after:LeadershipDraft}){
 const fields=compareLeadershipImport(before,after);
 return <section aria-label='Import content changes'><h4>{before?'Changes from saved draft':'New leadership content'}</h4><p>{before?`${fields.length} changed fields. Unlisted fields remain unchanged.`:'This creates a new draft. There is no saved content to replace.'}</p>{fields.map(row=><details key={row.field}><summary>{labels[row.field]??row.field}</summary>{before&&<><h5>Currently saved</h5><pre style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere',maxHeight:'20rem',overflow:'auto'}}>{valueText(row.before)}</pre></>}<h5>After import</h5><pre style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere',maxHeight:'20rem',overflow:'auto'}}>{valueText(row.after)}</pre></details>)}</section>;
}
