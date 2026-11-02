import test from 'node:test';
import assert from 'node:assert/strict';
import {formSchema,validateFormSubmission} from '../lib/cms/forms.ts';
import {handleEditorCommand} from '../lib/cms/editor-api.ts';
const field=(id,type,extra={})=>({id,type,label:id,help:'',required:false,validationMessage:'',...extra});
const definition=()=>({schemaVersion:1,title:'Enquiry',submitLabel:'Send enquiry',successMessage:'Thank you',notificationRouteIds:[],fields:[field('name','name',{required:true,maxLength:100}),field('email','email',{required:true}),field('interest','select',{options:[{id:'safari',label:'Safari'},{id:'other',label:'Other'}]}),field('details','message',{required:true,maxLength:200,showWhen:{fieldId:'interest',optionId:'other'}}),field('privacy','consent',{required:true,purpose:'enquiry',text:'Use this enquiry to respond.',textVersion:'privacy-1'}),field('marketing','consent',{purpose:'marketing',text:'Send optional news.',textVersion:'news-2'})]});
const answers={name:' Ada ',email:'ada@example.test',interest:'safari',privacy:true};
test('valid enquiry preserves separate consent purposes and exact consent versions',()=>{
 const form=definition(),result=validateFormSubmission(form,answers);assert.equal(result.valid,true);assert.equal(result.values.name,'Ada');assert.equal(result.values.marketing,false);assert.equal(result.consents[0].textVersion,'privacy-1');assert.equal(result.consents[1].accepted,false);assert.equal(result.consents[1].purpose,'marketing');assert.equal(form.fields[0].label,'name');
});
test('conditions reject forward references and hidden values; visible required questions are enforced',()=>{
 const form=definition();assert.ok(formSchema.safeParse(form).success);
 assert.equal(validateFormSubmission(form,{...answers,details:'Unexpected hidden value'}).valid,false);
 assert.equal(validateFormSubmission(form,{...answers,interest:'other'}).valid,false);
 assert.equal(validateFormSubmission(form,{...answers,interest:'other',details:'Tell me more'}).valid,true);
 form.fields[2].showWhen={fieldId:'details',optionId:'other'};assert.equal(formSchema.safeParse(form).success,false);
});
test('field configuration prevents duplicate identities, mandatory marketing and unsafe redirects',()=>{
 const form=definition();form.fields.push({...form.fields[0]});assert.equal(formSchema.safeParse(form).success,false);
 const marketing=definition();marketing.fields.at(-1).required=true;assert.equal(formSchema.safeParse(marketing).success,false);
 for(const redirectPath of ['//evil.test','/a//b','https://other.test','javascript:alert(1)'])assert.equal(formSchema.safeParse({...definition(),redirectPath}).success,false);
});
test('submission rejects unknown fields, malformed answers, oversized text, options and forged consent',()=>{
 const form=definition();for(const patch of [{admin:true},{name:''},{name:'x'.repeat(101)},{email:'invalid'},{interest:'forged'},{privacy:'true'},{privacy:false},{marketing:'yes'}])assert.equal(validateFormSubmission(form,{...answers,...patch}).valid,false);
 const choice={...definition(),fields:[field('choices','multiselect',{required:true,options:[{id:'one',label:'One'}]})]};
 for(const value of ['one',['one','one'],['forged'],[]])assert.equal(validateFormSubmission(choice,{choices:value}).valid,false);
 assert.equal(validateFormSubmission(choice,{choices:['one']}).valid,true);
});
test('file answers require independently authorized inspected file evidence',()=>{
 const form={...definition(),fields:[field('attachment','file',{required:true,maxBytes:1000,mimeTypes:['application/pdf']})]};
 assert.equal(validateFormSubmission(form,{attachment:'upload-1'}).valid,false);
 const file={uploadId:'upload-1',mimeType:'application/pdf',byteSize:900,available:true};
 assert.equal(validateFormSubmission(form,{attachment:'upload-1'},[file]).valid,true);
 for(const patch of [{available:false},{byteSize:1001},{mimeType:'image/svg+xml'},{uploadId:'other'},{byteSize:NaN}])assert.equal(validateFormSubmission(form,{attachment:'upload-1'},[{...file,...patch}]).valid,false);
});
test('form save validates definitions before persistence and retains null route',async()=>{
 const site='00000000-0000-4000-8000-000000000001';const body={action:'save',site,record:null,expectedRevision:null,type:'form',path:null,title:'Enquiry',payload:definition()};
 const request=value=>new Request('https://site.test/api/cms/content',{method:'POST',headers:{Authorization:'Bearer a.b.c','Content-Type':'application/json'},body:JSON.stringify(value)});
 assert.equal((await handleEditorCommand(request(body),async()=>({recordId:site}))).status,200);
 for(const patch of [{path:'/form'},{payload:{schemaVersion:1}},{payload:{...definition(),script:'injected'}}])assert.equal((await handleEditorCommand(request({...body,...patch}),async()=>assert.fail('unexpected write'))).status,422);
});

