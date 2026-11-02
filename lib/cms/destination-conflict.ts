import {destinationSchema,type DestinationDraft} from './destinations.ts';
export type DestinationConflictRecord={id:string;type:string;path:string|null;locale:string;currentRevision:string;payload:unknown;permissions:{edit:boolean}};
/** Keep optional fields in the comparison so additions and removals are visible. */
export function destinationConflictSnapshot(payload:unknown):Record<string,unknown>{
 const parsed=destinationSchema.parse(payload);
 return {image:undefined,heroImage:undefined,video:undefined,...parsed};
}
export function prepareDestinationConflict(base:DestinationConflictRecord,mine:DestinationDraft,latest:DestinationConflictRecord){
 if(!latest||latest.id!==base.id||latest.type!=='destination'||latest.locale!==base.locale||latest.path!==base.path||!latest.permissions?.edit||!latest.currentRevision||latest.currentRevision===base.currentRevision)throw Error('The latest destination cannot be reconciled with your access, revision or route. Your unsaved changes remain open.');
 const original=destinationConflictSnapshot(base.payload),remote=destinationConflictSnapshot(latest.payload);
 if(`/destinations/${remote.slug}`!==latest.path||remote.slug!==original.slug)throw Error('The latest destination URL is inconsistent. Your unsaved changes remain open.');
 return {base:original,mine:destinationConflictSnapshot(mine),remote};
}
