import {productFilterEvidence,projectProductFilters} from './product-filter-evidence.ts';
import {z} from 'zod';
import {productPath} from './products.ts';
import {cmsRpc} from './gateway.ts';
import {projectPublishedProduct} from './published-product.ts';
export function usesCmsProduct(env:Record<string,string|undefined>=process.env){return env.CMS_PUBLIC_DELIVERY_ENABLED==='true'&&env.CMS_PRODUCT_DELIVERY_ENABLED==='true'&&env.CMS_PRODUCT_CATEGORY_DELIVERY_ENABLED==='true';}
import {pageSeoSchema} from './page-seo.ts';
import {image} from './composition-media.ts';
const slug=z.string().max(100).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
export type ProductReader={site:string;read:(site:string,path:string)=>Promise<unknown>;list:(after:string|null,category:string|null)=>Promise<unknown>};
export function publicProductConfig(env:Record<string,string|undefined>=process.env,fetcher:typeof fetch=fetch):ProductReader|null{
 if(!usesCmsProduct(env)||!z.string().uuid().safeParse(env.CMS_WEBSITE_ID).success||!env.CMS_SUPABASE_URL||!env.CMS_SUPABASE_ANON_KEY)return null;
 const connection={url:env.CMS_SUPABASE_URL,key:env.CMS_SUPABASE_ANON_KEY},site=env.CMS_WEBSITE_ID!;
 return {site,read:(website,path)=>cmsRpc(connection,connection.key,'get_public_product',{p_site:website,p_path:path,p_locale:'en'},fetcher),list:(after,category)=>cmsRpc(connection,connection.key,'list_published_products',{p_site:site,p_after:after,p_limit:100,p_category:category},fetcher)};
}
export async function readPublishedProduct(value:string,config:ProductReader|null){if(!slug.safeParse(value).success)return null;if(!config)throw Error('Product delivery is not configured.');const path=productPath(value),result=await config.read(config.site,path);return result===null?null:projectPublishedProduct(result,path,config.site);}
const summary=z.object({recordId:z.string().uuid(),revisionId:z.string().uuid(),path:z.string().max(110).regex(/^\/products\/[a-z0-9]+(?:-[a-z0-9]+)*$/),modifiedAt:z.string().datetime({offset:true}),title:z.string().trim().min(1).max(200),summary:z.string().trim().min(1).max(2000),code:z.string().trim().min(1).max(120),brand:z.string().max(200),image:image.nullable(),lifecycle:z.enum(['active','comingSoon','discontinued']),seo:pageSeoSchema,filterEvidence:productFilterEvidence.optional()}).strict();
export async function readPublishedProductList(config:ProductReader|null,category:string|null=null){if(category!==null&&!z.string().uuid().safeParse(category).success)throw Error('Invalid product category filter.');if(!config)throw Error('Product delivery is not configured.');let after:string|null=null;const rows:z.infer<typeof summary>[]=[],paths=new Set<string>();for(let page=0;page<100;page++){const batch=z.array(summary).max(100).parse(await config.list(after,category));for(const row of batch){if(!row.path.startsWith('/products/')||after!==null&&row.recordId<=after||paths.has(row.path))throw Error('Invalid product pagination.');after=row.recordId;paths.add(row.path);rows.push(row);}if(batch.length<100)return rows.sort((a,b)=>a.title.localeCompare(b.title)||a.recordId.localeCompare(b.recordId)).map(({filterEvidence,...row})=>({...row,attributes:filterEvidence?projectProductFilters(filterEvidence,config.site):[]}));}throw Error('Product listing exceeds the delivery limit.');}
