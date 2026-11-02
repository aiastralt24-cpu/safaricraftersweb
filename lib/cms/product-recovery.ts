import {checkNewDraft,type NewDraftCheckpoint} from './new-draft-checkpoints.ts';
import {checkpointRecoveryMode,type DraftCheckpoint} from './draft-checkpoints.ts';
import {productPath,productSchema} from './products.ts';
import {prepareProductConflict,type ProductConflictRecord} from './product-conflict.ts';
export function recoverNewProduct(value:NewDraftCheckpoint,actor:string,site:string){const checked=checkNewDraft(value,{actor,site,kind:'product'});return {payload:productSchema.parse(checked.draft),locale:checked.locale};}
export function recoverProductCheckpoint(value:DraftCheckpoint,actor:string,site:string,current:ProductConflictRecord,latest:ProductConflictRecord){
 if(!latest||latest.id!==current.id||latest.type!=='product'||latest.path!==current.path||latest.path===null||latest.locale!==current.locale)throw Error('The current Product identity could not be verified.');
 const mode=checkpointRecoveryMode(value,{scope:{actor,site,record:latest.id,kind:'product',locale:latest.locale},revision:latest.currentRevision,canEdit:latest.permissions?.edit===true});
 const payload=productSchema.parse(value.draft),base=productSchema.parse(value.base);const currentPayload=productSchema.parse(latest.payload);
 if(latest.path!==productPath(currentPayload.slug)||payload.slug!==currentPayload.slug||base.slug!==currentPayload.slug)throw Error('Product recovery route mismatch.');
 return {payload,locale:latest.locale,conflict:mode==='compare'?prepareProductConflict({...latest,currentRevision:value.baseRevision,payload:base},payload,latest):null};
}
