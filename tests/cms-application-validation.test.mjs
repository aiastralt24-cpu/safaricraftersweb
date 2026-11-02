import test from 'node:test';import assert from 'node:assert/strict';
import {newApplication} from '../lib/cms/applications.ts';
import {validateApplicationContent} from '../lib/cms/application-validation.ts';
const id=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const payload={...newApplication(),slug:'example',summary:'Example',body:[{id:'intro',kind:'paragraph',text:'Example content'}]};
const input={site:id(1),record:id(2),revision:id(3),type:'application',path:'/applications/example',locale:'en',payload};
const evidence={websiteId:id(1),recordId:id(2),revisionId:id(3),claims:[],media:[],references:[],links:[]};
test('trusted application findings require exact saved identity and complete application details',()=>{
 assert.equal(validateApplicationContent(input,evidence).contentChecksPass,true);
 for(const patch of [{site:id(4)},{record:id(4)},{revision:id(4)},{type:'news'},{path:'/applications/other'},{locale:'fr'}])assert.equal(validateApplicationContent({...input,...patch},evidence).contentChecksPass,false);
 for(const patch of [{summary:''},{body:[]}])assert.equal(validateApplicationContent({...input,payload:{...payload,...patch}},evidence).contentChecksPass,false);
 assert.equal(validateApplicationContent(input,null).contentChecksPass,false);
});
test('application validation matches media, references and profile links to exact server evidence',()=>{
 const image={assetId:'example',alt:'Example',decorative:false};
 const draft={...payload,image,body:[...payload.body,{id:'link',kind:'link',label:'Contact',href:'/contact'}],relationships:{...payload.relationships,documents:[{recordId:id(4)}]}};
 const e={...evidence,media:[{assetId:'example',available:true}],links:[{href:'/contact',available:true}],references:[{type:'document',recordId:id(4),available:true,published:true,locale:'en'}]};
 assert.equal(validateApplicationContent({...input,payload:draft},e).contentChecksPass,true);
 for(const patch of [{media:[]},{media:[...e.media,...e.media]},{media:[{assetId:'example',available:false}]},{links:[]},{links:[{href:'/contact',available:false}]},{references:[]},{references:[{...e.references[0],locale:'fr'}]},{references:[{...e.references[0],published:false}]}])assert.equal(validateApplicationContent({...input,payload:draft},{...e,...patch}).contentChecksPass,false);

});

test('application claim evidence requires a single current approval for every claim and blocks unfinished product delivery',()=>{
 const claim={id:id(8),statement:'Claim',evidence:[{recordId:id(9)}],approvalContact:'Reviewer',reviewOn:'2099-01-01'};
 const draft={...payload,claims:[claim]},e={...evidence,claims:[{claimId:claim.id,approved:true}]};
 assert.equal(validateApplicationContent({...input,payload:draft},e).contentChecksPass,true);
 for(const claims of [[],[{claimId:claim.id,approved:false}],[...e.claims,...e.claims],[{claimId:id(7),approved:true}]])assert.equal(validateApplicationContent({...input,payload:draft},{...e,claims}).contentChecksPass,false);
 const product={...payload,relationships:{...payload.relationships,products:[{recordId:id(6)}]}};
 assert.equal(validateApplicationContent({...input,payload:product},{...evidence,references:[{recordId:id(6),type:'product',available:true,published:true,locale:'en'}]}).contentChecksPass,false);
 const industry={...payload,kind:'industry'};assert.equal(validateApplicationContent({...input,payload:industry,path:'/industries/example'},evidence).contentChecksPass,true);assert.equal(validateApplicationContent({...input,payload:industry},evidence).contentChecksPass,false);
});
