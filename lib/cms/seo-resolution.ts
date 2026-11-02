import {z} from 'zod';
import {globalSettingsSchema} from './global-settings.ts';
import {pageSeoSchema} from './page-seo.ts';
const context=z.object({origin:z.string(),path:z.string().regex(/^(?:\/[a-z0-9/-]*|\/languages\/[a-z]{2,3}-[A-Z]{2}\/[a-z0-9/-]+)$/),title:z.string().trim().min(1).max(200)}).strict();
export function resolvePageSeo(seoInput:unknown,settingsInput:unknown,contextInput:unknown){
 const settings=globalSettingsSchema.parse(settingsInput);
 const result=resolveSeoDefaults(seoInput,{...settings.seo,...(!settings.seo.socialImage&&settings.fallbackImage?{socialImage:settings.fallbackImage}:{})},contextInput);
 if(!pageSeoSchema.parse(seoInput).socialImage&&!settings.seo.socialImage&&settings.fallbackImage)result.socialImage.source='Website fallback image';
 return result;
}
/** Resolve against either validated draft defaults or the published SEO projection. */
export function resolveSeoDefaults(seoInput:unknown,defaultsInput:unknown,contextInput:unknown){
 const seo=pageSeoSchema.parse(seoInput),defaults=globalSettingsSchema.shape.seo.parse(defaultsInput),page=context.parse(contextInput);
 const origin=new URL(page.origin);
 if(origin.protocol!=='https:'||origin.username||origin.password||origin.pathname!=='/'||origin.search||origin.hash||/[\s\\]/.test(page.origin))throw Error('Configure a public HTTPS origin.');
 if(page.path.startsWith('//')||page.path.includes('//'))throw Error('Invalid page path.');
 const field=<T>(value:T,source:string)=>({value,source});
 const title=seo.title.trim()?field(seo.title,'Page SEO title'):field(defaults.titleTemplate.replaceAll('%s',page.title),'Website title template + page title');
 const description=seo.description.trim()?field(seo.description,'Page meta description'):field(defaults.description,'Website meta description');
 const canonical=seo.canonical?field(seo.canonical,'Page canonical override'):field(new URL(page.path,origin).href,'Configured website origin + page path');
 const indexing=defaults.indexing==='noindex'?field('noindex','Website noindex restriction'):seo.indexing==='inherit'?field(defaults.indexing,'Website indexing default'):field(seo.indexing,'Page indexing override');
 const following=field(seo.following==='inherit'?'follow':seo.following,seo.following==='inherit'?'System default':'Page link-following override');
 const sitemap=indexing.value==='noindex'?field(false,'Excluded because effective indexing is noindex'):seo.sitemap==='exclude'?field(false,'Page sitemap exclusion'):new URL(canonical.value).href!==new URL(page.path,origin).href?field(false,'Excluded because canonical points to another URL'):field(true,seo.sitemap==='include'?'Page sitemap inclusion':'Automatic for indexable canonical page');
 return {title,description,canonical,indexing,following,sitemap,
  socialTitle:seo.socialTitle.trim()?field(seo.socialTitle,'Page social title'):field(title.value,'Resolved SEO title'),
  socialDescription:seo.socialDescription.trim()?field(seo.socialDescription,'Page social description'):field(description.value,'Resolved meta description'),
  socialImage:seo.socialImage?field(seo.socialImage,'Page sharing image'):defaults.socialImage?field(defaults.socialImage,'Website sharing image'):field(null,'No sharing image configured'),
  breadcrumbLabel:field(seo.breadcrumbLabel.trim()?seo.breadcrumbLabel:page.title,seo.breadcrumbLabel.trim()?'Page breadcrumb override':'Page title')};
}