test('optional placeholders preserve existing forms and never become submitted answers',()=>{
 const legacy=definition();assert.deepEqual(formSchema.parse(legacy),legacy);
 for(const type of ['name','organization','city','state','pincode','message','text','email','phone']){
  const f=field('answer',type,{required:true,placeholder:'e.g. A journey in March',...(!['email','phone'].includes(type)?{maxLength:200}:{})});
  const form={...legacy,fields:[f]};assert.equal(formSchema.parse(form).fields[0].placeholder,f.placeholder);
  const empty=validateFormSubmission(form,{});assert.equal(empty.valid,false);assert.equal(Object.hasOwn(empty.values,'answer'),false);
 }
});
test('placeholder contract rejects oversized/control text and unsupported field types',()=>{
 for(const placeholder of ['x'.repeat(501),'one\ntwo','bad\u0000text']){const value=definition();value.fields[0].placeholder=placeholder;assert.equal(formSchema.safeParse(value).success,false);}
 for(const index of [2,4]){const value=definition();value.fields[index].placeholder='Not a selectable value';assert.equal(formSchema.safeParse(value).success,false);}
 const value=definition();value.fields[0].placeholder='  Exact example & punctuation  ';assert.equal(formSchema.parse(value).fields[0].placeholder,'  Exact example & punctuation  ');
});
test('default choices use stable option IDs, cannot preselect consent, and never replace omitted required answers on intake',()=>{
 const value=definition();value.fields[2].defaultOptionId='safari';value.fields[2].required=true;
 assert.equal(formSchema.parse(value).fields[2].defaultOptionId,'safari');
 assert.equal(validateFormSubmission(value,{name:'Guest',email:'guest@example.com',privacy:true}).valid,false);
 value.fields[2].options[0].label='Renamed safari';assert.equal(formSchema.safeParse(value).success,true);
 value.fields[2].options.shift();assert.equal(formSchema.safeParse(value).success,false);
 for(const index of [0,4,5]){const form=definition();form.fields[index].defaultOptionId='safari';assert.equal(formSchema.safeParse(form).success,false);}
 const multi={...definition(),fields:[field('multi','multiselect',{options:[{id:'one',label:'One'}],defaultOptionId:'one'})]};assert.equal(formSchema.safeParse(multi).success,false);
});
test('optional success headings preserve legacy definitions and reject invisible or oversized headings',()=>{
 const form=definition();assert.equal(Object.hasOwn(formSchema.parse(form),'successHeading'),false);
 for(const successHeading of ['', '  ','x'.repeat(201)])assert.equal(formSchema.safeParse({...form,successHeading}).success,false);
 assert.equal(formSchema.parse({...form,successHeading:'Your brief is received.'}).successHeading,'Your brief is received.');
});
test('email and phone limits validate server-side while absent limits retain previous form behavior',()=>{
 const form={...definition(),fields:[field('email','email',{required:true,maxLength:254}),field('phone','phone',{required:true,maxLength:60,maxDigits:15})]};
 const email='a'.repeat(242)+'@example.com';assert.equal(email.length,254);
 assert.equal(validateFormSubmission(form,{email,phone:'+123456789012345'}).valid,true);
 assert.equal(validateFormSubmission(form,{email:'a'+email,phone:'+123456789012345'}).valid,false);
 assert.equal(validateFormSubmission(form,{email,phone:'+1234567890123456'}).valid,false);
 assert.equal(validateFormSubmission(form,{email,phone:'1234567'+'.'.repeat(54)}).valid,false);
 assert.equal(validateFormSubmission(form,{email,phone:'1234567'+'.'.repeat(53)}).valid,true);
 delete form.fields[0].maxLength;delete form.fields[1].maxLength;delete form.fields[1].maxDigits;
 assert.equal(validateFormSubmission(form,{email:'a'+email,phone:'+1234567890123456'}).valid,true);
 for(const [index,key,value]of [[0,'maxLength',321],[0,'maxLength',2],[1,'maxLength',81],[1,'maxDigits',6],[1,'maxDigits',15.5]]){const invalid=structuredClone(form);invalid.fields[index][key]=value;assert.equal(formSchema.safeParse(invalid).success,false);}
});
