import {z} from 'zod';
import {formSchema} from './forms.ts';
const record=z.object({id:z.string().uuid(),type:z.literal('form'),currentRevision:z.string().uuid(),payload:formSchema}).passthrough();
/** Only accepts a response fetched using the viewer's existing content permissions. */
export function parseFormPreviewReference(input:unknown,expectedId:string){
 const parsed=record.parse(input);
 if(parsed.id!==expectedId)throw Error('Referenced form identity mismatch.');
 return {revision:parsed.currentRevision,definition:parsed.payload};
}
export type FormPreviewReference=ReturnType<typeof parseFormPreviewReference>;
export type LoadFormPreview=(id:string,signal:AbortSignal)=>Promise<unknown>;
