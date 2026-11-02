import {z} from 'zod';
import {publicNavigationHosts} from './navigation-routes.ts';
import {verifiedLocalizedRoutes} from './localized-routes.ts';
import {projectLocalizedCustomPage} from './custom-page.ts';
import type {ContentFinding,ValidationRecord} from './content-validation.ts';
const uuid=z.string().uuid();
export const localizedPublicationEvidenceSchema=z.object({websiteId:uuid,recordId:uuid,revisionId:uuid,locale:z.string().regex(/^[a-z]{2,3}(?:-[A-Z]{2})?$/),path:z.string(),registry:z.unknown()}).strict();
export function localizedPublicationPaths(payload:unknown,path:string):string[]{
 const visit=(value:unknown):string[]=>{
  if(Array.isArray(value))return value.flatMap(visit);
  if(!value||typeof value!=='object')return [];
  return Object.entries(value).flatMap(([key,child])=>{
   if(key!=='href'||typeof child!=='string')return visit(child);
   let href=child;
   if(!href.startsWith('/')){try{const url=new URL(href);if(!(publicNavigationHosts as readonly string[]).includes(url.hostname.toLowerCase().replace(/\.$/,'')))return [];href=url.pathname;}catch{return [];}}
   return [href.split(/[?#]/,1)[0]];
  });
 };
 return [...new Set([path,...visit(payload)])].sort();
}
/** Evidence is produced from the saved revision by the private worker RPC, never the browser. */
export function localizedPublicationFindings(record:ValidationRecord&{site:string;record:string;revision:string},evidence:unknown,now=new Date()):ContentFinding[]{
 try{
  const value=localizedPublicationEvidenceSchema.parse(evidence);
  if(value.websiteId!==record.site||value.recordId!==record.record||value.revisionId!==record.revision||value.locale!==record.locale||value.path!==record.path)throw Error('Localized publication evidence does not match the saved revision.');
  const registry=verifiedLocalizedRoutes(value.registry,record.site,value.locale,localizedPublicationPaths(record.payload,value.path));
  const self=registry.routes.find(row=>row.path===record.path);
  if(!self?.available||self.recordId!==record.record||self.revisionId!==record.revision)throw Error('Localized publication evidence does not match the saved page.');
  projectLocalizedCustomPage({recordId:record.record,revisionId:record.revision,type:'page',payload:record.payload},value.path,{locale:value.locale,now,resolveLocalizedRoute:registry.resolve,documents:record.downloadStatus?.map(ref=>({...ref,locale:value.locale}))});
  return [];
 }catch(reason){return [{field:'composition',severity:'error',code:'localized_publication_unverified',message:reason instanceof Error?reason.message:'Verify translated page content and published links.'}];}
}
