import {readPublishedSettings,settingsReader} from './public-settings.ts';
export async function readBrandSettings(env:Record<string,string|undefined>=process.env,fetcher:typeof fetch=fetch){
 if(env.CMS_BRAND_METADATA_ENABLED!=='true')return undefined;
 const settings=await readPublishedSettings(env.CMS_WEBSITE_ID!,'en',settingsReader(env,fetcher));
 if(!settings)throw Error('Published website settings are unavailable.');
 const {brand,contact,social}=settings.payload;
 return {brand,contact,social};
}
