import {z} from 'zod';
import {verifiedTranslationStatus,type TranslationStatus} from './translation-status.ts';
const savedRecord=z.object({id:z.string().uuid(),currentRevision:z.string().uuid(),type:z.string(),locale:z.string(),title:z.string(),path:z.string().nullable(),payload:z.record(z.string(),z.json())});
type Saved=z.infer<typeof savedRecord>;
type Cell={kind:string;text:string};
export type TranslationField={id:string;label:string;source:Cell;translation:Cell;equal:boolean};
export type TranslationComparison={status:TranslationStatus;sourceTitle:string;translationTitle:string;fields:TranslationField[]};
const missing:Cell={kind:'missing',text:'Field not present'};
function flatten(value:unknown){
 const out=new Map<string,{label:string;cell:Cell}>();let nodes=0;
 function visit(v:unknown,path:(string|number)[],depth:number){
  if(++nodes>20000||depth>32)throw Error('This content is too complex for field comparison. Review it with support before confirming translation.');
  const empty=Array.isArray(v)?v.length===0:v!==null&&typeof v==='object'&&Object.keys(v).length===0;
  if(v!==null&&typeof v==='object'&&!empty){if(Array.isArray(v))v.forEach((child,i)=>visit(child,[...path,i],depth+1));else for(const [name,child]of Object.entries(v))visit(child,[...path,name],depth+1);return;}
  const kind=v===''?'empty text':v===null?'null':Array.isArray(v)?'list':typeof v==='object'?'group':typeof v;
  const text=v===null?'No value':empty?(Array.isArray(v)?'Empty list':'Empty group'):typeof v==='string'?(v||'Empty text'):String(v);
  const label=path.map(part=>typeof part==='number'?`Item ${part+1}`:part.replace(/([a-z])([A-Z])/g,'$1 $2')).join(' › ');
  out.set(JSON.stringify(path),{label,cell:{kind,text}});
 }
 visit(value,[],0);return out;
}
export function compareTranslationRecords(status:TranslationStatus,sourceValue:unknown,targetValue:unknown):TranslationComparison{
 const source=savedRecord.parse(sourceValue),target=savedRecord.parse(targetValue);
 if(source.id!==status.sourceRecordId||source.currentRevision!==status.currentSourceRevisionId||source.locale!==status.sourceLocale||target.id!==status.recordId||target.currentRevision!==status.revisionId||target.locale!==status.locale||target.type!==source.type)throw Error('The source or translation changed. Refresh status and load the comparison again.');
 const content=(r:Saved)=>({title:r.title,path:r.path,content:r.payload});
 const left=flatten(content(source)),right=flatten(content(target));
 const fields=[...new Set([...left.keys(),...right.keys()])].map(id=>{const a=left.get(id),b=right.get(id),source=a?.cell??missing,translation=b?.cell??missing;return {id,label:a?.label??b!.label,source,translation,equal:source.kind===translation.kind&&source.text===translation.text};});
 return {status,sourceTitle:source.title,translationTitle:target.title,fields};
}
type Api=(path:string,options?:RequestInit)=>Promise<any>;
/** Both reads use the caller's permissions. The final status read detects
 * source/target changes while loading; SQL checks again when confirming. */
export async function loadTranslationComparison(api:Api,site:string,status:TranslationStatus){
 const path=(id:string)=>`/api/cms/content?site=${encodeURIComponent(site)}&record=${encodeURIComponent(id)}`;
 const [source,target]=await Promise.all([api(path(status.sourceRecordId)),api(path(status.recordId))]);
 const comparison=compareTranslationRecords(status,source.record,target.record);
 const response=await api('/api/cms/translations',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'read',site,record:status.recordId})});
 const current=verifiedTranslationStatus(response.result,status.recordId,status.revisionId);
 if(!current||JSON.stringify(current)!==JSON.stringify(status))throw Error('Translation status changed while loading. Refresh it and compare again.');
 return comparison;
}
