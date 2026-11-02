import {productPath,productSchema,type ProductDraft} from './products.ts';
export type ProductConflictRecord={id:string;type:string;path:string|null;locale:string;currentRevision:string;payload:unknown;permissions:{edit:boolean}};
export function prepareProductConflict(base:ProductConflictRecord,mine:ProductDraft,latest:ProductConflictRecord){
 if(!latest||latest.id!==base.id||base.type!=='product'||latest.type!=='product'||base.path===null||latest.path!==base.path||latest.locale!==base.locale||!latest.permissions?.edit||!latest.currentRevision||latest.currentRevision===base.currentRevision)throw Error('The latest Product cannot be reconciled with your access, identity or revision. Your unsaved edits remain open.');
 const original=productSchema.parse(base.payload),local=productSchema.parse(mine),remote=productSchema.parse(latest.payload);
 if(base.path!==productPath(original.slug)||[local,remote].some(d=>d.slug!==original.slug))throw Error('Product conflict route mismatch.');
 return {base:{...productSchema.parse(base.payload)},mine:{...productSchema.parse(mine)},remote:{...productSchema.parse(latest.payload)}};
}
