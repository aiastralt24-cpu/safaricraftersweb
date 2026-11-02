import {journalArticleSchema,type JournalArticleDraft} from './journal.ts';
export type JournalConflictRecord={id:string;type:string;path:string|null;locale:string;currentRevision:string;payload:unknown;permissions:{edit:boolean}};
/** Keep optional fields in the comparison so additions and removals are visible. */
export function journalConflictSnapshot(payload:unknown):Record<string,unknown>{
 const parsed=journalArticleSchema.parse(payload);
 return {image:undefined,heroImage:undefined,...parsed};
}
export function prepareJournalConflict(base:JournalConflictRecord,mine:JournalArticleDraft,latest:JournalConflictRecord){
 if(!latest||latest.id!==base.id||latest.type!=='journalArticle'||latest.locale!==base.locale||latest.path!==base.path||!latest.permissions?.edit||!latest.currentRevision||latest.currentRevision===base.currentRevision)throw Error('The latest article cannot be reconciled with your access, revision or route. Your unsaved changes remain open.');
 const original=journalConflictSnapshot(base.payload),remote=journalConflictSnapshot(latest.payload);
 if(`/journal/${remote.slug}`!==latest.path||remote.slug!==original.slug)throw Error('The latest article URL is inconsistent. Your unsaved changes remain open.');
 return {base:original,mine:journalConflictSnapshot(mine),remote};
}
