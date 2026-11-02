import type {FormField,FormDefinition} from './forms.ts';
export function newFormField(type:FormField['type'],id:string):FormField{
 const base={id,label:'New field',help:'',required:false,validationMessage:''};
 if(type==='email'||type==='phone')return {...base,type};
 if(type==='consent')return {...base,type,purpose:'enquiry',text:'Describe the consent requested.',textVersion:id};
 if(type==='file')return {...base,type,maxBytes:5000000,mimeTypes:['application/pdf']};
 if(type==='select'||type==='multiselect'||type==='productInterest'||type==='enquiryType')return {...base,type,options:[{id:`${id}-option`,label:'First option'}]};
 return {...base,type,maxLength:type==='message'?2000:200};
}
export function newForm(id:string):FormDefinition{return {schemaVersion:1,title:'New enquiry form',fields:[{...newFormField('name',id),label:'Your name',required:true}],submitLabel:'Send enquiry',successMessage:'Thank you. We have received your enquiry.',notificationRouteIds:[]};}
