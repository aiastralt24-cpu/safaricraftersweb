import test from 'node:test';import assert from 'node:assert/strict';
import {newCertification} from '../lib/cms/certifications.ts';
import {projectPublishedCertification} from '../lib/cms/published-certification.ts';
import {usesCmsCertification,publicCertificationConfig,readPublishedCertification,readPublishedCertificationList} from '../lib/cms/public-certification-runtime.ts';
const id=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const {evidence,relationships,internalNotes,reviewOn,statusNote,...base}=newCertification();
const payload={...base,title:'Example certificate',summary:'Summary',issuer:'Issuer',statement:'Synthetic claim',scope:'Example site',issuedOn:'2020-01-01',validFrom:'2020-01-01',validity:'noExpiry'};
const envelope={recordId:id(1),revisionId:id(2),type:'certification',path:'/certifications/new-certification',locale:'en',payload};
test('public certification projection excludes private fields and rejects invalid identity/content',()=>{
 assert.equal(projectPublishedCertification(envelope,envelope.path).content.issuer,'Issuer');
 for(const patch of [{internalNotes:'private'},{evidence:[]},{reviewOn:'2099-01-01'},{relationships:{}},{status:'revoked'},{validFrom:'2019-01-01'},{validity:'dated'},{summary:''}])assert.throws(()=>projectPublishedCertification({...envelope,payload:{...payload,...patch}},envelope.path));
 assert.throws(()=>projectPublishedCertification(envelope,'/certifications/other'));assert.throws(()=>projectPublishedCertification(envelope,envelope.path,'fr'));
});
test('public delivery is disabled by default and uses anonymous configuration only',async()=>{
 assert.equal(usesCmsCertification({}),false);assert.equal(publicCertificationConfig({}),null);
 const env={CMS_PUBLIC_DELIVERY_ENABLED:'true',CMS_CERTIFICATION_DELIVERY_ENABLED:'true',CMS_WEBSITE_ID:id(3),CMS_SUPABASE_URL:'https://example.test',CMS_SUPABASE_ANON_KEY:'public-key',CMS_SUPABASE_SERVICE_ROLE_KEY:'private-never-send'};
 const config=publicCertificationConfig(env,async(url,options)=>{assert.equal(options.headers.Authorization,'Bearer public-key');assert.equal(options.headers.apikey,'public-key');assert.equal(JSON.stringify(options).includes('private-never-send'),false);return Response.json(envelope);});
 assert.equal((await readPublishedCertification('new-certification',config)).content.title,payload.title);
 assert.equal(await readPublishedCertification('../private',config),null);assert.equal(await readPublishedCertification('new-certification',{site:id(3),read:async()=>null,list:async()=>[]}),null);
});
test('certification listing rejects repeated identities, routes and private list fields',async()=>{
 const row={recordId:id(1),revisionId:id(2),path:envelope.path,modifiedAt:'2026-10-30T00:00:00Z',title:payload.title,summary:payload.summary,issuer:payload.issuer,seo:payload.seo};
 const config=rows=>({site:id(3),read:async()=>null,list:async()=>rows});
 assert.equal((await readPublishedCertificationList(config([row]))).length,1);
 for(const rows of [[row,row],[{...row,internalNotes:'private'}],[{...row,path:'/wrong'}],[row,{...row,recordId:id(4)}]])await assert.rejects(()=>readPublishedCertificationList(config(rows)));
});
test('certification metadata respects editorial SEO and never includes private evidence',async()=>{
 const {publishedCertificationMetadata}=await import('../lib/cms/certification-route.ts');
 const profile=projectPublishedCertification(envelope,envelope.path),metadata=publishedCertificationMetadata(profile);
 assert.equal(metadata.title,payload.title);assert.equal(metadata.alternates.canonical,envelope.path);assert.equal(metadata.description,payload.summary);
 const changed=publishedCertificationMetadata({...profile,content:{...profile.content,seo:{...payload.seo,title:'Search title',description:'Search description',indexing:'noindex',following:'nofollow',canonical:'https://example.test/canonical'}}});assert.equal(changed.title,'Search title');assert.equal(changed.robots.index,false);assert.equal(changed.robots.follow,false);assert.equal(changed.alternates.canonical,'https://example.test/canonical');
});
