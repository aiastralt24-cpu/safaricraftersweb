import type {Metadata} from 'next';
import {readPublicLanguageVariants} from './public-language-variants.ts';
type Variants=Awaited<ReturnType<typeof readPublicLanguageVariants>>;
/** Only indexable, self-canonical members form the reciprocal search language set. */
export function languageAlternates(variants:Variants,locale:string,path:string,origin:string){
 const base=new URL(origin);
 if(base.protocol!=='https:'||base.username||base.password||base.pathname!=='/'||base.search||base.hash||/[\s\\]/.test(origin))throw Error('Configure a public HTTPS origin.');
 const eligible=(variants??[]).filter(row=>row.indexable&&(!row.canonical||new URL(row.canonical).href===new URL(row.href,base).href));
 if(eligible.length<2||!eligible.some(row=>row.locale===locale&&row.href===path))return {};
 return Object.fromEntries(eligible.map(row=>[row.locale,new URL(row.href,base).href]));
}
export async function withLanguageMetadata(metadata:Metadata,page:{recordId:string;revisionId:string;locale:string;path:string},origin:string,env:Record<string,string|undefined>=process.env,fetcher:typeof fetch=fetch):Promise<Metadata>{
 if(env.CMS_LOCALIZED_PAGES_ENABLED!=='true')return metadata;
 const variants=await readPublicLanguageVariants({site:env.CMS_WEBSITE_ID??'',record:page.recordId,revision:page.revisionId,locale:page.locale},env,fetcher);
 // Do not announce alternates when this snapshot's SEO excludes the current page.
 const robots=metadata.robots;
 const canonical=metadata.alternates?.canonical;
 const currentEligible=typeof robots==='object'&&robots!==null&&robots.index===true&&typeof canonical==='string'&&new URL(canonical).href===new URL(page.path,origin).href;
 return {...metadata,alternates:{...metadata.alternates,languages:currentEligible?languageAlternates(variants,page.locale,page.path,origin):{}}};
}
