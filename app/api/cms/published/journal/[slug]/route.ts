import {handlePublishedJournal,publicJournalConfig} from '../../../../../../lib/cms/public-journal-runtime.ts';
export const dynamic='force-dynamic';
export async function GET(request:Request,{params}:{params:Promise<{slug:string}>}){return handlePublishedJournal(request,(await params).slug,publicJournalConfig());}
