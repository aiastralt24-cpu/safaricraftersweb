import {z} from 'zod';
import type {LoadFormPreview} from './form-preview-reference.ts';
const language=z.string().regex(/^[a-z]{2,3}(?:-[A-Z]{2})?$/);
const identity=z.object({id:z.string().uuid(),locale:language}).passthrough();
/** Draft reference selection is explicit. Never substitute a source-language record or guess a translation. */
export function localePreviewLoader(load:LoadFormPreview,locale:string):LoadFormPreview{
 return async(id,signal)=>{
  language.parse(locale);z.string().uuid().parse(id);
  const value=await load(id,signal),parsed=identity.safeParse(value);
  if(!parsed.success||parsed.data.id!==id||parsed.data.locale!==locale)throw Error('Select a linked draft in the preview language. Automatic language fallback is not enabled.');
  return value;
 };
}
