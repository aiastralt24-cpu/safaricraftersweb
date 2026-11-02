import {leadershipSchema,type LeadershipDraft} from './leadership.ts';
export type LeadershipConflictRecord={id:string;type:string;path:string|null;locale:string;currentRevision:string;payload:unknown;permissions:{edit:boolean}};
export function prepareLeadershipConflict(base:LeadershipConflictRecord,mine:LeadershipDraft,latest:LeadershipConflictRecord){
 if(!latest||latest.id!==base.id||base.type!=='leadership'||latest.type!=='leadership'||base.path===null||latest.path!==base.path||latest.locale!==base.locale||!latest.permissions?.edit||!latest.currentRevision||latest.currentRevision===base.currentRevision)throw Error('The latest Leadership cannot be reconciled with your access, identity or revision. Your unsaved edits remain open.');
 return {base:{...leadershipSchema.parse(base.payload)},mine:{...leadershipSchema.parse(mine)},remote:{...leadershipSchema.parse(latest.payload)}};
}
