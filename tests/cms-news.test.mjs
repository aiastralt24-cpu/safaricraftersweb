import test from 'node:test';import assert from 'node:assert/strict';
import {newsSchema,newNews,newsPath,newsSaveCommand} from '../lib/cms/news.ts';
import {validateNewsContent} from '../lib/cms/news-validation.ts';
const site='11111111-1111-4111-8111-111111111111',record='22222222-2222-4222-8222-222222222222',revision='33333333-3333-4333-8333-333333333333';
const payload={...newNews(),title:'Synthetic announcement',slug:'synthetic-announcement',summary:'An example summary.',author:'Example author',date:'2026-10-29',topic:'Announcements',body:[{id:'intro',kind:'paragraph',text:'An example announcement.'}]};
const input={site,record,revision,type:'news',path:newsPath(payload.slug),locale:'en',payload};
const evidence={websiteId:site,recordId:record,revisionId:revision,references:[],media:[],links:[]};
test('news and press releases have strict independent drafts and recoverable save identities',()=>{
 for(const kind of ['news','pressRelease'])assert.equal(newsSchema.parse(newNews(kind)).kind,kind);
 for(const patch of [{kind:'article'},{slug:'../escape'},{title:' '},{date:'2026-02-30'},{unexpected:true},{body:[...payload.body,...payload.body]}])assert.equal(newsSchema.safeParse({...payload,...patch}).success,false);
 assert.equal(newsSaveCommand.safeParse({action:'save',site,record:null,expectedRevision:null,requestKey:revision,payload}).success,true);
 assert.equal(newsSaveCommand.safeParse({action:'save',site,record:null,expectedRevision:null,payload}).success,false);
 assert.equal(newsSaveCommand.safeParse({action:'save',site,record,expectedRevision:revision,payload}).success,true);
 assert.equal(newsSaveCommand.safeParse({action:'save',site,record,expectedRevision:revision,requestKey:site,payload}).success,false);
});
test('news readiness requires substantive content and press release datelines',()=>{
 assert.equal(validateNewsContent(input,evidence).contentChecksPass,true);
 for(const patch of [{summary:''},{author:''},{date:''},{topic:''},{body:[{id:'heading',kind:'heading',level:'h2',text:'Heading only'}]},{kind:'pressRelease',dateline:''}])assert.equal(validateNewsContent({...input,payload:{...payload,...patch}},evidence).contentChecksPass,false);
 assert.equal(validateNewsContent({...input,payload:{...payload,kind:'pressRelease',dateline:'Example city'}},evidence).contentChecksPass,true);
 for(const patch of [{type:'journalArticle'},{path:'/journal/synthetic-announcement'},{locale:'fr'}])assert.equal(validateNewsContent({...input,...patch},evidence).contentChecksPass,false);
 for(const patch of [{websiteId:record},{recordId:site},{revisionId:site}])assert.equal(validateNewsContent(input,{...evidence,...patch}).contentChecksPass,false);
});
test('news checks all selected media and exact current related-record and internal-link evidence',()=>{
 const image={assetId:'sample-image',alt:'Example',decorative:false};
 const draft={...payload,image,heroImage:image,body:[...payload.body,{id:'photo',kind:'image',image},{id:'link',kind:'link',label:'Related',href:'/example'}],relationships:{...payload.relationships,articles:[{recordId:site}]}};
 const e={...evidence,media:[{assetId:'sample-image',available:true}],links:[{href:'/example',available:true}],references:[{type:'journalArticle',recordId:site,available:true,published:true,locale:'en'}]};
 assert.equal(validateNewsContent({...input,payload:draft},e).contentChecksPass,true);
 for(const patch of [{media:[]},{media:[...e.media,...e.media]},{media:[{...e.media[0],available:false}]},{links:[]},{references:[]},{references:[{...e.references[0],locale:'fr'}]},{references:[{...e.references[0],published:false}]},{references:[...e.references,...e.references]}])assert.equal(validateNewsContent({...input,payload:draft},{...e,...patch}).contentChecksPass,false);
});
