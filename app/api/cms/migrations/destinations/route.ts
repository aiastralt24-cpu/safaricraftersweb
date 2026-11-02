import {handleDestinationMigrationReview} from '@/lib/cms/destination-migration-api';
export const runtime='nodejs';
export async function POST(request:Request){return handleDestinationMigrationReview(request);}
