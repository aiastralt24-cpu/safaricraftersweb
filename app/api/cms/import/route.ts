import {handleImportUpload} from '../../../../lib/cms/import-api.ts';
export const dynamic='force-dynamic';
export const runtime='nodejs';
export async function POST(request:Request){return handleImportUpload(request);}
