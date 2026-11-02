import {newExpeditionDirectoryData} from './expedition-directory-section.ts';
import {validateComposition} from './composition.ts';
import type {Composition} from './composition.ts';
export type ImageSectionKind='hero'|'imageText'|'gallery';
export const emptySectionImage=()=>({assetId:'',alt:'',decorative:false});
export function createSpecialistDirectorySection(id:string):Composition['sections'][number]{
 const parsed=validateComposition({schemaVersion:1,title:'Specialists',sections:[{id,kind:'specialistDirectory',controls:{label:'Specialist directory'},data:{title:'Our specialists',relatedHeading:'Journeys shaped in the field',emptyMessage:'Specialist profiles will be available soon.'}}]});
 if(!parsed.valid||!parsed.page)throw Error('Invalid section identity.');
 return parsed.page.sections[0];
}
/** Empty image drafts are intentionally incomplete until the editor selects media. */
export function createImageSectionDraft(kind:ImageSectionKind,id:string,itemId:string):Composition['sections'][number]{
 const controls=validateComposition({schemaVersion:1,title:'Draft',sections:[{id,kind:'text',controls:{label:{hero:'Hero',imageText:'Image and text',gallery:'Gallery'}[kind]},data:{body:[]}}]}).page?.sections[0].controls;
 if(!controls)throw Error('Invalid section identity.');
 return {id,kind,controls,data:kind==='hero'?{title:'New hero',copy:'',desktop:emptySectionImage(),buttons:[]}:kind==='imageText'?{title:'New section',body:[],image:emptySectionImage()}:{title:'Gallery',images:[{id:itemId,image:emptySectionImage()}]}};
}
export type CollectionSectionKind='cards'|'statistics'|'timeline'|'logos';
export const collectionSectionNames={cards:'Cards',statistics:'Statistics',timeline:'Timeline',logos:'Logo strip'} as const;
export function newCollectionItem(kind:CollectionSectionKind,id:string){
 switch(kind){
  case 'cards':return {id,title:'New card',copy:''};
  case 'statistics':return {id,value:'0',label:'New statistic',source:''};
  case 'timeline':return {id,date:'Date',title:'New milestone',copy:''};
  case 'logos':return {id,label:'New logo',image:emptySectionImage()};
 }
}
export function createCollectionSectionDraft(kind:CollectionSectionKind,id:string,itemId:string):Composition['sections'][number]{
 const controls=validateComposition({schemaVersion:1,title:'Draft',sections:[{id,kind:'text',controls:{label:collectionSectionNames[kind]},data:{body:[]}}]}).page?.sections[0].controls;
 if(!controls)throw Error('Invalid section identity.');
 return {id,kind,controls,data:{title:collectionSectionNames[kind],items:[newCollectionItem(kind,itemId)],...(kind==='cards'?{columns:3}:{})}};
}
export type ReferenceSectionKind='reusableLeadership'|'reusableFaq'|'testimonials'|'productListing'|'projects'|'related';
export const referenceSectionNames={reusableLeadership:'Leadership profiles',reusableFaq:'Reusable FAQs',testimonials:'Testimonials',productListing:'Product listing',projects:'Projects',related:'Related content'} as const;
export function createReferenceSectionDraft(kind:ReferenceSectionKind,id:string):Composition['sections'][number]{
 const controls=validateComposition({schemaVersion:1,title:'Draft',sections:[{id,kind:'text',controls:{label:referenceSectionNames[kind]},data:{body:[]}}]}).page?.sections[0].controls;
 if(!controls)throw Error('Invalid section identity.');
 return {id,kind,controls,data:{title:referenceSectionNames[kind],...((kind==='testimonials'||kind==='reusableFaq'||kind==='reusableLeadership')?{records:[]}:{source:{mode:'manual',records:[],contentType:kind==='productListing'?'product':kind==='projects'?'project':'journey',limit:6,order:'manual'}})}};
}

export function createExpeditionDirectorySection(id:string):Composition['sections'][number]{
 const parsed=validateComposition({schemaVersion:1,title:'Draft',sections:[{id,kind:'expeditionDirectory',controls:{label:'Expedition directory'},data:newExpeditionDirectoryData()}]});
 if(!parsed.page)throw Error('Invalid expedition directory identity.');return parsed.page.sections[0];
}

