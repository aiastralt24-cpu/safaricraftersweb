import {isCustomPagePath} from './custom-page-path.ts';
/** Page references use eligible custom namespaces; fixed pages retain URL links. */
export function navigationRecordPathAvailable(type:string,path:string){
 if(type==='page')return isCustomPagePath(path);
 const prefix=({journey:'/journeys/',destination:'/destinations/',journalArticle:'/journal/'} as Record<string,string>)[type];
 return Boolean(prefix&&new RegExp(`^${prefix}[a-z0-9]+(?:-[a-z0-9]+)*$`).test(path));
}
