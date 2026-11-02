import {handlePhotoExpeditionMigrationReview} from '../../../../../lib/cms/photo-expedition-migration-api.ts';
export const dynamic='force-dynamic';
export async function POST(request:Request){return handlePhotoExpeditionMigrationReview(request);}