export function createHomepageHeroSection(id:string,frameId:string):Composition['sections'][number]{
 const controls=validateComposition({schemaVersion:1,title:'Draft',sections:[{id,kind:'text',controls:{label:'Homepage hero',headingLevel:'h1'},data:{body:[]}}]}).page?.sections[0].controls;
 if(!controls)throw Error('Invalid section identity.');
 return {id,kind:'homepageHero',controls,data:{navigationLabel:'Welcome',frames:[{id:frameId,heading:{lines:[{runs:[{text:'New headline',emphasis:false}]}]}}],copy:'',poster:emptySectionImage(),background:{kind:'image'}}};
}

export function createHomepageStorySection(id:string,statisticId:string):Composition['sections'][number]{
 const controls=validateComposition({schemaVersion:1,title:'Draft',sections:[{id,kind:'text',controls:{label:'Homepage story and experience'},data:{body:[]}}]}).page?.sections[0].controls;
 if(!controls)throw Error('Invalid section identity.');
 return {id,kind:'homepageStory',controls,data:{eyebrow:'Our story',heading:{lines:[{runs:[{text:'Our story',emphasis:false}]}]},copy:'',button:{label:'Discover our story',href:'/about',newWindow:false},ledgerTitle:'Our experience',statistics:[{id:statisticId,value:0,suffix:'',label:'New statistic',source:''}]}};
}

export function createHomepageConciergeSection(id:string,choiceId:string):Composition['sections'][number]{
 const controls=validateComposition({schemaVersion:1,title:'Draft',sections:[{id,kind:'text',controls:{label:'Begin your journey',background:'forest'},data:{body:[]}}]}).page?.sections[0].controls;
 if(!controls)throw Error('Invalid section identity.');
 return {id,kind:'homepageConcierge',controls,data:{heading:{lines:[{runs:[{text:'Ready when',emphasis:false}]},{runs:[{text:'you are.',emphasis:true}]}]},prompt:{lines:[{runs:[{text:'Where would you like ',emphasis:false},{text:'to',emphasis:true},{text:' begin?',emphasis:false}]}]},choices:[{id:choiceId,link:{label:'India',href:'/plan?region=India',newWindow:false}}],contact:{label:'Plan My Journey',href:'/contact',newWindow:false}}};
}

export function newHomepageJourneyType(id:string){return {id,heading:{lines:[{runs:[{text:'New journey type',emphasis:false}]}]},copy:{runs:[{text:'Describe this way to travel.',strong:false}]},image:emptySectionImage(),link:{label:'Explore',href:'/journeys',newWindow:false}};}
export function createHomepageJourneyTypesSection(id:string,itemId:string):Composition['sections'][number]{
 const controls=validateComposition({schemaVersion:1,title:'Draft',sections:[{id,kind:'text',controls:{label:'Ways to journey'},data:{body:[]}}]}).page?.sections[0].controls;
 if(!controls)throw Error('Invalid section identity.');
 return {id,kind:'homepageJourneyTypes',controls,data:{heading:{lines:[{runs:[{text:'Ways to journey',emphasis:false}]}]},items:[newHomepageJourneyType(itemId)]}};
}

export function newHomepagePartner(id:string){return {id,name:'New partner',image:emptySectionImage()};}
export function createHomepagePartnersSection(id:string,regionId:string,partnerId:string):Composition['sections'][number]{
 const controls=validateComposition({schemaVersion:1,title:'Draft',sections:[{id,kind:'text',controls:{label:'Preferred partners'},data:{body:[]}}]}).page?.sections[0].controls;
 if(!controls)throw Error('Invalid section identity.');
 return {id,kind:'homepagePartners',controls,data:{eyebrow:'',heading:{lines:[{runs:[{text:'Preferred partners',emphasis:false}]}]},defaultRegionId:regionId,regions:[{id:regionId,label:'New region',items:[newHomepagePartner(partnerId)]}]}};
}

