import {conceptNavigationSchema} from './concept-navigation.ts';
import {navigationUrlStatus} from './navigation-routes.ts';
import type {ContentFinding} from './content-validation.ts';

/** Advisory only. Extra paths must come from trusted same-site published readers.
 * Media is checked by the full revision's existing asset-verification traversal. */
export function conceptNavigationFindings(value:unknown,publishedPaths:readonly string[]=[]):ContentFinding[]{
 const parsed=conceptNavigationSchema.safeParse(value);
 if(!parsed.success)return parsed.error.issues.map(issue=>({field:['navigation',...issue.path].join('.'),severity:'error',code:'concept_menu_field',message:issue.message}));
 const paths=new Set(publishedPaths),findings:ContentFinding[]=[];
 const links=[{value:parsed.data.cta,field:'navigation.cta'},...parsed.data.primary.map((value,index)=>({value,field:`navigation.primary.${index}`})),...parsed.data.secondary.map((value,index)=>({value,field:`navigation.secondary.${index}`}))];
 for(const {value:link,field} of links){
  // Dynamic path evidence is exact: it does not prove arbitrary fragments or queries.
  const verifiedPath=link.href.startsWith('/')&&!/[?#]/.test(link.href)&&paths.has(link.href);
  if(navigationUrlStatus(link.href)!=='available'&&!verifiedPath)findings.push({field:`${field}.href`,severity:'error',code:'concept_menu_link_unverified',message:'Choose a verified public destination. Unknown paths and unverified anchors cannot be published.'});
 }
 return findings;
}
