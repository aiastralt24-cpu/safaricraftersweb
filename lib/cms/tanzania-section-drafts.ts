import {validateComposition,type Composition} from './composition.ts';
import {tanzaniaSectionNames,type TanzaniaSectionKind} from './tanzania-country-sections.ts';
export function tanzaniaSectionBlank(kind:TanzaniaSectionKind):Record<string,any>{
 const image=()=>({assetId:'',alt:'',decorative:false}),heading=()=>({lines:[{runs:[{text:'',emphasis:false}]}]}),titles=()=>({eyebrow:'',heading:heading()}),planner=()=>({label:'Start planning',interest:'',region:'Africa',dialogLabel:'',dialogEyebrow:'Your private journey',closeLabel:'Close planner'});
 return {
 tanzaniaHero:{title:'Tanzania',accent:'Tanzania',copy:'',meta:'',image:image(),focalPoint:{x:58,y:90},breadcrumbs:[{id:'home',label:'Home',href:'/'},{id:'current',label:'Tanzania'}]},
 tanzaniaFacts:{accessibleLabel:'Tanzania at a glance',items:[{id:'fact-1',label:'',value:'',note:''}]},
 tanzaniaIntroduction:{...titles(),lead:'',paragraphs:[{id:'paragraph-1',text:''}]},
 tanzaniaPlaces:{...titles(),items:[{id:'place-1',title:'',subtitle:'',copy:'',image:image(),imageCaption:'',planner:planner()}]},
 tanzaniaGallery:{heading:heading(),copy:'',accessibleLabel:'Tanzania field photographs',images:[{id:'image-1',image:image()}]},
 tanzaniaItineraries:{...titles(),items:[{id:'itinerary-1',title:'',label:'',copy:'',image:image(),planner:planner()}]},
 tanzaniaFaq:{...titles(),items:[{id:'faq-1',question:'',answer:''}]},
 tanzaniaPlanner:{...titles(),copy:'',planner:planner()},
 tanzaniaRelated:{...titles(),items:[{id:'country-1',title:'',copy:'',button:{label:'',href:'/destinations'}}]},
 }[kind];
}
export function createTanzaniaSection(kind:TanzaniaSectionKind,id:string):Composition['sections'][number]{
 const controls=validateComposition({schemaVersion:1,title:'Draft',sections:[{id,kind:'text',controls:{label:tanzaniaSectionNames[kind],headingLevel:kind==='tanzaniaHero'?'h1':'h2'},data:{body:[]}}]}).page?.sections[0].controls;
 if(!controls)throw Error('Invalid Tanzania section identity.');return {id,kind,controls,data:tanzaniaSectionBlank(kind)};
}
