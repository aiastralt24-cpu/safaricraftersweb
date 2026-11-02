import inventory from '../../docs/cms/contact-migration-inventory.json' with {type:'json'};
import {planContactMigration} from './contact-migration.ts';
import {formSchema,type FormField} from './forms.ts';
const successHeading='Your brief has been received.';
const successBody='A Safari Crafters specialist will review it and respond with considered next steps.';
/** Pure proposals, never saved or published. Source proof covers the shared form,
 * page, intake and metadata dependencies before any mapping is constructed. */
export function planContactFormMigration(currentHashes:unknown){
 const source=planContactMigration(currentHashes);
 const component=inventory.sources.find(item=>item.sourcePath==='components/ContactForm.tsx');
 if(!component)throw Error('Shared form source is missing.');
 const forms=inventory.routes.map(route=>{
  const variant=route.path==='/contact'?'contact':'corporate';
  const optionMappings:{fieldId:string;options:{id:string;legacyValue:string}[]}[]=[];
  const fields:FormField[]=route.form.fields.map(field=>{
   const base={id:field.name,label:field.label||'Enquiry consent',help:field.help??'',required:field.required,validationMessage:'',...(field.placeholder!==null?{placeholder:field.placeholder}:{})};
   if(field.name==='consent')return {...base,type:'consent',purpose:'enquiry',text:field.consentText!,textVersion:`contact-${component.sha256.slice(0,16)}`};
   if(field.options){
    const options=field.options.map((option,index)=>({id:`${field.name}-${index+1}`,label:option.label}));
    optionMappings.push({fieldId:field.name,options:field.options.map((option,index)=>({id:options[index].id,legacyValue:option.value}))});
    const defaultIndex=field.options.findIndex(option=>option.value===field.defaultValue);
    if(defaultIndex<0)throw Error('Uncaptured default option.');
    return {...base,type:'select',options,defaultOptionId:options[defaultIndex].id};
   }
   if(field.name==='email')return {...base,type:'email',maxLength:254};
   if(field.name==='phone')return {...base,type:'phone',maxLength:60,maxDigits:15};
   const type=field.name==='name'?'name':field.name==='company'?'organization':field.name==='message'?'message':'text';
   // Proposed standalone limits, explicitly surfaced below for review. They do
   // not claim equivalence with the legacy combined-notes payload limits.
   const maxLength=field.maxLength!==null?Number(field.maxLength):field.name==='message'?4000:160;
   return {...base,type,maxLength};
  });
  const definition=formSchema.parse({schemaVersion:1,title:variant==='contact'?'Your travel brief':'Your corporate travel brief',fields,submitLabel:route.form.submitLabel,successHeading,successMessage:successBody,notificationRouteIds:[]});
  return {variant,sourcePath:route.path,definition,optionMappings,presentation:{note:route.form.note,successHeading,successBody,referenceLabel:'Enquiry reference:'},findings:[
   {code:'validation_review',message:'Proposed text limits require review. Email and phone length/digit limits match the captured legacy intake. Email syntax, phone punctuation and whitespace normalization still differ and require review. Combined notes mapping is not connected.'},
   {code:'presentation_review',message:'Form titles and an enquiry-consent field label are explicit CMS labels. Preserve the corporate note when connecting the page. The source success heading and body use separate CMS fields.'},
   {code:'notifications_unmapped',message:'No notification routes were inferred. Configure and verify routing before replacing the existing enquiry delivery.'},
  ]};
 });
 return {mode:'review-only' as const,readyToApply:false as const,sourceProof:source.sourceProof,forms,findings:[{code:'intake_mapping_pending',message:'Published form bindings, source-to-lead mapping, duplicate recovery and notifications need end-to-end verification. No form, draft or enquiry was saved.'}]};
}
