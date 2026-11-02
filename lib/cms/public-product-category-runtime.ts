import {z} from 'zod';
import {productCategoryPath} from './products.ts';
import {cmsRpc} from './gateway.ts';
import {projectPublishedProductCategory} from './published-product-category.ts';
export function usesCmsProductCategory(env:Record<string,string|undefined>=process.env){return env.CMS_PUBLIC_DELIVERY_ENABLED==='true'&&env.CMS_PRODUCT_CATEGORY_DELIVERY_ENABLED==='true';}
import {pageSeoSchema} from './page-seo.ts';
import {publicCategoryParent} from './published-product-category.ts';
const slug=z.string().max(100).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
export type ProductCategoryReader={site:string;read:(site:string,path:string)=>Promise<unknown>;list:(after:string|null)=>Promise<unknown>};
export function publicProductCategoryConfig(env:Record<string,string|undefined>=process.env,fetcher:typeof fetch=fetch):ProductCategoryReader|null{
 if(!usesCmsProductCategory(env)||!z.string().uuid().safeParse(env.CMS_WEBSITE_ID).success||!env.CMS_SUPABASE_URL||!env.CMS_SUPABASE_ANON_KEY)return null;
 const connection={url:env.CMS_SUPABASE_URL,key:env.CMS_SUPABASE_ANON_KEY},site=env.CMS_WEBSITE_ID!;
 return {site,read:(website,path)=>cmsRpc(connection,connection.key,'get_public_product_category',{p_site:website,p_path:path,p_locale:'en'},fetcher),list:(after)=>cmsRpc(connection,connection.key,'list_published_product_categories',{p_site:site,p_after:after,p_limit:100},fetcher)};
}
export async function readPublishedProductCategory(value:string,config:ProductCategoryReader|null){if(!slug.safeParse(value).success)return null;if(!config)throw Error('Product category delivery is not configured.');const path=productCategoryPath(value),result=await config.read(config.site,path);return result===null?null:projectPublishedProductCategory(result,path);}
const summary=z.object({recordId:z.string().uuid(),revisionId:z.string().uuid(),path:z.string().max(120).regex(/^\/product-categories\/[a-z0-9]+(?:-[a-z0-9]+)*$/),modifiedAt:z.string().datetime({offset:true}),title:z.string().trim().min(1).max(200),summary:z.string().trim().min(1).max(2000),parent:publicCategoryParent,seo:pageSeoSchema}).strict();
export async function readPublishedProductCategoryList(config:ProductCategoryReader|null){if(!config)throw Error('Product category delivery is not configured.');let after:string|null=null;const rows:z.infer<typeof summary>[]=[],paths=new Set<string>();for(let page=0;page<100;page++){const batch=z.array(summary).max(100).parse(await config.list(after));for(const row of batch){if(!row.path.startsWith('/product-categories/')||after!==null&&row.recordId<=after||paths.has(row.path))throw Error('Invalid product category pagination.');after=row.recordId;paths.add(row.path);rows.push(row);}if(batch.length<100)return rows.sort((a,b)=>a.title.localeCompare(b.title)||a.recordId.localeCompare(b.recordId));}throw Error('Product category listing exceeds the delivery limit.');}
