import {z} from 'zod';
const uuid=z.string().uuid();
export const productLibraryQuery=z.object({site:uuid,search:z.string().trim().max(120).default(''),status:z.enum(['','draft','in_review','changes_requested','approved']).default(''),owned:z.enum(['all','mine']).default('all'),after:uuid.optional(),limit:z.coerce.number().int().min(1).max(100).default(50)}).strict();
export function verifiedProductLibrary(value:unknown,type:'product'|'productCategory',limit:number,after?:string){
 const row=z.object({id:uuid,type:z.literal(type),title:z.string(),path:z.string().regex(type==='product'?/^\/products\/[a-z0-9]+(?:-[a-z0-9]+)*$/:/^\/product-categories\/[a-z0-9]+(?:-[a-z0-9]+)*$/),locale:z.string(),currentRevision:uuid,reviewStatus:z.enum(['draft','in_review','changes_requested','approved']),publishedRevision:uuid.nullable(),ownerId:uuid}).strict();
 const result=z.object({records:z.array(row).max(100),next:uuid.nullable()}).strict().parse(value);
 if(result.records.length>limit||result.records.some((r,i)=>r.id<=(i?result.records[i-1].id:after??''))||(result.next!==null&&(result.records.length!==limit||result.next!==result.records.at(-1)?.id)))throw Error('Product library response is inconsistent.');return result;
}
