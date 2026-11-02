import {readPublishedSettings,settingsReader} from './public-settings.ts';
export async function readFooterSettings(env:Record<string,string|undefined>=process.env,fetcher:typeof fetch=fetch){
 if(env.CMS_FOOTER_DELIVERY_ENABLED!=='true')return undefined;
 const read=settingsReader(env,fetcher);
 const settings=await readPublishedSettings(env.CMS_WEBSITE_ID!,'en',read);
 if(!settings)throw Error('Published website settings are unavailable.');
 const {brand,contact,footer,social}=settings.payload;
 return {brand,contact,footer,social,...(settings.payload.interfaceText?{interfaceText:settings.payload.interfaceText}:{})};
}
