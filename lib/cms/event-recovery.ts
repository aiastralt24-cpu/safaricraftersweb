import {checkNewDraft,type NewDraftCheckpoint} from './new-draft-checkpoints.ts';
import {checkpointRecoveryMode,type DraftCheckpoint} from './draft-checkpoints.ts';
import {eventSchema} from './events.ts';
import {prepareEventConflict,type EventConflictRecord} from './event-conflict.ts';
export function recoverNewEvent(value:NewDraftCheckpoint,actor:string,site:string){const checked=checkNewDraft(value,{actor,site,kind:'event'});return {payload:eventSchema.parse(checked.draft),locale:checked.locale};}
export function recoverEventCheckpoint(value:DraftCheckpoint,actor:string,site:string,current:EventConflictRecord,latest:EventConflictRecord){
 if(!latest||latest.id!==current.id||latest.type!=='event'||latest.path!==current.path||latest.path===null||latest.locale!==current.locale)throw Error('The current Event identity could not be verified.');
 const mode=checkpointRecoveryMode(value,{scope:{actor,site,record:latest.id,kind:'event',locale:latest.locale},revision:latest.currentRevision,canEdit:latest.permissions?.edit===true});
 const payload=eventSchema.parse(value.draft),base=eventSchema.parse(value.base);const currentPayload=eventSchema.parse(latest.payload);
 if(latest.path!==`/events/${currentPayload.slug}`||payload.slug!==currentPayload.slug||base.slug!==currentPayload.slug)throw Error('Event recovery route mismatch.');
 return {payload,locale:latest.locale,conflict:mode==='compare'?prepareEventConflict({...latest,currentRevision:value.baseRevision,payload:base},payload,latest):null};
}
