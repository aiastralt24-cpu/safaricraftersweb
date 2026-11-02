export type SiteSearchItem={title:string;href:string;type:'Journey'|'Destination'|'Photography Tours'|'Journal'|'Page'|'Project'|'News'|'Event'|'Leadership'|'Application'|'Location'|'Career'|'Certification'|'Partner'|'Product category'|'Product';detail?:string;searchText?:string};
export function filterSiteSearch(items:SiteSearchItem[],query:string,category:'All'|SiteSearchItem['type']){
 const term=query.trim().toLocaleLowerCase();
 return items.filter(item=>(category==='All'||item.type===category)&&(!term||`${item.title} ${item.detail??''} ${item.type} ${item.searchText??''}`.toLocaleLowerCase().includes(term)));
}
