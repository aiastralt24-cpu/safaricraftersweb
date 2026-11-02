import {validateComposition,type Composition} from './composition.ts';
import {contactSectionNames,type ContactSectionKind} from './contact-content.ts';
const heading=(text:string)=>({lines:[{runs:[{text,emphasis:false}]}]});
export function createContactSection(kind:ContactSectionKind,id:string):Composition['sections'][number]{
 const controls=validateComposition({schemaVersion:1,title:'Draft',sections:[{id,kind:'text',controls:{label:contactSectionNames[kind],headingLevel:kind==='contactIntro'?'h1':'h2'},data:{body:[]}}]}).page?.sections[0].controls;
 if(!controls)throw Error('Invalid contact section identity.');
 const data=kind==='contactIntro'?{eyebrow:'Contact',heading:heading('Start a conversation'),lead:'Introduce your travel planning service.',scope:'Describe the journeys you arrange.',image:{assetId:'',alt:'',decorative:false},focalPoint:{x:50,y:62},showImageOnMobile:false,direct:{prompt:'Write to us',label:'Enter contact email',email:''},corporate:{copy:'Planning a corporate journey? ',link:{label:'Explore corporate journeys',href:'/mice#corporate-enquiry'}}}:{eyebrow:'Your travel brief',heading:heading('Tell us about your journey'),copy:'Introduce the enquiry form.',requiredHint:'Describe the required information after selecting the form.',privacy:{copy:'Explain how enquiry details are used. ',link:{label:'Privacy policy',href:'/legal/privacy'}}};
 return {id,kind,controls,data};
}
