import {validateComposition,type Composition} from './composition.ts';
import type {AviationSectionKind} from './private-aviation-content.ts';
export const aviationSectionNames={aviationHero:'Aviation hero',aviationIntroduction:'Air access introduction',aviationFleet:'Aircraft selection',aviationJourney:'Journey coordination',aviationServices:'Aviation services'} as const;
const heading=()=>({lines:[{runs:[{text:'',emphasis:false}]}]});
const image=()=>({assetId:'',alt:'',decorative:false});
const media=()=>({image:image(),desktopFraming:{x:50,y:50,shape:'natural'},mobileFraming:{x:50,y:50,shape:'natural'}});
const link=()=>({label:'',href:'',newWindow:false});
/** Blank forms deliberately fail content validation until an editor supplies copy
 * and assets. Template defaults are presentation choices, never approved claims. */
export function createAviationSection(kind:AviationSectionKind,id:string):Composition['sections'][number]{
 const controls=validateComposition({schemaVersion:1,title:'Draft',sections:[{id,kind:'text',controls:{label:aviationSectionNames[kind],headingLevel:kind==='aviationHero'?'h1':'h2',background:kind==='aviationHero'?'ink':kind==='aviationJourney'?'forest':kind==='aviationFleet'?'white':'paper',width:['aviationHero','aviationJourney'].includes(kind)?'full':'content',mediaAlign:['aviationJourney','aviationFleet'].includes(kind)?'start':'end',mobileOrder:['aviationJourney','aviationFleet'].includes(kind)?'mediaFirst':'textFirst'},data:{body:[]}}]}).page?.sections[0].controls;
 if(!controls)throw Error('Invalid aviation section identity.');
 const titles={eyebrow:'',heading:heading()},steps=[{id:'step-1',title:'',copy:''}];
 const data={
 aviationHero:{...titles,copy:'',button:link(),media:{poster:image(),background:{kind:'image'},desktopFraming:{x:50,y:50,shape:'panorama'},mobileFraming:{x:50,y:50,shape:'landscape'}},captions:{primary:'',secondary:'',showSecondaryOnMobile:false}},
 aviationIntroduction:{...titles,paragraphs:[{id:'paragraph-1',text:''}],button:link(),sequenceLabel:'',steps},
 aviationFleet:{...titles,introduction:'',aircraft:[{id:'aircraft-1',name:'',type:'',summary:'',media:media(),specifications:[{id:'specification-1',label:'',value:''}]}],sourceNote:''},
 aviationJourney:{...titles,media:media(),steps},
 aviationServices:{...titles,introduction:'',items:steps},
 }[kind];
 return {id,kind,controls,data};
}
export function createAviationPageDraft(){return {title:'Private Aviation',path:'/private-aviation',composition:{schemaVersion:1 as const,title:'Private Aviation',sections:[]}};}
