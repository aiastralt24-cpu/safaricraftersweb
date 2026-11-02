import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs/promises';import {createHash} from 'node:crypto';
import {kenyaCountryContentSchema} from '../lib/cms/kenya-country-content.ts';
import {newPageSeo} from '../lib/cms/page-seo.ts';
import {kenyaPlaces,kenyaCombinations,kenyaFaqs} from '../content/kenya-editorial.ts';
const inventory=JSON.parse(await fs.readFile(new URL('../docs/cms/kenya-source-inventory.json',import.meta.url),'utf8'));
const sections=inventory.views[0].content,[hero,facts,opening,places,gallery,luxury,itineraries,faq,planner,related]=sections;
const image=(value)=>({assetId:'fixture-'+inventory.media.findIndex(m=>m.sourcePath===value.sourcePath),alt:value.alt,credit:'Safari Crafters archive'});
const heading=value=>({lines:value.lines});const title=s=>({eyebrow:s.paragraphs[0],heading:heading(s.headings[0])});
function fixture(){return {
 schemaVersion:1,hero:{title:'Kenya',accent:'Kenya',copy:hero.paragraphs[1],meta:hero.paragraphs[0],image:image(hero.images[0]),focalPoint:{x:35,y:100},breadcrumbs:[...hero.links.map((l,i)=>({id:'crumb-'+i,label:l.label,href:l.href})),{id:'current',label:'Kenya'}]},
 facts:{accessibleLabel:facts.label,items:facts.headings.map((h,i)=>({id:'fact-'+i,label:h.lines[0].runs.map(r=>r.text).join(''),value:facts.paragraphs[i],note:facts.small[i]}))},
 introduction:{...title(opening),lead:opening.paragraphs[1],paragraphs:[{id:'intro',text:opening.paragraphs[2]}]},
 places:{...title(places),items:kenyaPlaces.map((p,i)=>({id:p.slug,title:p.title,subtitle:p.subtitle,copy:p.copy,focus:p.focus,image:image(places.images[i]),button:{label:places.links[i*2+1].label,href:places.links[i*2+1].href},imageLinkLabel:places.links[i*2].ariaLabel}))},
 gallery:{heading:heading(gallery.headings[0]),copy:gallery.paragraphs[0],accessibleLabel:'Kenya field photographs',images:gallery.images.map((m,i)=>({id:'gallery-'+i,image:image(m)}))},
 luxury:{...title(luxury),image:image(luxury.images[0]),caption:luxury.captions[0],paragraphs:luxury.paragraphs.slice(1).map((text,i,a)=>({id:'luxury-'+i,text,emphasized:i===a.length-1}))},
 itineraries:{...title(itineraries),items:kenyaCombinations.map((c,i)=>({id:c.slug,title:c.title,label:c.note,copy:c.copy,image:image(itineraries.images[i]),button:{label:'Start planning',href:itineraries.links[i].href}}))},
 faq:{...title(faq),items:kenyaFaqs.map((f,i)=>({id:'faq-'+i,...f}))},
 planner:{...title(planner),copy:planner.paragraphs[1],button:{label:planner.links[0].label,href:planner.links[0].href}},
 related:{...title(related),items:[{id:'tanzania',title:'Tanzania',copy:related.paragraphs[1],button:{label:'Explore Tanzania',href:'/destinations/tanzania'}},{id:'uganda',title:'Uganda & Rwanda',copy:related.paragraphs[2],button:{label:'Explore Uganda & Rwanda',href:'/destinations/uganda'}}]},seo:newPageSeo(),
};}
test('Kenya contract preserves ten source sections, explicit typography, planning queries and media alternatives',()=>{
 const value=kenyaCountryContentSchema.parse(fixture());assert.equal(sections.length,10);assert.equal(value.introduction.heading.lines.length,2);assert.equal(value.planner.button.href,'/plan?destination=kenya');assert.match(value.itineraries.items[0].button.href,/&kenyaRoute=mara-amboseli$/);assert.equal(value.places.items[0].imageLinkLabel,'Explore Masai Mara');assert.equal(value.luxury.paragraphs.at(-1).emphasized,true);assert.equal(value.gallery.images.length,3);assert.equal(value.faq.items.length,4);
});
test('Kenya editorial contract rejects unsafe links, unbound media, duplicated IDs and invalid title/breadcrumb semantics',()=>{
 const mutations=[v=>v.planner.button.href='https://outside.test',v=>v.itineraries.items[0].button.href='javascript:alert(1)',v=>v.hero.image={src:'/assets/legacy.jpg',alt:'Legacy'},v=>v.places.items[0].image.alt='',v=>v.facts.items.push({...v.facts.items[0]}),v=>v.hero.accent='Missing',v=>v.hero.breadcrumbs.at(-1).href='/destinations/kenya',v=>delete v.hero.breadcrumbs[0].href,v=>v.planner.copy='   ',v=>v.hero.focalPoint.x=101,v=>v.extra='Unexpected'];
 for(const mutate of mutations){const value=fixture();mutate(value);assert.equal(kenyaCountryContentSchema.safeParse(value).success,false);}
});
test('Kenya source capture retains matching desktop/mobile content and verifiable source/media evidence',async()=>{
 assert.equal(inventory.path,'/destinations/kenya');assert.deepEqual(inventory.views.map(v=>v.width),[1280,390]);assert.deepEqual(inventory.views[0].content,inventory.views[1].content);assert.equal(inventory.states.filter(s=>s.kind==='faq').length,8);assert.equal(inventory.states.filter(s=>s.kind==='gallery').length,6);assert.equal(inventory.media.length,8);
 for(const entry of [...inventory.sources,...inventory.media]){const file=entry.sourcePath.startsWith('/assets/')?'public'+entry.sourcePath:entry.sourcePath;assert.equal(createHash('sha256').update(await fs.readFile(file)).digest('hex'),entry.sha256,`Changed source ${file}; recapture deliberately before migration.`);}
});

test('Kenya section palette registers all ten editable groups without enabling another country',async()=>{
 const {kenyaSectionKinds,kenyaSectionSchemas}=await import('../lib/cms/kenya-country-sections.ts'),{createKenyaSection}=await import('../lib/cms/kenya-section-drafts.ts'),{pageSectionOptions}=await import('../lib/cms/page-section-options.ts'),{validateComposition}=await import('../lib/cms/composition.ts');
 assert.equal(kenyaSectionKinds.length,10);assert.deepEqual(pageSectionOptions('page','/destinations/kenya'),kenyaSectionKinds);assert.notDeepEqual(pageSectionOptions('page','/destinations/tanzania'),kenyaSectionKinds);
 const value=fixture(),sections=kenyaSectionKinds.map(kind=>{const key=kind.slice(5);const group=key[0].toLowerCase()+key.slice(1);return {...createKenyaSection(kind,kind),data:value[group]};});assert.equal(validateComposition({schemaVersion:1,title:'Kenya',sections}).valid,true);
 for(const kind of kenyaSectionKinds){const first=createKenyaSection(kind,kind),second=createKenyaSection(kind,kind);assert.equal(first.kind,kind);assert.notEqual(first.data,second.data);assert.equal(kenyaSectionSchemas[kind].safeParse(first.data).success,false,'Empty authoring fields cannot pass complete-content validation');}
});
