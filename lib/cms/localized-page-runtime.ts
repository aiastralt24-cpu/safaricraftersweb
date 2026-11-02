import {pageDownloadReferences,verifiedPublishedDownloadEvidence} from './published-download-evidence.ts';
import {z} from 'zod';
import {cmsRpc} from './gateway.ts';
import {isCustomPagePath} from './custom-page-path.ts';
import {projectLocalizedCustomPage} from './custom-page.ts';
import {readLocalizedRoutes,localizedRoutesReader,localizedPageHref} from './localized-routes.ts';
import {readPublishedSeoSettings,seoSettingsReader} from './public-seo-settings.ts';
import {publicNavigationHosts} from './navigation-routes.ts';
function linkedPaths(value:unknown):string[]{
 if(Array.isArray(value))return value.flatMap(linkedPaths);
 if(!value||typeof value!=='object')return [];
 return Object.entries(value).flatMap(([key,child])=>{
  if(key!=='href'||typeof child!=='string')return linkedPaths(child);
  let href=child;
  if(!href.startsWith('/')){try{const url=new URL(href);if(!(publicNavigationHosts as readonly string[]).includes(url.hostname.toLowerCase().replace(/\.$/,'')))return [];href=url.pathname+url.search+url.hash;}catch{return [];}}
  return [href.split(/[?#]/,1)[0]];
 });
}
/** Prepared data pipeline; the visitor route/shared shell and release guards are separate integration gates. */
export async function loadLocalizedCustomPage(path:string,locale:string,env:Record<string,string|undefined>=process.env,fetcher:typeof fetch=fetch,now=new Date()){
 if(env.CMS_LOCALIZED_PAGES_ENABLED!=='true')return null;
 if(!isCustomPagePath(path))return null;
 localizedPageHref(locale,path);
 const site=z.string().uuid().parse(env.CMS_WEBSITE_ID),registryRead=localizedRoutesReader(env,fetcher);
 const connection={url:env.CMS_SUPABASE_URL!,key:env.CMS_SUPABASE_ANON_KEY!};
 const input=await cmsRpc(connection,connection.key,'get_public_page',{p_site:site,p_path:path,p_locale:locale},fetcher);
 if(input===null)return null;
 const identity=z.object({recordId:z.string().uuid(),revisionId:z.string().uuid(),payload:z.unknown()}).parse(input);
 const payload=z.object({composition:z.unknown()}).parse(identity.payload),references=pageDownloadReferences(payload.composition);
 if(references.length&&(env.CMS_DOCUMENT_DOWNLOADS_ENABLED!=='true'||!env.CMS_SUPABASE_SERVICE_ROLE_KEY))throw Error('Localized document delivery is not configured.');
 const paths=[...new Set([path,...linkedPaths(identity.payload)])];
 const [registry,settings,downloadEvidence]=await Promise.all([readLocalizedRoutes(site,locale,paths,registryRead),readPublishedSeoSettings(site,locale,seoSettingsReader(env,fetcher)),references.length?cmsRpc(connection,connection.key,'get_public_page_download_status',{p_site:site,p_record:identity.recordId,p_revision:identity.revisionId,p_locale:locale},fetcher):Promise.resolve(null)]);
 const route=registry.routes.find(row=>row.path===path);
 if(!route?.available||route.recordId!==identity.recordId||route.revisionId!==identity.revisionId)throw Error('Localized page publication changed. Reload before rendering.');
 if(!settings)throw Error('Published localized SEO defaults are unavailable.');
 const documents=references.length?verifiedPublishedDownloadEvidence(downloadEvidence,{site,record:identity.recordId,revision:identity.revisionId,locale},references):[];
 const page=projectLocalizedCustomPage(input,path,{locale,now,resolveLocalizedRoute:registry.resolve,documents});
 return {page,seoDefaults:settings.seo,settingsRecordId:settings.recordId,settingsRevisionId:settings.revisionId};
}
