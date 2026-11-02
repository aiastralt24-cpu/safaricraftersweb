import test from 'node:test';import assert from 'node:assert/strict';
import {validateStoredContent} from '../lib/cms/content-validation.ts';
import {newGlobalSettings} from '../lib/cms/global-settings.ts';
import {planHomepageMigration} from '../lib/cms/homepage-migration.ts';
import {homepageMigrationDependencies} from '../lib/cms/homepage-migration-review.ts';
import {makeHomepageMigrationFixture} from './fixtures/cms-homepage-migration.mjs';
const id=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`,site=id(100);
function fixture(){
 const payload=structuredClone(planHomepageMigration(homepageMigrationDependencies,makeHomepageMigrationFixture().mappings).previewPayload);
 payload.composition.sections.find(s=>s.kind==='homepageStory').data.statistics.forEach(s=>s.source='Private supporting evidence');
 const media=new Set();function visit(value){if(!value||typeof value!=='object')return;for(const [key,item]of Object.entries(value)){if(['assetId','desktopAssetId','mobileAssetId'].includes(key))media.add(item);else visit(item);}}visit(payload);
 const refs=payload.composition.sections.flatMap(s=>['homepageJourneys','homepageGuestNotes','homepageDepartures'].includes(s.kind)?s.data[s.kind==='homepageDepartures'?'overrides':'items'].map(i=>({recordId:i.recordId,type:s.kind==='homepageJourneys'?'journey':s.kind==='homepageGuestNotes'?'testimonial':'photoExpedition',available:true,locale:'en',revisionId:id(200)})):[]);
 const settings=newGlobalSettings();settings.header.mainMenu={recordId:id(300)};
 const header={settings:{websiteId:site,recordId:id(301),revisionId:id(302),locale:'en',payload:settings},menus:{mainMenu:{websiteId:site,recordId:id(300),revisionId:id(303),locale:'en',payload:{schemaVersion:1,title:'Main',items:[{id:'contact',parentId:null,label:'Contact',target:{kind:'url',href:'/contact'},visibility:{visible:true}}]},references:[]},utilityMenu:null,mobileMenu:null},featured:[]};
 return {record:{type:'homepage',path:'/',locale:'en',payload},media:[...media].map(assetId=>({assetId,available:true})),refs,paths:payload.composition.sections.find(s=>s.kind==='homepageGuestNotes').data.items.map(i=>i.href),header:{site,header}};
}
const check=f=>validateStoredContent(f.record,f.media,undefined,undefined,undefined,undefined,undefined,f.paths,f.refs,f.header);
test('all ten supported homepage sections pass only with complete trusted evidence',()=>{
 const f=fixture(),before=structuredClone(f),result=check(f);assert.equal(f.record.payload.composition.sections.length,10);assert.deepEqual(result.findings.filter(f=>f.severity==='error'),[]);assert.equal(result.contentChecksPass,true);assert.equal(result.validatorVersion,'homepage-1');assert.deepEqual(f,before);
 for(const mutate of [f=>f.media=[],f=>f.refs=[],f=>f.header=undefined,f=>f.paths=[],f=>f.record.path='/home',f=>f.record.payload.composition.sections.find(s=>s.kind==='homepageStory').data.statistics[0].source='']){const value=fixture();mutate(value);assert.equal(check(value).contentChecksPass,false);}
});
