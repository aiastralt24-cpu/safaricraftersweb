import {readCookiePresentation} from '../lib/cms/cookie-settings';
import {CookiePreferences} from './CookiePreferences';
export async function SiteCookiePreferences(){
 const presentation=await readCookiePresentation();
 const settings=presentation?.cookies;
 if(!settings&&process.env.NEXT_PUBLIC_FUNNEL_ENABLED!=='true')return null;
 return <CookiePreferences settings={settings} saveError={presentation?.interfaceText?.cookieSaveError}/>;
}
