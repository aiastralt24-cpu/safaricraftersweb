import {applicationPath,applicationSchema,type ApplicationDraft} from './applications.ts';
import {prepareApplicationConflict,type ApplicationConflictRecord} from './application-conflict.ts';
/** A read can confirm content equivalence, not ownership of a lost write. */
export function reconcileApplicationUpdate(base:ApplicationConflictRecord,mine:ApplicationDraft,latest:ApplicationConflictRecord){
 if(base.type!=='application'||latest.type!=='application'||latest.id!==base.id||latest.locale!==base.locale||latest.path!==base.path||!latest.permissions.edit)throw Error('Application update recovery access or identity changed. Keep your local edits.');
 const original=applicationSchema.parse(base.payload),sent=applicationSchema.parse(mine),current=applicationSchema.parse(latest.payload);
 if(base.path!==applicationPath(original.slug,original.kind)||sent.slug!==original.slug||current.slug!==original.slug||sent.kind!==original.kind||current.kind!==original.kind)throw Error('Application update recovery route mismatch.');
 if(JSON.stringify(sent)===JSON.stringify(current))return {status:'matching' as const};
 if(latest.currentRevision===base.currentRevision){
  if(JSON.stringify(original)!==JSON.stringify(current))throw Error('Application revision content changed without a new revision.');
  return {status:'retry' as const};
 }
 return {status:'compare' as const,conflict:prepareApplicationConflict(base,sent,latest)};
}
