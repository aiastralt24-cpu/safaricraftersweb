import {notFound} from 'next/navigation';
import {z} from 'zod';
import {DocumentDownloadPage} from './download-client';
export const dynamic='force-dynamic';
export const metadata={title:'Document download | Safari Crafters',robots:{index:false,follow:false}};
export default async function Page({params,searchParams}:{params:Promise<{record:string}>;searchParams:Promise<Record<string,string|string[]|undefined>>}){
 const {record}=await params,query=await searchParams;
 const revision=query.revision;
 if(Object.keys(query).some(key=>key!=='revision')||revision!==undefined&&!z.string().uuid().safeParse(revision).success)notFound();
 if(process.env.CMS_DOCUMENT_DOWNLOADS_ENABLED!=='true'||!z.string().uuid().safeParse(record).success)notFound();
 const raw=process.env.CMS_SUPABASE_URL||'',key=process.env.CMS_SUPABASE_ANON_KEY||'';
 let config:{url:string;key:string}|null=null;
 try{const url=new URL(raw);if(url.protocol==='https:'&&url.pathname==='/'&&!url.username&&!url.password&&!url.search&&!url.hash&&key)config={url:raw,key};}catch{}
 return <DocumentDownloadPage record={record} revision={revision as string|undefined} config={config}/>;
}
