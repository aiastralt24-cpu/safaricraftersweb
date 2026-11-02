import {handleJournalImportUpload} from '../../../../../lib/cms/journal-import-api';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function POST(request:Request){return handleJournalImportUpload(request);}
