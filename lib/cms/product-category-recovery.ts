import {checkNewDraft,type NewDraftCheckpoint} from './new-draft-checkpoints.ts';
import {checkpointRecoveryMode,type DraftCheckpoint} from './draft-checkpoints.ts';
import {productCategoryPath,productCategorySchema} from './products.ts';
import {prepareProductCategoryConflict,type ProductCategoryConflictRecord} from './product-category-conflict.ts';
export function recoverNewProductCategory(value:NewDraftCheckpoint,actor:string,site:string){const checked=checkNewDraft(value,{actor,site,kind:'productCategory'});return {payload:productCategorySchema.parse(checked.draft),locale:checked.locale};}
export function recoverProductCategoryCheckpoint(value:DraftCheckpoint,actor:string,site:string,current:ProductCategoryConflictRecord,latest:ProductCategoryConflictRecord){
 if(!latest||latest.id!==current.id||latest.type!=='productCategory'||latest.path!==current.path||latest.path===null||latest.locale!==current.locale)throw Error('The current ProductCategory identity could not be verified.');
 const mode=checkpointRecoveryMode(value,{scope:{actor,site,record:latest.id,kind:'productCategory',locale:latest.locale},revision:latest.currentRevision,canEdit:latest.permissions?.edit===true});
 const payload=productCategorySchema.parse(value.draft),base=productCategorySchema.parse(value.base);const currentPayload=productCategorySchema.parse(latest.payload);
 if(latest.path!==productCategoryPath(currentPayload.slug)||payload.slug!==currentPayload.slug||base.slug!==currentPayload.slug)throw Error('ProductCategory recovery route mismatch.');
 return {payload,locale:latest.locale,conflict:mode==='compare'?prepareProductCategoryConflict({...latest,currentRevision:value.baseRevision,payload:base},payload,latest):null};
}
