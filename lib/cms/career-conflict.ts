import {careerPath,careerSchema,type CareerDraft} from './careers.ts';
export type CareerConflictRecord={id:string;type:string;path:string|null;locale:string;currentRevision:string;payload:unknown;permissions:{edit:boolean}};
export function prepareCareerConflict(base:CareerConflictRecord,mine:CareerDraft,latest:CareerConflictRecord){
 if(!latest||latest.id!==base.id||base.type!=='career'||latest.type!=='career'||base.path===null||latest.path!==base.path||latest.locale!==base.locale||!latest.permissions?.edit||!latest.currentRevision||latest.currentRevision===base.currentRevision)throw Error('The latest Career cannot be reconciled with your access, identity or revision. Your unsaved edits remain open.');
 const original=careerSchema.parse(base.payload),local=careerSchema.parse(mine),remote=careerSchema.parse(latest.payload);
 if(base.path!==careerPath(original.slug)||[local,remote].some(d=>d.slug!==original.slug))throw Error('Career conflict route mismatch.');
 return {base:{...careerSchema.parse(base.payload)},mine:{...careerSchema.parse(mine)},remote:{...careerSchema.parse(latest.payload)}};
}
