import {handleProductCategoryImportUpload} from '@/lib/cms/product-category-import-api';
export const runtime='nodejs';
export async function POST(request:Request){return handleProductCategoryImportUpload(request);}
