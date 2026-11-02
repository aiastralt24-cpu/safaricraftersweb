import {productCategoryPath,productCategorySchema,type ProductCategoryDraft} from './products.ts';
export type ProductCategoryConflictRecord={id:string;type:string;path:string|null;locale:string;currentRevision:string;payload:unknown;permissions:{edit:boolean}};
export function prepareProductCategoryConflict(base:ProductCategoryConflictRecord,mine:ProductCategoryDraft,latest:ProductCategoryConflictRecord){
 if(!latest||latest.id!==base.id||base.type!=='productCategory'||latest.type!=='productCategory'||base.path===null||latest.path!==base.path||latest.locale!==base.locale||!latest.permissions?.edit||!latest.currentRevision||latest.currentRevision===base.currentRevision)throw Error('The latest ProductCategory cannot be reconciled with your access, identity or revision. Your unsaved edits remain open.');
 const original=productCategorySchema.parse(base.payload),local=productCategorySchema.parse(mine),remote=productCategorySchema.parse(latest.payload);
 if(base.path!==productCategoryPath(original.slug)||[local,remote].some(d=>d.slug!==original.slug))throw Error('ProductCategory conflict route mismatch.');
 return {base:{...productCategorySchema.parse(base.payload)},mine:{...productCategorySchema.parse(mine)},remote:{...productCategorySchema.parse(latest.payload)}};
}
