import {newsSchema,type NewsDraft} from './news.ts';
export type NewsConflictRecord={id:string;type:string;path:string|null;locale:string;currentRevision:string;payload:unknown;permissions:{edit:boolean}};
export function prepareNewsConflict(base:NewsConflictRecord,mine:NewsDraft,latest:NewsConflictRecord){
 if(!latest||latest.id!==base.id||base.type!=='news'||latest.type!=='news'||base.path===null||latest.path!==base.path||latest.locale!==base.locale||!latest.permissions?.edit||!latest.currentRevision||latest.currentRevision===base.currentRevision)throw Error('The latest News cannot be reconciled with your access, identity or revision. Your unsaved edits remain open.');
 return {base:{...newsSchema.parse(base.payload)},mine:{...newsSchema.parse(mine)},remote:{...newsSchema.parse(latest.payload)}};
}
