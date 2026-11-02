import {validateComposition} from './composition.ts';
import {createExpeditionDirectorySection,createSpecialistDirectorySection} from './section-drafts.ts';
/** Starting drafts only. No legal copy, claims, media or document references are invented. */
export const pageTemplates=[
 {id:'custom',label:'Editorial page',title:'New page',path:''},
 {id:'blank',label:'Blank page draft',title:'New page',path:''},
 {id:'tanzania',label:'Tanzania country draft',title:'Tanzania',path:'/destinations/tanzania'},
 {id:'kenya',label:'Kenya country draft',title:'Kenya',path:'/destinations/kenya'},
 {id:'mice',label:'Corporate Travel & MICE draft',title:'Corporate Travel & MICE',path:'/mice'},
 {id:'aviation',label:'Private Aviation draft',title:'Private Aviation',path:'/private-aviation'},
 {id:'guided',label:'Bespoke Safaris draft',title:'Bespoke Safaris',path:'/guided-bespoke-safaris'},
 {id:'concept',label:'Concept page draft',title:'Safari Crafters Concept',path:'/concept'},
 {id:'contact',label:'Contact page draft',title:'Contact Us',path:'/contact'},
 {id:'conservation',label:'Conservation page draft',title:'Conservation Commitment',path:'/conservation-commitment'},
 {id:'about',label:'About',title:'About us',path:'/about'},
 {id:'privacy',label:'Privacy policy',title:'Privacy policy',path:'/legal/privacy'},
 {id:'terms',label:'Terms',title:'Terms and conditions',path:'/legal/terms'},
 {id:'cookies',label:'Cookie policy',title:'Cookie policy',path:'/legal/cookies'},
 {id:'expeditions',label:'Photography expedition directory',title:'Photography expeditions',path:'/photo-expeditions'},
 {id:'specialists',label:'Specialist directory',title:'Our specialists',path:'/specialists'},
] as const;
export type PageTemplateId=typeof pageTemplates[number]['id'];
export function createPageTemplate(id:PageTemplateId){
 const template=pageTemplates.find(item=>item.id===id);if(!template)throw Error('Choose an available page template.');
 const sections:unknown[]=id==='tanzania'||id==='kenya'||id==='mice'||id==='aviation'||id==='guided'||id==='concept'||id==='blank'||id==='conservation'||id==='contact'?[]:[{id:'introduction',kind:'text',controls:{label:'Introduction',headingLevel:'h1'},data:{title:template.title,body:[]}}];
 if(id==='expeditions')sections.push(createExpeditionDirectorySection('directory'));
 if(id==='specialists')sections.push(createSpecialistDirectorySection('directory'));
 const parsed=validateComposition({schemaVersion:1,title:template.title,sections});if(!parsed.valid||!parsed.page)throw Error('Page template is invalid.');
 return {title:template.title,path:template.path,composition:parsed.page};
}
