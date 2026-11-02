import {productPath,productSchema,type ProductDraft} from './products.ts';
import {prepareProductConflict,type ProductConflictRecord} from './product-conflict.ts';
/** A read can confirm content equivalence, not ownership of a lost write. */
export function reconcileProductUpdate(base:ProductConflictRecord,mine:ProductDraft,latest:ProductConflictRecord){
 if(base.type!=='product'||latest.type!=='product'||latest.id!==base.id||latest.locale!==base.locale||latest.path!==base.path||!latest.permissions.edit)throw Error('Product update recovery access or identity changed. Keep your local edits.');
 const original=productSchema.parse(base.payload),sent=productSchema.parse(mine),current=productSchema.parse(latest.payload);
 if(base.path!==productPath(original.slug)||sent.slug!==original.slug||current.slug!==original.slug)throw Error('Product update recovery route mismatch.');
 if(JSON.stringify(sent)===JSON.stringify(current))return {status:'matching' as const};
 if(latest.currentRevision===base.currentRevision){
  if(JSON.stringify(original)!==JSON.stringify(current))throw Error('Product revision content changed without a new revision.');
  return {status:'retry' as const};
 }
 return {status:'compare' as const,conflict:prepareProductConflict(base,sent,latest)};
}
