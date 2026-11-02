import test from 'node:test';
import assert from 'node:assert/strict';
import {journalArticleSchema,newJournalArticle,validateJournalArticle} from '../lib/cms/journal.ts';
import {validateStoredContent} from '../lib/cms/content-validation.ts';
import {handleEditorCommand} from '../lib/cms/editor-api.ts';
const site='00000000-0000-4000-8000-000000000001',record='00000000-0000-4000-8000-000000000002',revision='00000000-0000-4000-8000-000000000003';
const photo={assetId:'forest',alt:'Forest canopy',decorative:false};
const request=body=>new Request('https://site.test/api/cms/content',{method:'POST',headers:{Authorization:'Bearer a.b.c','Content-Type':'application/json'},body:JSON.stringify(body)});
test('journal drafts preserve structured editorial content, media, SEO and editable CTA without automatic dates',()=>{
 const value=newJournalArticle();assert.equal(value.date,'');
 value.body=[{id:'intro',kind:'paragraph',text:'Forest mornings.'},{id:'heading',kind:'heading',level:'h2',text:'Field notes'},{id:'list',kind:'list',ordered:false,items:['Listen','Look']},{id:'quote',kind:'quote',text:'Take your time.',attribution:'Guide'},{id:'link',kind:'link',label:'Plan your visit',href:'/plan'},{id:'photo',kind:'image',image:photo}];
 value.image=photo;value.heroImage=photo;value.gallery=[photo];value.seo.socialImage=photo;value.sources=[{title:'Reference',url:'https://example.test/research',publisher:'Research team',accessedAt:'2026-10-22'}];
 assert.deepEqual(journalArticleSchema.parse(value),value);
 assert.equal(validateStoredContent({type:'journalArticle',path:'/journal/new-article',payload:value}).validatorVersion,'journal-1');
});
test('journal contract rejects unsupported legacy data, duplicate block IDs, unsafe URLs, dates and missing alt text',()=>{
 const value=newJournalArticle();
 for(const patch of [{body:['Legacy paragraph']},{body:[{id:'one',kind:'paragraph',text:'a'},{id:'one',kind:'paragraph',text:'b'}]},{date:'2026-02-30'},{slug:'../escape'},{image:{src:'/legacy.jpg',alt:'Forest'}},{image:{assetId:'forest',alt:'',decorative:false}},{video:{assetId:'video'}},{body:[{id:'one',kind:'html',html:'<script/>'}]},{body:[{id:'one',kind:'heading',level:'h1',text:'Duplicate title'}]},{body:[{id:'one',kind:'link',label:'Unsafe',href:'javascript:alert(1)'}]},{cta:{...value.cta,button:{label:'Unsafe',href:'https://user:pass@example.test'}}}])assert.equal(journalArticleSchema.safeParse({...value,...patch}).success,false,JSON.stringify(patch));
});
test('journal readiness checks all image locations and requires complete content and verified images',()=>{
 const value={...newJournalArticle(),author:'Guide',date:'2026-10-22',category:'Wildlife',description:'Forest notes',image:photo,heroImage:{...photo,assetId:'hero'},gallery:[{...photo,assetId:'gallery'}],body:[{id:'p',kind:'paragraph',text:'Field notes'},{id:'image',kind:'image',image:{...photo,assetId:'inline'}}],seo:{...newJournalArticle().seo,socialImage:{...photo,assetId:'social'}}};
 const record={path:'/journal/new-article',payload:value};
 const missing=validateJournalArticle(record);assert.deepEqual(missing.findings.filter(f=>f.code==='asset_verification_required').map(f=>f.field),['image.assetId','heroImage.assetId','gallery.0.assetId','body.1.image.assetId','seo.socialImage.assetId']);
 const ready=validateJournalArticle(record,['forest','hero','gallery','inline','social'].map(assetId=>({assetId,available:true})));
 assert.equal(ready.contentChecksPass,true);assert.deepEqual(ready.findings,[]);
 assert.ok(validateJournalArticle({...record,locale:'fr'}).findings.some(f=>f.code==='journal_locale_not_ready'));
 assert.ok(validateJournalArticle({...record,path:'/journal/wrong'}).findings.some(f=>f.code==='path_mismatch'));
 const blank=validateJournalArticle({path:'/journal/new-article',payload:{...newJournalArticle(),body:[{id:'blank',kind:'paragraph',text:'   '}]}});assert.ok(blank.findings.some(f=>f.code==='article_body_required'));
});
test('journal save rejects invalid payload or mismatched title and route before any database call',async()=>{
 const payload=newJournalArticle(),body={action:'save',site,record:null,expectedRevision:null,type:'journalArticle',path:'/journal/new-article',title:payload.title,payload};
 let forwarded;assert.equal((await handleEditorCommand(request(body),async(...args)=>{forwarded=args;return {};})).status,200);assert.equal(forwarded[0],'a.b.c');assert.equal(forwarded[1],'save_draft');assert.deepEqual(forwarded[2].p_payload,payload);
 for(const patch of [{title:'Different'},{path:'/journeys/new-article'},{payload:{title:'Incomplete legacy data'}},{expectedRevision:revision}]){let calls=0;assert.equal((await handleEditorCommand(request({...body,...patch}),async()=>{calls++;})).status,422);assert.equal(calls,0);}
});
test('journal advisory validation uses stored revision and caller-scoped media evidence',async()=>{
 const calls=[];const response=await handleEditorCommand(request({action:'validate',site,record,revision}),async(token,name,args)=>{calls.push({token,name,args});if(name==='get_editor_record')return {id:record,currentRevision:revision,type:'journalArticle',path:'/journal/new-article',payload:{...newJournalArticle(),image:photo}};if(name==='get_record_media_status')return [{assetId:'forest',available:false}];throw Error('Unexpected call');});
 assert.equal(response.status,200);const result=(await response.json()).result;assert.equal(result.publicationAuthorized,false);assert.equal(result.contentChecksPass,false);assert.ok(result.findings.some(f=>f.field==='image.assetId'));assert.deepEqual(calls[1],{token:'a.b.c',name:'get_record_media_status',args:{p_site:site,p_record:record,p_revision:revision}});
});

test('journal paragraphs preserve approved marks and exact fallback text within article limits',()=>{
 const article=newJournalArticle();article.body=[{id:'p',kind:'paragraph',text:'Field notes',spans:[{text:'Field ',bold:true},{text:'notes',italic:true,script:'superscript',href:'/contact'}]}];
 assert.deepEqual(journalArticleSchema.parse(JSON.parse(JSON.stringify(article))),article);
 for(const patch of [{text:'Mismatch'},{text:'x'.repeat(10001),spans:[{text:'x'.repeat(10001)}]},{spans:[]},{spans:[{text:'Field notes',href:'javascript:alert(1)'}]},{spans:[{text:'Field notes',html:'<b>notes</b>'}]}])assert.equal(journalArticleSchema.safeParse({...article,body:[{...article.body[0],...patch}]}).success,false);
});

test('journal tables share the bounded rectangular schema and keep stable article block IDs',()=>{
 const article=newJournalArticle();article.body=[{id:'t',kind:'table',caption:'Routes',headers:['Route','Days'],rows:[['Forest','3']]}];
 assert.deepEqual(journalArticleSchema.parse(JSON.parse(JSON.stringify(article))),article);
 assert.equal(journalArticleSchema.safeParse({...article,body:[...article.body,...article.body]}).success,false);
 assert.equal(journalArticleSchema.safeParse({...article,body:[{...article.body[0],rows:[['short']]}]}).success,false);
});
