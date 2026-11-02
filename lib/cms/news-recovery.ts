import {checkNewDraft,type NewDraftCheckpoint} from './new-draft-checkpoints.ts';
import {checkpointRecoveryMode,type DraftCheckpoint} from './draft-checkpoints.ts';
import {newsSchema} from './news.ts';
import {prepareNewsConflict,type NewsConflictRecord} from './news-conflict.ts';
export function recoverNewNews(value:NewDraftCheckpoint,actor:string,site:string){const checked=checkNewDraft(value,{actor,site,kind:'news'});return {payload:newsSchema.parse(checked.draft),locale:checked.locale};}
export function recoverNewsCheckpoint(value:DraftCheckpoint,actor:string,site:string,current:NewsConflictRecord,latest:NewsConflictRecord){
 if(!latest||latest.id!==current.id||latest.type!=='news'||latest.path!==current.path||latest.path===null||latest.locale!==current.locale)throw Error('The current News identity could not be verified.');
 const mode=checkpointRecoveryMode(value,{scope:{actor,site,record:latest.id,kind:'news',locale:latest.locale},revision:latest.currentRevision,canEdit:latest.permissions?.edit===true});
 const payload=newsSchema.parse(value.draft),base=newsSchema.parse(value.base);const currentPayload=newsSchema.parse(latest.payload);
 if(latest.path!==`/news/${currentPayload.slug}`||payload.slug!==currentPayload.slug||base.slug!==currentPayload.slug)throw Error('News recovery route mismatch.');
 return {payload,locale:latest.locale,conflict:mode==='compare'?prepareNewsConflict({...latest,currentRevision:value.baseRevision,payload:base},payload,latest):null};
}
