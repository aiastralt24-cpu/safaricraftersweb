import {isCanonicalSitemapEntry} from './sitemap-policy.ts';
import type {PublishedDestinationSummary} from './published-destination-list.ts';
import {readPublishedDestinationList,type DestinationListReader} from './published-destination-list.ts';
export type DestinationDiscoveryItem={slug:string;title:string;path:string;country:string;modifiedAt:string;canonical?:string;indexing:'inherit'|'index'|'noindex';sitemap:'inherit'|'include'|'exclude'};
/** Replace individual legacy destinations; keep only routes owned by specialized templates. */
export async function destinationDiscoveryItems(legacy:DestinationDiscoveryItem[],reserved:readonly string[],enabled:boolean,read:DestinationListReader):Promise<DestinationDiscoveryItem[]>{
 if(!enabled)return legacy;
 const published=await readPublishedDestinationList(read);
 return [...legacy.filter(item=>reserved.includes(item.slug)),...published.filter(item=>!reserved.includes(item.slug)).map(discoveryItem)];
}
function discoveryItem(item:PublishedDestinationSummary):DestinationDiscoveryItem{
 return {slug:item.slug,title:item.title,path:item.path,country:item.country,modifiedAt:item.modifiedAt,canonical:item.canonical,indexing:item.indexing,sitemap:item.sitemap};
}
export function destinationSearchItems(items:DestinationDiscoveryItem[]){
 return items.map(item=>({title:item.title,href:item.path,type:'Destination' as const,detail:item.country}));
}
export function destinationSitemapItems(items:DestinationDiscoveryItem[],base:string){
 return items.filter(item=>isCanonicalSitemapEntry({...item,canonical:item.canonical??''},base)).map(item=>({url:new URL(item.path,base).href,lastModified:new Date(item.modifiedAt)}));
}
