import {handleKenyaMigrationReview} from '@/lib/cms/kenya-migration-api';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function POST(request:Request){return handleKenyaMigrationReview(request);}
