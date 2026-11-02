import {z} from 'zod';
import {image} from './composition.ts';
const canonical=z.string().max(2048).refine(value=>{if(value==='')return true;try{const url=new URL(value);return url.protocol==='https:'&&!url.username&&!url.password&&!url.hash&&!/[\s\\]/.test(value);}catch{return false;}},'Use a full HTTPS canonical URL without credentials, spaces or a fragment.');
export const pageSeoSchema=z.object({
 schemaVersion:z.literal(1),title:z.string().max(200),description:z.string().max(1000),canonical,
 indexing:z.enum(['inherit','index','noindex']),following:z.enum(['inherit','follow','nofollow']),
 socialTitle:z.string().max(200),socialDescription:z.string().max(1000),socialImage:image.optional(),
 breadcrumbLabel:z.string().max(200),sitemap:z.enum(['inherit','include','exclude']),
}).strict();
export type PageSeo=z.infer<typeof pageSeoSchema>;
export function newPageSeo():PageSeo{return {schemaVersion:1,title:'',description:'',canonical:'',indexing:'inherit',following:'inherit',socialTitle:'',socialDescription:'',breadcrumbLabel:'',sitemap:'inherit'};}
/** Advisory draft checks, never a ranking score or authorization to publish. */
export function pageSeoFindings(input:unknown){
 const parsed=pageSeoSchema.safeParse(input);if(!parsed.success)return parsed.error.issues.map(issue=>({field:`seo.${issue.path.join('.')}`,severity:'error' as const,code:'seo_field',message:issue.message}));
 const findings:{field:string;severity:'warning';code:string;message:string}[]=[];
 if(parsed.data.indexing==='noindex')findings.push({field:'seo.indexing',severity:'warning',code:'page_noindex',message:'This page requests exclusion from search-engine indexing. Check that this is intentional.'});
 if(parsed.data.indexing==='noindex'&&parsed.data.sitemap==='include')findings.push({field:'seo.sitemap',severity:'warning',code:'sitemap_noindex',message:'Sitemap inclusion conflicts with noindex. Resolve this before publication.'});
 return findings;
}