export function createHomepageCorporateSection(id:string,paragraphId:string,formatId:string):Composition['sections'][number]{
 const controls=validateComposition({schemaVersion:1,title:'Draft',sections:[{id,kind:'text',controls:{label:'Corporate journeys'},data:{body:[]}}]}).page?.sections[0].controls;
 if(!controls)throw Error('Invalid section identity.');
 return {id,kind:'homepageCorporate',controls,data:{eyebrow:'Corporate journeys',heading:{lines:[{runs:[{text:'Corporate journeys',emphasis:false}]}]},paragraphs:[{id:paragraphId,text:'Introduce your corporate journeys.'}],formats:[{id:formatId,label:'Travel format',title:'New format',href:'/mice'}],button:{label:'Discover corporate journeys',href:'/mice',newWindow:false},mainImage:emptySectionImage(),insetImage:emptySectionImage()}};
}

export function createHomepageAviationSection(id:string,benefitId:string):Composition['sections'][number]{
 const controls=validateComposition({schemaVersion:1,title:'Draft',sections:[{id,kind:'text',controls:{label:'Private jet safaris'},data:{body:[]}}]}).page?.sections[0].controls;
 if(!controls)throw Error('Invalid section identity.');
 return {id,kind:'homepageAviation',controls,data:{eyebrow:'Private Jet Safaris',heading:{lines:[{runs:[{text:'Private jet safaris',emphasis:false}]}]},copy:'',benefitsLabel:'Private jet safari benefits',benefits:[{id:benefitId,text:'New benefit'}],button:{label:'Explore private jet safaris',href:'/private-aviation',newWindow:false},image:emptySectionImage()}};
}

export function createHomepageJourneysSection(id:string):Composition['sections'][number]{
 const controls=validateComposition({schemaVersion:1,title:'Draft',sections:[{id,kind:'text',controls:{label:'Private journeys'},data:{body:[]}}]}).page?.sections[0].controls;
 if(!controls)throw Error('Invalid section identity.');
 return {id,kind:'homepageJourneys',controls,data:{eyebrow:'Private journey collection',heading:{lines:[{runs:[{text:'Journeys designed around you',emphasis:false}]}]},introduction:'',button:{label:'View all journeys',href:'/journeys',newWindow:false},cardActionLabel:'Explore journey',items:[]}};
}

export function createHomepageDeparturesSection(id:string):Composition['sections'][number]{
 const controls=validateComposition({schemaVersion:1,title:'Draft',sections:[{id,kind:'text',controls:{label:'Photography Tours'},data:{body:[]}}]}).page?.sections[0].controls;
 if(!controls)throw Error('Invalid section identity.');
 return {id,kind:'homepageDepartures',controls,data:{eyebrow:'Photography Tours',heading:{lines:[{runs:[{text:'The next group ',emphasis:false},{text:'departures.',emphasis:true}]}]},button:{label:'View all expeditions',href:'/photo-expeditions',newWindow:false},cardActionLabel:'View expedition',boardLabel:'Upcoming photography tours',emptyMessage:'New dates are being planned.',overrides:[]}};
}

export function createHomepageGuestNotesSection(id:string):Composition['sections'][number]{
 const controls=validateComposition({schemaVersion:1,title:'Draft',sections:[{id,kind:'text',controls:{label:'Guest Notes'},data:{body:[]}}]}).page?.sections[0].controls;
 if(!controls)throw Error('Invalid section identity.');
 return {id,kind:'homepageGuestNotes',controls,data:{eyebrow:'Guest Notes',heading:{lines:[{runs:[{text:'The journey stays ',emphasis:false},{text:'with you.',emphasis:true}]}]},button:{label:'All guest notes',href:'/reviews',newWindow:false},cardActionLabel:'Explore this journey',previousLabel:'Previous guest note',nextLabel:'Next guest note',items:[]}};
}

export function createDownloadSectionDraft(id:string):Composition['sections'][number]{
 const controls=validateComposition({schemaVersion:1,title:'Draft',sections:[{id,kind:'text',controls:{label:'Document downloads'},data:{body:[]}}]}).page?.sections[0].controls;
 if(!controls)throw Error('Invalid section identity.');
 return {id,kind:'downloads',controls,data:{title:'Downloads',items:[]}};
}
