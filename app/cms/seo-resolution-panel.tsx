'use client';
import {useEffect,useState} from 'react';
import type {PageSeo} from '../../lib/cms/page-seo';
import type {resolvePageSeo} from '../../lib/cms/seo-resolution';
type Result={values:ReturnType<typeof resolvePageSeo>;settingsRevision:string;source:string};
export function SeoResolutionPanel({site,record,revision,title,seo,api,busy,run}:{site:string;record:string;revision:string;title:string;seo:PageSeo;api:(path:string,options?:RequestInit)=>Promise<any>;busy:boolean;run:(work:()=>Promise<void>)=>Promise<void>}){
 const [result,setResult]=useState<Result|null>(null);
 useEffect(()=>{setResult(null);},[site,record,revision,title,seo]);
 return <details className='cms-seo-resolution'><summary>Resolve inherited SEO values</summary><p>Uses the current settings draft for this locale. This is a draft calculation; it does not change the website.</p><button type='button' disabled={busy} onClick={()=>run(async()=>{setResult(null);const response=await api('/api/cms/seo/resolve',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({site,record,revision,title,seo})});setResult(response.result);})}>Check SEO defaults and overrides</button>{result&&<><p>{result.source}</p><p>Settings revision: {result.settingsRevision}</p><dl>{Object.entries(result.values).map(([key,field])=><div key={key}><dt>{({title:'SEO title',description:'Meta description',canonical:'Canonical URL',indexing:'Indexing',following:'Link following',sitemap:'Sitemap inclusion',socialTitle:'Social title',socialDescription:'Social description',socialImage:'Sharing image',breadcrumbLabel:'Breadcrumb label'} as Record<string,string>)[key]}</dt><dd>{field.value===null?'Not configured':typeof field.value==='boolean'?field.value?'Included':'Excluded':typeof field.value==='object'?`Image asset: ${field.value.assetId}`:field.value||'Empty'}<small>Source: {field.source}</small></dd></div>)}</dl></>}</details>;
}
