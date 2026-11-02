'use client';
import {useEffect,useRef,useState} from 'react';
export type LoadDocumentPreview=(identity:{record:string;revision:string;asset:string},signal:AbortSignal)=>Promise<Blob>;
export function DocumentPreviewPanel({record,revision,asset,disabled,load}:{record:string;revision:string;asset:string;disabled:boolean;load:LoadDocumentPreview}){
 const [url,setUrl]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const current=useRef(0),controller=useRef<AbortController|null>(null),objectUrl=useRef(''),loader=useRef(load);loader.current=load;
 function release(){current.current++;controller.current?.abort();controller.current=null;if(objectUrl.current){URL.revokeObjectURL(objectUrl.current);objectUrl.current='';}}
 function close(){release();setUrl('');setBusy(false);setError('');}
 useEffect(()=>{close();return release;},[record,revision,asset,disabled]); // eslint-disable-line react-hooks/exhaustive-deps
 async function preview(){
  if(disabled||controller.current)return;
  release();setUrl('');setError('');setBusy(true);const generation=current.current,request=new AbortController();controller.current=request;
  try{
   const blob=await loader.current({record,revision,asset},request.signal);
   if(request.signal.aborted||generation!==current.current)return;
   if(blob.type!=='application/pdf'||blob.size<1||blob.size>25000000)throw Error('The PDF preview response is invalid.');
   const value=URL.createObjectURL(blob);objectUrl.current=value;setUrl(value);
  }catch(e){if(generation===current.current&&!request.signal.aborted)setError(e instanceof Error?e.message:'PDF preview is unavailable.');}
  finally{if(generation===current.current){controller.current=null;setBusy(false);}}
 }
 return <section aria-label='Saved PDF preview'><h3>Saved PDF preview</h3>
  <p>{disabled?'Save or discard pending changes before previewing the saved file.':'Preview the PDF selected by this saved revision. Loading checks your current access and the file status.'}</p>
  {error&&<p role='alert'>{error}</p>}
  <div className='cms-actions'><button disabled={disabled||busy} onClick={()=>void preview()}>{busy?'Loading PDF preview…':url?'Reload PDF preview':'Load PDF preview'}</button>
  {(busy||url)&&<button onClick={close}>Close PDF preview</button>}
  {url&&!disabled&&<a href={url} target='_blank' rel='noopener noreferrer'>Open PDF preview in a new tab</a>}</div>
  {url&&!disabled&&<p role='status'>The saved PDF is ready to open in your browser’s PDF viewer.</p>}
 </section>;
}
