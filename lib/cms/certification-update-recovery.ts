import {certificationPath,certificationSchema,type CertificationDraft} from './certifications.ts';
import {prepareCertificationConflict,type CertificationConflictRecord} from './certification-conflict.ts';
/** A read can confirm content equivalence, not ownership of a lost write. */
export function reconcileCertificationUpdate(base:CertificationConflictRecord,mine:CertificationDraft,latest:CertificationConflictRecord){
 if(base.type!=='certification'||latest.type!=='certification'||latest.id!==base.id||latest.locale!==base.locale||latest.path!==base.path||!latest.permissions.edit)throw Error('Certification update recovery access or identity changed. Keep your local edits.');
 const original=certificationSchema.parse(base.payload),sent=certificationSchema.parse(mine),current=certificationSchema.parse(latest.payload);
 if(base.path!==certificationPath(original.slug)||sent.slug!==original.slug||current.slug!==original.slug)throw Error('Certification update recovery route mismatch.');
 if(JSON.stringify(sent)===JSON.stringify(current))return {status:'matching' as const};
 if(latest.currentRevision===base.currentRevision){
  if(JSON.stringify(original)!==JSON.stringify(current))throw Error('Certification revision content changed without a new revision.');
  return {status:'retry' as const};
 }
 return {status:'compare' as const,conflict:prepareCertificationConflict(base,sent,latest)};
}
