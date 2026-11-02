import {handleTanzaniaMigrationReview} from '@/lib/cms/tanzania-migration-api';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function POST(request:Request){return handleTanzaniaMigrationReview(request);}
