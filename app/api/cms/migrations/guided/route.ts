import {handleGuidedMigrationReview} from '@/lib/cms/guided-migration-api';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function POST(request:Request){return handleGuidedMigrationReview(request);}
