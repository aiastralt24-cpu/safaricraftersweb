import {projectPublishedHeader} from './published-header.ts';
import type {ContentFinding} from './content-validation.ts';
/** Evidence must come from the same-site published-header reader, never the draft payload. */
export type HomepageHeaderEvidence={site:string;header:unknown};
export function homepageHeaderFindings(evidence?:HomepageHeaderEvidence,now=new Date()):ContentFinding[]{
 try{
  if(!evidence)throw Error('Missing published header.');
  projectPublishedHeader(evidence.header,evidence.site,now,{requireAvailableReferences:true});
  return [];
 }catch{
  return [{field:'header',severity:'error',code:'homepage_header_unavailable',message:'Publish valid site settings and all selected header menus for this website before publishing the homepage.'}];
 }
}
