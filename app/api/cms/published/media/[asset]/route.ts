import {handlePublicMedia,publicMediaConfig} from '@/lib/cms/public-media';
export const runtime='nodejs';
export const maxDuration=60;
export async function GET(request:Request,{params}:{params:Promise<{asset:string}>}){return handlePublicMedia(request,(await params).asset,publicMediaConfig());}
