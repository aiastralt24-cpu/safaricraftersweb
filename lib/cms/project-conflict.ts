import {projectSchema,projectPath,type ProjectDraft} from './projects.ts';
export type ProjectConflictRecord={id:string;type:string;path:string|null;locale:string;currentRevision:string;payload:unknown;permissions:{edit:boolean}};
export function projectConflictSnapshot(payload:unknown):Record<string,unknown>{return {image:undefined,...projectSchema.parse(payload)};}
export function prepareProjectConflict(base:ProjectConflictRecord,mine:ProjectDraft,latest:ProjectConflictRecord){
 if(!latest||latest.id!==base.id||latest.type!=='project'||base.type!=='project'||latest.locale!==base.locale||latest.path!==base.path||!latest.permissions?.edit||!latest.currentRevision||latest.currentRevision===base.currentRevision)throw Error('The latest project cannot be reconciled with your access, revision or URL. Your unsaved changes remain open.');
 const original=projectConflictSnapshot(base.payload),local=projectConflictSnapshot(mine),remote=projectConflictSnapshot(latest.payload);
 if([original,local,remote].some(value=>projectPath(String(value.slug))!==latest.path))throw Error('Recovered project URLs do not match this record. Your unsaved changes remain open.');
 return {base:original,mine:local,remote};
}
