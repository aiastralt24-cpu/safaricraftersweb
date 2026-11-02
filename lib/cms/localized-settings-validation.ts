import {z} from 'zod';
import {publicNavigationHosts} from './navigation-routes.ts';
import {verifiedLocalizedRoutes} from './localized-routes.ts';
import {validateSettingsDraft} from './settings-validation.ts';
import type {ValidationRecord,MediaStatus} from './content-validation.ts';
import type {SettingsReferenceStatus} from './settings-reference-status.ts';
const uuid=z.string().uuid();
export const localizedSettingsEvidenceSchema=z.object({websiteId:uuid,recordId:uuid,revisionId:uuid,locale:z.string(),registry:z.unknown()}).strict();
export function localizedSettingsPaths(payload:unknown):string[]{
 const visit=(value:unknown):string[]=>{
  if(Array.isArray(value))return value.flatMap(visit);if(!value||typeof value!=='object')return [];
  return Object.entries(value).flatMap(([key,child])=>{
   if(!['href','homeHref'].includes(key)||typeof child!=='string')return visit(child);
   let href=child;if(!href.startsWith('/')){try{const url=new URL(href);if(!(publicNavigationHosts as readonly string[]).includes(url.hostname.toLowerCase().replace(/\.$/,'')))return [];href=url.pathname;}catch{return [];}}
   return [href.split(/[?#]/,1)[0]];
  });
 };return [...new Set(visit(payload))].sort();
}
export function validateLocalizedSettings(record:ValidationRecord&{site:string;record:string;revision:string},media:MediaStatus[]|undefined,references:SettingsReferenceStatus[]|undefined,evidence:unknown){
 try{
  const value=localizedSettingsEvidenceSchema.parse(evidence);
  if(value.websiteId!==record.site||value.recordId!==record.record||value.revisionId!==record.revision||value.locale!==record.locale)throw Error('Translated settings evidence does not match the saved revision.');
  const registry=verifiedLocalizedRoutes(value.registry,record.site,value.locale,localizedSettingsPaths(record.payload));
  return validateSettingsDraft(record,media,references,registry.resolve);
 }catch{return {validatorVersion:'settings-1',contentChecksPass:false,findings:[{field:'locale',severity:'error' as const,code:'localized_settings_evidence',message:'Request a trusted check for this saved settings revision and its translated destinations.'}]};}
}
