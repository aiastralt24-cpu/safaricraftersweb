import {effectiveValidationState,type ContentHealthRow} from './content-health.ts';
export type HealthFilters={query:string;type:string;locale:string;validation:string;review:string;publication:string;order:'attention'|'title'};
export const defaultHealthFilters:HealthFilters={query:'',type:'',locale:'',validation:'',review:'',publication:'',order:'attention'};
export function healthPublication(row:ContentHealthRow){return row.publishedRevision===row.revision?'current':row.publishedRevision?'changed':'unpublished';}
export function healthNeedsAttention(row:ContentHealthRow,now=Date.now()){return effectiveValidationState(row,now)!=='passed'||row.warnings>0||row.reviewStatus==='changes_requested'||row.reviewStatus==='in_review';}
export function filterContentHealth(rows:ContentHealthRow[],filters:HealthFilters,now=Date.now()){
 const query=filters.query.trim().toLocaleLowerCase();
 const priority=(row:ContentHealthRow)=>{const state=effectiveValidationState(row,now);return state==='failed'?0:row.reviewStatus==='changes_requested'?1:state==='stale'?2:state==='not_checked'?3:state==='unsupported'?4:row.warnings>0?5:6;};
 return rows.filter(row=>(!query||[row.title,row.type,row.locale].some(value=>value.toLocaleLowerCase().includes(query)))&&(!filters.type||row.type===filters.type)&&(!filters.locale||row.locale===filters.locale)&&(!filters.validation||(filters.validation==='attention'?healthNeedsAttention(row,now):effectiveValidationState(row,now)===filters.validation))&&(!filters.review||row.reviewStatus===filters.review)&&(!filters.publication||healthPublication(row)===filters.publication)).sort((a,b)=>(filters.order==='attention'?priority(a)-priority(b):0)||a.title.localeCompare(b.title)||a.id.localeCompare(b.id));
}
