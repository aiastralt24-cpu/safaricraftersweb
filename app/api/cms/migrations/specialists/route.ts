import {handleSpecialistMigrationReview} from '../../../../../lib/cms/specialist-migration-api.ts';
export const dynamic='force-dynamic';
export async function POST(request:Request){return handleSpecialistMigrationReview(request);}
