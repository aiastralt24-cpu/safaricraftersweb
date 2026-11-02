import {handlePublicVideo,publicVideoConfig} from '@/lib/cms/public-video';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export const maxDuration=180;
export async function GET(request:Request,{params}:{params:Promise<{asset:string}>}){return handlePublicVideo(request,(await params).asset,publicVideoConfig());}
