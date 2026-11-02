import {z} from 'zod';
const id=z.string().regex(/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,127}$/);
const condition=z.object({fieldId:id,optionId:id}).strict();
const base={id,label:z.string().trim().min(1).max(200),help:z.string().max(2000),required:z.boolean(),validationMessage:z.string().max(300),showWhen:condition.optional()};
const options=z.array(z.object({id,label:z.string().trim().min(1).max(200)}).strict()).min(1).max(100).refine(items=>new Set(items.map(v=>v.id)).size===items.length,'Option IDs must be unique.');
const placeholder=z.string().max(500).regex(/^[^\r\n\u0000-\u001f\u007f]*$/,'Use a single line of placeholder text.').optional();
const textType=z.enum(['name','organization','city','state','pincode','message','text']);
export const formFieldSchema=z.discriminatedUnion('type',[
 z.object({...base,type:textType,placeholder,maxLength:z.number().int().min(1).max(10000)}).strict(),
 z.object({...base,type:z.literal('email'),placeholder,maxLength:z.number().int().min(3).max(320).optional()}).strict(),
 z.object({...base,type:z.literal('phone'),placeholder,maxLength:z.number().int().min(7).max(80).optional(),maxDigits:z.number().int().min(7).max(80).optional()}).strict(),
 z.object({...base,type:z.enum(['select','productInterest','enquiryType']),options,defaultOptionId:id.optional()}).strict().refine(field=>field.defaultOptionId===undefined||field.options.some(option=>option.id===field.defaultOptionId),'The default must refer to an existing option.'),
 z.object({...base,type:z.literal('multiselect'),options}).strict(),
 z.object({...base,type:z.literal('consent'),purpose:z.enum(['enquiry','marketing']),text:z.string().trim().min(1).max(5000),textVersion:id}).strict(),
 z.object({...base,type:z.literal('file'),maxBytes:z.number().int().min(1).max(25000000),mimeTypes:z.array(z.enum(['application/pdf','image/jpeg','image/png'])).min(1).max(3)}).strict(),
]);
export const formSchema=z.object({schemaVersion:z.literal(1),title:z.string().trim().min(1).max(200),fields:z.array(formFieldSchema).min(1).max(50),submitLabel:z.string().trim().min(1).max(30),successMessage:z.string().trim().min(1).max(2000),successHeading:z.string().min(1).max(200).refine(value=>Boolean(value.trim()),'Enter a visible success heading.').optional(),redirectPath:z.string().max(500).regex(/^\/[a-z0-9/-]*$/).refine(v=>!v.includes('//'),'Use a local page path.').optional(),notificationRouteIds:z.array(z.string().uuid()).max(20).refine(v=>new Set(v).size===v.length,'Notification routes must be unique.')}).strict().superRefine((form,ctx)=>{
 const seen=new Map<string,z.infer<typeof formFieldSchema>>();
 form.fields.forEach((field,index)=>{
  if(seen.has(field.id))ctx.addIssue({code:'custom',path:['fields',index,'id'],message:'Field IDs must be unique.'});
  if(field.showWhen){const source=seen.get(field.showWhen.fieldId);if(!source||!('options' in source)||!source.options.some(option=>option.id===field.showWhen!.optionId))ctx.addIssue({code:'custom',path:['fields',index,'showWhen'],message:'Conditions must select an option from an earlier choice field.'});}
  if(field.type==='consent'&&field.purpose==='marketing'&&field.required)ctx.addIssue({code:'custom',path:['fields',index,'required'],message:'Marketing consent must be optional and separate from the enquiry.'});
  seen.set(field.id,field);
 });
});
export type FormDefinition=z.infer<typeof formSchema>;
export type FormField=z.infer<typeof formFieldSchema>;
export type VerifiedFormFile={uploadId:string;mimeType:string;byteSize:number;available:boolean};
export type FormIssue={field:string;message:string};
/** Call with a stored form revision and server-authorized file evidence. Neither
 * definition nor evidence may be taken from a public submission body. */
export function validateFormSubmission(definition:unknown,input:unknown,files:VerifiedFormFile[]=[]){
 const parsed=formSchema.safeParse(definition);if(!parsed.success)return {valid:false,issues:[{field:'form',message:'This form configuration is unavailable.'}],values:{},consents:[]};
 const form=parsed.data;
 if(!input||typeof input!=='object'||Array.isArray(input))return {valid:false,issues:[{field:'form',message:'Provide form fields.'}],values:{},consents:[]};
 const fields=input as Record<string,unknown>,values:Record<string,string|string[]|boolean>={},issues:FormIssue[]=[],consents:{fieldId:string;purpose:'enquiry'|'marketing';accepted:boolean;text:string;textVersion:string}[]=[];
 const fieldIds=new Set(form.fields.map(f=>f.id));for(const key of Object.keys(fields))if(!fieldIds.has(key))issues.push({field:key,message:'Unknown form field.'});
 const fail=(field:FormField,fallback:string)=>issues.push({field:field.id,message:field.validationMessage||fallback});
 for(const field of form.fields){
  if(field.showWhen){const source=values[field.showWhen.fieldId];const visible=Array.isArray(source)?source.includes(field.showWhen.optionId):source===field.showWhen.optionId;if(!visible){if(Object.hasOwn(fields,field.id))fail(field,'Do not submit a hidden field.');continue;}}
  const value=fields[field.id];
  if(field.type==='consent'){
   if(value!==undefined&&typeof value!=='boolean'){fail(field,'Choose a consent option.');continue;}
   const accepted=value===true;if(field.required&&!accepted){fail(field,'This consent is required to submit an enquiry.');continue;}
   values[field.id]=accepted;consents.push({fieldId:field.id,purpose:field.purpose,accepted,text:field.text,textVersion:field.textVersion});continue;
  }
  if(value===undefined||value===''||(Array.isArray(value)&&value.length===0)){if(field.required)fail(field,'This field is required.');continue;}
  if('options' in field){
   const selected=field.type==='multiselect'?value:[value];
   if(!Array.isArray(selected)||selected.length>field.options.length||selected.some(v=>typeof v!=='string'||!field.options.some(o=>o.id===v))||new Set(selected).size!==selected.length){fail(field,'Choose valid options.');continue;}
   values[field.id]=field.type==='multiselect'?selected as string[]:value as string;continue;
  }
  if(typeof value!=='string'){fail(field,'Enter text for this field.');continue;}
  const text=value.trim();if(!text){if(field.required)fail(field,'This field is required.');continue;}
  if(field.type==='file'){
   const file=files.find(f=>f.uploadId===text&&f.available);if(!file||file.byteSize<1||file.byteSize>field.maxBytes||!Number.isInteger(file.byteSize)||!field.mimeTypes.includes(file.mimeType as typeof field.mimeTypes[number])){fail(field,'Select an inspected, authorized file within the allowed type and size.');continue;}
  }else if(field.type==='email'){if(!z.string().email().max(field.maxLength??320).safeParse(text).success){fail(field,'Enter a valid email address.');continue;}}
  else if(field.type==='phone'){if(text.length>(field.maxLength??80)||!/^\+?[0-9 ()\-.]+$/.test(text)||text.replace(/\D/g,'').length<7||(field.maxDigits!==undefined&&text.replace(/\D/g,'').length>field.maxDigits)){fail(field,'Enter a valid phone number.');continue;}}
  else if('maxLength' in field&&text.length>field.maxLength){fail(field,`Use at most ${field.maxLength} characters.`);continue;}
  values[field.id]=text;
 }
 return {valid:issues.length===0,issues,values,consents};
}
