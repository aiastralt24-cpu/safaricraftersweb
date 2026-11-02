import {photoExpeditionSchema,type PhotoExpeditionDraft} from './photo-expeditions.ts';
export type ExpeditionConflictRecord={id:string;type:string;path:string|null;locale:string;currentRevision:string;payload:unknown;permissions:{edit:boolean}};
/** Keep optional fields in the comparison so additions and removals are visible. */
export function expeditionConflictSnapshot(payload:unknown):Record<string,unknown>{
 const parsed=photoExpeditionSchema.parse(payload);
 return {image:undefined,heroImage:undefined,mobileHeroImage:undefined,video:undefined,...parsed};
}
export function prepareExpeditionConflict(base:ExpeditionConflictRecord,mine:PhotoExpeditionDraft,latest:ExpeditionConflictRecord){
 if(!latest||latest.id!==base.id||latest.type!=='photoExpedition'||latest.locale!==base.locale||latest.path!==base.path||!latest.permissions?.edit||!latest.currentRevision||latest.currentRevision===base.currentRevision)throw Error('The latest expedition cannot be reconciled with your access, revision or route. Your unsaved changes remain open.');
 const original=expeditionConflictSnapshot(base.payload),remote=expeditionConflictSnapshot(latest.payload);
 if(`/photo-expeditions/${remote.slug}`!==latest.path||remote.slug!==original.slug)throw Error('The latest expedition URL is inconsistent. Your unsaved changes remain open.');
 return {base:original,mine:expeditionConflictSnapshot(mine),remote};
}
