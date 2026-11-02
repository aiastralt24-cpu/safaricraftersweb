import test from 'node:test';
import assert from 'node:assert/strict';
import {newGlobalSettings} from '../lib/cms/global-settings.ts';
import {validateStoredContent} from '../lib/cms/content-validation.ts';
const record=payload=>({type:'settings',path:null,locale:'en',payload});
function complete(){const d=newGlobalSettings();d.search.contentTypes=['journey','destination','journalArticle'];d.seo.description='Forest journeys';d.footer.copyright='Safari Crafters';d.cookies.title='Cookie preferences';d.cookies.description='Choose optional cookies.';return d;}
test('configured addresses and social links need visible content but optional collections may be empty',()=>{
 const draft=complete();draft.contact.addresses=[{id:'office',label:' ',address:'\n'}];draft.social=[{id:'profile',label:' ',url:'https://example.com/profile'}];
 const before=structuredClone(draft);
 const fields=validateStoredContent(record(draft)).findings.filter(f=>f.code==='settings_required').map(f=>f.field);
 assert.deepEqual(fields,['contact.addresses.0.label','contact.addresses.0.address','social.0.label']);assert.deepEqual(draft,before);
 draft.contact.addresses[0]={id:'office',label:'Office',address:'Forest Road'};draft.social[0].label='Our profile';
 assert.equal(validateStoredContent(record(draft)).findings.some(f=>f.code==='settings_required'),false);
 draft.contact.addresses=[];draft.social=[];
 assert.equal(validateStoredContent(record(draft)).findings.some(f=>f.code==='settings_required'),false);
});
test('settings checks expose actionable fields and reject incomplete release content',()=>{
 const draft=newGlobalSettings(),before=structuredClone(draft),result=validateStoredContent(record(draft));
 for(const field of ['seo.description','footer.copyright','cookies.title','cookies.description'])assert.ok(result.findings.some(f=>f.field===field&&f.code==='settings_required'));
 assert.deepEqual(draft,before);assert.equal(result.validatorVersion,'settings-1');
 const ready=validateStoredContent(record(complete()));assert.equal(ready.contentChecksPass,false);assert.deepEqual(ready.findings.map(f=>f.code),['settings_main_menu_required']);
});
test('settings checks cover all nested images with exact nonconflicting availability evidence',()=>{
 const d=complete(),image={assetId:'forest',alt:'Forest',decorative:false};d.brand.logo=image;d.footer.marks=[{id:'mark',label:'Member',image}];d.seo.socialImage=image;
 for(const statuses of [undefined,[],[{assetId:'forest',available:false}],[{assetId:'forest',available:true},{assetId:'forest',available:false}]]){
 const result=validateStoredContent(record(d),statuses);assert.deepEqual(result.findings.filter(f=>f.code==='asset_verification_required').map(f=>f.field),['brand.logo.assetId','footer.marks.0.image.assetId','seo.socialImage.assetId']);
 }
 assert.equal(validateStoredContent(record(d),[{assetId:'forest',available:true}]).findings.some(f=>f.code==='asset_verification_required'),false);
});
test('enabled shared surfaces and references need actual content and delivery evidence',()=>{
 const d=complete();d.search.contentTypes=[];d.search.placeholder=' ';d.announcement.enabled=true;d.footer.groups=[{id:'empty',title:' ',links:[]}];d.header.mainMenu={recordId:'00000000-0000-4000-8000-000000000001'};d.header.featuredContent=[d.header.mainMenu];d.seo.indexing='noindex';
 const result=validateStoredContent(record(d));for(const field of ['search.contentTypes','search.placeholder','announcement.title','announcement.body','footer.groups.0.title','footer.groups.0.links','header.mainMenu.recordId','header.featuredContent.0.recordId'])assert.ok(result.findings.some(f=>f.field===field),field);
 assert.ok(result.findings.some(f=>f.code==='website_noindex'&&f.severity==='warning'));
 d.search.enabled=false;d.announcement.enabled=false;assert.equal(validateStoredContent(record(d)).findings.some(f=>f.field==='announcement.title'||f.field==='search.placeholder'),false);
});
test('malformed settings and unsupported routing cannot pass publication checks',()=>{
 const result=validateStoredContent({...record({...complete(),unknown:'hidden'}),path:'/settings',locale:'fr'});
 for(const code of ['settings_field','settings_path','settings_locale_not_ready'])assert.ok(result.findings.some(f=>f.code===code));assert.equal(result.contentChecksPass,false);
});
test('enabled footer call to action requires a title and button while older settings remain supported',()=>{
 const d=complete();assert.equal(validateStoredContent(record(d)).findings.some(f=>f.field.startsWith('footer.cta')),false);
 d.footer.cta={enabled:true,title:'',body:''};const result=validateStoredContent(record(d));assert.ok(result.findings.some(f=>f.field==='footer.cta.title'));assert.ok(result.findings.some(f=>f.code==='settings_footer_cta_button'));
 d.footer.cta={enabled:true,title:'Plan your journey',body:'Speak to a guide',button:{label:'Contact',href:'/contact',newWindow:false}};assert.equal(validateStoredContent(record(d)).findings.some(f=>f.field.startsWith('footer.cta')),false);
});
test('settings references require unique current published evidence with correct type and language',()=>{
 const d=complete(),menu='00000000-0000-4000-8000-000000000001',feature='00000000-0000-4000-8000-000000000002';d.header.mainMenu={recordId:menu};d.header.featuredContent=[{recordId:feature}];
 const evidence=[{recordId:menu,available:true,type:'navigation',locale:'en'},{recordId:feature,available:true,type:'journey',locale:'en'}];
 const check=refs=>validateStoredContent(record(d),[],undefined,undefined,refs);
 assert.deepEqual(check(evidence).findings.map(f=>f.code),[]);assert.equal(check(evidence).contentChecksPass,true);
 for(const refs of [undefined,[],[evidence[0]],evidence.map(v=>({...v,available:false})),evidence.map(v=>({...v,locale:'fr'})),[...evidence,evidence[0]],[{...evidence[0],type:'journey'},evidence[1]],[evidence[0],{...evidence[1],type:'navigation'}]])assert.ok(check(refs).findings.some(f=>f.code==='settings_reference_verification_required'));
 assert.ok(check([...evidence,{recordId:'00000000-0000-4000-8000-000000000003',available:false}]).findings.some(f=>f.code==='settings_evidence_mismatch'));
});
test('shared settings reject administrative, unknown and unverified same-site links',()=>{
 for(const href of ['/cms','/unverified-page','https://safaricrafters.com/studio','#unknown']){
  const d=complete();d.header.cta={label:'Contact',href,newWindow:false};d.cookies.policy={label:'Policy',href,newWindow:false};d.footer.groups=[{id:'links',title:'Links',links:[{id:'one',link:{label:'Link',href,newWindow:false}}]}];
  const findings=validateStoredContent(record(d)).findings.filter(f=>f.code==='settings_url_verification_required');assert.deepEqual(findings.map(f=>f.field),['header.cta.href','footer.groups.0.links.0.link.href','cookies.policy.href']);
 }
 const d=complete();d.header.cta={label:'Contact',href:'/contact#main',newWindow:false};d.cookies.policy={label:'Policy',href:'https://external.example/policy',newWindow:true};assert.equal(validateStoredContent(record(d)).findings.some(f=>f.code==='settings_url_verification_required'),false);
});
test('settings release preparation catches missing main menu, duplicate featured records and blank link text',()=>{
 const d=complete(),feature='00000000-0000-4000-8000-000000000002';d.header.featuredContent=[{recordId:feature},{recordId:feature}];d.header.cta={label:'   ',href:'/contact',newWindow:false};
 const input=structuredClone(d);const findings=validateStoredContent(record(d)).findings;
 assert.ok(findings.some(f=>f.code==='settings_main_menu_required'&&f.field==='header.mainMenu'));
 assert.ok(findings.some(f=>f.code==='settings_duplicate_feature'&&f.field==='header.featuredContent.1.recordId'));
 assert.ok(findings.some(f=>f.code==='settings_link_label_required'&&f.field==='header.cta.label'));assert.deepEqual(d,input);
 d.header.mainMenu={recordId:'00000000-0000-4000-8000-000000000001'};d.header.featuredContent=[{recordId:feature}];d.header.cta.label='Contact';
 const refs=[{recordId:d.header.mainMenu.recordId,available:true,type:'navigation',locale:'en'},{recordId:feature,available:true,type:'journey',locale:'en'}];
 assert.deepEqual(validateStoredContent(record(d),[],undefined,undefined,refs).findings.map(f=>f.code),[]);
});
