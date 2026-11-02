import {validateComposition,type Composition} from './composition.ts';
import {conservationSectionNames,type ConservationSectionKind} from './conservation-content.ts';
const heading=(text:string)=>({lines:[{runs:[{text,emphasis:false}]}]});
export function newConservationRecord(id:string){return {id,place:'Project location',title:'New project',copy:'Describe the project.',image:{assetId:'',alt:'',decorative:false}};}
export function newConservationMetric(id:string){return {id,value:'Enter figure',label:'Describe the outcome',tier:'secondary' as const};}
export function newConservationRegion(id:string){return {id,title:'New region',copy:'Describe the landscapes.'};}
/** Media drafts stay incomplete until a real approved asset is selected. */
export function createConservationSection(kind:ConservationSectionKind,id:string,itemId:string):Composition['sections'][number]{
 const label=conservationSectionNames[kind],controls=validateComposition({schemaVersion:1,title:'Draft',sections:[{id,kind:'text',controls:{label,headingLevel:kind==='conservationHero'?'h1':'h2'},data:{body:[]}}]}).page?.sections[0].controls;
 if(!controls)throw Error('Invalid conservation section identity.');
 const data={
  conservationHero:{eyebrow:'Conservation',heading:heading('Our commitment'),copy:'Describe your commitment.',image:{assetId:'',alt:'',decorative:false},credit:'Enter image credit'},
  conservationIntro:{label:'Our position',heading:heading('Our responsibility'),paragraphs:['Describe your position.']},
  conservationImpact:{eyebrow:'Impact',heading:heading('Our outcomes'),copy:'Describe the evidence behind these figures.',source:{label:'View source',href:'',newWindow:true},primaryLabel:'Primary outcomes',secondaryLabel:'Additional outcomes',metrics:[{...newConservationMetric(itemId),tier:'primary'},{...newConservationMetric(`${itemId}-secondary`)}]},
  conservationRecords:{eyebrow:'Field record',heading:heading('Work in the field'),copy:'Describe the work.',items:[newConservationRecord(itemId)]},
  conservationFootprint:{eyebrow:'Our footprint',heading:heading('Landscapes we support'),regions:[newConservationRegion(itemId)],species:{label:'Species supported',copy:'Describe the species supported.'}},
 }[kind];
 return {id,kind,controls,data};
}
