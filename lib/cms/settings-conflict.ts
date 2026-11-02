import {globalSettingsSchema,type GlobalSettings} from './global-settings.ts';
export type SettingsConflictRecord={id:string;type:string;path:string|null;locale:string;currentRevision:string;payload:unknown;permissions:{edit:boolean}};
const snapshot=(payload:unknown):Record<string,unknown>=>({fallbackImage:undefined,...globalSettingsSchema.parse(payload)});
export function prepareSettingsConflict(base:SettingsConflictRecord,mine:GlobalSettings,latest:SettingsConflictRecord){
 if(!latest||latest.id!==base.id||latest.type!=='settings'||base.path!==null||latest.path!==null||latest.locale!==base.locale||!latest.permissions?.edit||!latest.currentRevision||latest.currentRevision===base.currentRevision)throw Error('The latest settings cannot be reconciled with your access, identity or revision. Your unsaved changes remain open.');
 return {base:snapshot(base.payload),mine:snapshot(mine),remote:snapshot(latest.payload)};
}
