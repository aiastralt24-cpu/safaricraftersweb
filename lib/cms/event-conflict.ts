import {eventSchema,type EventDraft} from './events.ts';
export type EventConflictRecord={id:string;type:string;path:string|null;locale:string;currentRevision:string;payload:unknown;permissions:{edit:boolean}};
export function prepareEventConflict(base:EventConflictRecord,mine:EventDraft,latest:EventConflictRecord){
 if(!latest||latest.id!==base.id||base.type!=='event'||latest.type!=='event'||base.path===null||latest.path!==base.path||latest.locale!==base.locale||!latest.permissions?.edit||!latest.currentRevision||latest.currentRevision===base.currentRevision)throw Error('The latest Event cannot be reconciled with your access, identity or revision. Your unsaved edits remain open.');
 return {base:{...eventSchema.parse(base.payload)},mine:{...eventSchema.parse(mine)},remote:{...eventSchema.parse(latest.payload)}};
}
