'use client';
import type {CertificationDraft} from '../../lib/cms/certifications';
import {compareCertificationImport} from '../../lib/cms/certification-import-comparison';
const labels:Record<string,string>={title:'Certification title',slug:'URL slug',issuer:'Issuer',certificateNumber:'Certificate number',statement:'Claim',scope:'Scope',issuedOn:'Issue date',validFrom:'Valid from',expiresOn:'Expiry',reviewOn:'Review date',validity:'Validity',status:'Status',statusNote:'Status explanation',evidence:'Supporting documents',relationships:'Related records',summary:'Summary',internalNotes:'Private notes',seo:'SEO settings'};
function valueText(value:unknown){return value===null?'Not set':value===''?'Empty text':typeof value==='string'?value:JSON.stringify(value,null,2);}
export function CertificationImportComparison({before,after}:{before:CertificationDraft|null;after:CertificationDraft}){
 const fields=compareCertificationImport(before,after);
 return <section aria-label='Import content changes'><h4>{before?'Changes from saved draft':'New certification content'}</h4><p>{before?`${fields.length} changed fields. Unlisted fields remain unchanged.`:'This creates a new draft. There is no saved content to replace.'}</p>{fields.map(row=><details key={row.field}><summary>{labels[row.field]??row.field}</summary>{before&&<><h5>Currently saved</h5><pre style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere',maxHeight:'20rem',overflow:'auto'}}>{valueText(row.before)}</pre></>}<h5>After import</h5><pre style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere',maxHeight:'20rem',overflow:'auto'}}>{valueText(row.after)}</pre></details>)}</section>;
}
