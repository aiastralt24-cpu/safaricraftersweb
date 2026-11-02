import test from 'node:test';import assert from 'node:assert/strict';
import {newPartner} from '../lib/cms/partners.ts';
import {validatePartnerContent} from '../lib/cms/partner-validation.ts';
const id=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const payload={...newPartner(),slug:'example',summary:'Example',services:['Repairs'],coverage:[{countryCode:'IN',regions:[]}],contact:{email:'support@example.com',phone:'',website:''},body:[{id:'intro',kind:'paragraph',text:'Example content'}]};
const input={site:id(1),record:id(2),revision:id(3),type:'partner',path:'/partners/example',locale:'en',payload};
const evidence={websiteId:id(1),recordId:id(2),revisionId:id(3),media:[],references:[],links:[]};
test('trusted partner findings require exact saved identity and complete partner details',()=>{
 assert.equal(validatePartnerContent(input,evidence).contentChecksPass,true);
 for(const patch of [{site:id(4)},{record:id(4)},{revision:id(4)},{type:'news'},{path:'/partners/other'},{locale:'fr'}])assert.equal(validatePartnerContent({...input,...patch},evidence).contentChecksPass,false);
 for(const patch of [{summary:''},{services:[]},{coverage:[]},{contact:{email:'',phone:'',website:''}},{status:'inactive'}])assert.equal(validatePartnerContent({...input,payload:{...payload,...patch}},evidence).contentChecksPass,false);
 assert.equal(validatePartnerContent(input,null).contentChecksPass,false);
});
test('partner validation matches media, references and profile links to exact server evidence',()=>{
 const image={assetId:'example',alt:'Example',decorative:false};
 const draft={...payload,image,body:[...payload.body,{id:'link',kind:'link',label:'Contact',href:'/contact'}],relationships:{...payload.relationships,documents:[{recordId:id(4)}]}};
 const e={...evidence,media:[{assetId:'example',available:true}],links:[{href:'/contact',available:true}],references:[{type:'document',recordId:id(4),available:true,published:true,locale:'en'}]};
 assert.equal(validatePartnerContent({...input,payload:draft},e).contentChecksPass,true);
 for(const patch of [{media:[]},{media:[...e.media,...e.media]},{media:[{assetId:'example',available:false}]},{links:[]},{links:[{href:'/contact',available:false}]},{references:[]},{references:[{...e.references[0],locale:'fr'}]},{references:[{...e.references[0],published:false}]}])assert.equal(validatePartnerContent({...input,payload:draft},{...e,...patch}).contentChecksPass,false);

});


test('partner validation blocks unsupported products and detects duplicate or unexpected reference/link evidence',()=>{
 const product={...payload,relationships:{...payload.relationships,products:[{recordId:id(6)}]}};
 assert.equal(validatePartnerContent({...input,payload:product},{...evidence,references:[{recordId:id(6),type:'product',available:true,published:true,locale:'en'}]}).contentChecksPass,false);
 const draft={...payload,relationships:{...payload.relationships,applications:[{recordId:id(7)}]},body:[{id:'link',kind:'link',label:'Contact',href:'/contact'}]};
 const e={...evidence,references:[{recordId:id(7),type:'application',available:true,published:true,locale:'en'}],links:[{href:'/contact',available:true}]};
 assert.equal(validatePartnerContent({...input,payload:draft},e).contentChecksPass,true);
 for(const patch of [{references:[...e.references,...e.references]},{references:[{...e.references[0],recordId:id(8)}]},{references:[{...e.references[0],available:false}]},{links:[...e.links,...e.links]},{links:[{href:'/different',available:true}]}])assert.equal(validatePartnerContent({...input,payload:draft},{...e,...patch}).contentChecksPass,false);
});

test('partner certification links require current publication eligibility',()=>{const draft={...payload,relationships:{...payload.relationships,certifications:[{recordId:id(8)}]}};const refs=[{recordId:id(8),type:'certification',available:true,published:true,locale:'en'}];assert.equal(validatePartnerContent({...input,payload:draft},{...evidence,references:refs}).contentChecksPass,true);assert.equal(validatePartnerContent({...input,payload:draft},{...evidence,references:[{...refs[0],published:false}]}).contentChecksPass,false);});
