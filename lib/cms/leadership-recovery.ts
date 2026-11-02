import {checkNewDraft,type NewDraftCheckpoint} from './new-draft-checkpoints.ts';
import {checkpointRecoveryMode,type DraftCheckpoint} from './draft-checkpoints.ts';
import {leadershipSchema} from './leadership.ts';
import {prepareLeadershipConflict,type LeadershipConflictRecord} from './leadership-conflict.ts';
export function recoverNewLeadership(value:NewDraftCheckpoint,actor:string,site:string){const checked=checkNewDraft(value,{actor,site,kind:'leadership'});return {payload:leadershipSchema.parse(checked.draft),locale:checked.locale};}
export function recoverLeadershipCheckpoint(value:DraftCheckpoint,actor:string,site:string,current:LeadershipConflictRecord,latest:LeadershipConflictRecord){
 if(!latest||latest.id!==current.id||latest.type!=='leadership'||latest.path!==current.path||latest.path===null||latest.locale!==current.locale)throw Error('The current Leadership identity could not be verified.');
 const mode=checkpointRecoveryMode(value,{scope:{actor,site,record:latest.id,kind:'leadership',locale:latest.locale},revision:latest.currentRevision,canEdit:latest.permissions?.edit===true});
 const payload=leadershipSchema.parse(value.draft),base=leadershipSchema.parse(value.base);const currentPayload=leadershipSchema.parse(latest.payload);
 if(latest.path!==`/leadership/${currentPayload.slug}`||payload.slug!==currentPayload.slug||base.slug!==currentPayload.slug)throw Error('Leadership recovery route mismatch.');
 return {payload,locale:latest.locale,conflict:mode==='compare'?prepareLeadershipConflict({...latest,currentRevision:value.baseRevision,payload:base},payload,latest):null};
}
