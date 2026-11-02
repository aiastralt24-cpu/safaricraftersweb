import {navigationReader} from './published-navigation.ts';
export async function readHeaderNavigation(env:Record<string,string|undefined>=process.env,fetcher:typeof fetch=fetch,now=new Date()){
 if(env.CMS_NAVIGATION_DELIVERY_ENABLED!=='true')return undefined;
 if(!env.CMS_MAIN_NAVIGATION_ID)throw Error('Choose a published main navigation record before enabling delivery.');
 const menu=await navigationReader(env,fetcher)(env.CMS_MAIN_NAVIGATION_ID,{now});
 if(!menu)throw Error('Published main navigation is unavailable.');
 return menu;
}
