'use client';
type Revision={id:string;createdAt:string};
type Props={hasMore?:boolean;onLoadMore?:()=>void;history:Revision[];currentRevision:string;publishedRevision:string|null;disabled:boolean;canEdit:boolean;onRestore:(revision:string)=>void};
export function SettingsHistory({hasMore=false,onLoadMore,history,currentRevision,publishedRevision,disabled,canEdit,onRestore}:Props){
 return <details><summary>Settings revision history</summary><p>Restore an earlier version as a new draft. The published website stays unchanged. Restoring sensitive settings requires configuration permission.</p>
  {history.length?history.map(revision=><div key={revision.id}><p>{new Date(revision.createdAt).toLocaleString()}{revision.id===currentRevision?' · Current draft':''}{revision.id===publishedRevision?' · Published':''}</p>
   {canEdit&&revision.id!==currentRevision&&<button type="button" disabled={disabled} onClick={()=>{if(window.confirm('Restore these settings as a new draft? The published website will stay unchanged.'))onRestore(revision.id);}}>Restore settings draft</button>}
  </div>):<p>No earlier revisions are available.</p>}
  {hasMore&&onLoadMore?<button type="button" disabled={disabled} onClick={onLoadMore}>Load older revisions</button>:history.length>0&&<p>All available revisions are shown.</p>}
 </details>;
}
