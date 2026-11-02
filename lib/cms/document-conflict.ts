import {documentSchema,type DocumentDraft} from './documents.ts';
export type DocumentConflictRecord={id:string;type:string;path:string|null;locale:string;currentRevision:string;payload:unknown;permissions:{edit:boolean}};
const snapshot=(payload:unknown):Record<string,unknown>=>({file:undefined,effectiveOn:undefined,expiresOn:undefined,reviewOn:undefined,...documentSchema.parse(payload)});
export function prepareDocumentConflict(base:DocumentConflictRecord,mine:DocumentDraft,latest:DocumentConflictRecord){
 if(!latest||latest.id!==base.id||latest.type!=='document'||base.path!==null||latest.path!==null||latest.locale!==base.locale||!latest.permissions?.edit||!latest.currentRevision||latest.currentRevision===base.currentRevision)throw Error('The latest document cannot be reconciled with your access, identity or revision. Your unsaved changes remain open.');
 if(documentSchema.parse(latest.payload).language!==base.locale||mine.language!==base.locale)throw Error('Document language must match the saved locale.');
 return {base:snapshot(base.payload),mine:snapshot(mine),remote:snapshot(latest.payload)};
}
