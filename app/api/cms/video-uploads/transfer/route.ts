import {handleHeroVideoTransfer} from '@/lib/cms/hero-video-transfer';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function POST(request:Request){return handleHeroVideoTransfer(request);}
