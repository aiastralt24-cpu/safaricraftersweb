import {handlePublicPageRead} from '@/lib/cms/public-page';
import {publicPageConfig} from '@/lib/cms/public-page-runtime';
export const runtime='nodejs';
export async function GET(request:Request){return handlePublicPageRead(request,publicPageConfig());}
