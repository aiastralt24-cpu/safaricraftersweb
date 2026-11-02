'use client';
export type SettingsReviewAction='submit'|'approve'|'request_changes';
type State={currentRevision:string;reviewStatus:string;permissions:{submit:boolean;approve:boolean}};
export function SettingsReview({record,disabled,onAction}:{record:State;disabled:boolean;onAction:(action:SettingsReviewAction,revision:string)=>void}){
 return <section aria-label="Settings review"><h3>Settings review</h3><p>Status: {record.reviewStatus.replaceAll('_',' ')}</p><p>Review applies to this saved revision. Approval does not publish settings. Sensitive website changes require configuration permission, and authors cannot approve their own revision.</p>
  <div className="cms-actions">
   {record.permissions.submit&&<button type="button" disabled={disabled||!['draft','changes_requested'].includes(record.reviewStatus)} onClick={()=>onAction('submit',record.currentRevision)}>Submit settings for review</button>}
   {record.permissions.approve&&record.reviewStatus==='in_review'&&<><button type="button" disabled={disabled} onClick={()=>onAction('approve',record.currentRevision)}>Approve settings revision</button><button type="button" disabled={disabled} onClick={()=>onAction('request_changes',record.currentRevision)}>Request settings changes</button></>}
  </div>
 </section>;
}
