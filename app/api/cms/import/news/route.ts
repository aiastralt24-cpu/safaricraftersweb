import {handleNewsImportUpload} from '../../../../../lib/cms/news-import-api';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function POST(request:Request){return handleNewsImportUpload(request);}
