import test from 'node:test';import assert from 'node:assert/strict';
import {newProject} from '../lib/cms/projects.ts';import {validateProjectContent} from '../lib/cms/project-validation.ts';import {evaluateValidationInput,runTrustedValidation} from '../lib/cms/validation-worker.ts';
const id=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`,site=id(1),record=id(2),revision=id(3),claim=id(4),related=id(5);
const payload={...newProject(),summary:'Summary',body:[{kind:'paragraph',text:'Substantive overview'}],image:{assetId:'project-image',alt:'Project photograph',decorative:false}};
const input={site,record,revision,type:'project',path:'/projects/new-case-study',locale:'en',payload},evidence={websiteId:site,recordId:record,revisionId:revision,claims:[],references:[],media:[{assetId:'project-image',available:true}],links:[]};
test('project validation checks content, immutable evidence identity and exact dependencies',()=>{
 assert.equal(validateProjectContent(input,evidence).contentChecksPass,true);
 for(const patch of [{locale:'fr'},{path:'/wrong'},{payload:{...payload,summary:' '}},{payload:{...payload,body:[{kind:'paragraph',text:' '}]}},{payload:{...payload,image:undefined}},{payload:{...payload,extra:true}}])assert.equal(validateProjectContent({...input,...patch},evidence).contentChecksPass,false);
 for(const patch of [{revisionId:id(9)},{media:[]},{media:[...evidence.media,...evidence.media]},{media:[{assetId:'project-image',available:false}]},{references:[{type:'project',recordId:related,available:true,published:true,locale:'en'}]}])assert.equal(validateProjectContent(input,{...evidence,...patch}).contentChecksPass,false);
 assert.equal(validateProjectContent(input,null).contentChecksPass,false);
});
test('claim approvals, related publication and local link availability are all required',()=>{
 const p={...payload,claims:[{id:claim,statement:'Claim',evidence:[{recordId:related}],approvalContact:'',reviewOn:'2099-01-01'}],relationships:{...payload.relationships,projects:[{recordId:related}]},body:[{kind:'paragraph',text:'Overview'},{kind:'link',label:'Contact',href:'/contact'}]},e={...evidence,claims:[{claimId:claim,approved:true}],references:[{type:'project',recordId:related,available:true,published:true,locale:'en'}],links:[{href:'/contact',available:true}]};
 assert.equal(validateProjectContent({...input,payload:p},e).contentChecksPass,true);
 for(const patch of [{claims:[]},{claims:[{claimId:claim,approved:false}]},{references:[{...e.references[0],published:false}]},{references:[{...e.references[0],locale:'fr'}]},{links:[{href:'/contact',available:false}]}])assert.equal(validateProjectContent({...input,payload:p},{...e,...patch}).contentChecksPass,false);
});
test('trusted project workers use server evidence and record only project-version receipts',async()=>{
 const trusted={...input,projectEvidence:evidence};assert.equal(evaluateValidationInput(trusted).contentChecksPass,true);let receipt;
 const result=await runTrustedValidation(async(name,args)=>{if(name==='get_validation_input')return trusted;receipt=args;}, {site,record,revision});assert.equal(result.validatorVersion,'project-1');assert.equal(receipt.p_valid,true);assert.equal(receipt.p_revision,revision);
 assert.equal(evaluateValidationInput({...trusted,projectEvidence:null}).contentChecksPass,false);
});

test('product relationships remain in drafts until public product delivery is connected',()=>{const result=validateProjectContent({...input,payload:{...payload,relationships:{...payload.relationships,products:[{recordId:related}]}}},{...evidence,references:[{type:'product',recordId:related,available:true,published:true,locale:'en'}]});assert.equal(result.contentChecksPass,false);assert.ok(result.findings.some(f=>f.code==='project_product_delivery_not_ready'));});
