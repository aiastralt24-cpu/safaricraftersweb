import test from 'node:test';import assert from 'node:assert/strict';
import {newLocation} from '../lib/cms/locations.ts';
import {validateLocationContent} from '../lib/cms/location-validation.ts';
const id=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const payload={...newLocation(),slug:'example',summary:'Example',address:{lines:['Example office'],locality:'Example city',region:'',postalCode:'',countryCode:'IN'},visiting:'noPublicAccess',body:[{id:'intro',kind:'paragraph',text:'Example content'}]};
const input={site:id(1),record:id(2),revision:id(3),type:'location',path:'/locations/example',locale:'en',payload};
const evidence={websiteId:id(1),recordId:id(2),revisionId:id(3),media:[],references:[],links:[]};
test('trusted location findings require exact saved identity and complete location details',()=>{
 assert.equal(validateLocationContent(input,evidence).contentChecksPass,true);
 for(const patch of [{site:id(4)},{record:id(4)},{revision:id(4)},{type:'news'},{path:'/locations/other'},{locale:'fr'}])assert.equal(validateLocationContent({...input,...patch},evidence).contentChecksPass,false);
 for(const patch of [{summary:''},{address:{...payload.address,lines:[]}},{visiting:'unspecified'},{visiting:'appointmentOnly'},{hours:[{day:1,intervals:[]}]}])assert.equal(validateLocationContent({...input,payload:{...payload,...patch}},evidence).contentChecksPass,false);
 assert.equal(validateLocationContent(input,null).contentChecksPass,false);
});
test('location validation matches media, references and profile links to exact server evidence',()=>{
 const image={assetId:'example',alt:'Example',decorative:false};
 const draft={...payload,image,body:[...payload.body,{id:'link',kind:'link',label:'Contact',href:'/contact'}],relationships:{...payload.relationships,documents:[{recordId:id(4)}]}};
 const e={...evidence,media:[{assetId:'example',available:true}],links:[{href:'/contact',available:true}],references:[{type:'document',recordId:id(4),available:true,published:true,locale:'en'}]};
 assert.equal(validateLocationContent({...input,payload:draft},e).contentChecksPass,true);
 for(const patch of [{media:[]},{media:[...e.media,...e.media]},{media:[{assetId:'example',available:false}]},{links:[]},{links:[{href:'/contact',available:false}]},{references:[]},{references:[{...e.references[0],locale:'fr'}]},{references:[{...e.references[0],published:false}]}])assert.equal(validateLocationContent({...input,payload:draft},{...e,...patch}).contentChecksPass,false);

});


test('location validation blocks unsupported products and detects duplicate or unexpected reference/link evidence',()=>{
 const product={...payload,relationships:{...payload.relationships,products:[{recordId:id(6)}]}};
 assert.equal(validateLocationContent({...input,payload:product},{...evidence,references:[{recordId:id(6),type:'product',available:true,published:true,locale:'en'}]}).contentChecksPass,false);
 const draft={...payload,relationships:{...payload.relationships,applications:[{recordId:id(7)}]},body:[{id:'link',kind:'link',label:'Contact',href:'/contact'}]};
 const e={...evidence,references:[{recordId:id(7),type:'application',available:true,published:true,locale:'en'}],links:[{href:'/contact',available:true}]};
 assert.equal(validateLocationContent({...input,payload:draft},e).contentChecksPass,true);
 for(const patch of [{references:[...e.references,...e.references]},{references:[{...e.references[0],recordId:id(8)}]},{references:[{...e.references[0],available:false}]},{links:[...e.links,...e.links]},{links:[{href:'/different',available:true}]}])assert.equal(validateLocationContent({...input,payload:draft},{...e,...patch}).contentChecksPass,false);
});
