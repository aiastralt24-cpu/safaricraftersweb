import {validateComposition,type Composition} from './composition.ts';
import type {GuidedSectionKind} from './guided-safaris-content.ts';
export const guidedSectionNames={guidedHero:'Bespoke hero',guidedIntroduction:'Bespoke introduction',guidedEncounter:'Field encounter image',guidedFieldCards:'Field intelligence cards',guidedPhotography:'Photography guidance',guidedCompanion:'Field companion',guidedPaths:'Ways to begin',guidedFaq:'Bespoke questions'} as const;
export function guidedPresentationDefaults(kind:GuidedSectionKind){return {background:kind==='guidedHero'?'ink' as const:kind==='guidedPhotography'?'forest' as const:['guidedFieldCards','guidedCompanion','guidedFaq'].includes(kind)?'white' as const:'paper' as const,width:['guidedHero','guidedEncounter','guidedPhotography'].includes(kind)?'full' as const:'content' as const,mediaAlign:kind==='guidedPhotography'?'start' as const:'end' as const,mobileOrder:['guidedHero','guidedPhotography','guidedCompanion'].includes(kind)?'mediaFirst' as const:'textFirst' as const};}
const heading=()=>({lines:[{runs:[{text:'',emphasis:false}]}]});
const media=()=>({image:{assetId:'',alt:'',decorative:false},desktopFraming:{x:50,y:50,shape:'wide'},mobileFraming:{x:50,y:50,shape:'portrait'}});
const link=()=>({label:'',href:'',newWindow:false});
/** Intentionally incomplete drafts. No claims, approved assets or source copy invented. */
export function createGuidedSection(kind:GuidedSectionKind,id:string):Composition['sections'][number]{
 const controls=validateComposition({schemaVersion:1,title:'Draft',sections:[{id,kind:'text',controls:{...guidedPresentationDefaults(kind),label:guidedSectionNames[kind],headingLevel:kind==='guidedHero'?'h1':'h2'},data:{body:[]}}]}).page?.sections[0].controls;
 if(!controls)throw Error('Invalid Bespoke section identity.');
 const titles={eyebrow:'',heading:heading()},paragraphs=[{id:`${id}-paragraph`,text:''}],card={id:`${id}-card`,...titles,copy:'',media:media()};
 const data={
  guidedHero:{...titles,copy:'',media:media(),button:link(),scrollCue:{label:'',accessibleLabel:'',anchor:'#guided-introduction'}},
  guidedIntroduction:{...titles,paragraphs},guidedEncounter:{accessibleLabel:'',media:media(),expandOnScroll:false},
  guidedFieldCards:{...titles,introduction:'',items:[card],mobileLayout:'horizontal'},guidedPhotography:{...titles,paragraphs,quotation:'',media:media()},
  guidedCompanion:{...titles,paragraphs,media:media()},guidedPaths:{...titles,items:[{...card,action:link()}]},
  guidedFaq:{...titles,items:[{id:`${id}-question`,question:'',answer:''}],initialOpenId:null},
 }[kind];
 return {id,kind,controls,data};
}
export function createGuidedPageDraft(){return {title:'Bespoke Safaris',path:'/guided-bespoke-safaris',composition:{schemaVersion:1 as const,title:'Bespoke Safaris',sections:[]}};}
