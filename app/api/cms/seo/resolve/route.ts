import {handleSeoResolution} from '../../../../../lib/cms/seo-resolution-api';
export const dynamic='force-dynamic';
export async function POST(request:Request){return handleSeoResolution(request);}
