import {applicationPath,applicationSchema,type ApplicationDraft} from './applications.ts';
export type ApplicationConflictRecord={id:string;type:string;path:string|null;locale:string;currentRevision:string;payload:unknown;permissions:{edit:boolean}};
export function prepareApplicationConflict(base:ApplicationConflictRecord,mine:ApplicationDraft,latest:ApplicationConflictRecord){
 if(!latest||latest.id!==base.id||base.type!=='application'||latest.type!=='application'||base.path===null||latest.path!==base.path||latest.locale!==base.locale||!latest.permissions?.edit||!latest.currentRevision||latest.currentRevision===base.currentRevision)throw Error('The latest Application cannot be reconciled with your access, identity or revision. Your unsaved edits remain open.');
 const original=applicationSchema.parse(base.payload),local=applicationSchema.parse(mine),remote=applicationSchema.parse(latest.payload);
 if(base.path!==applicationPath(original.slug,original.kind)||[local,remote].some(d=>d.slug!==original.slug||d.kind!==original.kind))throw Error('Application conflict route mismatch.');
 return {base:{...applicationSchema.parse(base.payload)},mine:{...applicationSchema.parse(mine)},remote:{...applicationSchema.parse(latest.payload)}};
}
