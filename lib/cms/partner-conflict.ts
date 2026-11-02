import {partnerPath,partnerSchema,type PartnerDraft} from './partners.ts';
export type PartnerConflictRecord={id:string;type:string;path:string|null;locale:string;currentRevision:string;payload:unknown;permissions:{edit:boolean}};
export function preparePartnerConflict(base:PartnerConflictRecord,mine:PartnerDraft,latest:PartnerConflictRecord){
 if(!latest||latest.id!==base.id||base.type!=='partner'||latest.type!=='partner'||base.path===null||latest.path!==base.path||latest.locale!==base.locale||!latest.permissions?.edit||!latest.currentRevision||latest.currentRevision===base.currentRevision)throw Error('The latest Partner cannot be reconciled with your access, identity or revision. Your unsaved edits remain open.');
 const original=partnerSchema.parse(base.payload),local=partnerSchema.parse(mine),remote=partnerSchema.parse(latest.payload);
 if(base.path!==partnerPath(original.slug)||[local,remote].some(d=>d.slug!==original.slug))throw Error('Partner conflict route mismatch.');
 return {base:{...partnerSchema.parse(base.payload)},mine:{...partnerSchema.parse(mine)},remote:{...partnerSchema.parse(latest.payload)}};
}
