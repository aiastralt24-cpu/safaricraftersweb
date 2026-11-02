import test from 'node:test';import assert from 'node:assert/strict';
import {aviationSectionSchemas,aviationLinkSchema} from '../lib/cms/private-aviation-content.ts';
import inventory from '../docs/cms/private-aviation-migration-inventory.json' with {type:'json'};
const [hero,intro,fleet,journey,services]=inventory.views[0].content;
const heading=text=>({lines:[{runs:[{text,emphasis:false}]}]});
const titles=s=>({eyebrow:s.paragraphs[0],heading:heading(s.headings[0].text)});
const image={assetId:'fixture-asset',alt:'Original aircraft image',decorative:false};
const media={image,desktopFraming:{x:50,y:68,shape:'wide'},mobileFraming:{x:50,y:66,shape:'portrait'}};
const link=s=>({...s.links[0],newWindow:false});
const steps=items=>items.map((s,i)=>({id:'step-'+i,title:s.title,copy:s.copy}));
const examples={
 aviationHero:{...titles(hero),copy:hero.paragraphs[1],button:link(hero),media:{poster:image,background:{kind:'video',desktopAssetId:'fixture-video'},desktopFraming:{x:50,y:50,shape:'panorama'},mobileFraming:{x:50,y:50,shape:'landscape'}},captions:{primary:hero.captions[0].text,secondary:hero.captions[1].text,showSecondaryOnMobile:false}},
 aviationIntroduction:{...titles(intro),paragraphs:intro.paragraphs.slice(1,3).map((text,i)=>({id:'p-'+i,text})),button:link(intro),sequenceLabel:intro.routeSteps[0].accessibleLabel,steps:steps(intro.routeSteps)},
 aviationFleet:{...titles(fleet),introduction:fleet.paragraphs[1],aircraft:fleet.aircraft.map((a,i)=>({id:'aircraft-'+i,name:a.name,type:a.type,summary:a.summary,media,specifications:a.specifications.map((s,j)=>({id:'spec-'+j,...s}))})),sourceNote:fleet.paragraphs.at(-1)},
 aviationJourney:{...titles(journey),media,steps:steps(journey.journeySteps)},
 aviationServices:{...titles(services),introduction:services.paragraphs[1],items:steps(services.services)},
};
test('Aviation contracts retain captured copy, labelled specifications and responsive settings without coercion',()=>{
 for(const [kind,value]of Object.entries(examples)){const before=structuredClone(value);assert.deepEqual(aviationSectionSchemas[kind].parse(value),before);assert.deepEqual(value,before);assert.equal(aviationSectionSchemas[kind].safeParse({...value,privateExtra:'unreviewed'}).success,false);}
 const value=structuredClone(examples.aviationFleet);value.aircraft.reverse();assert.equal(aviationSectionSchemas.aviationFleet.parse(value).aircraft[0].id,'aircraft-1');value.sourceNote='  Preserve authored spacing.  ';assert.equal(aviationSectionSchemas.aviationFleet.parse(value).sourceNote,value.sourceNote);
});
test('Aviation rejects duplicate identities, missing content, unsafe links and invalid media fields',()=>{
 for(const [kind,collection]of [['aviationIntroduction','steps'],['aviationJourney','steps'],['aviationServices','items'],['aviationFleet','aircraft']]){const value=structuredClone(examples[kind]);value[collection].push(value[collection][0]);assert.equal(aviationSectionSchemas[kind].safeParse(value).success,false);}
 let value=structuredClone(examples.aviationFleet);value.aircraft[0].specifications.push(value.aircraft[0].specifications[0]);assert.equal(aviationSectionSchemas.aviationFleet.safeParse(value).success,false);
 for(const sourceNote of ['', '  ','x'.repeat(4001)])assert.equal(aviationSectionSchemas.aviationFleet.safeParse({...examples.aviationFleet,sourceNote}).success,false);
 for(const href of ['javascript:alert(1)','//evil.example','/plan?experience=other','/plan?experience=private-aviation&extra=true','/../plan','https://user:pass@example.com','https://example.com/ bad','/plan\\oops'])assert.equal(aviationLinkSchema.safeParse({label:'Plan',href,newWindow:false}).success,false,href);
 for(const href of ['/plan?experience=private-aviation','/journeys','#fleet','https://example.com/aircraft'])assert.equal(aviationLinkSchema.safeParse({label:'Plan',href,newWindow:false}).success,true,href);
 value=structuredClone(examples.aviationHero);value.media.background.src='https://unverified.example/video.mp4';assert.equal(aviationSectionSchemas.aviationHero.safeParse(value).success,false);
 value=structuredClone(examples.aviationHero);value.media.desktopFraming.x=101;assert.equal(aviationSectionSchemas.aviationHero.safeParse(value).success,false);
 value=structuredClone(examples.aviationJourney);value.media.image={assetId:'asset',alt:'',decorative:false};assert.equal(aviationSectionSchemas.aviationJourney.safeParse(value).success,false);
});
test('Aviation supports image fallback and independent mobile assets without deleting hidden captions',()=>{
 const value=structuredClone(examples.aviationHero);value.media.background={kind:'image'};value.media.mobilePoster={...image,assetId:'mobile-poster'};assert.deepEqual(aviationSectionSchemas.aviationHero.parse(value),value);
 value.media.background={kind:'video',desktopAssetId:'desktop-video',mobileAssetId:'mobile-video'};assert.deepEqual(aviationSectionSchemas.aviationHero.parse(value),value);assert.equal(value.captions.secondary,'India · By arrangement');
});
