import {locationPath,locationSchema,type LocationDraft} from './locations.ts';
import {prepareLocationConflict,type LocationConflictRecord} from './location-conflict.ts';
/** A read can confirm content equivalence, not ownership of a lost write. */
export function reconcileLocationUpdate(base:LocationConflictRecord,mine:LocationDraft,latest:LocationConflictRecord){
 if(base.type!=='location'||latest.type!=='location'||latest.id!==base.id||latest.locale!==base.locale||latest.path!==base.path||!latest.permissions.edit)throw Error('Location update recovery access or identity changed. Keep your local edits.');
 const original=locationSchema.parse(base.payload),sent=locationSchema.parse(mine),current=locationSchema.parse(latest.payload);
 if(base.path!==locationPath(original.slug)||sent.slug!==original.slug||current.slug!==original.slug)throw Error('Location update recovery route mismatch.');
 if(JSON.stringify(sent)===JSON.stringify(current))return {status:'matching' as const};
 if(latest.currentRevision===base.currentRevision){
  if(JSON.stringify(original)!==JSON.stringify(current))throw Error('Location revision content changed without a new revision.');
  return {status:'retry' as const};
 }
 return {status:'compare' as const,conflict:prepareLocationConflict(base,sent,latest)};
}
