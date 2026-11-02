'use client';
import type {CareerDraft} from '../../lib/cms/careers';
import {compareCareerImport} from '../../lib/cms/career-import-comparison';
const labels:Record<string,string>={title:'Job title',slug:'URL slug',organization:'Organization',department:'Department',referenceCode:'Reference code',employment:'Employment type',workMode:'Work arrangement',remoteRegions:'Remote-work eligibility',status:'Job status',statusNote:'Status explanation',postedOn:'Posting date',opensAt:'Applications open',closesAt:'Applications close',compensation:'Compensation',application:'Application destination',summary:'Summary',body:'Job description',image:'Main image',relationships:'Related records',internalNotes:'Private hiring notes',seo:'SEO settings'};
function valueText(value:unknown){return value===null?'Not set':value===''?'Empty text':typeof value==='string'?value:JSON.stringify(value,null,2);}
export function CareerImportComparison({before,after}:{before:CareerDraft|null;after:CareerDraft}){
 const fields=compareCareerImport(before,after);
 return <section aria-label='Import content changes'><h4>{before?'Changes from saved draft':'New career content'}</h4><p>{before?`${fields.length} changed fields. Unlisted fields remain unchanged.`:'This creates a new draft. There is no saved content to replace.'}</p>{fields.map(row=><details key={row.field}><summary>{labels[row.field]??row.field}</summary>{before&&<><h5>Currently saved</h5><pre style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere',maxHeight:'20rem',overflow:'auto'}}>{valueText(row.before)}</pre></>}<h5>After import</h5><pre style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere',maxHeight:'20rem',overflow:'auto'}}>{valueText(row.after)}</pre></details>)}</section>;
}
