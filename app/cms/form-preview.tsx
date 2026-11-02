'use client';
import {useState} from 'react';
import {formSchema,validateFormSubmission} from '../../lib/cms/forms';
import type {FormDefinition,FormIssue} from '../../lib/cms/forms';
import {FormFields} from './form-fields';
import {visibleFormState,initialFormAnswers,changeFormAnswer} from '../../lib/cms/form-visibility';
export function FormPreview({value}:{value:FormDefinition}){
 return <details className='cms-form-preview'><summary>Try this form</summary><p>Preview only. No enquiry is saved, no notification is sent, and no redirect is followed. Editing the definition resets these test answers.</p>{formSchema.safeParse(value).success?<Preview key={JSON.stringify(value)} value={value}/>:<p role='alert'>Correct the form definition before trying it.</p>}</details>;
}
function Preview({value}:{value:FormDefinition}){
 const [answers,setAnswers]=useState<Record<string,unknown>>(()=>initialFormAnswers(value)),[issues,setIssues]=useState<FormIssue[]>([]),[success,setSuccess]=useState(false);
 const visible=visibleFormState(value,answers);
 function change(id:string,answer:unknown){setAnswers(changeFormAnswer(value,answers,id,answer));setIssues([]);setSuccess(false);}
 return <form noValidate onSubmit={e=>{e.preventDefault();const result=validateFormSubmission(value,visible.answers);setIssues(result.issues);setSuccess(result.valid);}}><h3>{value.title}</h3><FormFields fields={visible.fields} answers={answers} issues={issues} change={change}/><button type='submit'>Test “{value.submitLabel}”</button><button type='button' onClick={()=>{setAnswers(initialFormAnswers(value));setIssues([]);setSuccess(false);}}>Reset test answers</button>{issues.length>0&&<p role='alert'>Please correct {issues.length} field{issues.length===1?'':'s'}.</p>}{success&&<div role='status'><strong>Preview validation passed. Nothing was submitted.</strong>{value.successHeading&&<h3>{value.successHeading}</h3>}<p>Configured success message: {value.successMessage}</p>{value.redirectPath&&<p>Configured redirect: {value.redirectPath}</p>}</div>}</form>;
}
