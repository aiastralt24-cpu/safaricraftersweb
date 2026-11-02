import {careerPath,careerSchema,type CareerDraft} from './careers.ts';
import {prepareCareerConflict,type CareerConflictRecord} from './career-conflict.ts';
/** A read can confirm content equivalence, not ownership of a lost write. */
export function reconcileCareerUpdate(base:CareerConflictRecord,mine:CareerDraft,latest:CareerConflictRecord){
 if(base.type!=='career'||latest.type!=='career'||latest.id!==base.id||latest.locale!==base.locale||latest.path!==base.path||!latest.permissions.edit)throw Error('Career update recovery access or identity changed. Keep your local edits.');
 const original=careerSchema.parse(base.payload),sent=careerSchema.parse(mine),current=careerSchema.parse(latest.payload);
 if(base.path!==careerPath(original.slug)||sent.slug!==original.slug||current.slug!==original.slug)throw Error('Career update recovery route mismatch.');
 if(JSON.stringify(sent)===JSON.stringify(current))return {status:'matching' as const};
 if(latest.currentRevision===base.currentRevision){
  if(JSON.stringify(original)!==JSON.stringify(current))throw Error('Career revision content changed without a new revision.');
  return {status:'retry' as const};
 }
 return {status:'compare' as const,conflict:prepareCareerConflict(base,sent,latest)};
}
