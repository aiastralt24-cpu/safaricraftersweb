import {checkNewDraft,type NewDraftCheckpoint} from './new-draft-checkpoints.ts';
import {checkpointRecoveryMode,type DraftCheckpoint} from './draft-checkpoints.ts';
import {faqSchema} from './faqs.ts';
import {prepareFaqConflict,type FaqConflictRecord} from './faq-conflict.ts';
export function recoverNewFaq(value:NewDraftCheckpoint,actor:string,site:string){const checked=checkNewDraft(value,{actor,site,kind:'faq'});return {payload:faqSchema.parse(checked.draft),locale:checked.locale};}
export function recoverFaqCheckpoint(value:DraftCheckpoint,actor:string,site:string,current:FaqConflictRecord,latest:FaqConflictRecord){
 if(!latest||latest.id!==current.id||latest.type!=='faq'||latest.path!==null||latest.locale!==current.locale)throw Error('The current FAQ identity could not be verified.');
 const mode=checkpointRecoveryMode(value,{scope:{actor,site,record:latest.id,kind:'faq',locale:latest.locale},revision:latest.currentRevision,canEdit:latest.permissions?.edit===true});
 const payload=faqSchema.parse(value.draft),base=faqSchema.parse(value.base);faqSchema.parse(latest.payload);
 return {payload,locale:latest.locale,conflict:mode==='compare'?prepareFaqConflict({...latest,currentRevision:value.baseRevision,payload:base},payload,latest):null};
}
