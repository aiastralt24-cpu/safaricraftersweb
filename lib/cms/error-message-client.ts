import {globalSettingsSchema} from './global-settings.ts';
const responseSchema=globalSettingsSchema.shape.errors.shape.serverError.nullable();
/** Public recovery endpoint contains message fields only, never error diagnostics. */
export async function fetchServerErrorMessage(signal:AbortSignal,fetcher:typeof fetch=fetch){
 try{
  const response=await fetcher('/api/cms/public/error-message',{signal:AbortSignal.any([signal,AbortSignal.timeout(2500)]),cache:'no-store',credentials:'omit',redirect:'error'});
  if(!response.ok)return undefined;
  const parsed=responseSchema.safeParse(await response.json());
  const message=parsed.success?parsed.data:null;
  return message?.enabled&&message.title.trim()&&message.body.trim()?message:undefined;
 }catch{return undefined;}
}
