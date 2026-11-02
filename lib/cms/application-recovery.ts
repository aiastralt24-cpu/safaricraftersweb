import {checkNewDraft,type NewDraftCheckpoint} from './new-draft-checkpoints.ts';
import {checkpointRecoveryMode,type DraftCheckpoint} from './draft-checkpoints.ts';
import {applicationPath,applicationSchema} from './applications.ts';
import {prepareApplicationConflict,type ApplicationConflictRecord} from './application-conflict.ts';
export function recoverNewApplication(value:NewDraftCheckpoint,actor:string,site:string){const checked=checkNewDraft(value,{actor,site,kind:'application'});return {payload:applicationSchema.parse(checked.draft),locale:checked.locale};}
export function recoverApplicationCheckpoint(value:DraftCheckpoint,actor:string,site:string,current:ApplicationConflictRecord,latest:ApplicationConflictRecord){
 if(!latest||latest.id!==current.id||latest.type!=='application'||latest.path!==current.path||latest.path===null||latest.locale!==current.locale)throw Error('The current Application identity could not be verified.');
 const mode=checkpointRecoveryMode(value,{scope:{actor,site,record:latest.id,kind:'application',locale:latest.locale},revision:latest.currentRevision,canEdit:latest.permissions?.edit===true});
 const payload=applicationSchema.parse(value.draft),base=applicationSchema.parse(value.base);const currentPayload=applicationSchema.parse(latest.payload);
 if(latest.path!==applicationPath(currentPayload.slug,currentPayload.kind)||payload.slug!==currentPayload.slug||base.slug!==currentPayload.slug||payload.kind!==currentPayload.kind||base.kind!==currentPayload.kind)throw Error('Application recovery route mismatch.');
 return {payload,locale:latest.locale,conflict:mode==='compare'?prepareApplicationConflict({...latest,currentRevision:value.baseRevision,payload:base},payload,latest):null};
}
