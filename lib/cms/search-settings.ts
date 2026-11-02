import {readPublishedSettings,settingsReader} from './public-settings.ts';
import {searchCategories} from './search-policy.ts';
export async function readSearchSettings(env:Record<string,string|undefined>=process.env,fetcher:typeof fetch=fetch){
 if(env.CMS_SEARCH_SETTINGS_ENABLED!=='true')return undefined;
 const settings=await readPublishedSettings(env.CMS_WEBSITE_ID!,'en',settingsReader(env,fetcher));
 if(!settings)throw Error('Published website settings are unavailable.');
 searchCategories(settings.payload.search);
 return settings.payload.search;
}
