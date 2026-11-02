import {leadershipSchema,type LeadershipDraft} from './leadership.ts';
import {prepareLeadershipConflict,type LeadershipConflictRecord} from './leadership-conflict.ts';
/** A read can confirm content equivalence, not ownership of a lost write. */
export function reconcileLeadershipUpdate(base:LeadershipConflictRecord,mine:LeadershipDraft,latest:LeadershipConflictRecord){
 if(base.type!=='leadership'||latest.type!=='leadership'||latest.id!==base.id||latest.locale!==base.locale||latest.path!==base.path||!latest.permissions.edit)throw Error('Leadership update recovery access or identity changed. Keep your local edits.');
 const original=leadershipSchema.parse(base.payload),sent=leadershipSchema.parse(mine),current=leadershipSchema.parse(latest.payload);
 if(base.path!==`/leadership/${original.slug}`||sent.slug!==original.slug||current.slug!==original.slug)throw Error('Leadership update recovery route mismatch.');
 if(JSON.stringify(sent)===JSON.stringify(current))return {status:'matching' as const};
 if(latest.currentRevision===base.currentRevision){
  if(JSON.stringify(original)!==JSON.stringify(current))throw Error('Leadership revision content changed without a new revision.');
  return {status:'retry' as const};
 }
 return {status:'compare' as const,conflict:prepareLeadershipConflict(base,sent,latest)};
}
