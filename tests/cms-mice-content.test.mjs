import test from 'node:test';import assert from 'node:assert/strict';
import {miceSectionSchemas,miceSectionKinds} from '../lib/cms/mice-content.ts';
import {createMiceSection} from '../lib/cms/mice-section-drafts.ts';
import {createPageTemplate} from '../lib/cms/page-templates.ts';
import {pageSectionOptions} from '../lib/cms/page-section-options.ts';
import {validateComposition} from '../lib/cms/composition.ts';
const heading={lines:[{runs:[{text:'Corporate journeys',emphasis:false}]}]},titles={eyebrow:'India and international',heading},image={assetId:'approved-image',alt:'Heritage gardens',decorative:false},focalPoint={x:50,y:40},button={label:'Plan a corporate journey',href:'#corporate-enquiry'},items=[{id:'first',title:'Shared experience',copy:'Plan around the group.'}];
const fixtures={miceHero:{...titles,copy:'Travel together.',image,focalPoint,breadcrumbs:[{id:'home',label:'Home',href:'/'},{id:'current',label:'Corporate journeys'}]},miceIntroduction:{...titles,paragraphs:[{id:'intro',text:'Begin with your brief.'}],button},miceFormats:{accessibleLabel:'Corporate travel formats',items},miceDestinations:{...titles,copy:'India and beyond.',items:[{...items[0],image,focalPoint,button}]},miceProcess:{...titles,items},miceEnquiry:{...titles,copy:'Share your brief.',form:{recordId:'00000000-0000-4000-8000-000000000001'}}};
test('all MICE content fields participate in composition validation and preserve editorial data',()=>{
 const sections=miceSectionKinds.map(kind=>({...createMiceSection(kind,kind),data:fixtures[kind]}));
 const parsed=validateComposition({schemaVersion:1,title:'Corporate Travel & MICE',sections});assert.equal(parsed.valid,true);assert.deepEqual(parsed.page.sections.map(s=>s.data),Object.values(fixtures));
 assert.deepEqual(pageSectionOptions('page','/mice'),miceSectionKinds);
 const template=createPageTemplate('mice');assert.equal(template.path,'/mice');assert.deepEqual(template.composition.sections,[]);
 for(const kind of miceSectionKinds)assert.equal(miceSectionSchemas[kind].safeParse(createMiceSection(kind,kind).data).success,false);
});
test('MICE rejects unsafe links, duplicate rows, missing alt text and forged form/media properties',()=>{
 for(const href of ['//evil.test','javascript:alert(1)','https://evil.test','/\\evil.test','/path?secret=value'])assert.equal(miceSectionSchemas.miceIntroduction.safeParse({...fixtures.miceIntroduction,button:{...button,href}}).success,false);
 assert.equal(miceSectionSchemas.miceFormats.safeParse({...fixtures.miceFormats,items:[items[0],items[0]]}).success,false);
 assert.equal(miceSectionSchemas.miceHero.safeParse({...fixtures.miceHero,image:{...image,alt:''}}).success,false);
 assert.equal(miceSectionSchemas.miceHero.safeParse({...fixtures.miceHero,image:{...image,url:'https://evil.test/image'}}).success,false);
 assert.equal(miceSectionSchemas.miceEnquiry.safeParse({...fixtures.miceEnquiry,form:{...fixtures.miceEnquiry.form,published:true}}).success,false);
 assert.equal(miceSectionSchemas.miceProcess.safeParse({...fixtures.miceProcess,items:[]}).success,false);
 assert.equal(miceSectionSchemas.miceHero.safeParse({...fixtures.miceHero,focalPoint:{x:101,y:0}}).success,false);
});
