import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import inventory from '../docs/cms/contact-migration-inventory.json' with {type:'json'};
import {contactContentSchema} from '../lib/cms/contact-content.ts';
import {planContactMigration,contactMigrationDependencies as proof} from '../lib/cms/contact-migration.ts';
import {editorialHeadingText} from '../lib/cms/editorial-heading.ts';
const captured=inventory.routes.find(route=>route.path==='/contact');
const mapping={sourcePath:captured.image.sourcePath,sourceSha256:captured.image.sha256,assetId:'processed-contact-image'};
test('contact source dependencies still match the captured page, shared forms, intake and original image',async()=>{
 for(const source of proof)assert.equal(createHash('sha256').update(await fs.readFile(new URL(`../${source.sourcePath}`,import.meta.url))).digest('hex'),source.sha256,source.sourcePath);
});
test('contact proposal preserves exact copy, explicit heading lines, emphasis and image framing without granting apply',()=>{
 const result=planContactMigration(proof);const body=result.content;
 assert.equal(result.readyToApply,false);assert.equal(result.missingMedia.length,2);
 assert.equal(editorialHeadingText(body.intro.heading),'Where would you\nlike to go next?');
 assert.deepEqual(body.intro.heading,captured.contactContent.intro.heading);
 assert.equal(body.intro.heading.lines[1].runs[1].emphasis,true);
 assert.deepEqual({...body.intro,image:captured.contactContent.intro.image},captured.contactContent.intro);
 assert.deepEqual(body.enquiry,captured.contactContent.enquiry);
 assert.equal(body.intro.image.caption,'Every journey begins with a little curiosity.');
 assert.deepEqual(body.intro.focalPoint,{x:50,y:62});assert.equal(body.intro.showImageOnMobile,false);
 assert.equal(body.intro.corporate.copy.endsWith(' '),true);
 assert.equal(result.metadata.title,captured.title);assert.equal(result.metadata.description,captured.description);
});
test('mapped contact image remains a review proposal and retains distinct contact/corporate form requirements',()=>{
 const result=planContactMigration(proof,mapping);assert.equal(result.readyToApply,false);assert.equal(result.missingMedia.length,1);assert.equal(result.content.intro.image.assetId,mapping.assetId);
 assert.equal(result.legacyForms[0].form.fields.find(f=>f.name==='message').required,true);
 assert.equal(result.legacyForms[1].form.fields.find(f=>f.name==='message').required,false);
 assert.ok(result.findings.some(f=>f.code==='form_mapping_pending'));assert.ok(result.findings.some(f=>f.code==='provider_unverified'));
 result.content.intro.lead='Changed';assert.equal(planContactMigration(proof).content.intro.lead,captured.contactContent.intro.lead);
});
test('source changes and unverified substitutions cannot silently enter the migration proposal',()=>{
 for(const invalid of [proof.slice(1),[...proof,proof[0]],proof.map((p,i)=>i? p:{...p,sha256:'0'.repeat(64)})])assert.throws(()=>planContactMigration(invalid));
 for(const invalid of [{...mapping,sourceSha256:'0'.repeat(64)},{...mapping,sourcePath:'/assets/other.webp'},{...mapping,assetId:'review-only-fake'},{...mapping,approved:true}])assert.throws(()=>planContactMigration(proof,invalid));
});
test('contact content rejects unsafe links, mail headers, missing accessibility text and unsupported properties',()=>{
 const content=planContactMigration(proof).content;
 for(const href of ['//external.test','https://external.test','javascript:alert(1)','/mice/../admin','/%2fexternal','/mice\\escape','/mice?redirect=evil']){const value=structuredClone(content);value.enquiry.privacy.link.href=href;assert.equal(contactContentSchema.safeParse(value).success,false,href);}
 for(const email of ['info@example.com?subject=Injected','info@example.com\r\nBcc:other@example.com']){const value=structuredClone(content);value.intro.direct.email=email;assert.equal(contactContentSchema.safeParse(value).success,false);}
 const image=structuredClone(content);image.intro.image.alt=' ';assert.equal(contactContentSchema.safeParse(image).success,false);
 const empty=structuredClone(content);empty.intro.lead=' ';assert.equal(contactContentSchema.safeParse(empty).success,false);
 assert.equal(contactContentSchema.safeParse({...content,publish:true}).success,false);
});

test('contact SEO proposal preserves captured sharing metadata and flags inherited canonical and network differences',()=>{
 const social=inventory.media.find(item=>item.sourcePath!==mapping.sourcePath),socialMapping={sourcePath:social.sourcePath,sourceSha256:social.sha256,assetId:'processed-contact-social'};
 const result=planContactMigration(proof,mapping,socialMapping),seo=result.previewPayload.seo;
 assert.equal(result.readyToApply,false);assert.equal(result.missingMedia.length,0);
 assert.equal(seo.title,captured.title);assert.equal(seo.canonical,captured.metadata.canonical);
 assert.equal(seo.socialTitle,captured.metadata.openGraph.find(item=>item.property==='og:title').content);
 assert.equal(seo.socialDescription,captured.metadata.openGraph.find(item=>item.property==='og:description').content);
 assert.equal(seo.socialImage.assetId,socialMapping.assetId);assert.notEqual(seo.socialImage.assetId,result.content.intro.image.assetId);
 assert.deepEqual(result.metadata.twitter,captured.metadata.twitter);
 assert.ok(result.findings.some(item=>item.code==='canonical_review'));assert.ok(result.findings.some(item=>item.code==='social_metadata_review'));
 assert.throws(()=>planContactMigration(proof,mapping,{...socialMapping,assetId:mapping.assetId}));
 assert.throws(()=>planContactMigration(proof,mapping,{...socialMapping,sourceSha256:'0'.repeat(64)}));
 assert.throws(()=>planContactMigration(proof,mapping,mapping));
});
