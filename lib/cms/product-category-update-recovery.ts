import {productCategoryPath,productCategorySchema,type ProductCategoryDraft} from './products.ts';
import {prepareProductCategoryConflict,type ProductCategoryConflictRecord} from './product-category-conflict.ts';
/** A read can confirm content equivalence, not ownership of a lost write. */
export function reconcileProductCategoryUpdate(base:ProductCategoryConflictRecord,mine:ProductCategoryDraft,latest:ProductCategoryConflictRecord){
 if(base.type!=='productCategory'||latest.type!=='productCategory'||latest.id!==base.id||latest.locale!==base.locale||latest.path!==base.path||!latest.permissions.edit)throw Error('ProductCategory update recovery access or identity changed. Keep your local edits.');
 const original=productCategorySchema.parse(base.payload),sent=productCategorySchema.parse(mine),current=productCategorySchema.parse(latest.payload);
 if(base.path!==productCategoryPath(original.slug)||sent.slug!==original.slug||current.slug!==original.slug)throw Error('ProductCategory update recovery route mismatch.');
 if(JSON.stringify(sent)===JSON.stringify(current))return {status:'matching' as const};
 if(latest.currentRevision===base.currentRevision){
  if(JSON.stringify(original)!==JSON.stringify(current))throw Error('ProductCategory revision content changed without a new revision.');
  return {status:'retry' as const};
 }
 return {status:'compare' as const,conflict:prepareProductCategoryConflict(base,sent,latest)};
}
