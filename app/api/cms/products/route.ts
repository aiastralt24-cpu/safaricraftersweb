import {handleProductSave} from '../../../../lib/cms/products-editor-api';
import {handleProductLibrary} from '../../../../lib/cms/product-library-api';
export const dynamic='force-dynamic';
export async function POST(request:Request){return handleProductSave(request);}
export async function GET(request:Request){return handleProductLibrary(request,'product');}
