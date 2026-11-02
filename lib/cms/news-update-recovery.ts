import {newsSchema,type NewsDraft} from './news.ts';
import {prepareNewsConflict,type NewsConflictRecord} from './news-conflict.ts';
/** A read can confirm content equivalence, not ownership of a lost write. */
export function reconcileNewsUpdate(base:NewsConflictRecord,mine:NewsDraft,latest:NewsConflictRecord){
 if(base.type!=='news'||latest.type!=='news'||latest.id!==base.id||latest.locale!==base.locale||latest.path!==base.path||!latest.permissions.edit)throw Error('News update recovery access or identity changed. Keep your local edits.');
 const original=newsSchema.parse(base.payload),sent=newsSchema.parse(mine),current=newsSchema.parse(latest.payload);
 if(base.path!==`/news/${original.slug}`||sent.slug!==original.slug||current.slug!==original.slug)throw Error('News update recovery route mismatch.');
 if(JSON.stringify(sent)===JSON.stringify(current))return {status:'matching' as const};
 if(latest.currentRevision===base.currentRevision){
  if(JSON.stringify(original)!==JSON.stringify(current))throw Error('News revision content changed without a new revision.');
  return {status:'retry' as const};
 }
 return {status:'compare' as const,conflict:prepareNewsConflict(base,sent,latest)};
}
