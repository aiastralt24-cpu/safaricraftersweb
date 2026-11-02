import type {GlobalSettings} from './global-settings.ts';
import type {SiteSearchItem} from '../site-search.ts';
export const searchTypeMap={page:'Page',product:'Product',project:'Project',news:'News',event:'Event',leadership:'Leadership',application:'Application',location:'Location',career:'Career',certification:'Certification',partner:'Partner',productCategory:'Product category',journey:'Journey',destination:'Destination',photoExpedition:'Photography Tours',journalArticle:'Journal'} as const;
export function searchCategories(settings:GlobalSettings['search']):SiteSearchItem['type'][] {
 if(!settings.enabled)return [];
 return settings.contentTypes.map(type=>{
  if(!(type in searchTypeMap))throw Error(`Search delivery is not available for ${type}.`);
  return searchTypeMap[type as keyof typeof searchTypeMap];
 });
}
