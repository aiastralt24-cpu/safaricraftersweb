import {handleJournalMigrationReview} from '@/lib/cms/journal-migration-api';
export const runtime='nodejs';
export async function POST(request:Request){return handleJournalMigrationReview(request);}
