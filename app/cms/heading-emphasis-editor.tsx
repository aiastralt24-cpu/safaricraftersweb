'use client';
import {headingEmphasisMatches} from '../../lib/cms/heading-emphasis';
export function HeadingEmphasisEditor({title,accent,onChange}:{title:string;accent?:string;onChange:(accent:string|undefined)=>void}){
 const valid=headingEmphasisMatches({title,titleAccent:accent});
 return <label>Emphasized heading words (optional)<input maxLength={200} value={accent??''} aria-invalid={!valid} onChange={event=>onChange(event.target.value||undefined)}/><small>Copy an exact word or phrase from the heading. Its first occurrence will be emphasized.</small>{!valid&&<span role='alert'>These words no longer match the heading. Update or clear the emphasis before saving.</span>}</label>;
}
