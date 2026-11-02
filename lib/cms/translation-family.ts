import {z} from 'zod';
const uuid=z.string().uuid(),locale=z.string().regex(/^[a-z]{2,3}(?:-[A-Z]{2})?$/);
const entry=z.object({id:uuid,title:z.string(),locale,path:z.string().nullable(),type:z.string(),revision:uuid}).strict();
export const translationFamilySchema=z.object({recordId:uuid,source:entry,translations:z.array(entry.extend({status:z.enum(['unreviewed','source_changed','translation_changed','current'])})).max(50),nextCursor:uuid.nullable()}).strict().refine(v=>v.translations.every(t=>t.id!==v.source.id&&t.locale!==v.source.locale&&t.type===v.source.type)&&new Set(v.translations.map(t=>t.id)).size===v.translations.length&&new Set(v.translations.map(t=>t.locale)).size===v.translations.length&&v.translations.every((t,i)=>i===0||t.id>v.translations[i-1].id)&&(!v.nextCursor||(v.translations.length===50&&v.nextCursor===v.translations.at(-1)?.id)));
export type TranslationFamily=z.infer<typeof translationFamilySchema>;
export type TranslationFamilyEntry=z.infer<typeof entry>;
export function verifiedTranslationFamily(value:unknown,record:string,after?:string){
 const parsed=translationFamilySchema.safeParse(value);
 if(!parsed.success||parsed.data.recordId!==record||(after&&parsed.data.translations.some(t=>t.id<=after)))throw Error('Translation list could not be verified. Refresh it before opening a record.');
 return parsed.data;
}
