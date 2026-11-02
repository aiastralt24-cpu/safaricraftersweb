import {validateComposition,type Composition} from './composition.ts';
import {kenyaSectionNames,type KenyaSectionKind} from './kenya-country-sections.ts';
export function kenyaSectionBlank(kind:KenyaSectionKind):Record<string,any>{
 const image=()=>({assetId:'',alt:'',decorative:false}),button=()=>({label:'',href:'/plan?destination=kenya'}),heading=()=>({lines:[{runs:[{text:'',emphasis:false}]}]}),titles=()=>({eyebrow:'',heading:heading()});
 return {
 kenyaHero:{title:'Kenya',accent:'Kenya',copy:'',meta:'',image:image(),focalPoint:{x:35,y:100},breadcrumbs:[{id:'home',label:'Home',href:'/'},{id:'current',label:'Kenya'}]},
 kenyaFacts:{accessibleLabel:'Kenya at a glance',items:[{id:'fact-1',label:'',value:'',note:''}]},
 kenyaIntroduction:{...titles(),lead:'',paragraphs:[{id:'paragraph-1',text:''}]},
 kenyaPlaces:{...titles(),items:[{id:'place-1',title:'',subtitle:'',copy:'',focus:'',image:image(),button:button(),imageLinkLabel:''}]},
 kenyaGallery:{heading:heading(),copy:'',accessibleLabel:'Kenya field photographs',images:[{id:'image-1',image:image()}]},
 kenyaLuxury:{...titles(),image:image(),caption:'',paragraphs:[{id:'paragraph-1',text:'',emphasized:false}]},
 kenyaItineraries:{...titles(),items:[{id:'itinerary-1',title:'',label:'',copy:'',image:image(),button:button()}]},
 kenyaFaq:{...titles(),items:[{id:'faq-1',question:'',answer:''}]},
 kenyaPlanner:{...titles(),copy:'',button:button()},
 kenyaRelated:{...titles(),items:[{id:'country-1',title:'',copy:'',button:{label:'',href:'/destinations'}}]},
 }[kind];
}
export function createKenyaSection(kind:KenyaSectionKind,id:string):Composition['sections'][number]{
 const controls=validateComposition({schemaVersion:1,title:'Draft',sections:[{id,kind:'text',controls:{label:kenyaSectionNames[kind],headingLevel:kind==='kenyaHero'?'h1':'h2'},data:{body:[]}}]}).page?.sections[0].controls;
 if(!controls)throw Error('Invalid Kenya section identity.');return {id,kind,controls,data:kenyaSectionBlank(kind)};
}
