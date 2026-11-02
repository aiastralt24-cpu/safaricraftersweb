import {checkNewDraft,type NewDraftCheckpoint} from './new-draft-checkpoints.ts';
import {checkpointRecoveryMode,type DraftCheckpoint} from './draft-checkpoints.ts';
import {locationPath,locationSchema} from './locations.ts';
import {prepareLocationConflict,type LocationConflictRecord} from './location-conflict.ts';
export function recoverNewLocation(value:NewDraftCheckpoint,actor:string,site:string){const checked=checkNewDraft(value,{actor,site,kind:'location'});return {payload:locationSchema.parse(checked.draft),locale:checked.locale};}
export function recoverLocationCheckpoint(value:DraftCheckpoint,actor:string,site:string,current:LocationConflictRecord,latest:LocationConflictRecord){
 if(!latest||latest.id!==current.id||latest.type!=='location'||latest.path!==current.path||latest.path===null||latest.locale!==current.locale)throw Error('The current Location identity could not be verified.');
 const mode=checkpointRecoveryMode(value,{scope:{actor,site,record:latest.id,kind:'location',locale:latest.locale},revision:latest.currentRevision,canEdit:latest.permissions?.edit===true});
 const payload=locationSchema.parse(value.draft),base=locationSchema.parse(value.base);const currentPayload=locationSchema.parse(latest.payload);
 if(latest.path!==locationPath(currentPayload.slug)||payload.slug!==currentPayload.slug||base.slug!==currentPayload.slug)throw Error('Location recovery route mismatch.');
 return {payload,locale:latest.locale,conflict:mode==='compare'?prepareLocationConflict({...latest,currentRevision:value.baseRevision,payload:base},payload,latest):null};
}
