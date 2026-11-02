'use client';
import {editorialHeadingSchema,editorialHeadingText} from '../../lib/cms/editorial-heading';
import type {EditorialHeading} from '../../lib/cms/editorial-heading';
import {CmsEditorialHeading} from '../../components/CmsEditorialHeading';

export function EditorialHeadingEditor({value,onChange,disabled=false}:{value:EditorialHeading;onChange:(value:EditorialHeading)=>void;disabled?:boolean}){
 const validation=editorialHeadingSchema.safeParse(value);
 function update(lineIndex:number,runIndex:number,patch:Partial<EditorialHeading['lines'][number]['runs'][number]>){
  onChange({lines:value.lines.map((line,index)=>index===lineIndex?{runs:line.runs.map((run,r)=>r===runIndex?{...run,...patch}:run)}:line)});
 }
 return <fieldset disabled={disabled}><legend>Heading text and emphasis</legend><p>Keep spaces between fragments. Each line appears as a separate line in the heading.</p>
 {value.lines.map((line,lineIndex)=><fieldset key={lineIndex}><legend>Line {lineIndex+1}</legend>
 {line.runs.map((run,runIndex)=><div key={runIndex}><label>Text fragment {runIndex+1}<input maxLength={200} value={run.text} onChange={event=>update(lineIndex,runIndex,{text:event.target.value})}/></label><label><input type='checkbox' checked={run.emphasis} onChange={event=>update(lineIndex,runIndex,{emphasis:event.target.checked})}/>Emphasize this fragment</label><button type='button' disabled={line.runs.length===1} onClick={()=>onChange({lines:value.lines.map((item,index)=>index===lineIndex?{runs:item.runs.filter((_,r)=>r!==runIndex)}:item)})}>Remove fragment {runIndex+1}</button></div>)}
 <button type='button' disabled={line.runs.length>=20} onClick={()=>onChange({lines:value.lines.map((item,index)=>index===lineIndex?{runs:[...item.runs,{text:'',emphasis:false}]}:item)})}>Add text fragment</button>
 <button type='button' disabled={value.lines.length===1} onClick={()=>onChange({lines:value.lines.filter((_,index)=>index!==lineIndex)})}>Remove line {lineIndex+1}</button>
 </fieldset>)}
 <button type='button' disabled={value.lines.length>=6} onClick={()=>onChange({lines:[...value.lines,{runs:[{text:'',emphasis:false}]}]})}>Add heading line</button>
 <small>{editorialHeadingText(value).length}/200 characters, including line breaks</small>
 {!validation.success&&<ul role='alert'>{validation.error.issues.map((issue,index)=><li key={index}>{issue.message}</li>)}</ul>}
 <div aria-label='Heading appearance preview'><CmsEditorialHeading value={value}/></div>
 </fieldset>;
}
