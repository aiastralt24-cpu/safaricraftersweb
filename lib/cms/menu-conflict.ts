import {navigationSchema,type Navigation} from './navigation.ts';
export type MenuConflictRecord={id:string;type:string;path:string|null;locale:string;currentRevision:string;payload:unknown;permissions:{edit:boolean}};
const snapshot=(payload:unknown):Record<string,unknown>=>({...navigationSchema.parse(payload)});
export function prepareMenuConflict(base:MenuConflictRecord,mine:Navigation,latest:MenuConflictRecord){
 if(!latest||latest.id!==base.id||latest.type!=='navigation'||base.path!==null||latest.path!==null||latest.locale!==base.locale||!latest.permissions?.edit||!latest.currentRevision||latest.currentRevision===base.currentRevision)throw Error('The latest menu cannot be reconciled with your access, identity or revision. Your unsaved changes remain open.');
 return {base:snapshot(base.payload),mine:snapshot(mine),remote:snapshot(latest.payload)};
}
