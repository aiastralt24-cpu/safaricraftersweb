import {z} from 'zod';import {richText} from './composition.ts';
export const publicFaqSchema=z.object({recordId:z.string().uuid(),revisionId:z.string().uuid(),locale:z.literal('en'),question:z.string().trim().min(1).max(200),answer:richText}).strict();
export type PublicFaq=z.infer<typeof publicFaqSchema>;
export function verifiedPublicFaq(value:unknown,record:string,locale='en'):PublicFaq|null{if(value===null)return null;const parsed=publicFaqSchema.safeParse(value);if(!parsed.success||parsed.data.recordId!==record||parsed.data.locale!==locale)throw Error('Public FAQ identity or answer is invalid.');return parsed.data;}
