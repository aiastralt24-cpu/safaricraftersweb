import {checkNewDraft,type NewDraftCheckpoint} from './new-draft-checkpoints.ts';
import {checkpointRecoveryMode,type DraftCheckpoint} from './draft-checkpoints.ts';
import {careerPath,careerSchema} from './careers.ts';
import {prepareCareerConflict,type CareerConflictRecord} from './career-conflict.ts';
export function recoverNewCareer(value:NewDraftCheckpoint,actor:string,site:string){const checked=checkNewDraft(value,{actor,site,kind:'career'});return {payload:careerSchema.parse(checked.draft),locale:checked.locale};}
export function recoverCareerCheckpoint(value:DraftCheckpoint,actor:string,site:string,current:CareerConflictRecord,latest:CareerConflictRecord){
 if(!latest||latest.id!==current.id||latest.type!=='career'||latest.path!==current.path||latest.path===null||latest.locale!==current.locale)throw Error('The current Career identity could not be verified.');
 const mode=checkpointRecoveryMode(value,{scope:{actor,site,record:latest.id,kind:'career',locale:latest.locale},revision:latest.currentRevision,canEdit:latest.permissions?.edit===true});
 const payload=careerSchema.parse(value.draft),base=careerSchema.parse(value.base);const currentPayload=careerSchema.parse(latest.payload);
 if(latest.path!==careerPath(currentPayload.slug)||payload.slug!==currentPayload.slug||base.slug!==currentPayload.slug)throw Error('Career recovery route mismatch.');
 return {payload,locale:latest.locale,conflict:mode==='compare'?prepareCareerConflict({...latest,currentRevision:value.baseRevision,payload:base},payload,latest):null};
}
