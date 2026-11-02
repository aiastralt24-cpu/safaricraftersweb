import {checkNewDraft,type NewDraftCheckpoint} from './new-draft-checkpoints.ts';
import {checkpointRecoveryMode,type DraftCheckpoint} from './draft-checkpoints.ts';
import {partnerPath,partnerSchema} from './partners.ts';
import {preparePartnerConflict,type PartnerConflictRecord} from './partner-conflict.ts';
export function recoverNewPartner(value:NewDraftCheckpoint,actor:string,site:string){const checked=checkNewDraft(value,{actor,site,kind:'partner'});return {payload:partnerSchema.parse(checked.draft),locale:checked.locale};}
export function recoverPartnerCheckpoint(value:DraftCheckpoint,actor:string,site:string,current:PartnerConflictRecord,latest:PartnerConflictRecord){
 if(!latest||latest.id!==current.id||latest.type!=='partner'||latest.path!==current.path||latest.path===null||latest.locale!==current.locale)throw Error('The current Partner identity could not be verified.');
 const mode=checkpointRecoveryMode(value,{scope:{actor,site,record:latest.id,kind:'partner',locale:latest.locale},revision:latest.currentRevision,canEdit:latest.permissions?.edit===true});
 const payload=partnerSchema.parse(value.draft),base=partnerSchema.parse(value.base);const currentPayload=partnerSchema.parse(latest.payload);
 if(latest.path!==partnerPath(currentPayload.slug)||payload.slug!==currentPayload.slug||base.slug!==currentPayload.slug)throw Error('Partner recovery route mismatch.');
 return {payload,locale:latest.locale,conflict:mode==='compare'?preparePartnerConflict({...latest,currentRevision:value.baseRevision,payload:base},payload,latest):null};
}
