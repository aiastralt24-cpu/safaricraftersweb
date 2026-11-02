import {handleConceptMigrationReview} from '../../../../../lib/cms/concept-migration-api';
export const dynamic='force-dynamic';
export const runtime='nodejs';
export async function POST(request:Request){return handleConceptMigrationReview(request);}
