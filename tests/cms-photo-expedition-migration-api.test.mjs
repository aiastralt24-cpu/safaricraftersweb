import test from 'node:test';
import assert from 'node:assert/strict';
import {handlePhotoExpeditionMigrationReview} from '../lib/cms/photo-expedition-migration-api.ts';
import {planPhotoExpeditionMigration} from '../lib/cms/photo-expedition-migration.ts';
import {newPhotoExpedition} from '../lib/cms/photo-expeditions.ts';
const site='00000000-0000-4000-8000-000000000001',form='00000000-0000-4000-8000-000000000002';
const image={assetId:'forest',alt:'Forest',decorative:false};
function command(){
 const source=[{slug:'forest',title:'Forest',geography:'India',image:{src:'/forest.webp'},gallery:[{src:'/unused-in-display.webp'}]}],key=planPhotoExpeditionMigration(source).candidates[0].sourceKey,draft=newPhotoExpedition();
 return {action:'review',site,locale:'en',source,mappings:{[key]:{images:{image,'gallery.0':{...image,assetId:'original-gallery'}},programmeStatus:'preview',specialists:[],display:{heroTitle:'Forest',heroCopy:'Forest copy',heroImage:image,gallery:[],labels:draft.labels,booking:draft.booking,enquiry:{...draft.enquiry,form:{recordId:form}},additionalFaqs:[],reviewedOn:'2026-10-22',reviewNotes:'Reviewed legacy page display.'}}}};
}
const req=(value,headers={})=>new Request('https://site.test/api/cms/migrations/expeditions',{method:'POST',headers:{Authorization:'Bearer a.b.c','Content-Type':'application/json',...headers},body:JSON.stringify(value)});
const evidence=args=>({assets:args.p_assets.map(assetId=>({assetId,available:true})),references:args.p_references.map(item=>({...item,available:true,locale:'en'}))});
test('review checks all retained mappings, binds evidence digest and exposes only verified draft apply',async()=>{
 const input=command(),before=structuredClone(input);let args;
 const response=await handlePhotoExpeditionMigrationReview(req(input),async(_token,name,value)=>{assert.equal(name,'review_expedition_migration_links');args=value;return evidence(value);});
 assert.equal(response.status,200);assert.match(response.headers.get('cache-control'),/no-store/);const body=await response.json();assert.equal(body.plan.readyDrafts,1);assert.equal(body.applyAvailable,true);assert.deepEqual(args.p_assets,['forest','original-gallery']);assert.deepEqual(args.p_references,[{recordId:form,type:'form'}]);assert.deepEqual(input,before);
 const denied=await handlePhotoExpeditionMigrationReview(req(input),async(_t,_n,args)=>{const e=evidence(args);e.assets[1].available=false;return e;});const deniedBody=await denied.json();assert.equal(deniedBody.plan.readyDrafts,0);assert.notEqual(deniedBody.reviewDigest,body.reviewDigest);
 const foreign=await handlePhotoExpeditionMigrationReview(req(input),async(_t,_n,args)=>{const e=evidence(args);e.references[0].locale='fr';return e;});assert.equal((await foreign.json()).plan.readyDrafts,0);
});
test('review rejects missing, reordered, duplicate or unexpected evidence and malformed requests',async()=>{
 for(const alter of [e=>({...e,assets:[]}),e=>({...e,assets:e.assets.toReversed()}),e=>({...e,assets:[e.assets[0],e.assets[0]]}),e=>({...e,references:[{...e.references[0],type:'specialist'}]}),e=>({...e,extra:true})])assert.equal((await handlePhotoExpeditionMigrationReview(req(command()),async(_t,_n,args)=>alter(evidence(args)))).status,503);
 for(const input of [{...command(),action:'apply'},{...command(),locale:'fr'},{...command(),source:[]}])assert.equal((await handlePhotoExpeditionMigrationReview(req(input),async()=>assert.fail('No RPC'))).status,422);
 assert.equal((await handlePhotoExpeditionMigrationReview(req(command(),{Origin:'https://foreign.test'}),async()=>assert.fail('No RPC'))).status,403);
 assert.equal((await handlePhotoExpeditionMigrationReview(req(command(),{Authorization:''}),async()=>assert.fail('No RPC'))).status,401);
});
