import test from 'node:test';import assert from 'node:assert/strict';
import {guidedSectionSchemas,guidedLinkSchema} from '../lib/cms/guided-safaris-content.ts';
const heading={lines:[{runs:[{text:'Field knowledge',emphasis:false}]}]},image={assetId:'forest',alt:'Forest',decorative:false},media={image,desktopFraming:{x:50,y:50,shape:'wide'},mobileFraming:{x:30,y:50,shape:'portrait'}},titles={eyebrow:'In the field',heading},paragraphs=[{id:'intro',text:'Reviewed source text.'}],link={label:'Plan with a private guide',href:'/plan?guided=true',newWindow:false};
const card={id:'one',eyebrow:'Read the field',heading,copy:'Reviewed source copy.',media};
const examples={guidedHero:{...titles,copy:'Reviewed source copy.',media,button:link,scrollCue:{label:'Into the field',accessibleLabel:'Continue to the introduction',anchor:'#guided-introduction'}},guidedIntroduction:{...titles,paragraphs},guidedEncounter:{accessibleLabel:'A patient field encounter',media,expandOnScroll:true},guidedFieldCards:{...titles,introduction:'Reviewed source copy.',items:[card],mobileLayout:'horizontal'},guidedPhotography:{...titles,paragraphs,quotation:'The camera follows the field.',media},guidedCompanion:{...titles,paragraphs,media,button:{enabled:false,link:{...link,href:'/specialists'}}},guidedPaths:{...titles,items:[{...card,action:{...link,href:'/journeys'}}]},guidedFaq:{...titles,items:[{id:'availability',question:'Can a guide join?',answer:'Subject to availability.'}],initialOpenId:'availability'}};
test('all eight Bespoke Safaris contracts retain independent presentation, disabled links and accordion state',()=>{
 for(const [kind,value]of Object.entries(examples)){const original=structuredClone(value);assert.deepEqual(guidedSectionSchemas[kind].parse(value),original);assert.deepEqual(value,original);assert.equal(guidedSectionSchemas[kind].safeParse({...value,unreviewed:'extra'}).success,false);}
 assert.equal(guidedSectionSchemas.guidedFaq.safeParse({...examples.guidedFaq,initialOpenId:null}).success,true);assert.equal(guidedSectionSchemas.guidedCompanion.parse(examples.guidedCompanion).button.enabled,false);
});
test('Bespoke Safaris rejects ambiguous item IDs, broken accordion selection and invalid framing',()=>{
 for(const kind of ['guidedFieldCards','guidedPaths','guidedFaq']){const value=structuredClone(examples[kind]);value.items.push(structuredClone(value.items[0]));assert.equal(guidedSectionSchemas[kind].safeParse(value).success,false);}
 assert.equal(guidedSectionSchemas.guidedFaq.safeParse({...examples.guidedFaq,initialOpenId:'missing'}).success,false);
 const value=structuredClone(examples.guidedHero);value.media.mobileFraming.x=101;assert.equal(guidedSectionSchemas.guidedHero.safeParse(value).success,false);
});
test('Bespoke Safaris preserves exact guided planning intent without accepting unsafe or unrelated queries',()=>{
 for(const href of ['/plan?guided=true','/journeys','#guided-introduction','https://example.com/travel'])assert.equal(guidedLinkSchema.parse({...link,href}).href,href);
 for(const href of ['//evil.example','/../plan','/%2e%2e/plan','/plan?guided=false','/plan?guided=true&redirect=https://evil.example','javascript:alert(1)','https://user:password@example.com','/plan\\bad'])assert.equal(guidedLinkSchema.safeParse({...link,href}).success,false,href);
});

test('Bespoke source text is retained verbatim and button labels enforce the agreed cap',()=>{const value={...examples.guidedIntroduction,paragraphs:[{id:'source',text:'  Original wording.\nSecond line.  '}]};assert.equal(guidedSectionSchemas.guidedIntroduction.parse(value).paragraphs[0].text,value.paragraphs[0].text);assert.equal(guidedLinkSchema.safeParse({...link,label:'x'.repeat(31)}).success,false);});
