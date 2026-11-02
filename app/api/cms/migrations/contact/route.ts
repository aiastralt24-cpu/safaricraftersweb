import {handleContactMigrationReview} from '@/lib/cms/contact-migration-api';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function POST(request:Request){return handleContactMigrationReview(request);}
