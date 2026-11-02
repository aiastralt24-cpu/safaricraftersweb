/** Local test-only fetch shim. Start Next with --import; never use for deployment. */
import fs from 'node:fs/promises';import {createHash} from 'node:crypto';import sharp from 'sharp';
import {planTanzaniaMigration,tanzaniaMigrationDependencies} from '../../lib/cms/tanzania-migration.ts';
import inventory from '../../docs/cms/tanzania-source-inventory.json' with {type:'json'};
if(process.env.CMS_TANZANIA_LOCAL_FIXTURE!=='true'||!process.env.CMS_TANZANIA_FIXTURE_STATE?.startsWith('/private/tmp/'))throw Error('Use an explicitly enabled local fixture and temporary state file.');
const envExample=await fs.readFile(new URL('../../.env.example',import.meta.url),'utf8');for(const match of envExample.matchAll(/^(CMS_[A-Z_]+_ENABLED)=/gm))process.env[match[1]]='false';
const site='00000000-0000-4000-8000-000000000001',record='00000000-0000-4000-8000-000000000002',revision='00000000-0000-4000-8000-000000000003';
Object.assign(process.env,{CMS_TANZANIA_DELIVERY_ENABLED:'true',CMS_PUBLIC_DELIVERY_ENABLED:'true',CMS_WEBSITE_ID:site,CMS_SUPABASE_URL:'https://tanzania-fixture.test',CMS_SUPABASE_ANON_KEY:'anon-fixture'});
const bindings=inventory.media.map((m,i)=>({sourcePath:m.sourcePath,sourceSha256:m.sha256,assetId:`tanzania-fixture-${i}`})),images=new Map();
for(const binding of bindings){const bytes=await sharp(await fs.readFile(new URL('../../public'+binding.sourcePath,import.meta.url))).webp().toBuffer();images.set(binding.assetId,{bytes,descriptor:{id:binding.assetId,site,key:`${site}/${binding.assetId}/delivery.webp`,sha256:createHash('sha256').update(bytes).digest('hex'),bytes:bytes.length}});}
const page={websiteId:site,recordId:record,revisionId:revision,type:'page',path:'/destinations/tanzania',locale:'en',payload:planTanzaniaMigration(tanzaniaMigrationDependencies,bindings).previewPayload};
const original=globalThis.fetch;
globalThis.fetch=async(input,options={})=>{
 const url=new URL(typeof input==='string'||input instanceof URL?input:input.url);
 if(url.hostname!=='tanzania-fixture.test'){if(['localhost','127.0.0.1','[::1]'].includes(url.hostname))return original(input,options);throw Error('External server requests are disabled in this fixture.');}
 const {mode='ready'}=JSON.parse(await fs.readFile(process.env.CMS_TANZANIA_FIXTURE_STATE,'utf8'));const eligible=!['withdrawn','rights-revoked'].includes(mode);
 if(url.pathname.startsWith('/storage/v1/')){const id=decodeURIComponent(url.pathname.split('/').at(-2)),image=images.get(id);if(!eligible||!image)return new Response(null,{status:404});return new Response(image.bytes,{headers:{'Content-Type':'image/webp','Content-Length':String(image.bytes.length)}});}
 const args=JSON.parse(options.body??'{}');if(args.p_site!==site)throw Error('Fixture site mismatch');if(options.cache!=='no-store')throw Error('Expected uncached CMS request');
 const name=url.pathname.split('/').at(-1);
 if(name==='get_public_tanzania'){const value=structuredClone(page);value.payload.seo={...value.payload.seo,indexing:mode==='noindex'?'noindex':'inherit'};if(mode.startsWith('presentation:')){const [,background,mediaAlign,mobileOrder]=mode.split(':');for(const section of value.payload.composition.sections){if(section.kind==='tanzaniaHero')continue;Object.assign(section.controls,{background,tanzaniaOverrides:{background:true}});if(section.kind==='tanzaniaPlaces')Object.assign(section.controls,{mediaAlign,mobileOrder,tanzaniaOverrides:{background:true,mediaAlign:true,mobileOrder:true}});}}if(mode.startsWith('motion:'))for(const section of value.payload.composition.sections)section.controls.animation=mode.split(':')[1];if(mode.startsWith('layout:')){const [,width,spacing,textAlign]=mode.split(':');for(const section of value.payload.composition.sections)Object.assign(section.controls,{width,spacing,textAlign});}return Response.json(eligible?value:null);}
 if(name==='get_public_seo_settings')return Response.json({websiteId:site,recordId:record,revisionId:revision,locale:'en',seo:{titleTemplate:'%s | Safari Crafters',description:'Default description',indexing:'index'}});
 if(name==='get_public_media')return Response.json(eligible?(images.get(args.p_asset)?.descriptor??null):null);
 throw Error(`Unexpected fixture RPC ${name}; writes are prohibited.`);
};
