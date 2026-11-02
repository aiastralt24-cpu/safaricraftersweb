import {handleAboutMigrationReview} from '@/lib/cms/about-migration-api';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function POST(request:Request){return handleAboutMigrationReview(request);}
