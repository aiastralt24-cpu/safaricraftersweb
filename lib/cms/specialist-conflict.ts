import {specialistSchema,type SpecialistDraft} from './specialists.ts';
export type SpecialistConflictRecord={id:string;type:string;path:string|null;locale:string;currentRevision:string;payload:unknown;permissions:{edit:boolean}};
const snapshot=(payload:unknown):Record<string,unknown>=>({image:undefined,video:undefined,...specialistSchema.parse(payload)});
export function prepareSpecialistConflict(base:SpecialistConflictRecord,mine:SpecialistDraft,latest:SpecialistConflictRecord){
 if(!latest||latest.id!==base.id||latest.type!=='specialist'||base.path!==null||latest.path!==null||latest.locale!==base.locale||!latest.permissions?.edit||!latest.currentRevision||latest.currentRevision===base.currentRevision)throw Error('The latest profile cannot be reconciled with your access, identity or revision. Your unsaved changes remain open.');
 return {base:snapshot(base.payload),mine:snapshot(mine),remote:snapshot(latest.payload)};
}
