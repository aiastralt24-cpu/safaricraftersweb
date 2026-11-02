'use client';
import type {EventDraft} from '../../lib/cms/events';
import {compareEventImport} from '../../lib/cms/event-import-comparison';
const labels:Record<string,string>={title:'Title',slug:'URL slug',summary:'Summary',category:'Category',organizer:'Organizer',status:'Event status',statusNote:'Status explanation',timing:'Dates and times',attendance:'Attendance',venue:'Venue',onlineUrl:'Online URL',registration:'Registration',body:'Event body',image:'Listing image',heroImage:'Hero image',gallery:'Gallery',relationships:'Related records',internalNotes:'Private notes',seo:'SEO settings'};
function valueText(value:unknown){return value===null?'Not set':value===''?'Empty text':typeof value==='string'?value:JSON.stringify(value,null,2);}
export function EventImportComparison({before,after}:{before:EventDraft|null;after:EventDraft}){
 const fields=compareEventImport(before,after);
 return <section aria-label='Import content changes'><h4>{before?'Changes from saved draft':'New event content'}</h4><p>{before?`${fields.length} changed fields. Unlisted fields remain unchanged.`:'This creates a new draft. There is no saved content to replace.'}</p>{fields.map(row=><details key={row.field}><summary>{labels[row.field]??row.field}</summary>{before&&<><h5>Currently saved</h5><pre style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere',maxHeight:'20rem',overflow:'auto'}}>{valueText(row.before)}</pre></>}<h5>After import</h5><pre style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere',maxHeight:'20rem',overflow:'auto'}}>{valueText(row.after)}</pre></details>)}</section>;
}
