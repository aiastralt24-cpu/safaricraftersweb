import {checkNewDraft,type NewDraftCheckpoint} from './new-draft-checkpoints.ts';
import {checkpointRecoveryMode,type DraftCheckpoint} from './draft-checkpoints.ts';
import {certificationPath,certificationSchema} from './certifications.ts';
import {prepareCertificationConflict,type CertificationConflictRecord} from './certification-conflict.ts';
export function recoverNewCertification(value:NewDraftCheckpoint,actor:string,site:string){const checked=checkNewDraft(value,{actor,site,kind:'certification'});return {payload:certificationSchema.parse(checked.draft),locale:checked.locale};}
export function recoverCertificationCheckpoint(value:DraftCheckpoint,actor:string,site:string,current:CertificationConflictRecord,latest:CertificationConflictRecord){
 if(!latest||latest.id!==current.id||latest.type!=='certification'||latest.path!==current.path||latest.path===null||latest.locale!==current.locale)throw Error('The current Certification identity could not be verified.');
 const mode=checkpointRecoveryMode(value,{scope:{actor,site,record:latest.id,kind:'certification',locale:latest.locale},revision:latest.currentRevision,canEdit:latest.permissions?.edit===true});
 const payload=certificationSchema.parse(value.draft),base=certificationSchema.parse(value.base);const currentPayload=certificationSchema.parse(latest.payload);
 if(latest.path!==certificationPath(currentPayload.slug)||payload.slug!==currentPayload.slug||base.slug!==currentPayload.slug)throw Error('Certification recovery route mismatch.');
 return {payload,locale:latest.locale,conflict:mode==='compare'?prepareCertificationConflict({...latest,currentRevision:value.baseRevision,payload:base},payload,latest):null};
}
