import {z} from 'zod';
const uuid=z.string().uuid(),fieldId=z.string().regex(/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,127}$/);
export const routingFieldType=z.enum(['productInterest','enquiryType','city','state','pincode','select','text','multiselect']);
export const routingRule=z.object({id:uuid,name:z.string().trim().min(1).max(100),enabled:z.boolean(),formId:uuid,fieldId,fieldType:routingFieldType,value:z.string().min(1).max(200).refine(v=>Boolean(v.trim())),ownerId:uuid}).strict();
export const routingRules=z.array(routingRule).max(20).refine(r=>new Set(r.map(v=>v.id)).size===r.length);
const config=z.object({websiteId:uuid,version:z.number().int().nonnegative(),rules:routingRules}).strict();
const options=z.object({websiteId:uuid,forms:z.array(z.object({id:uuid,title:z.string(),fields:z.array(z.object({id:fieldId,label:z.string(),type:routingFieldType,options:z.array(z.object({id:fieldId,label:z.string()}).strict())}).strict()).max(50)}).strict()).max(200),owners:z.array(z.object({id:uuid,email:z.string().nullable()}).strict()).max(200)}).strict();
export type LeadRouting=z.infer<typeof config>;export type RoutingRule=z.infer<typeof routingRule>;export type RoutingOptions=z.infer<typeof options>;
export function verifiedLeadRouting(input:unknown,site:string){const value=config.parse(input);if(value.websiteId!==site)throw Error('Assignment rule response mismatch.');return value;}
export function verifiedRoutingOptions(input:unknown,site:string){const value=options.parse(input);if(value.websiteId!==site||new Set(value.forms.map(f=>f.id)).size!==value.forms.length||new Set(value.owners.map(o=>o.id)).size!==value.owners.length||value.forms.some(f=>new Set(f.fields.map(v=>v.id)).size!==f.fields.length))throw Error('Assignment choices response mismatch.');return value;}
