import {readLeadCareerContext} from '../../lib/cms/lead-career-context';
export function LeadCareerContext({attribution,formId,formRevision}:{attribution:unknown;formId:unknown;formRevision:unknown}){
 const result=readLeadCareerContext(attribution,{formId,formRevision});
 if(result.status==='none')return null;
 if(result.status==='invalid')return <p role='alert'>The saved job application context could not be verified. Review the original source records before following up.</p>;
 const c=result.context;
 return <section aria-label='Job application context'><h3>Job at time of application</h3><p>Saved when the application was accepted. The job may have changed or closed since then.</p><dl className='cms-lead-answers'><div><dt>Job title</dt><dd>{c.title}</dd></div><div><dt>Hiring organization</dt><dd>{c.organization}</dd></div><div><dt>Job reference</dt><dd>{c.referenceCode||'Not recorded'}</dd></div><div><dt>Application accepted</dt><dd><time dateTime={c.acceptedAt}>{new Date(c.acceptedAt).toLocaleString()}</time></dd></div><div><dt>Job page path</dt><dd>{c.path}</dd></div></dl><details><summary>Saved application references</summary><dl className='cms-lead-answers'><div><dt>Job record</dt><dd>{c.recordId}</dd></div><div><dt>Job revision</dt><dd>{c.revisionId}</dd></div><div><dt>Form revision</dt><dd>{c.formRevisionId}</dd></div></dl></details></section>;
}
