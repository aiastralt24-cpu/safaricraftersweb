import {partnerPath,partnerSchema,type PartnerDraft} from './partners.ts';
import {preparePartnerConflict,type PartnerConflictRecord} from './partner-conflict.ts';
/** A read can confirm content equivalence, not ownership of a lost write. */
export function reconcilePartnerUpdate(base:PartnerConflictRecord,mine:PartnerDraft,latest:PartnerConflictRecord){
 if(base.type!=='partner'||latest.type!=='partner'||latest.id!==base.id||latest.locale!==base.locale||latest.path!==base.path||!latest.permissions.edit)throw Error('Partner update recovery access or identity changed. Keep your local edits.');
 const original=partnerSchema.parse(base.payload),sent=partnerSchema.parse(mine),current=partnerSchema.parse(latest.payload);
 if(base.path!==partnerPath(original.slug)||sent.slug!==original.slug||current.slug!==original.slug)throw Error('Partner update recovery route mismatch.');
 if(JSON.stringify(sent)===JSON.stringify(current))return {status:'matching' as const};
 if(latest.currentRevision===base.currentRevision){
  if(JSON.stringify(original)!==JSON.stringify(current))throw Error('Partner revision content changed without a new revision.');
  return {status:'retry' as const};
 }
 return {status:'compare' as const,conflict:preparePartnerConflict(base,sent,latest)};
}
