import {readPublishedProductList,publicProductConfig} from '@/lib/cms/public-product-runtime';
import {CmsProductCatalog} from './CmsProductCatalog';
export async function CmsProductIndex({category,embedded=false}:{category?:string;embedded?:boolean}={}){
 const items=await readPublishedProductList(publicProductConfig(),category??null);
 return <CmsProductCatalog items={items} embedded={embedded} category={Boolean(category)}/>;
}
