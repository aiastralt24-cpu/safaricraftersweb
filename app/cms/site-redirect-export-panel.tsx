'use client';
import {useEffect,useRef,useState} from 'react';
import {verifiedSiteRedirectExport} from '../../lib/cms/site-redirect-export';
export function SiteRedirectExportPanel({site,api}:{site:string;api:(path:string,options?:RequestInit)=>Promise<any>}){
 const [busy,setBusy]=useState(false),[message,setMessage]=useState(''),[error,setError]=useState('');const generation=useRef(0);
 useEffect(()=>()=>{generation.current++;},[site]);
 async function download(){const ticket=++generation.current;setBusy(true);setError('');setMessage('');try{
  const response=await api('/api/cms/redirects/export',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({site})});
  if(ticket!==generation.current)return;
  const result=verifiedSiteRedirectExport(response.result,site),url=URL.createObjectURL(new Blob([JSON.stringify(result,null,2)+'\n'],{type:'application/json'})),link=document.createElement('a');
  try{link.href=url;link.download=`site-redirects-${site}.json`;document.body.appendChild(link);link.click();setMessage(`Export prepared with ${result.redirects.length} redirects.`);}finally{link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);}
 }catch(reason){if(ticket===generation.current)setError(reason instanceof Error?reason.message:'The export failed. No file was created.');}finally{if(ticket===generation.current)setBusy(false);}}
 return <section aria-label='Website redirect export'><h3>Website redirect export</h3><p>Download the complete saved page redirect inventory as JSON, including language, destination, paused addresses and publication state. Requires website-wide page viewing and export permission. This inventory does not verify live routing and cannot yet be imported. Exports above 10,000 redirects are refused without a partial file.</p><button disabled={busy} onClick={()=>void download()}>{busy?'Preparing redirect export…':'Download website redirects'}</button>{message&&<p role='status'>{message}</p>}{error&&<p role='alert'>{error}</p>}</section>;
}
