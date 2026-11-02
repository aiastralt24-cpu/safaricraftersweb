import {z} from 'zod';

/** Explicit lines and runs retain typography without accepting HTML. No trim or
 * whitespace normalization: imported editorial copy must remain unchanged. */
export const editorialHeadingSchema=z.object({
 lines:z.array(z.object({
  runs:z.array(z.object({text:z.string().min(1).max(200),emphasis:z.boolean()}).strict()).min(1).max(20),
 }).strict()).min(1).max(6),
}).strict().superRefine((heading,context)=>{
 const text=heading.lines.map(line=>line.runs.map(run=>run.text).join('')).join('\n');
 if(text.length>200)context.addIssue({code:'custom',message:'A heading can contain at most 200 characters, including line breaks.'});
 heading.lines.forEach((line,index)=>{
  if(!line.runs.some(run=>run.text.trim()))context.addIssue({code:'custom',path:['lines',index],message:'Each heading line needs visible text.'});
  line.runs.forEach((run,runIndex)=>{
   if(/[\r\n\u2028\u2029\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(run.text))context.addIssue({code:'custom',path:['lines',index,'runs',runIndex,'text'],message:'Use a separate heading line for line breaks; control characters are not allowed.'});
  });
 });
});
export type EditorialHeading=z.infer<typeof editorialHeadingSchema>;
export function editorialHeadingText(heading:EditorialHeading){
 return heading.lines.map(line=>line.runs.map(run=>run.text).join('')).join('\n');
}
