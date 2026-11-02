import {faqSchema,type FaqDraft} from './faqs.ts';
export type FaqConflictRecord={id:string;type:string;path:string|null;locale:string;currentRevision:string;payload:unknown;permissions:{edit:boolean}};
export function prepareFaqConflict(base:FaqConflictRecord,mine:FaqDraft,latest:FaqConflictRecord){
 if(!latest||latest.id!==base.id||base.type!=='faq'||latest.type!=='faq'||base.path!==null||latest.path!==null||latest.locale!==base.locale||!latest.permissions?.edit||!latest.currentRevision||latest.currentRevision===base.currentRevision)throw Error('The latest FAQ cannot be reconciled with your access, identity or revision. Your unsaved edits remain open.');
 return {base:{...faqSchema.parse(base.payload)},mine:{...faqSchema.parse(mine)},remote:{...faqSchema.parse(latest.payload)}};
}
