import {readLocalizedRoutes,localizedRoutesReader} from './lib/cms/localized-routes';
import {navigationLinkForLocale} from './lib/cms/localized-navigation-link';
import {localizedRequest,visitorRequestHeaders} from './lib/cms/localized-request';
import {readPageRedirect,pageRedirectResponse} from './lib/cms/page-redirect';
import {readSeoDefaults} from './lib/cms/seo-settings';
import {websiteIndexingHeaders} from './lib/cms/root-seo-metadata';
import {NextResponse,type NextRequest} from 'next/server';
import {maintenanceApplies,maintenanceResponse,readMaintenanceMessage} from './lib/cms/maintenance';
export async function proxy(request:NextRequest){
 const next=()=>NextResponse.next({request:{headers:visitorRequestHeaders(request.headers,request.nextUrl.pathname)}});
 if(request.nextUrl.pathname==='/languages'||request.nextUrl.pathname.startsWith('/languages/')){
  const route=localizedRequest(request.nextUrl.pathname);
  if(route&&process.env.CMS_LOCALIZED_PAGES_ENABLED==='true'&&maintenanceApplies(request.nextUrl.pathname,request.method)){
   const message=await readMaintenanceMessage(process.env,fetch,route.locale);
   if(message){
    // Maintenance remains available even when its optional destination has been withdrawn.
    let button=message.button;
    if(button){try{
     const href=button.href,path=href.startsWith('/')?href.split(/[?#]/,1)[0]:new URL(href).pathname;
     const registry=await readLocalizedRoutes(process.env.CMS_WEBSITE_ID!,route.locale,path.startsWith('/')?[path]:[],localizedRoutesReader());
     button={...button,href:navigationLinkForLocale(href,route.locale,registry.resolve)};
    }catch{button=undefined;}}
    return maintenanceResponse({...message,button},request.method,route.locale);
   }
   try{
    const redirect=await readPageRedirect(route.path,process.env,fetch,route.locale);
    const response=pageRedirectResponse(request.url,redirect,route.locale);
    if(response)return response;
   }catch{return new Response('Page routing is temporarily unavailable.',{status:503,headers:{'Cache-Control':'no-store','Retry-After':'60','X-Robots-Tag':'noindex, nofollow'}});}
  }
  return next();
 }
 if(!maintenanceApplies(request.nextUrl.pathname,request.method))return next();
 const [message,seo]=await Promise.all([readMaintenanceMessage(),readSeoDefaults()]);
 if(message)return maintenanceResponse(message,request.method);
 let redirect;
 try{redirect=await readPageRedirect(request.nextUrl.pathname);}catch{return new Response('Page routing is temporarily unavailable.',{status:503,headers:{'Cache-Control':'no-store','Retry-After':'60','X-Robots-Tag':'noindex, nofollow'}});}
 const response=pageRedirectResponse(request.url,redirect)??next();
 for(const [name,value] of Object.entries(websiteIndexingHeaders(seo)))response.headers.set(name,value);
 return response;
}
export const config={matcher:['/((?!_next/static|_next/image).*)']};
