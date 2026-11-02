import {handleApplicationImportUpload} from '../../../../../lib/cms/application-import-api';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function POST(request:Request){return handleApplicationImportUpload(request);}
