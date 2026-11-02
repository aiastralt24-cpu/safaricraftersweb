'use client';
import {useEffect,useRef,useState} from 'react';
import {verifiedContentHealth,validationStateLabels,effectiveValidationState,type ContentHealthRow} from '../../lib/cms/content-health';
import {ValidationPanel} from './validation-panel';
import {filterContentHealth,healthNeedsAttention,defaultHealthFilters,type HealthFilters} from '../../lib/cms/content-health-filters';
import {healthReportHref} from '../../lib/cms/content-health-link';
import {ContentActivityPanel} from './content-activity-panel';
import {ScheduledReleaseList} from './scheduled-release-list';
import {ReleaseDeliveryPanel} from './release-delivery-panel';
import {ScheduleMonitorPanel} from './schedule-monitor-panel';
import {DocumentDateMonitorPanel} from './document-date-monitor-panel';
import {LeadRemindersPanel} from './lead-reminders-panel';
import {LeadAttentionPanel} from './lead-attention-panel';
import {DeliveryMonitorPanel} from './delivery-monitor-panel';
import {MediaRightsMonitorPanel} from './media-rights-monitor-panel';
import {ValidationFindingsReportPanel} from './validation-findings-report-panel';
import {RedirectImportApprovalPanel} from './redirect-import-approval-panel';
import {RedirectImportPanel} from './redirect-import-panel';
import {SiteRedirectExportPanel} from './site-redirect-export-panel';
import {editorView} from '../../lib/cms/editor-target';
export function ContentHealthWorkspace({site,actor,api,onOpen,onOpenLead,onOpenMedia,onOpenPdf,initialRecord,onClearReport}:{onOpenPdf:(id:string)=>void;onOpenMedia:(id:string)=>void;onOpenLead:(id:string)=>void;actor:string;onClearReport?:()=>void;initialRecord?:string;site:string;api:(path:string,options?:RequestInit)=>Promise<any>;onOpen:(record:ContentHealthRow)=>void}){
 const [deliveryRequest,setDeliveryRequest]=useState<string|null>(null);
 const [rows,setRows]=useState<ContentHealthRow[]>([]),[cursor,setCursor]=useState<string|null>(null),[selected,setSelected]=useState<ContentHealthRow|null>(null);
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[loaded,setLoaded]=useState(false);
 const [filters,setFilters]=useState<HealthFilters>({...defaultHealthFilters});
 function updateFilter<K extends keyof HealthFilters>(key:K,value:HealthFilters[K]){setFilters(previous=>({...previous,[key]:value}));setSelected(null);}
 const [reportRecord,setReportRecord]=useState(initialRecord);
 const [now,setNow]=useState(Date.now());
 useEffect(()=>{const timer=setInterval(()=>setNow(Date.now()),1000);return()=>clearInterval(timer);},[]);
 const currentApi=useRef(api);currentApi.current=api;const generation=useRef(0);
 async function load(after:string|null=null){
  const ticket=++generation.current;setBusy(true);setError('');setSelected(null);
  if(after===null){setRows([]);setCursor(null);setLoaded(false);}
  try{
   const response=await currentApi.current(`/api/cms/health?site=${encodeURIComponent(site)}${reportRecord?'&record='+encodeURIComponent(reportRecord):after?'&after='+encodeURIComponent(after):''}`);
   if(ticket!==generation.current)return;
   const value=verifiedContentHealth(response.result,site,after);
   if(reportRecord&&(value.nextCursor!==null||value.items.length>1||value.items.some(row=>row.id!==reportRecord)))throw Error('Content health record mismatch.');
   if(reportRecord)setSelected(value.items[0]??null);
   setRows(previous=>after?[...previous,...value.items]:value.items);setCursor(value.nextCursor);setLoaded(true);
  }catch(reason){if(ticket===generation.current){setRows([]);setCursor(null);setLoaded(false);setError(reason instanceof Error?reason.message:'Content health is unavailable.');}}
  finally{if(ticket===generation.current)setBusy(false);}
 }
 useEffect(()=>{void load();return()=>{generation.current++;};},[site,reportRecord]); // The parent keys this workspace by account and site.
 const visible=filterContentHealth(rows,filters,now);
 const attention=rows.filter(row=>healthNeedsAttention(row,now)).length;
 return <section aria-label='Content health'><h2>Content health</h2><p>Review saved drafts, open their checks and request a fresh trusted check. Results cover only records you can view; passing checks alone do not authorize publication.</p>
 {reportRecord&&<p>This report loads the latest saved revision. <button disabled={busy} onClick={()=>{setReportRecord(undefined);setSelected(null);onClearReport?.();window.history.replaceState(null,'','/cms');}}>Show all content health</button></p>}
 <button disabled={busy} onClick={()=>void load()}>{busy?'Loading content health…':'Refresh content health'}</button>
 {error&&<p role='alert'>{error}</p>}{loaded&&<p role='status'>{rows.length} records loaded · {attention} need checks or review{cursor?' · More records available':''}.</p>}
 {loaded&&!rows.length&&<p>No accessible saved records were found. A linked record may have been removed or your access may have changed.</p>}
 <fieldset disabled={busy}><legend>Filter loaded records</legend>
 <p>Filters and ordering apply to the records loaded below. Load more to include additional accessible records.</p>
 <label>Search loaded records<input type='search' value={filters.query} onChange={event=>updateFilter('query',event.target.value)}/></label>
 <label>Content type<select value={filters.type} onChange={event=>updateFilter('type',event.target.value)}><option value=''>All content types</option>{[...new Set(rows.map(row=>row.type))].sort().map(value=><option key={value}>{value}</option>)}</select></label>
 <label>Language<select value={filters.locale} onChange={event=>updateFilter('locale',event.target.value)}><option value=''>All languages</option>{[...new Set(rows.map(row=>row.locale))].sort().map(value=><option key={value}>{value}</option>)}</select></label>
 <label>Check status<select value={filters.validation} onChange={event=>updateFilter('validation',event.target.value)}><option value=''>All check statuses</option><option value='attention'>Needs checks or review</option>{Object.entries(validationStateLabels).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label>
 <label>Review status<select value={filters.review} onChange={event=>updateFilter('review',event.target.value)}><option value=''>All review statuses</option>{['draft','in_review','changes_requested','approved'].map(value=><option key={value} value={value}>{value.replaceAll('_',' ')}</option>)}</select></label>
 <label>Publication<select value={filters.publication} onChange={event=>updateFilter('publication',event.target.value)}><option value=''>All publication states</option><option value='current'>Current revision published</option><option value='changed'>Newer draft than published content</option><option value='unpublished'>Unpublished</option></select></label>
 <label>Order<select value={filters.order} onChange={event=>updateFilter('order',event.target.value as HealthFilters['order'])}><option value='attention'>Errors and required checks first</option><option value='title'>Title</option></select></label>
 <button type='button' onClick={()=>{setFilters({...defaultHealthFilters});setSelected(null);}}>Clear filters</button>
 </fieldset>
 {loaded&&<p role='status'>{visible.length} of {rows.length} loaded records match.{cursor?' More records have not been searched.':''}</p>}
 {loaded&&rows.length>0&&!visible.length&&<p>No loaded records match these filters. Clear filters or load more records.</p>}
 <ul>{visible.map(row=><li key={row.id}><button disabled={busy} aria-pressed={selected?.id===row.id} onClick={()=>setSelected(row)}>{row.title} · {row.locale} · {row.type}</button><p>{validationStateLabels[effectiveValidationState(row,now)]} · {row.errors} {row.errors===1?'error':'errors'} · {row.warnings} {row.warnings===1?'warning':'warnings'}. {row.reviewStatus.replaceAll('_',' ')}{row.publishedRevision===row.revision?' · Current revision published':row.publishedRevision?' · Newer draft than published content':' · Unpublished'}.</p>{effectiveValidationState(row,now)==='stale'&&<small>Counts describe an earlier check and may have changed.</small>}</li>)}</ul>
 {cursor&&<button disabled={busy} onClick={()=>void load(cursor)}>Load more health records</button>}
 {selected&&<section key={`${selected.id}:${selected.revision}`} aria-label={`Checks for ${selected.title}`}><h3>{selected.title}</h3><a href={healthReportHref(site,selected.id)}>Link to this health report</a><p>{selected.locale} · {selected.type}. Opening the editor loads the latest saved revision with your current access.</p>{editorView(selected.type)?<button disabled={busy} onClick={()=>onOpen(selected)}>Open this record in editor</button>:<p>An editor for this content type is not available yet.</p>}<ValidationPanel revision={selected.revision} dirty={false} disabled={busy} canRequest={selected.canRequest} check={action=>currentApi.current('/api/cms/content',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action,site,record:selected.id,revision:selected.revision})})}/></section>}
 <section aria-label='Publishing operations'><h3>Publishing operations</h3><p>Load scheduled groups and release delivery separately to inspect their latest saved status. Document and certification expiry monitoring is separate.</p><DeliveryMonitorPanel key={`jobs:${actor}:${site}`} site={site} api={api}/><ScheduleMonitorPanel key={`individual:${actor}:${site}`} site={site} api={api}/><ScheduledReleaseList key={`schedules:${actor}:${site}`} site={site} disabled={busy} api={api} onInspectDelivery={setDeliveryRequest}/><ReleaseDeliveryPanel key={`delivery:${actor}:${site}:${deliveryRequest??'lookup'}`} site={site} actor={actor} initialRequest={deliveryRequest} disabled={busy} api={api}/></section>
 <DocumentDateMonitorPanel key={`dates:${actor}:${site}`} site={site} api={api}/>
 <LeadRemindersPanel key={`reminders:${actor}:${site}`} site={site} actor={actor} api={api} onOpen={onOpenLead}/>
 <LeadAttentionPanel key={`leads:${actor}:${site}`} site={site} api={api} onOpen={onOpenLead}/>
 <MediaRightsMonitorPanel key={`rights:${actor}:${site}`} site={site} api={api} onOpen={onOpenMedia}/>
 <MediaRightsMonitorPanel key={`pdf-rights:${actor}:${site}`} kind="pdf" site={site} api={api} onOpen={onOpenPdf}/>
 <ValidationFindingsReportPanel key={`findings:${actor}:${site}`} site={site} api={api}/>
 <RedirectImportApprovalPanel key={`redirect-approval:${actor}:${site}`} site={site} api={api}/>
 <RedirectImportPanel key={`redirect-import:${actor}:${site}`} site={site} actor={actor} api={api}/>
 <SiteRedirectExportPanel key={`redirect-export:${actor}:${site}`} site={site} api={api}/>
 <ContentActivityPanel key={site} site={site} api={api}/>
 </section>;
}
