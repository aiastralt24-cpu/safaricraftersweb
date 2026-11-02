import {handleDestinationImportUpload} from '../../../../../lib/cms/destination-import-api.ts';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function POST(request:Request){return handleDestinationImportUpload(request);}
