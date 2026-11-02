'use client';
export type DocumentReviewAction='submit'|'approve'|'request_changes';
type State={currentRevision:string;reviewStatus:string;permissions:{submit:boolean;approve:boolean}};
export function DocumentReview({record,disabled,onAction}:{record:State;disabled:boolean;onAction:(action:DocumentReviewAction,revision:string)=>void}){
 return <section aria-label="Document review"><h3>Document review</h3><p>Status: {record.reviewStatus.replaceAll('_',' ')}</p><p>Review applies to this saved revision. Approval does not publish the document. Authors cannot approve their own revision.</p>
  <div className="cms-actions">
   {record.permissions.submit&&<button type="button" disabled={disabled||!['draft','changes_requested'].includes(record.reviewStatus)} onClick={()=>onAction('submit',record.currentRevision)}>Submit document for review</button>}
   {record.permissions.approve&&record.reviewStatus==='in_review'&&<><button type="button" disabled={disabled} onClick={()=>onAction('approve',record.currentRevision)}>Approve document revision</button><button type="button" disabled={disabled} onClick={()=>onAction('request_changes',record.currentRevision)}>Request document changes</button></>}
  </div>
 </section>;
}
