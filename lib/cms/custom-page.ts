import {localizedPageHref} from './localized-routes.ts';
import {projectAboutPage,projectEditorialPage} from './about-page.ts';
import {isCustomPagePath} from './custom-page-path.ts';
import {resolvedSeoMetadata} from './seo-metadata.ts';
import type {GlobalSettings} from './global-settings.ts';
export {aboutSectionKinds as customPageSectionKinds} from './about-page.ts';
/** Shared approved editorial layout; projection is not publication authorization. */
export function projectCustomPage(input:unknown,path:string,context:{locale:string;now:Date}){
 if(!isCustomPagePath(path))throw Error('Choose a custom page URL outside reserved website routes.');
 try{return {...projectEditorialPage(input,{...context,allowReusableFaq:true,allowReusableLeadership:true}),path};}
 catch(reason){if(reason instanceof Error)throw Error(reason.message.replaceAll('About page','Custom page'));throw reason;}
}
export type PublishedCustomPage=ReturnType<typeof projectCustomPage>;
export function customPageMetadata(page:PublishedCustomPage,defaults:GlobalSettings['seo'],origin='https://safaricrafters.com'){
 return resolvedSeoMetadata(page.seo,defaults,{origin,path:page.path,title:page.title});
}

/** Only exact-language published snapshots and verified dependencies may reach a localized route. */
export function projectLocalizedCustomPage(input:unknown,path:string,context:Parameters<typeof projectEditorialPage>[1]){
 const publicPath=localizedPageHref(context.locale,path);
 const page=projectEditorialPage(input,context);
 return {...page,path:publicPath,contentPath:path};
}
export function localizedCustomPageMetadata(page:ReturnType<typeof projectLocalizedCustomPage>,defaults:GlobalSettings['seo'],origin='https://safaricrafters.com'){
 const metadata=resolvedSeoMetadata(page.seo,defaults,{origin,path:page.path,title:page.title});
 return {...metadata,openGraph:{...metadata.openGraph,locale:page.locale.replace('-','_')}};
}
