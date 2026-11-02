import {handleConservationMigrationReview} from '@/lib/cms/conservation-migration-api';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function POST(request:Request){return handleConservationMigrationReview(request);}
