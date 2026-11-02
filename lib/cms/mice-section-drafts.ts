import {validateComposition,type Composition} from './composition.ts';
import {miceSectionNames,type MiceSectionKind} from './mice-content.ts';
const image=()=>({assetId:'',alt:'',decorative:false});
const focalPoint=()=>({x:50,y:50});
const button=()=>({label:'',href:'#corporate-enquiry'});
/** Empty fields require client content; defaults never invent approved claims. */
export function createMiceSection(kind:MiceSectionKind,id:string):Composition['sections'][number]{
 const controls=validateComposition({schemaVersion:1,title:'Draft',sections:[{id,kind:'text',controls:{label:miceSectionNames[kind],headingLevel:kind==='miceHero'?'h1':'h2',background:kind==='miceProcess'?'forest':'paper',width:kind==='miceHero'||kind==='miceProcess'?'full':'content',...(kind==='miceEnquiry'?{anchor:'corporate-enquiry'}:{})},data:{body:[]}}]}).page?.sections[0].controls;
 if(!controls)throw Error('Invalid MICE section identity.');
 const titles={eyebrow:'',heading:{lines:[{runs:[{text:'',emphasis:false}]}]}},items=[{id:'item-1',title:'',copy:''}];
 const data={
 miceHero:{...titles,copy:'',image:image(),focalPoint:focalPoint(),breadcrumbs:[{id:'home',label:'Home',href:'/'},{id:'current',label:'Corporate Journeys & MICE'}]},
 miceIntroduction:{...titles,paragraphs:[{id:'paragraph-1',text:''}],button:button()},
 miceFormats:{accessibleLabel:'Corporate travel formats',items},
 miceDestinations:{...titles,copy:'',items:[{id:'destination-1',title:'',copy:'',image:image(),focalPoint:focalPoint(),button:button()}]},
 miceProcess:{...titles,items},
 miceEnquiry:{...titles,copy:''},
 }[kind];
 return {id,kind,controls,data};
}
