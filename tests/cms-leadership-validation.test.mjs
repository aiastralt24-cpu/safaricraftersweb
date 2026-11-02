import test from 'node:test';import assert from 'node:assert/strict';
import {newLeadership} from '../lib/cms/leadership.ts';
import {validateLeadershipContent} from '../lib/cms/leadership-validation.ts';
const id=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const payload={...newLeadership(),slug:'example',summary:'Example',role:'Director',body:[{id:'intro',kind:'paragraph',text:'Example content'}]};
const input={site:id(1),record:id(2),revision:id(3),type:'leadership',path:'/leadership/example',locale:'en',payload};
const evidence={websiteId:id(1),recordId:id(2),revisionId:id(3),media:[],references:[],links:[]};
test('trusted leadership findings require exact saved identity and complete leadership details',()=>{
 assert.equal(validateLeadershipContent(input,evidence).contentChecksPass,true);
 for(const patch of [{site:id(4)},{record:id(4)},{revision:id(4)},{type:'news'},{path:'/leadership/other'},{locale:'fr'}])assert.equal(validateLeadershipContent({...input,...patch},evidence).contentChecksPass,false);
 for(const patch of [{summary:''},{role:''},{body:[]}])assert.equal(validateLeadershipContent({...input,payload:{...payload,...patch}},evidence).contentChecksPass,false);
 assert.equal(validateLeadershipContent(input,null).contentChecksPass,false);
});
test('leadership validation matches media, references and profile links to exact server evidence',()=>{
 const image={assetId:'example',alt:'Example',decorative:false};
 const draft={...payload,image,links:[{label:'Contact',href:'/contact'}],relationships:{...payload.relationships,documents:[{recordId:id(4)}]}};
 const e={...evidence,media:[{assetId:'example',available:true}],links:[{href:'/contact',available:true}],references:[{type:'document',recordId:id(4),available:true,published:true,locale:'en'}]};
 assert.equal(validateLeadershipContent({...input,payload:draft},e).contentChecksPass,true);
 for(const patch of [{media:[]},{media:[...e.media,...e.media]},{media:[{assetId:'example',available:false}]},{links:[]},{links:[{href:'/contact',available:false}]},{references:[]},{references:[{...e.references[0],locale:'fr'}]},{references:[{...e.references[0],published:false}]}])assert.equal(validateLeadershipContent({...input,payload:draft},{...e,...patch}).contentChecksPass,false);

});
