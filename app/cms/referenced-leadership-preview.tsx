'use client';
import {useEffect,useState} from 'react';
import {z} from 'zod';
import {leadershipSchema} from '../../lib/cms/leadership';
import type {LoadFormPreview} from '../../lib/cms/form-preview-reference';
import {MediaImage,type LoadMediaPreview} from './media-image';
const response=z.object({id:z.string().uuid(),type:z.literal('leadership'),payload:leadershipSchema}).passthrough();
export function ReferencedLeadershipPreview({ids,load,loadPreview}:{ids:string[];load?:LoadFormPreview;loadPreview:LoadMediaPreview}){
 const key=JSON.stringify(ids),[values,setValues]=useState<{key:string;rows:(z.infer<typeof response>|null)[]}|null>(null);
 useEffect(()=>{if(!load)return;let active=true;const controller=new AbortController();
 (async()=>{const requested=JSON.parse(key) as string[],rows:(z.infer<typeof response>|null)[]=[];
 for(let i=0;i<requested.length;i+=5)rows.push(...await Promise.all(requested.slice(i,i+5).map(async id=>{try{const value=response.parse(await load(id,controller.signal));return value.id.toLowerCase()===id.toLowerCase()?value:null;}catch{return null;}})));
 if(active)setValues({key,rows});})();return()=>{active=false;controller.abort();};},[key,load]);
 if(!load)return <p role='status'>Connect the record library to preview profiles.</p>;
 if(values?.key!==key)return <p role='status'>Loading selected leadership profiles…</p>;
 return <><p>Selected draft summaries. The website uses each profile’s published revision.</p>{values.rows.map((row,i)=>row?<article key={ids[i]}><h3>{row.payload.title}</h3><p>{row.payload.role}{row.payload.department&&` · ${row.payload.department}`}{row.payload.status==='former'&&' · Former leadership'}</p>{row.payload.image&&<MediaImage asset={row.payload.image.assetId} alt={row.payload.image.decorative?'':row.payload.image.alt} load={loadPreview}/>}<p>{row.payload.summary}</p><p>Profile link disabled in preview.</p></article>:<p role='alert' key={ids[i]}>Selected profile unavailable. Check your selection and permissions.</p>)}</>;
}
