import {handlePartnerImportUpload} from '../../../../../lib/cms/partner-import-api';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function POST(request:Request){return handlePartnerImportUpload(request);}
