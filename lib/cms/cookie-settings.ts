import {readPublishedSettings,settingsReader} from './public-settings.ts';
export async function readCookiePresentation(env:Record<string,string|undefined>=process.env,fetcher:typeof fetch=fetch){
 if(env.CMS_COOKIE_SETTINGS_ENABLED!=='true')return undefined;
 const settings=await readPublishedSettings(env.CMS_WEBSITE_ID!,'en',settingsReader(env,fetcher));
 if(!settings)throw Error('Published website settings are unavailable.');
 return {cookies:settings.payload.cookies,interfaceText:settings.payload.interfaceText};
}

export async function readCookieSettings(env:Record<string,string|undefined>=process.env,fetcher:typeof fetch=fetch){return (await readCookiePresentation(env,fetcher))?.cookies;}
