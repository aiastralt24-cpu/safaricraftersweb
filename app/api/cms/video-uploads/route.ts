import {handleHeroVideoUploadCommand} from '@/lib/cms/hero-video-upload-api';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function POST(request:Request){return handleHeroVideoUploadCommand(request);}
