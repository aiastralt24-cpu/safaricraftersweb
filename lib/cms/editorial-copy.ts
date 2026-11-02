import {z} from 'zod';
/** A bounded paragraph of escaped text with semantic strong emphasis. */
export const editorialCopySchema=z.object({runs:z.array(z.object({text:z.string().min(1).max(2000),strong:z.boolean()}).strict()).min(1).max(50)}).strict().superRefine((value,context)=>{
 const text=value.runs.map(run=>run.text).join('');
 if(!text.trim()||text.length>2000)context.addIssue({code:'custom',message:'Enter between 1 and 2,000 characters of visible paragraph text.'});
 if(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(text))context.addIssue({code:'custom',message:'Control characters are not allowed in paragraph text.'});
});
export type EditorialCopy=z.infer<typeof editorialCopySchema>;
