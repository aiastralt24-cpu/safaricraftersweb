import {conceptEditorialFindings} from './concept-editorial-validation.ts';
import {conceptNavigationFindings} from './concept-navigation-validation.ts';
import {projectConceptPage} from './concept-page.ts';
import type {ContentFinding,ValidationRecord} from './content-validation.ts';
/** Revision structure/editorial checks; database publication rechecks mutable dependencies. */
export function conceptPageFindings(record:ValidationRecord,now=new Date()):ContentFinding[]{
 const findings:ContentFinding[]=conceptEditorialFindings(record,record.conceptPublishedPaths,now);
 if(record.type!=='page'||record.path!=='/concept')findings.push({field:'path',severity:'error',code:'concept_page_route',message:'Use an ordinary page at /concept, separate from the homepage.'});
 try{projectConceptPage({recordId:'00000000-0000-4000-8000-000000000001',revisionId:'00000000-0000-4000-8000-000000000002',type:record.type,payload:record.payload},{locale:record.locale??'en',now});}
 catch(reason){findings.push({field:'composition',severity:'error',code:'concept_page_structure',message:reason instanceof Error&&!('issues'in reason)?reason.message:'Complete the Concept composition and SEO fields.'});}
 if(record.payload.navigation!==undefined)findings.push(...conceptNavigationFindings(record.payload.navigation,record.conceptPublishedPaths));
 if(record.payload.navigation===undefined)findings.push({field:'navigation',severity:'error',code:'concept_menu_required',message:'Add and complete the page-owned Concept menu.'});
 return findings;
}
