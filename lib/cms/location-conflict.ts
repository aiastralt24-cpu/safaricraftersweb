import {locationPath,locationSchema,type LocationDraft} from './locations.ts';
export type LocationConflictRecord={id:string;type:string;path:string|null;locale:string;currentRevision:string;payload:unknown;permissions:{edit:boolean}};
export function prepareLocationConflict(base:LocationConflictRecord,mine:LocationDraft,latest:LocationConflictRecord){
 if(!latest||latest.id!==base.id||base.type!=='location'||latest.type!=='location'||base.path===null||latest.path!==base.path||latest.locale!==base.locale||!latest.permissions?.edit||!latest.currentRevision||latest.currentRevision===base.currentRevision)throw Error('The latest Location cannot be reconciled with your access, identity or revision. Your unsaved edits remain open.');
 const original=locationSchema.parse(base.payload),local=locationSchema.parse(mine),remote=locationSchema.parse(latest.payload);
 if(base.path!==locationPath(original.slug)||[local,remote].some(d=>d.slug!==original.slug))throw Error('Location conflict route mismatch.');
 return {base:{...locationSchema.parse(base.payload)},mine:{...locationSchema.parse(mine)},remote:{...locationSchema.parse(latest.payload)}};
}
