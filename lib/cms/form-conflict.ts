import {formSchema,type FormDefinition} from './forms.ts';
export type FormConflictRecord={id:string;type:string;path:string|null;locale:string;currentRevision:string;payload:unknown;permissions:{edit:boolean}};
const snapshot=(payload:unknown):Record<string,unknown>=>({successHeading:undefined,redirectPath:undefined,...formSchema.parse(payload)});
export function prepareFormConflict(base:FormConflictRecord,mine:FormDefinition,latest:FormConflictRecord){
 if(!latest||latest.id!==base.id||latest.type!=='form'||base.path!==null||latest.path!==null||latest.locale!==base.locale||!latest.permissions?.edit||!latest.currentRevision||latest.currentRevision===base.currentRevision)throw Error('The latest form cannot be reconciled with your access, identity or revision. Your unsaved changes remain open.');
 return {base:snapshot(base.payload),mine:snapshot(mine),remote:snapshot(latest.payload)};
}
