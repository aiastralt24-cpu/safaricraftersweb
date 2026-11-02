import {eventSchema,type EventDraft} from './events.ts';
import {prepareEventConflict,type EventConflictRecord} from './event-conflict.ts';
/** A read can confirm content equivalence, not ownership of a lost write. */
export function reconcileEventUpdate(base:EventConflictRecord,mine:EventDraft,latest:EventConflictRecord){
 if(base.type!=='event'||latest.type!=='event'||latest.id!==base.id||latest.locale!==base.locale||latest.path!==base.path||!latest.permissions.edit)throw Error('Event update recovery access or identity changed. Keep your local edits.');
 const original=eventSchema.parse(base.payload),sent=eventSchema.parse(mine),current=eventSchema.parse(latest.payload);
 if(base.path!==`/events/${original.slug}`||sent.slug!==original.slug||current.slug!==original.slug)throw Error('Event update recovery route mismatch.');
 if(JSON.stringify(sent)===JSON.stringify(current))return {status:'matching' as const};
 if(latest.currentRevision===base.currentRevision){
  if(JSON.stringify(original)!==JSON.stringify(current))throw Error('Event revision content changed without a new revision.');
  return {status:'retry' as const};
 }
 return {status:'compare' as const,conflict:prepareEventConflict(base,sent,latest)};
}
