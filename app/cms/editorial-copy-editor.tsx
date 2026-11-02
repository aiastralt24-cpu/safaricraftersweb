'use client';
import {editorialCopySchema} from '../../lib/cms/editorial-copy';
import type {EditorialCopy} from '../../lib/cms/editorial-copy';
export function EditorialCopyEditor({value,onChange}:{value:EditorialCopy;onChange:(value:EditorialCopy)=>void}){
 const validation=editorialCopySchema.safeParse(value);
 function update(index:number,patch:Partial<EditorialCopy['runs'][number]>){onChange({runs:value.runs.map((run,i)=>i===index?{...run,...patch}:run)});}
 return <fieldset><legend>Card description</legend><p>Use separate fragments to emphasize a phrase. Keep spaces around the phrase.</p>{value.runs.map((run,index)=><div key={index}><label>Description fragment {index+1}<textarea maxLength={2000} value={run.text} onChange={e=>update(index,{text:e.target.value})}/></label><label><input type='checkbox' checked={run.strong} onChange={e=>update(index,{strong:e.target.checked})}/>Strong emphasis</label><button type='button' disabled={value.runs.length===1} onClick={()=>onChange({runs:value.runs.filter((_,i)=>i!==index)})}>Remove description fragment</button></div>)}<button type='button' disabled={value.runs.length>=50} onClick={()=>onChange({runs:[...value.runs,{text:'',strong:false}]})}>Add description fragment</button><small>{value.runs.reduce((total,run)=>total+run.text.length,0)}/2000 characters</small>{!validation.success&&<ul role='alert'>{validation.error.issues.map((issue,index)=><li key={index}>{issue.message}</li>)}</ul>}</fieldset>;
}
