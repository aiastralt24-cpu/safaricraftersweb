import {certificationPath,certificationSchema,type CertificationDraft} from './certifications.ts';
export type CertificationConflictRecord={id:string;type:string;path:string|null;locale:string;currentRevision:string;payload:unknown;permissions:{edit:boolean}};
export function prepareCertificationConflict(base:CertificationConflictRecord,mine:CertificationDraft,latest:CertificationConflictRecord){
 if(!latest||latest.id!==base.id||base.type!=='certification'||latest.type!=='certification'||base.path===null||latest.path!==base.path||latest.locale!==base.locale||!latest.permissions?.edit||!latest.currentRevision||latest.currentRevision===base.currentRevision)throw Error('The latest Certification cannot be reconciled with your access, identity or revision. Your unsaved edits remain open.');
 const original=certificationSchema.parse(base.payload),local=certificationSchema.parse(mine),remote=certificationSchema.parse(latest.payload);
 if(base.path!==certificationPath(original.slug)||[local,remote].some(d=>d.slug!==original.slug))throw Error('Certification conflict route mismatch.');
 return {base:{...certificationSchema.parse(base.payload)},mine:{...certificationSchema.parse(mine)},remote:{...certificationSchema.parse(latest.payload)}};
}
