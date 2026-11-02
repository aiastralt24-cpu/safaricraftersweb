import {handleProductCategorySave} from '../../../../lib/cms/product-categories-editor-api';
import {handleProductLibrary} from '../../../../lib/cms/product-library-api';
export const dynamic='force-dynamic';
export async function POST(request:Request){return handleProductCategorySave(request);}
export async function GET(request:Request){return handleProductLibrary(request,'productCategory');}
