import {handleProductCategoryRevision} from '../../../../../lib/cms/product-category-revision-api';
export const dynamic='force-dynamic';
export async function GET(request:Request){return handleProductCategoryRevision(request);}
