import {checkNewDraft,type NewDraftCheckpoint} from './new-draft-checkpoints.ts';
import {projectSchema} from './projects.ts';
export function recoverNewProjectDraft(value:NewDraftCheckpoint,actor:string,site:string){
 const checked=checkNewDraft(value,{actor,site,kind:'project'});
 return {payload:projectSchema.parse(checked.draft),locale:checked.locale};
}
