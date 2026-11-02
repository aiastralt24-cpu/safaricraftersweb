import type {GlobalSettings} from './global-settings.ts';
import {readPublishedSettings,settingsReader} from './public-settings.ts';
/** Recovery pages must remain available when the content backend is unhealthy. */
export async function readErrorMessage(kind:'notFound'|'serverError',env:Record<string,string|undefined>=process.env,fetcher:typeof fetch=fetch):Promise<GlobalSettings['errors']['notFound']|undefined>{
 if(env.CMS_ERROR_SETTINGS_ENABLED!=='true')return undefined;
 try{
  const boundedFetch:typeof fetch=(input,init)=>fetcher(input,{...init,signal:AbortSignal.any([...(init?.signal?[init.signal]:[]),AbortSignal.timeout(1500)])});
  const settings=await readPublishedSettings(env.CMS_WEBSITE_ID!,'en',settingsReader(env,boundedFetch));
  const message=settings?.payload.errors[kind];
  return message?.enabled&&message.title.trim()&&message.body.trim()?message:undefined;
 }catch{return undefined;}
}
