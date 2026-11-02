import {createHash} from 'node:crypto';
import {z} from 'zod';
import {formSchema} from './forms.ts';
import type {BoundEnquiryFile} from './enquiry-file-validation.ts';
import {enquiryFileSessionIdentitySchema,type EnquiryFileSessionIdentity} from './enquiry-file-session-create.ts';
import type {EnquiryRpc} from './enquiry-database.ts';
const evidenceSchema=z.array(z.object({uploadId:z.string().uuid(),fieldId:z.string().regex(/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,127}$/),mimeType:z.enum(['application/pdf','image/jpeg','image/png']),byteSize:z.number().int().min(1).max(25000000),available:z.literal(true)}).strict()).max(50);
/** Stored definition and credential scope only. Missing/unchecked files produce
 * no evidence and remain field-validation failures, never permissive defaults. */
export async function readEnquiryFileEvidence(rpc:EnquiryRpc,input:EnquiryFileSessionIdentity,token:unknown,definition:unknown,answers:Record<string,unknown>):Promise<BoundEnquiryFile[]>{
 const i=enquiryFileSessionIdentitySchema.parse(input),secret=z.string().regex(/^[a-f0-9]{64}$/).parse(token),form=formSchema.parse(definition);
 const selections=form.fields.flatMap(field=>{if(field.type!=='file')return [];const raw=answers[field.id],parsed=z.string().uuid().safeParse(typeof raw==='string'?raw.trim():raw);return parsed.success?[{fieldId:field.id,uploadId:parsed.data}]:[];});
 if(new Set(selections.map(v=>v.uploadId)).size!==selections.length)return [];
 if(!selections.length)return [];
 const result=evidenceSchema.parse(await rpc('get_enquiry_file_evidence',{p_site:i.site,p_form:i.form,p_revision:i.revision,p_request:i.request,p_session:i.session,p_token_hash:createHash('sha256').update(secret).digest('hex'),p_files:selections}));
 const seen=new Set<string>();for(const file of result){if(seen.has(file.uploadId)||!selections.some(v=>v.uploadId===file.uploadId&&v.fieldId===file.fieldId))throw Error('Attachment evidence mismatch.');seen.add(file.uploadId);}
 return result;
}
