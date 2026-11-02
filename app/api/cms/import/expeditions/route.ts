import {handleExpeditionImportUpload} from '../../../../../lib/cms/photo-expedition-import-api.ts';
export const dynamic='force-dynamic';
export async function POST(request:Request){return handleExpeditionImportUpload(request);}
