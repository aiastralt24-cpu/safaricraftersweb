import test from 'node:test';import assert from 'node:assert/strict';
import {newEvent} from '../lib/cms/events.ts';
import {validateEventContent} from '../lib/cms/event-validation.ts';
const id=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const payload={...newEvent(),slug:'example',summary:'Example',category:'Workshop',organizer:'Example team',attendance:'online',onlineUrl:'https://example.test/event',timing:{mode:'allDay',start:'2026-12-01',end:'2026-12-01'},body:[{id:'intro',kind:'paragraph',text:'Example content'}]};
const input={site:id(1),record:id(2),revision:id(3),type:'event',path:'/events/example',locale:'en',payload};
const evidence={websiteId:id(1),recordId:id(2),revisionId:id(3),media:[],references:[],links:[]};
test('trusted event findings require exact saved identity and complete event details',()=>{
 assert.equal(validateEventContent(input,evidence).contentChecksPass,true);
 for(const patch of [{site:id(4)},{record:id(4)},{revision:id(4)},{type:'news'},{path:'/events/other'},{locale:'fr'}])assert.equal(validateEventContent({...input,...patch},evidence).contentChecksPass,false);
 for(const patch of [{summary:''},{onlineUrl:''},{timing:{mode:'allDay',start:'',end:''}},{status:'cancelled',statusNote:''}])assert.equal(validateEventContent({...input,payload:{...payload,...patch}},evidence).contentChecksPass,false);
 assert.equal(validateEventContent(input,null).contentChecksPass,false);
});
test('event validation matches media, references and registration links to exact server evidence',()=>{
 const image={assetId:'example',alt:'Example',decorative:false};
 const draft={...payload,image,heroImage:image,registration:{enabled:true,label:'Register',href:'/contact'},relationships:{...payload.relationships,documents:[{recordId:id(4)}]}};
 const e={...evidence,media:[{assetId:'example',available:true}],links:[{href:'/contact',available:true}],references:[{type:'document',recordId:id(4),available:true,published:true,locale:'en'}]};
 assert.equal(validateEventContent({...input,payload:draft},e).contentChecksPass,true);
 for(const patch of [{media:[]},{media:[...e.media,...e.media]},{media:[{assetId:'example',available:false}]},{links:[]},{links:[{href:'/contact',available:false}]},{references:[]},{references:[{...e.references[0],locale:'fr'}]},{references:[{...e.references[0],published:false}]}])assert.equal(validateEventContent({...input,payload:draft},{...e,...patch}).contentChecksPass,false);
 const cancelled={...draft,status:'cancelled',statusNote:'Cancelled example'};assert.equal(validateEventContent({...input,payload:cancelled},e).contentChecksPass,false);
});
