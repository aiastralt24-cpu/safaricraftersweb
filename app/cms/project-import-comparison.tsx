'use client';
import type {ProjectDraft} from '../../lib/cms/projects';
import {compareProjectImport} from '../../lib/cms/project-import-comparison';
const labels:Record<string,string>={kind:'Content type',title:'Title',slug:'URL slug',summary:'Summary',client:'Client',industry:'Industry',location:'Location',completedOn:'Completion date',body:'Overview',challenge:'Challenge',approach:'Approach',outcomes:'Outcomes',image:'Listing image',gallery:'Gallery',relationships:'Related records',claims:'Claims and supporting documents',seo:'SEO settings'};
function valueText(value:unknown){return value===null?'Not set':value===''?'Empty text':typeof value==='string'?value:JSON.stringify(value,null,2);}
export function ProjectImportComparison({before,after}:{before:ProjectDraft|null;after:ProjectDraft}){
 const fields=compareProjectImport(before,after);
 return <section aria-label='Import content changes'><h4>{before?'Changes from saved draft':'New project content'}</h4><p>{before?`${fields.length} changed fields. Unlisted fields remain unchanged.`:'This creates a new draft. There is no saved content to replace.'}</p>{fields.map(row=><details key={row.field}><summary>{labels[row.field]??row.field}</summary>{before&&<><h5>Currently saved</h5><pre style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere',maxHeight:'20rem',overflow:'auto'}}>{valueText(row.before)}</pre></>}<h5>After import</h5><pre style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere',maxHeight:'20rem',overflow:'auto'}}>{valueText(row.after)}</pre></details>)}</section>;
}
