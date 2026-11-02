import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createSnapshot, collections, normalizeRecord} from '../scripts/cms-snapshot.mjs';
const baseline = JSON.parse(fs.readFileSync(new URL('../content/site-content.json', import.meta.url)));
const config = {projectId:'testproject',dataset:'production'};
function docs() { return Object.entries(collections).flatMap(([type,key]) => baseline[key].map((item,i) => ({...structuredClone(item), _id:`${type}-${i}`, _type:type, ...(type === "photoExpedition" ? {publicationStatus:"preview"} : {}), ...(item.slug ? {slug:{current:item.slug}} : {})}))); }
test('all existing site collections survive import, with stable order and normalized slugs', () => {
 const {snapshot} = createSnapshot(baseline, docs().reverse(), config);
 for (const key of ['destinations','journeys','expeditions','journal','specialists']) assert.deepEqual(snapshot[key].map(i=>i.slug||i.name), baseline[key].map(i=>i.slug||i.name));
 assert.equal(snapshot.contentSource, 'sanity');
});
test('drafts are excluded and missing required collections fail', () => {
 assert.throws(()=>createSnapshot(baseline,docs().filter(d=>d._type!=='journey'),config),/no published records/);
 const data=docs();data.push({...data[0],_id:'drafts.destination-0',title:'Draft title'});
 assert.equal(createSnapshot(baseline,data,config).snapshot.destinations[0].title,baseline.destinations[0].title);
});
test('duplicate slugs, invalid array shapes and impossible dates stop import', () => {
 const duplicate=docs();duplicate.push({...duplicate[0],_id:'duplicate'});assert.throws(()=>createSnapshot(baseline,duplicate,config),/duplicate slug/);
 const malformed=docs();malformed[0].gallery='bad';assert.throws(()=>createSnapshot(baseline,malformed,config),/must be an array/);
 const dates=docs();dates.find(d=>d._type==='photoExpedition').departures=[{date:'2027-02-30',status:'Available'}];assert.throws(()=>createSnapshot(baseline,dates,config),/invalid departure/);
});
test('native uploads override old images, preserve alt and derive hotspot', () => {
 const image=normalizeRecord({src:'/assets/old.jpg',alt:'Tiger in grass',upload:{asset:{_ref:'image-abc123-1200x800-jpg'},hotspot:{x:0.25,y:0.5}}},config);
 assert.equal(image.src,'https://cdn.sanity.io/images/testproject/production/abc123-1200x800.jpg');assert.equal(image.focalPoint,'25% 50%');
 assert.throws(()=>normalizeRecord({src:'https://unapproved.example/image.jpg',alt:'Image'},config),/local/);
 assert.throws(()=>normalizeRecord({src:'/assets/a.jpg',alt:''},config),/alt text/);
});
test('only verified and consented testimonials publish; withdrawal leaves no fallback notes', () => {
 const data=docs().filter(d=>d._type!=='testimonial');
 data.push({_id:'note',_type:'testimonial',name:'Guest',trip:'Journey',quote:'Approved wording',verified:true,consented:false});
 assert.equal(createSnapshot(baseline,data,config).snapshot.testimonials.length,0);
 data.at(-1).consented=true;assert.equal(createSnapshot(baseline,data,config).snapshot.testimonials.length,1);
});
test('homepage and SEO images import without mutating the original snapshot',()=>{
 const original=JSON.stringify(baseline);const data=docs();data.push({_id:'homepage',_type:'homepage',title:'Test title',copy:'Test copy',heroLines:[],seo:{socialImage:{src:'/assets/social.jpg',alt:'Landscape'}}});
 const {snapshot}=createSnapshot(baseline,data,config);assert.equal(snapshot.homepage.title,'Test title');assert.equal(snapshot.homepage.heroLines,undefined);assert.equal(JSON.stringify(baseline),original);
});

test('incomplete published tours cannot pass by using the website fallback',()=>{const data=docs();const tour=data.find(d=>d._type==='photoExpedition');tour.publicationStatus='published';tour.inclusions=[];assert.throws(()=>createSnapshot(baseline,data,config),/published tour needs/);});

test('incomplete gallery images cannot enter a build',()=>{const data=docs();data[0].gallery=[{alt:'Missing image'}];assert.throws(()=>createSnapshot(baseline,data,config),/local.*image/);});
