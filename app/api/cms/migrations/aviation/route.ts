import {handleAviationMigrationReview} from '@/lib/cms/aviation-migration-api';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function POST(request:Request){return handleAviationMigrationReview(request);}
