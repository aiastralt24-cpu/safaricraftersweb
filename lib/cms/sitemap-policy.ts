import {pageSeoSchema} from './page-seo.ts';

/** Explicit inclusion cannot override noindex or a canonical pointing elsewhere. */
export function isCanonicalSitemapEntry(item:{path:string;canonical:string;indexing:string;sitemap:string},base:string){
 const origin=new URL(base);
 if(origin.protocol!=='https:'||origin.username||origin.password||origin.pathname!=='/'||origin.search||origin.hash)throw Error('Configure a public HTTPS origin.');
 if(!/^\/[a-z0-9/-]*$/.test(item.path)||item.path.includes('//'))throw Error('Invalid sitemap path.');
 const canonical=pageSeoSchema.shape.canonical.parse(item.canonical);
 return item.indexing!=='noindex'&&item.sitemap!=='exclude'&&(!canonical||new URL(canonical).href===new URL(item.path,origin).href);
}
