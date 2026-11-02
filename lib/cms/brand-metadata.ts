import type {Metadata} from 'next';
import type {GlobalSettings} from './global-settings.ts';
import {publishedMediaUrl} from './published-journey.ts';
export function brandMetadata(base:Metadata,brand:GlobalSettings['brand']):Metadata{
 return {...base,applicationName:brand.name,icons:{icon:brand.favicon?[{url:publishedMediaUrl(brand.favicon.assetId),type:'image/webp'}]:[]},openGraph:{...base.openGraph,siteName:brand.name}};
}
export function publishedOrganizationSchema(settings:Pick<GlobalSettings,'brand'|'contact'|'social'>,origin:string){
 const url=new URL(origin);
 if(url.protocol!=='https:'||url.username||url.password||url.pathname!=='/'||url.search||url.hash)throw Error('Configure a public HTTPS origin.');
 const base=url.origin,{brand,contact,social}=settings;
 return {'@context':'https://schema.org','@graph':[
  {'@type':'Organization','@id':`${base}/#organization`,name:brand.name,url:base,
   ...(brand.tagline?{description:brand.tagline}:{}),...(brand.logo?{logo:new URL(publishedMediaUrl(brand.logo.assetId),base).href}:{}),
   ...(contact.email?{email:contact.email}:{}),...(contact.phone?{telephone:contact.phone}:{}),
   ...(contact.addresses.length?{address:contact.addresses.map(item=>({'@type':'PostalAddress',name:item.label,streetAddress:item.address}))}:{}),
   ...(social.length?{sameAs:social.map(item=>item.url)}:{})},
  {'@type':'WebSite','@id':`${base}/#website`,url:base,name:brand.name,publisher:{'@id':`${base}/#organization`},inLanguage:'en'}]};
}
