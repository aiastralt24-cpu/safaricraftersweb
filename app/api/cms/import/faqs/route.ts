import {handleFaqImportUpload} from '../../../../../lib/cms/faq-import-api';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function POST(request:Request){return handleFaqImportUpload(request);}
