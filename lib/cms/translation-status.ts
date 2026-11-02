import {z} from 'zod';
const uuid=z.string().uuid(),locale=z.string().regex(/^[a-z]{2,3}(?:-[A-Z]{2})?$/);
export const translationStatusSchema=z.object({recordId:uuid,revisionId:uuid,locale,sourceRecordId:uuid,sourceLocale:locale,sourceRevisionId:uuid,currentSourceRevisionId:uuid,reviewedRevisionId:uuid.nullable(),status:z.enum(['unreviewed','source_changed','translation_changed','current'])}).strict().refine(s=>s.recordId!==s.sourceRecordId&&s.locale!==s.sourceLocale).refine(s=>s.status===(s.sourceRevisionId!==s.currentSourceRevisionId?'source_changed':s.reviewedRevisionId===null?'unreviewed':s.reviewedRevisionId!==s.revisionId?'translation_changed':'current'));
export type TranslationStatus=z.infer<typeof translationStatusSchema>;
export function verifiedTranslationStatus(value:unknown,record:string,revision:string):TranslationStatus|null {
 if(value===null)return null;
 const parsed=translationStatusSchema.safeParse(value);
 if(!parsed.success||parsed.data.recordId!==record||parsed.data.revisionId!==revision)throw Error('Translation status changed or could not be verified. Reload this record before reviewing.');
 return parsed.data;
}
